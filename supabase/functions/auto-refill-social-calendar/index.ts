/**
 * auto-refill-social-calendar
 *
 * Sprint 5B: client-driven trigger. The Social Calendar tab calls this with
 * `{ author_id, force: true }` whenever the author's scheduled runway drops to
 * 7 days or fewer. The nightly cron path is a no-op (author-driven scheduling).
 * On force, this generates 30 more days of post copy and inserts them as
 * Unscheduled drafts (see bp03-node-state → rebuildSocialPosts).
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

  // Author-driven scheduling: when called by the nightly cron (no `force`), this is now a no-op.
  // The author chooses when each post goes live from the Social Calendar UI — we never silently
  // extend the calendar in the background. The "Generate 30 more days" button still works because
  // it always sets `force: true` and a specific `author_id`.
  if (!force || !forceAuthorId) {
    return new Response(
      JSON.stringify({
        success: true,
        skipped_reason: "author_driven_scheduling",
        authors_checked: 0,
        refilled: 0,
        skipped: 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Forced manual refill — only generate copy for the requesting author.
  const { data: nodes } = await admin
    .from("author_nodes")
    .select("author_id, book_id")
    .eq("node_id", "BP-03")
    .in("status", ["live", "content_ready"])
    .eq("author_id", forceAuthorId);

  const authors = Array.from(
    new Map((nodes || []).map((n) => [n.author_id, n])).values()
  );

  const refilled: string[] = [];
  const skipped: string[] = [];

  for (const a of authors) {
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
