import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NodeGatingRow {
  node_id: string;
  category: string;
  is_open: boolean;
  updated_at: string;
}

export function useNodeGating() {
  const [gating, setGating] = useState<NodeGatingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("node_gating")
      .select("node_id, category, is_open, updated_at")
      .order("category")
      .order("node_id");
    if (!error && data) setGating(data as NodeGatingRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  /** Check if a specific node is open */
  const isNodeOpen = useCallback(
    (nodeId: string): boolean => {
      const row = gating.find((r) => r.node_id === nodeId);
      return row?.is_open ?? false;
    },
    [gating]
  );

  /** Check if ALL nodes in a category are closed (Coming Soon) */
  const isCategoryFullyClosed = useCallback(
    (categoryId: string): boolean => {
      const rows = gating.filter((r) => r.category === categoryId);
      if (rows.length === 0) return false;
      return rows.every((r) => !r.is_open);
    },
    [gating]
  );

  /** Toggle a node's open/closed state */
  const toggleNode = useCallback(
    async (nodeId: string, open: boolean) => {
      const { error } = await supabase
        .from("node_gating")
        .update({ is_open: open, updated_at: new Date().toISOString() })
        .eq("node_id", nodeId);
      if (!error) {
        setGating((prev) =>
          prev.map((r) => (r.node_id === nodeId ? { ...r, is_open: open } : r))
        );
      }
      return !error;
    },
    []
  );

  /** Bulk toggle all nodes in a category */
  const toggleCategory = useCallback(
    async (categoryId: string, open: boolean) => {
      const { error } = await supabase
        .from("node_gating")
        .update({ is_open: open, updated_at: new Date().toISOString() })
        .eq("category", categoryId);
      if (!error) {
        setGating((prev) =>
          prev.map((r) => (r.category === categoryId ? { ...r, is_open: open } : r))
        );
      }
      return !error;
    },
    []
  );

  return { gating, loading, refetch: fetch, isNodeOpen, isCategoryFullyClosed, toggleNode, toggleCategory };
}
