import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import {
  selectNextStep,
  type GateState,
  type NextStep,
  type NextStepInput,
  type NodeStatusSimple,
  type SubscriptionTier,
} from "@/lib/abby-next-step";

interface UseAbbyGatesArgs {
  bookId?: string | null;
}

interface UseAbbyGatesReturn {
  loading: boolean;
  nextStep: NextStep | null;
  gates: GateState[];
  skip: (nodeId: string) => Promise<void>;
  refresh: () => void;
}

/**
 * Loads node status + gate state for the current author/book and returns the
 * single Next Step ABBY should surface. Cross-device skip persistence lives in
 * `author_node_skips`. Gate evaluation + side-effects run in the
 * `abby-gate-engine` edge function.
 */
export function useAbbyGates({ bookId }: UseAbbyGatesArgs = {}): UseAbbyGatesReturn {
  const { user, tier } = useAuth();
  const [loading, setLoading] = useState(true);
  const [nextStep, setNextStep] = useState<NextStep | null>(null);
  const [gates, setGates] = useState<GateState[]>([]);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user) { setLoading(false); return; }
      setLoading(true);
      try {
        const { data: profile } = await supabase
          .from("author_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!profile?.id) { if (!cancelled) { setLoading(false); setNextStep(null); } return; }

        // Node status (book-scoped overlay).
        let nodesQ = supabase
          .from("author_nodes")
          .select("node_id, status, book_id")
          .eq("author_id", profile.id);
        const { data: nodeRows } = await nodesQ;
        const nodeStatus: Record<string, NodeStatusSimple> = {};
        (nodeRows ?? []).forEach((n: any) => {
          if (bookId && n.book_id && n.book_id !== bookId) return;
          const s: NodeStatusSimple =
            n.status === "live" ? "live"
              : n.status === "content_ready" || n.status === "draft" ? "in-progress"
                : "todo";
          // Most-progressed wins.
          const rank = (x: NodeStatusSimple) => x === "live" ? 3 : x === "in-progress" ? 2 : 1;
          if (!nodeStatus[n.node_id] || rank(s) > rank(nodeStatus[n.node_id])) {
            nodeStatus[n.node_id] = s;
          }
        });

        // Skipped node ids.
        const { data: skipRows } = await supabase
          .from("author_node_skips")
          .select("node_id, book_id")
          .eq("author_id", profile.id);
        const skipped = new Set<string>(
          (skipRows ?? [])
            .filter((r: any) => !r.book_id || r.book_id === bookId)
            .map((r: any) => r.node_id),
        );

        // Gate evaluation + side-effects.
        let gatesResult: GateState[] = [];
        try {
          const token = await getActiveToken();
          if (token) {
            const res = await fetchWithTimeout(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/abby-gate-engine`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ author_id: profile.id, book_id: bookId ?? null }),
              },
              20000,
            );
            if (res.ok) {
              const data = await res.json();
              gatesResult = (data?.gates ?? []).map((g: any) => ({
                id: g.id,
                ready: !!g.ready,
                alreadyFired: !!g.alreadyFired,
              }));
            }
          }
        } catch (e) {
          console.warn("[useAbbyGates] engine unreachable:", e);
        }

        const input: NextStepInput = {
          tier: (tier as SubscriptionTier) ?? "free",
          nodeStatus,
          skipped,
          gates: gatesResult,
        };

        if (!cancelled) {
          setGates(gatesResult);
          setNextStep(selectNextStep(input));
          setLoading(false);
        }
      } catch (e) {
        console.error("[useAbbyGates] error:", e);
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [user, tier, bookId, tick]);

  const skip = useCallback(
    async (nodeId: string) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile?.id) return;
      await supabase.from("author_node_skips").insert({
        author_id: profile.id,
        book_id: bookId ?? null,
        node_id: nodeId,
      });
      refresh();
    },
    [user, bookId, refresh],
  );

  return { loading, nextStep, gates, skip, refresh };
}
