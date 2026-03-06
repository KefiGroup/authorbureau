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
      if (data.completedAssets) setCompletedAssets(data.completedAssets);
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
  }, [bookId]);

  return { plan, loading, completedAssets, refreshPlan, updatePlan };
}
