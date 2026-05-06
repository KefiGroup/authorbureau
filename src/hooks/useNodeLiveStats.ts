import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { hasRequiredAssets, AUTHOR_LEVEL_NODES } from "@/lib/node-readiness";

export interface NodeLiveStats {
  status: string | null;
  /**
   * Effective status reflects true readiness. A node may be marked `live` in the DB,
   * but if required assets are missing it will be downgraded to `content_ready` here
   * so dashboard cards don't show a misleading "Live" badge.
   */
  effectiveStatus: string | null;
  progressPercent: number; // 0-100, derived
  revenueToDate: number;
  activatedAt: string | null;
  currentStep: number | null;
  bookId: string | null;
  micrositeUrl: string | null;
}

// Coarse progress mapping when current_step isn't meaningful for the node.
const STATUS_PROGRESS: Record<string, number> = {
  draft: 25,
  content_ready: 60,
  live: 100,
};

export function useNodeLiveStats(bookId?: string | null): {
  loading: boolean;
  byCode: Record<string, NodeLiveStats>;
  refresh: () => void;
} {
  const { user } = useAuth();
  const [byCode, setByCode] = useState<Record<string, NodeLiveStats>>({});
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // Auto-refresh on tab focus / visibility change so coming back from a
  // builder always reflects the latest author_nodes rows. Also poll every
  // 30s while the tab is visible as a safety net.
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const onVis = () => { if (document.visibilityState === "visible") bump(); };
    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", onVis);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") bump();
    }, 30000);
    return () => {
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Resolve ALL author_profiles for this person (sibling profiles share a
        // pen_name across SSO accounts). Mirrors the author-stats edge function
        // so the dashboard cards never miss rows owned by a sibling profile.
        const { data: myProfile } = await supabase
          .from("author_profiles")
          .select("id, pen_name")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!myProfile?.id) {
          if (!cancelled) {
            setByCode({});
            setLoading(false);
          }
          return;
        }
        const profileIds: string[] = [myProfile.id];
        if (myProfile.pen_name) {
          const { data: siblings } = await supabase
            .from("author_profiles")
            .select("id")
            .eq("pen_name", myProfile.pen_name)
            .neq("id", myProfile.id);
          (siblings || []).forEach((s: any) => profileIds.push(s.id));
        }

        // Always fetch ALL of the author's rows. Book scoping is applied
        // per-row below so author-level nodes (email, podcast, social, YR-*)
        // count on every book's dashboard, while book-specific products
        // only count for their own book_id. Mirrors useBookNodeProgress.
        const { data: rows } = await supabase
          .from("author_nodes")
          .select("node_id, status, revenue_to_date, activated_at, current_step, book_id, microsite_url, content_json")
          .in("author_id", profileIds);

        const map: Record<string, NodeLiveStats> = {};
        // Pick the most-progressed row per node_id (in case multiple books).
        const rank = (s: string | null) =>
          s === "live" ? 4 : s === "content_ready" ? 2 : s === "draft" ? 1 : 0;
        (rows || []).forEach((r: any) => {
          const code = r.node_id;
          // Per-row scope check.
          const isAuthorLevel = AUTHOR_LEVEL_NODES.has(code);
          const matchesBook = !bookId || !r.book_id || r.book_id === bookId;
          if (!isAuthorLevel && !matchesBook) return;

          const rawStatus: string | null = r.status ?? null;
          // Downgrade Live → content_ready if the node lacks required assets.
          // Stripe Express is intentionally NOT consulted: payouts are an
          // admin-side concern; reader payments always flow to the platform.
          const effective =
            rawStatus === "live" && !hasRequiredAssets(code, r.content_json)
              ? "content_ready"
              : rawStatus;
          const incoming: NodeLiveStats = {
            status: rawStatus,
            effectiveStatus: effective,
            progressPercent: STATUS_PROGRESS[effective ?? ""] ?? 0,
            revenueToDate: Number(r.revenue_to_date || 0),
            activatedAt: r.activated_at ?? null,
            currentStep: r.current_step ?? null,
            bookId: r.book_id ?? null,
            micrositeUrl: r.microsite_url ?? null,
          };
          const existing = map[code];
          if (!existing || rank(effective) > rank(existing.effectiveStatus)) {
            map[code] = incoming;
          } else if (rank(effective) === rank(existing.effectiveStatus)) {
            // Sum revenue across books for the same node.
            existing.revenueToDate += incoming.revenueToDate;
          }
        });
        if (!cancelled) {
          setByCode(map);
          setLoading(false);
          if (import.meta.env.DEV) {
            const inProgressIds = Object.entries(map)
              .filter(([, v]) => v.effectiveStatus === "content_ready" || v.effectiveStatus === "draft")
              .map(([k]) => k);
            // eslint-disable-next-line no-console
            console.debug(
              `[useNodeLiveStats] profiles=${profileIds.length} bookId=${bookId ?? "any"} in-progress=${JSON.stringify(inProgressIds)}`,
            );
          }
        }
      } catch (e) {
        console.error("useNodeLiveStats:", e);
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, tick, bookId]);

  return { loading, byCode, refresh: () => setTick((t) => t + 1) };
}
