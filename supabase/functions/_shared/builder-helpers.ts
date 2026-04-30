/**
 * Shared helpers for BA/YR generator edge functions.
 * Mirrors the resilience pattern used in generate-bp02-lead-magnets.
 *
 * NOTE (2026-04-24): author_nodes is now per-book — every read/write is keyed
 * on (author_id, node_id, book_id). Generators must thread book_id through
 * snapshotAuthorNode() and upsertAuthorNode().
 */
// @ts-nocheck — Deno runtime
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  sanitiseForPublic,
  validateForPublic,
  ensurePrimaryCta,
} from "./microsite-content-rules.ts";

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
 * Resolve the author's book using profile id, auth user id, or owner email.
 * If a specific bookId is provided, returns that book IF it belongs to the
 * author; otherwise falls back to the latest. Returns null if nothing found.
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
 * Idempotent upsert into author_nodes — keyed on (author_id, node_id, book_id).
 * The book_id is REQUIRED for new rows to ensure per-book scoping; if not
 * provided, we fall back to the previously stored book_id on an existing row,
 * or NULL (legacy bucket) if none exists.
 */
export async function upsertAuthorNode(
  supabase: ReturnType<typeof createClient>,
  authorId: string,
  nodeId: string,
  nodeName: string,
  payload: Record<string, unknown>,
  bookId?: string | null,
) {
  // ---- Content quality gate (Layer 2) -------------------------------------
  // If the caller is writing content_json, route it through the same validate /
  // sanitise / ensure-CTA pipeline used by saveNodeContent(), and log any rule
  // violations to content_quality_log so we see drift immediately instead of at
  // audit time. Best-effort — never blocks the write.
  if (payload && payload.content_json && typeof payload.content_json === "object") {
    try {
      const opts = { nodeId, archetype: (payload.archetype as string) ?? null };
      const { violations } = validateForPublic(
        payload.content_json as Record<string, unknown>,
        opts,
      );
      const cleaned = sanitiseForPublic(
        payload.content_json as Record<string, unknown>,
        opts,
      );
      const hadCtaBefore = JSON.stringify(cleaned).includes('"primary_cta"');
      const withCta = ensurePrimaryCta(cleaned, nodeId);
      const ctaInjected =
        !hadCtaBefore && JSON.stringify(withCta).includes('"primary_cta"');

      payload = { ...payload, content_json: withCta };

      if (violations.length > 0 || ctaInjected) {
        const rows: Record<string, unknown>[] = violations.map((v) => ({
          author_id: authorId,
          node_id: nodeId,
          rule: v.rule,
          sample: v.sample,
          field_path: v.field_path,
          source: "upsertAuthorNode",
        }));
        if (ctaInjected) {
          rows.push({
            author_id: authorId,
            node_id: nodeId,
            rule: "missing_cta",
            sample: null,
            field_path: "primary_cta",
            source: "upsertAuthorNode",
          });
        }
        try {
          await supabase.from("content_quality_log").insert(rows);
        } catch (_e) {
          // swallow — quality logging must never block content save
        }
      }
    } catch (_e) {
      // If the rules helper itself throws, fall through to the original
      // payload — we'd rather save raw content than lose it.
    }
  }
  // -------------------------------------------------------------------------

  // Try book-scoped match first
  let existing: { id: string; book_id: string | null } | null = null;
  if (bookId) {
    const { data } = await supabase
      .from("author_nodes")
      .select("id, book_id")
      .eq("author_id", authorId)
      .eq("node_id", nodeId)
      .eq("book_id", bookId)
      .maybeSingle();
    existing = (data as any) ?? null;
  }
  // Fallback: legacy author-only match (book_id = NULL) so we don't double-write
  if (!existing && !bookId) {
    const { data } = await supabase
      .from("author_nodes")
      .select("id, book_id")
      .eq("author_id", authorId)
      .eq("node_id", nodeId)
      .is("book_id", null)
      .maybeSingle();
    existing = (data as any) ?? null;
  }

  if (existing?.id) {
    const updatePayload: Record<string, unknown> = { ...payload };
    // If this update has a bookId and the row had none (legacy), pin it now.
    if (bookId && !existing.book_id) updatePayload.book_id = bookId;
    const { error } = await supabase.from("author_nodes").update(updatePayload).eq("id", existing.id);
    if (error) throw error;
    return;
  }
  const insertPayload: Record<string, unknown> = {
    author_id: authorId,
    node_id: nodeId,
    node_name: nodeName,
    ...payload,
  };
  if (bookId) insertPayload.book_id = bookId;
  const { error } = await supabase.from("author_nodes").insert(insertPayload);
  if (error) throw error;
}

/**
 * Snapshot the current author_nodes row so we can restore on error.
 * Matches on (author_id, node_id, book_id) when bookId is provided.
 */
export async function snapshotAuthorNode(
  supabase: ReturnType<typeof createClient>,
  authorId: string,
  nodeId: string,
  bookId?: string | null,
): Promise<Record<string, unknown> | null> {
  let q = supabase
    .from("author_nodes")
    .select("status, content_json, personalised_name, price_usd, currency, delivery_type, current_step")
    .eq("author_id", authorId)
    .eq("node_id", nodeId);
  if (bookId) q = q.eq("book_id", bookId);
  else q = q.is("book_id", null);
  const { data } = await q.maybeSingle();
  return (data as Record<string, unknown>) ?? null;
}

/**
 * Nodes that REQUIRE a per-book author_context row. If the author hasn't run
 * book analysis on this specific book yet, the generator should refuse rather
 * than hallucinate from a different book's framework.
 */
export const FRAMEWORK_REQUIRED_NODES = new Set([
  "BP-01", "BP-02", "BP-03", "BP-04", "BP-05",
  "BA-10", "BA-12", "BA-13",
  "YR-19", "YR-20", "YR-22", "YR-23", "YR-24", "YR-25",
]);

/**
 * Build a context bundle from author_context with strict per-book lookup.
 *
 * - Resolves the book first (by bookId if provided, else latest for the author).
 * - Looks up author_context by (author_id, book_id) — this is the ONLY mode now.
 *   The legacy book_title heuristic is gone; it caused cross-book content leaks.
 * - If no row exists for that book AND the node is in FRAMEWORK_REQUIRED_NODES,
 *   returns `{ contextBlocked: true, ... }` so the caller can refuse cleanly
 *   and the UI can prompt the author to run book analysis (BP-00) for this book.
 * - Otherwise returns ctx = null (non-framework-heavy nodes can proceed using
 *   the book's title/description alone).
 */
export async function buildAuthorContext(
  supabase: ReturnType<typeof createClient>,
  authorProfileId: string,
  authUserId: string | null,
  bookId?: string | null,
  nodeId?: string,
) {
  const book = await resolveAuthorBook(supabase, authorProfileId, authUserId, bookId);

  let ctx: Record<string, any> | null = null;
  let contextSource: "book-specific" | "book-only-fallback" | "blocked" = "book-only-fallback";

  if (book?.id) {
    const { data: matchedCtx } = await supabase
      .from("author_context")
      .select("*")
      .eq("author_id", authorProfileId)
      .eq("book_id", book.id)
      .maybeSingle();
    if (matchedCtx) {
      ctx = matchedCtx;
      contextSource = "book-specific";
    }
  }

  const requiresFramework = nodeId ? FRAMEWORK_REQUIRED_NODES.has(nodeId) : false;
  let contextBlocked = false;
  if (!ctx && requiresFramework) {
    contextBlocked = true;
    contextSource = "blocked";
  }

  const bookTitle = book?.title?.trim() || ctx?.book_title?.trim() || "";
  const bookSubtitle = book?.subtitle?.trim() || ctx?.book_subtitle?.trim() || "";
  const coreThesis = book?.description?.trim() || ctx?.core_thesis?.trim() || "";
  return { ctx, book, bookTitle, bookSubtitle, coreThesis, contextBlocked, contextSource };
}
