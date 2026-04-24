/**
 * Shared helpers for BA/YR generator edge functions.
 * Mirrors the resilience pattern used in generate-bp02-lead-magnets.
 */
// @ts-nocheck — Deno runtime
import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function makeServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try { return JSON.stringify(err); } catch { return String(err); }
}

/**
 * Always-200 failure envelope so the frontend (supabase.functions.invoke)
 * can read `data.success === false` and `data.error` without the SDK
 * swallowing the body behind a non-2xx error.
 */
export function failResponse(error: string, diagnostics?: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ success: false, error, diagnostics: diagnostics ?? null }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

/**
 * Confirm the auth user row still exists before spending AI tokens or
 * triggering FK violations on author_nodes.
 */
export async function verifyAuthUser(
  supabase: ReturnType<typeof createClient>,
  userId: string | null | undefined,
): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  if (!userId) {
    return { ok: false, code: "AUTH_USER_MISSING", message: "Author profile has no linked user_id." };
  }
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data?.user) {
      return { ok: false, code: "AUTH_USER_MISSING", message: "Linked auth user not found." };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, code: "AUTH_USER_LOOKUP_FAILED", message: errorMessage(e) };
  }
}

/**
 * Map AI gateway non-2xx responses to ABBY-voiced friendly messages.
 */
export function aiGatewayErrorMessage(status: number, bodyText: string): string {
  if (status === 429) return "ABBY is a bit overwhelmed right now. Please wait a few seconds and try again.";
  if (status === 402) return "ABBY's AI credits need topping up. Please head to Settings → Workspace → Usage to add credits, then try again.";
  if (status >= 500) return "ABBY's AI service is having a moment. Please try again in a few seconds.";
  return `AI gateway error (${status}): ${bodyText.slice(0, 200)}`;
}

export function parseAiJson(raw: string): any {
  const cleaned = (raw || "").replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI response did not contain valid JSON");
  return JSON.parse(match[0]);
}

/**
 * Resolve the author's primary book using profile id, auth user id, or owner email.
 * Returns null if nothing can be found (caller decides whether to throw).
 */
export async function resolveAuthorBook(
  supabase: ReturnType<typeof createClient>,
  authorProfileId: string,
  authUserId: string | null,
  bookId?: string | null,
) {
  let userEmail: string | null = null;
  if (authUserId) {
    const { data: u } = await supabase.auth.admin.getUserById(authUserId);
    userEmail = u.user?.email ?? null;
  }
  const candidateIds = Array.from(new Set([authorProfileId, authUserId].filter(Boolean) as string[]));

  // If a specific bookId is provided, try it first — but only return it if it actually
  // belongs to this author (by author_id OR owner_email). Otherwise fall through to latest.
  if (bookId) {
    const { data: byId } = await supabase
      .from("books")
      .select("id, title, subtitle, description, cover_image_url, genre, owner_email, author_id")
      .eq("id", bookId)
      .maybeSingle();
    if (byId) {
      const ownsByAuthorId = byId.author_id && candidateIds.includes(byId.author_id);
      const ownsByEmail = userEmail && byId.owner_email === userEmail;
      if (ownsByAuthorId || ownsByEmail) return byId;
    }
  }

  const orParts: string[] = [];
  if (candidateIds.length) orParts.push(`author_id.in.(${candidateIds.join(",")})`);
  if (userEmail) orParts.push(`owner_email.eq.${userEmail}`);
  const baseQuery = supabase
    .from("books")
    .select("id, title, subtitle, description, cover_image_url, genre, owner_email, author_id")
    .order("created_at", { ascending: false })
    .limit(1);
  const { data, error } = orParts.length
    ? await baseQuery.or(orParts.join(","))
    : await baseQuery;
  if (error) return null;
  return data?.[0] ?? null;
}

/**
 * Idempotent upsert into author_nodes — never throws if the row doesn't exist yet.
 */
export async function upsertAuthorNode(
  supabase: ReturnType<typeof createClient>,
  authorId: string,
  nodeId: string,
  nodeName: string,
  payload: Record<string, unknown>,
) {
  const { data: existing } = await supabase
    .from("author_nodes")
    .select("id")
    .eq("author_id", authorId)
    .eq("node_id", nodeId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from("author_nodes").update(payload).eq("id", existing.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("author_nodes").insert({
    author_id: authorId,
    node_id: nodeId,
    node_name: nodeName,
    ...payload,
  });
  if (error) throw error;
}

/**
 * Snapshot the current author_nodes row so we can restore on error.
 */
export async function snapshotAuthorNode(
  supabase: ReturnType<typeof createClient>,
  authorId: string,
  nodeId: string,
): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from("author_nodes")
    .select("status, content_json, personalised_name, price_usd, currency, delivery_type, current_step")
    .eq("author_id", authorId)
    .eq("node_id", nodeId)
    .maybeSingle();
  return (data as Record<string, unknown>) ?? null;
}

/**
 * Build a context bundle from author_context with safe fallback to the latest book.
 * Never throws — returns whatever can be assembled.
 */
export async function buildAuthorContext(
  supabase: ReturnType<typeof createClient>,
  authorProfileId: string,
  authUserId: string | null,
) {
  const { data: ctx } = await supabase
    .from("author_context")
    .select("*")
    .eq("author_id", authorProfileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const book = await resolveAuthorBook(supabase, authorProfileId, authUserId);
  const bookTitle = ctx?.book_title?.trim() || book?.title?.trim() || "";
  const bookSubtitle = ctx?.book_subtitle?.trim() || book?.subtitle?.trim() || "";
  const coreThesis = ctx?.core_thesis?.trim() || book?.description?.trim() || "";
  return { ctx, book, bookTitle, bookSubtitle, coreThesis };
}
