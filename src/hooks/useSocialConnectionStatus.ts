import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Single source of truth for whether the current user has connected at
 * least one social account (LinkedIn / Facebook Page / Instagram Business / X).
 *
 * Used by:
 *  - BP-03 Builder Activate gate
 *  - Marketing Hub → Social Calendar gate
 *  - Dashboard "connect your social accounts" banner
 */
export interface SocialConnectionStatus {
  loading: boolean;
  connectedPlatforms: string[];
  hasAnyConnection: boolean;
  refresh: () => Promise<void>;
}

export function useSocialConnectionStatus(): SocialConnectionStatus {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);

  const load = async () => {
    if (!user?.id) {
      setConnectedPlatforms([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("social_connections")
      .select("platform, status")
      .eq("user_id", user.id)
      .eq("status", "connected");
    setConnectedPlatforms((data || []).map((r: any) => r.platform));
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load();
    // re-poll on tab focus so OAuth-return updates show up immediately
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
