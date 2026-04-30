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
        // Always fetch ALL of the author's rows. Book scoping is applied
        // per-row below so author-level nodes (email, podcast, social, YR-*)
        // count on every book's dashboard, while book-specific products
        // only count for their own book_id. Mirrors useBookNodeProgress.
        const { data: rows } = await supabase
          .from("author_nodes")
          .select("node_id, status, revenue_to_date, activated_at, current_step, book_id, microsite_url, content_json")
          .eq("author_id", profile.id);

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
  }, [user, tick, bookId]);

  return { loading, byCode, refresh: () => setTick((t) => t + 1) };
}
