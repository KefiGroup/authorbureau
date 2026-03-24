import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ABBY_CATEGORIES, getCategoryForNode, type AbbyCategory } from "@/config/abbyFrameworkConfig";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

export interface NodeGatingRow {
  node_id: string;
  category: string;
  is_open: boolean;
  updated_at: string;
}

const sortRows = (rows: NodeGatingRow[]) =>
  [...rows].sort((a, b) => a.category.localeCompare(b.category) || a.node_id.localeCompare(b.node_id));

const getNodeIdsForCategory = (categoryId: string): string[] => {
  const category = ABBY_CATEGORIES[categoryId as AbbyCategory];
  return category ? category.nodes.map((node) => node.id) : [];
};

async function adminDataFetch(action: string, body: Record<string, unknown> = {}) {
  const token = await getActiveToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetchWithTimeout(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...body }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export function useNodeGating() {
  const [gating, setGating] = useState<NodeGatingRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Public read path for all users and all dashboard surfaces
  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("node_gating")
        .select("node_id, category, is_open, updated_at")
        .order("category")
        .order("node_id");

      if (error) throw error;
      setGating(sortRows((data || []) as NodeGatingRow[]));
    } catch (error) {
      setGating([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

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

  /** Toggle a node's open/closed state (admin-only, via backend function) */
  const toggleNode = useCallback(async (nodeId: string, open: boolean) => {
    const category = getCategoryForNode(nodeId);
    if (!category) return false;

    try {
      const data = await adminDataFetch("update-node-gating-node", {
        nodeId,
        category,
        isOpen: open,
      });

      const updatedAt = data?.row?.updated_at || new Date().toISOString();
      setGating((prev) => {
        const next = prev.filter((r) => r.node_id !== nodeId);
        next.push({ node_id: nodeId, category, is_open: open, updated_at: updatedAt });
        return sortRows(next);
      });

      return true;
    } catch (error) {
      return false;
    }
  }, []);

  /** Bulk toggle all nodes in a category (admin-only, via backend function) */
  const toggleCategory = useCallback(async (categoryId: string, open: boolean) => {
    const nodeIds = getNodeIdsForCategory(categoryId);
    if (nodeIds.length === 0) return false;

    try {
      const data = await adminDataFetch("update-node-gating-category", {
        categoryId,
        nodeIds,
        isOpen: open,
      });

      const updatedAt = data?.updated_at || new Date().toISOString();
      setGating((prev) => {
        const byNodeId = new Map(prev.map((row) => [row.node_id, row]));
        nodeIds.forEach((node_id) => {
          byNodeId.set(node_id, {
            node_id,
            category: categoryId,
            is_open: open,
            updated_at: updatedAt,
          });
        });
        return sortRows(Array.from(byNodeId.values()));
      });

      return true;
    } catch (error) {
      return false;
    }
  }, []);

  return { gating, loading, refetch: fetch, isNodeOpen, isCategoryFullyClosed, toggleNode, toggleCategory };
}
