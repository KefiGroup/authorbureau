import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface NodeLiveStats {
  status: string | null;
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

export function useNodeLiveStats(): {
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
        const { data: rows } = await supabase
          .from("author_nodes")
          .select("node_id, status, revenue_to_date, activated_at, current_step, book_id, microsite_url")
          .eq("author_id", profile.id);

        const map: Record<string, NodeLiveStats> = {};
        // Pick the most-progressed row per node_id (in case multiple books).
        const rank = (s: string | null) =>
          s === "live" ? 4 : s === "published_pending_ghl" ? 3 : s === "content_ready" ? 2 : s === "draft" ? 1 : 0;
        (rows || []).forEach((r: any) => {
          const code = r.node_id;
          const incoming: NodeLiveStats = {
            status: r.status ?? null,
            progressPercent: STATUS_PROGRESS[r.status] ?? 0,
            revenueToDate: Number(r.revenue_to_date || 0),
            activatedAt: r.activated_at ?? null,
            currentStep: r.current_step ?? null,
            bookId: r.book_id ?? null,
            micrositeUrl: r.microsite_url ?? null,
          };
          const existing = map[code];
          if (!existing || rank(r.status) > rank(existing.status)) {
            map[code] = incoming;
          } else if (rank(r.status) === rank(existing.status)) {
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
