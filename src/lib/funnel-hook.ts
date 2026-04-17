import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget: Generates a funnel page for a node after publish.
 * Does not block publish flow; failures are logged only.
 * Skips if a funnel already exists for this author + node.
 */
export async function ensureFunnel(params: {
  authorId: string;
  nodeId: "BP-01" | "BP-02" | "BP-05";
  bookId?: string | null;
  funnelType?: "opt_in" | "lead_magnet" | "webinar" | "webinar_registration" | "sales";
}) {
  const { authorId, nodeId, bookId, funnelType } = params;
  try {
    const { data: existing } = await supabase
      .from("funnels")
      .select("id")
      .eq("author_id", authorId)
      .eq("node_id", nodeId)
      .limit(1)
      .maybeSingle();
    if (existing) return { skipped: true, funnel_id: existing.id };

    const { data, error } = await supabase.functions.invoke("generate-funnel", {
      body: {
        author_id: authorId,
        node_id: nodeId,
        book_id: bookId || null,
        funnel_type: funnelType || "opt_in",
      },
    });
    if (error) {
      console.warn(`[ensureFunnel] ${nodeId} failed:`, error.message);
      return { error: error.message };
    }
    return data;
  } catch (e: any) {
    console.warn(`[ensureFunnel] ${nodeId} threw:`, e?.message);
    return { error: e?.message };
  }
}
