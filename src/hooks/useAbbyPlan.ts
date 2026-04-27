import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AbbyPlan } from "@/components/dashboard/BusinessPlanCard";

const EXECUTE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/abby-execute`;

export interface UseAbbyPlanReturn {
  plan: AbbyPlan | null;
  loading: boolean;
  completedAssets: string[];
  refreshPlan: () => Promise<void>;
  updatePlan: (completedProducts: string[]) => Promise<AbbyPlan | null>;
}

export function useAbbyPlan(bookId: string | undefined): UseAbbyPlanReturn {
  const [plan, setPlan] = useState<AbbyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [completedAssets, setCompletedAssets] = useState<string[]>([]);

  const getToken = async (): Promise<string> => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  };

  const refreshPlan = useCallback(async () => {
    if (!bookId) return;
    setLoading(true);
    try {
      const token = await getToken();
      const resp = await fetch(EXECUTE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "status", bookId }),
      });
      const data = await resp.json();
      if (data.plan) setPlan(data.plan);

      // Source of truth for "built" count is `author_nodes` (status in live/content_ready)
      // — same query Revenue Dashboard uses. We merge with anything abby-execute returned
      // so the Books Hub counter never under-reports vs Revenue Dashboard. (M2 fix)
      const merged = new Set<string>(Array.isArray(data.completedAssets) ? data.completedAssets : []);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const userId = sess?.session?.user?.id;
        if (userId) {
          const { data: profile } = await supabase
            .from("author_profiles")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();
          if (profile?.id) {
            const { data: nodes } = await supabase
              .from("author_nodes")
              .select("node_id, status")
              .eq("author_id", profile.id)
              .eq("book_id", bookId)
              .in("status", ["live", "content_ready"]);
            (nodes || []).forEach((n: any) => n?.node_id && merged.add(n.node_id));
          }
        }
      } catch (e) {
        console.warn("[useAbbyPlan] author_nodes merge failed:", (e as Error).message);
      }
      setCompletedAssets(Array.from(merged));
    } catch (err) {
      console.error("Failed to load plan:", err);
    }
    setLoading(false);
  }, [bookId]);

  const updatePlan = useCallback(async (completedProducts: string[]): Promise<AbbyPlan | null> => {
    if (!bookId || !plan) return null;
    try {
      const token = await getToken();
      const resp = await fetch(EXECUTE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "update-plan",
          bookId,
          businessPlan: plan,
          completedProducts,
        }),
      });
      const data = await resp.json();
      if (data.plan) {
        setPlan(data.plan);
        return data.plan;
      }
    } catch (err) {
      console.error("Failed to update plan:", err);
    }
    return null;
  }, [bookId, plan]);

  useEffect(() => {
    refreshPlan();
  }, [bookId, refreshPlan]);

  return { plan, loading, completedAssets, refreshPlan, updatePlan };
}
