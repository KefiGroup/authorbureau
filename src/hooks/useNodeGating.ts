import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ABBY_CATEGORIES, getCategoryForNode, type AbbyCategory } from "@/config/abbyFrameworkConfig";

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

  /** Toggle a node's open/closed state (creates missing row if needed) */
  const toggleNode = useCallback(async (nodeId: string, open: boolean) => {
    const category = getCategoryForNode(nodeId);
    if (!category) return false;

    const updatedAt = new Date().toISOString();
    const { data: existing, error: existingError } = await supabase
      .from("node_gating")
      .select("node_id")
      .eq("node_id", nodeId)
      .maybeSingle();

    if (existingError) return false;

    const mutation = existing
      ? supabase
          .from("node_gating")
          .update({ category, is_open: open, updated_at: updatedAt })
          .eq("node_id", nodeId)
      : supabase.from("node_gating").insert({
          node_id: nodeId,
          category,
          is_open: open,
          updated_at: updatedAt,
        });

    const { error } = await mutation;
    if (error) return false;

    setGating((prev) => {
      const next = prev.filter((r) => r.node_id !== nodeId);
      next.push({ node_id: nodeId, category, is_open: open, updated_at: updatedAt });
      return sortRows(next);
    });

    return true;
  }, []);

  /** Bulk toggle all nodes in a category (also backfills missing rows) */
  const toggleCategory = useCallback(async (categoryId: string, open: boolean) => {
    const nodeIds = getNodeIdsForCategory(categoryId);
    if (nodeIds.length === 0) return false;

    const updatedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("node_gating")
      .update({ category: categoryId, is_open: open, updated_at: updatedAt })
      .in("node_id", nodeIds);

    if (updateError) return false;

    const { data: existingRows, error: existingError } = await supabase
      .from("node_gating")
      .select("node_id")
      .in("node_id", nodeIds);

    if (existingError) return false;

    const existingIds = new Set((existingRows || []).map((r) => r.node_id));
    const missingIds = nodeIds.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      const { error: insertError } = await supabase.from("node_gating").insert(
        missingIds.map((node_id) => ({
          node_id,
          category: categoryId,
          is_open: open,
          updated_at: updatedAt,
        }))
      );
      if (insertError) return false;
    }

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
  }, []);

  return { gating, loading, refetch: fetch, isNodeOpen, isCategoryFullyClosed, toggleNode, toggleCategory };
}

