// generate-asset-pack — produces the per-node Marketing Asset Pack
// Idempotent: re-runs upsert by (book_id, author_id, asset_type=`<type>:<node_id>`).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAiGateway } from "../_shared/builder-helpers.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ASSET_PACK_REGISTRY } from "../_shared/assetPackRegistry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { author_id, node_id, book_id, source } = await req.json();
    if (!author_id || !node_id) return json(400, { error: "author_id and node_id required" });

    const spec = ASSET_PACK_REGISTRY[node_id];
    if (!spec) return json(400, { error: `Unknown node_id: ${node_id}` });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load author profile + book + node content
    const [{ data: author }, { data: book }, { data: node }, { data: ctx }] = await Promise.all([
      admin.from("author_profiles").select("id, user_id, pen_name, methodology_name").eq("id", author_id).maybeSingle(),
      book_id ? admin.from("books").select("id, title, subtitle, author_name").eq("id", book_id).maybeSingle() : Promise.resolve({ data: null }),
      admin.from("author_nodes").select("content_json, personalised_name").eq("author_id", author_id).eq("node_id", node_id).maybeSingle(),
      admin.from("author_context").select("core_thesis, key_frameworks").eq("author_id", author_id).eq("book_id", book_id).maybeSingle(),
    ]);

    if (!author) return json(404, { error: "Author profile not found" });

    const bookTitle = book?.title || "your book";
    const penName = author.pen_name || book?.author_name || "the author";
    const nodeContent = node?.content_json || {};
    const personalisedNodeName = node?.personalised_name || spec.node_name;

    // Build the prompt
    const systemPrompt = `You are ABBY, an expert direct-response copywriter for authors. Produce a complete Marketing Asset Pack as a single JSON object. No prose outside JSON.`;

    const userPrompt = `
AUTHOR: ${penName}
BOOK: "${bookTitle}"${book?.subtitle ? ` — ${book.subtitle}` : ""}
NODE: ${spec.node_id} — ${personalisedNodeName} (${spec.node_name})
METHODOLOGY: ${author?.methodology_name || ctx?.core_thesis || "(not provided)"}
SIGNATURE FRAMEWORK: ${Array.isArray(ctx?.key_frameworks) && ctx.key_frameworks.length ? ctx.key_frameworks[0] : "(not provided)"}
TONE OF VOICE: warm, expert, plain-spoken
EXISTING NODE CONTENT (excerpt): ${JSON.stringify(nodeContent).slice(0, 1500)}

Produce ONE JSON object with these exact keys:
{
  "sales_copy": "Long-form sales page copy following an 11-section framework (hero, problem, transformation, introduction, what's included, who it's for, who it's not for, proof, offer/pricing, FAQ, CTA). Use markdown headings. ~800-1200 words.",
  "social_posts": [
    { "platform": "linkedin", "body": "..." },
    { "platform": "instagram", "body": "..." },
    { "platform": "twitter", "body": "..." }
  ],
  "email_announcement": {
    "subject": "...",
    "preview": "...",
    "body_markdown": "Ready-to-send broadcast email announcing this offer. ~250-400 words. Include one clear CTA."
  },
  "bonus_asset": {
    "type": "${spec.bonus_type}",
    "label": "${spec.bonus_label}",
    "body_markdown": "..."
  }
}

Tone for social posts: ${spec.social_tone}.
Bonus asset instructions: ${spec.bonus_prompt}
Personalize everything to this author's book and methodology.`;

    // Helper: call gateway
    const callAI = async (model: string) => {
      const r = await fetchAiGateway({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          // NOTE: no `temperature` override — gpt-5* only accepts default(1).
        }),
      }, "generate-asset-pack");
      const text = await r.text();
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch { /* ignore */ }
      const content = parsed?.choices?.[0]?.message?.content;
      let pkg: any = null;
      try { pkg = content ? JSON.parse(content) : null; } catch { pkg = null; }
      return { ok: r.ok, status: r.status, body: text.slice(0, 400), pack: pkg };
    };

    const isPackComplete = (p: any) =>
      !!p &&
      typeof p.sales_copy === "string" && p.sales_copy.trim().length > 50 &&
      Array.isArray(p.social_posts) && p.social_posts.length > 0 &&
      p.email_announcement && typeof p.email_announcement === "object" &&
      (p.email_announcement.body_markdown || "").length > 50 &&
      p.bonus_asset && typeof p.bonus_asset === "object" &&
      (p.bonus_asset.body_markdown || "").length > 50;

    // Attempt 1 — Gemini Flash (fast & cheap)
    let attempt = await callAI("google/gemini-2.5-flash");
    console.log(`[asset-pack] ${spec.node_id} attempt-1 gemini-flash status=${attempt.status} ok=${attempt.ok} complete=${isPackComplete(attempt.pack)}`);

    // Attempt 2 — fallback to gpt-5-mini if AI errored OR returned an incomplete pack
    if (!attempt.ok || !isPackComplete(attempt.pack)) {
      attempt = await callAI("openai/gpt-5-mini");
      console.log(`[asset-pack] ${spec.node_id} attempt-2 gpt-5-mini status=${attempt.status} ok=${attempt.ok} complete=${isPackComplete(attempt.pack)}`);
    }

    const pack = attempt.pack || {};
    const isReady = isPackComplete(pack);
    const meta = {
      node_id: spec.node_id,
      node_name: personalisedNodeName,
      book_title: bookTitle,
      generated_at: new Date().toISOString(),
      source: source || "manual",
    };

    if (!isReady) {
      // Mark all four rows as failed instead of writing empty placeholders.
      const failMeta = { ...meta, error: `AI returned incomplete pack (status ${attempt.status})` };
      const failedRows = (
        ["sales_copy", "social_pack", "email_announcement", "bonus"] as const
      ).map((t) => ({
        book_id: book_id ?? null,
        author_id,
        asset_type: `${t}:${spec.node_id}`,
        content: failMeta,
        status: "failed",
      }));
      for (const row of failedRows) {
        await admin.from("marketing_assets")
          .delete()
          .eq("author_id", row.author_id)
          .eq("asset_type", row.asset_type)
          .or(book_id ? `book_id.eq.${book_id}` : "book_id.is.null");
        await admin.from("marketing_assets").insert(row);
      }
      console.error(`[asset-pack] ${spec.node_id} FAILED — wrote 4 failed rows. last_body=${attempt.body}`);
      return json(200, { ok: false, status: "failed", node_id: spec.node_id });
    }

    // Build the four asset rows
    const rows = [
      {
        book_id: book_id ?? null,
        author_id,
        asset_type: `sales_copy:${spec.node_id}`,
        content: { ...meta, label: "Sales Page Copy", markdown: pack.sales_copy },
        status: "ready",
      },
      {
        book_id: book_id ?? null,
        author_id,
        asset_type: `social_pack:${spec.node_id}`,
        content: { ...meta, label: "3 Social Posts", posts: pack.social_posts },
        status: "ready",
      },
      {
        book_id: book_id ?? null,
        author_id,
        asset_type: `email_announcement:${spec.node_id}`,
        content: { ...meta, label: "Email Announcement", email: pack.email_announcement },
        status: "ready",
      },
      {
        book_id: book_id ?? null,
        author_id,
        asset_type: `bonus:${spec.node_id}`,
        content: { ...meta, label: spec.bonus_label, bonus: pack.bonus_asset },
        status: "ready",
      },
    ];

    // Upsert with conflict on (book_id, author_id, asset_type) — null book_id handled by COALESCE in unique index.
    // Supabase upsert can't see COALESCE, so do delete+insert per row to stay simple and reliable.
    for (const row of rows) {
      await admin.from("marketing_assets")
        .delete()
        .eq("author_id", row.author_id)
        .eq("asset_type", row.asset_type)
        .or(book_id ? `book_id.eq.${book_id}` : "book_id.is.null");
      await admin.from("marketing_assets").insert(row);
    }

    // Notification → links to library deep-link
    if (author.user_id) {
      await admin.from("notifications").insert({
        user_id: author.user_id,
        title: `Marketing Pack ready: ${personalisedNodeName}`,
        message: `Your sales copy, 3 social posts, email announcement and ${spec.bonus_label} for "${bookTitle}" are in My Library.`,
        link: `/library?node=${spec.node_id}`,
      });
    }

    return json(200, { ok: true, node_id: spec.node_id, assets_created: rows.length });
  } catch (err: any) {
    console.error("generate-asset-pack error:", err?.message, err?.stack);
    return json(500, { error: err?.message || "Internal error" });
  }
});
