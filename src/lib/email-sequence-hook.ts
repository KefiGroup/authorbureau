import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget: Generates an email sequence for a node after publish.
 * Does not block publish flow; failures are logged only.
 * Skips if a flow already exists for this author + node.
 *
 * Note: `authorId` here is the **author_profiles.id** (NOT auth.users.id),
 * which is what `email_flows.author_id` stores.
 */
export type AbbyNodeId =
  | "BP-01" | "BP-02" | "BP-03" | "BP-04" | "BP-05" | "BP-06" | "BP-07" | "BP-08" | "BP-09"
  | "BA-10" | "BA-11" | "BA-12" | "BA-13" | "BA-14" | "BA-15" | "BA-16" | "BA-17" | "BA-18"
  | "YR-19" | "YR-20" | "YR-21" | "YR-22" | "YR-23" | "YR-24" | "YR-25" | "YR-26" | "YR-27" | "YR-28";

export async function ensureEmailSequence(params: {
  authorId: string;          // author_profiles.id
  nodeId: AbbyNodeId;
  bookId?: string | null;
}) {
  const { authorId, nodeId, bookId } = params;
  try {
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

/**
 * Auto-enroll a subscriber into the right sequences after a conversion event.
 * Fire-and-forget — never blocks the user-facing flow.
 *
 * Pass either `userId` (auth.users.id) OR `authorProfileId`. If both are known, pass both.
 */
export async function autoEnrollSubscriber(params: {
  email: string;
  name?: string | null;
  userId?: string | null;
  authorProfileId?: string | null;
  nodeId?: AbbyNodeId | null;
  source?: string;
  sourceDetail?: string | null;
  bookId?: string | null;
}) {
  try {
    const { data, error } = await supabase.functions.invoke("enroll-subscriber", {
      body: {
        email: params.email,
        name: params.name ?? null,
        user_id: params.userId ?? null,
        author_profile_id: params.authorProfileId ?? null,
        node_id: params.nodeId ?? null,
        source: params.source ?? "auto_enroll",
        source_detail: params.sourceDetail ?? null,
        book_id: params.bookId ?? null,
      },
    });
    if (error) {
      console.warn("[autoEnrollSubscriber] failed:", error.message);
      return { error: error.message };
    }
    return data;
  } catch (e: any) {
    console.warn("[autoEnrollSubscriber] threw:", e?.message);
    return { error: e?.message };
  }
}
