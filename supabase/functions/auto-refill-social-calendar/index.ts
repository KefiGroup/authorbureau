/**
 * auto-refill-social-calendar
 *
 * Sprint D BUG-M3: scheduled daily via pg_cron. For every author whose social
 * queue runs out within the next 7 days, kicks off the existing BP-03 generator
 * for the next 30 days. Idempotent — generator dedupes per (author_id, day).
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REFILL_THRESHOLD_DAYS = 7;
const REFILL_HORIZON_DAYS = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const horizonCutoff = new Date(Date.now() + REFILL_THRESHOLD_DAYS * 86400_000).toISOString();

  // Optional per-author force call (from the Social Calendar "Generate 30 more days" button).
  let forceAuthorId: string | null = null;
  let force = false;
  try {
    const body = await req.json().catch(() => ({}));
    forceAuthorId = body?.author_id ?? null;
    force = !!body?.force;
  } catch { /* ignore */ }

  // 1. Find target authors. If a force call, only that author; else every active BP-03 author.
  let nodesQuery = admin
    .from("author_nodes")
    .select("author_id, book_id")
    .eq("node_id", "BP-03")
    .in("status", ["live", "content_ready"]);
  if (forceAuthorId) nodesQuery = nodesQuery.eq("author_id", forceAuthorId);
  const { data: nodes } = await nodesQuery;

  const authors = Array.from(
    new Map((nodes || []).map((n) => [n.author_id, n])).values()
  );

  const refilled: string[] = [];
  const skipped: string[] = [];

  for (const a of authors) {
    // 2. Count queued posts in the next 7 days.
    const { count } = await admin
      .from("social_posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", a.author_id)
      .in("status", ["draft", "ready"])
      .gte("scheduled_at", new Date().toISOString())
      .lte("scheduled_at", horizonCutoff);

    if ((count || 0) >= REFILL_THRESHOLD_DAYS) {
      skipped.push(a.author_id);
      continue;
    }

    // 3. Trigger the existing BP-03 generator for the next 30 days.
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/generate-bp03-social-media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          author_id: a.author_id,
          book_id: a.book_id,
          days: REFILL_HORIZON_DAYS,
          source: "auto_refill_cron",
        }),
      });
      if (resp.ok) refilled.push(a.author_id);
      else skipped.push(a.author_id);
    } catch (e) {
      console.error("[auto-refill-social-calendar] generator failed for", a.author_id, e);
      skipped.push(a.author_id);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      authors_checked: authors.length,
      refilled: refilled.length,
      skipped: skipped.length,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
