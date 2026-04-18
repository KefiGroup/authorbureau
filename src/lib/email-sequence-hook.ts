import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget: Generates an email sequence for a node after publish.
 * Does not block publish flow; failures are logged only.
 * Skips if a flow already exists for this author + node.
 */
export async function ensureEmailSequence(params: {
  authorId: string;
  nodeId: "BP-01" | "BP-02" | "BP-04" | "BP-05";
  bookId?: string | null;
}) {
  const { authorId, nodeId, bookId } = params;
  try {
    // Skip if a flow already exists for this node
    const { data: existing } = await supabase
      .from("email_flows")
      .select("id")
      .eq("author_id", authorId)
      .eq("node_id", nodeId)
      .limit(1)
      .maybeSingle();
    if (existing) return { skipped: true, flow_id: existing.id };

    const { data, error } = await supabase.functions.invoke("generate-email-sequence", {
      body: { author_id: authorId, node_id: nodeId, book_id: bookId || null },
    });
    if (error) {
      console.warn(`[ensureEmailSequence] ${nodeId} failed:`, error.message);
      return { error: error.message };
    }
    return data;
  } catch (e: any) {
    console.warn(`[ensureEmailSequence] ${nodeId} threw:`, e?.message);
    return { error: e?.message };
  }
}
