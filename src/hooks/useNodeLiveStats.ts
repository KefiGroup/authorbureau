import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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
  published_pending_ghl: 85,
  live: 100,
};

/**
 * Mirror of server-side readiness gates in deploy-ba14-to-transistor /
 * deploy-ba15-to-ghl. If a node's `status === 'live'` but the required assets
 * are absent, we surface `content_ready` so the UI doesn't show a false Live badge.
 */
function hasRequiredAssets(nodeId: string, content: any): boolean {
  if (!content || typeof content !== "object") return false;
  switch (nodeId) {
    case "BA-14": {
      const rssReady = !!(content.rss_url || content.rss_feed_url || content?.transistor?.show_id);
      const episodes = Array.isArray(content.episodes) ? content.episodes : [];
      return rssReady && episodes.length > 0;
    }
    case "BA-15": {
      const hasPressRelease = !!(content.press_release || content.press_release_html || content?.assets?.press_release);
      const hasMediaList = Array.isArray(content.media_list)
        ? content.media_list.length > 0
        : Array.isArray(content.outlets)
        ? content.outlets.length > 0
        : false;
      return hasPressRelease && hasMediaList;
    }
    case "BA-13": {
      // Group coaching needs at least a session schedule or cohort config
      const hasSchedule = Array.isArray(content.sessions) ? content.sessions.length > 0 : !!content.schedule;
      return hasSchedule;
    }
    default:
      return true; // No extra gate beyond DB status
  }
}

export function useNodeLiveStats(bookId?: string | null): {
  loading: boolean;
  byCode: Record<string, NodeLiveStats>;
  refresh: () => void;
} {
  const { user } = useAuth();
  const [byCode, setByCode] = useState<Record<string, NodeLiveStats>>({});
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: profile } = await supabase
          .from("author_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!profile?.id) {
          if (!cancelled) {
            setByCode({});
            setLoading(false);
          }
          return;
        }
        let q = supabase
          .from("author_nodes")
          .select("node_id, status, revenue_to_date, activated_at, current_step, book_id, microsite_url, content_json")
          .eq("author_id", profile.id);
        if (bookId) q = q.eq("book_id", bookId);
        const { data: rows } = await q;

        const map: Record<string, NodeLiveStats> = {};
        // Pick the most-progressed row per node_id (in case multiple books).
        const rank = (s: string | null) =>
          s === "live" ? 4 : s === "published_pending_ghl" ? 3 : s === "content_ready" ? 2 : s === "draft" ? 1 : 0;
        (rows || []).forEach((r: any) => {
          const code = r.node_id;
          const rawStatus: string | null = r.status ?? null;
          // Downgrade Live → content_ready if the node lacks required assets
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
  }, [user, tick]);

  return { loading, byCode, refresh: () => setTick((t) => t + 1) };
}
