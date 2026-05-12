import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAuthReady } from "@/hooks/useAuthReady";

/**
 * Single source of truth for whether the current user has connected at
 * least one social account (LinkedIn / Facebook Page / Instagram Business / X).
 *
 * Used by:
 *  - BP-03 Builder Activate gate
 *  - Marketing Hub → Social Calendar gate
 *  - Dashboard "connect your social accounts" banner
 *  - Connect Settings page
 */
export interface SocialConnectionStatus {
  loading: boolean;
  connectedPlatforms: string[];
  hasAnyConnection: boolean;
  refresh: () => Promise<void>;
}

const ACTIVE_STATUSES = new Set(["connected", "active"]);

export function useSocialConnectionStatus(): SocialConnectionStatus {
  const { user } = useAuth();
  const { isReady: authReady } = useAuthReady();
  const [loading, setLoading] = useState(true);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) {
      setConnectedPlatforms([]);
      setLoading(false);
      return;
    }
    // Pull every row for this user so we can de-dupe by platform on the client.
    // (DB now has a unique index on (user_id, platform) but historic data may
    // briefly survive in a stale tab; treat the newest active row as truth.)
    const { data } = await supabase
      .from("social_connections")
      .select("platform, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const seen = new Set<string>();
    const platforms: string[] = [];
    for (const row of (data || []) as Array<{ platform: string; status: string }>) {
      if (!row.platform || seen.has(row.platform)) continue;
      seen.add(row.platform);
      if (ACTIVE_STATUSES.has(row.status)) platforms.push(row.platform);
    }
    setConnectedPlatforms(platforms);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    // Wait for auth to be hydrated before the first query — otherwise we render
    // "not connected" during the auth race.
    if (!authReady) return;
    setLoading(true);
    load();

    const onFocus = () => load();
    window.addEventListener("focus", onFocus);

    // OAuth callback (popup or redirect) emits this event so any open tab
    // refreshes immediately without waiting for window focus.
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("social-connect");
      bc.onmessage = (ev) => {
        if (ev?.data?.type === "connected" || ev?.data?.type === "disconnected") {
          load();
        }
      };
    } catch (_) {
      // Browsers without BroadcastChannel still get the focus listener.
    }

    return () => {
      window.removeEventListener("focus", onFocus);
      try { bc?.close(); } catch (_) {}
    };
  }, [authReady, load]);

  return {
    loading,
    connectedPlatforms,
    hasAnyConnection: connectedPlatforms.length > 0,
    refresh: load,
  };
}

/** Normalize calendar/post platform values to the social_connections key. */
export function normalizePlatformKey(p: string): string {
  if (p === "twitter") return "x";
  return p;
}
