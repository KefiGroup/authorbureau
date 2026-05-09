// @ts-nocheck — Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, makeServiceClient, fetchAiGateway, parseAiJson,
  errorMessage, failResponse, aiGatewayErrorMessage,
  buildAuthorContext, normaliseSlide,
} from "../_shared/builder-helpers.ts";

/**
 * resize-slide-deck
 * Generic AI-driven slide-deck reshaper. Takes whatever slide array a node
 * already has (slides | pitch_deck | sponsor_deck | <key>.slides) and
 * expands or contracts it to roughly target_slide_count, preserving
 * cover/agenda/CTA slides and the original schema fields.
 *
 * Body: { author_id, book_id, node_id, target_slide_count, target_minutes }
 *
 * - No-op (and returns existing slides) when |current - target| < 2.
 * - No-op for BP-09 (deck count is locked by spec).
 * - Persists deck_runtime_minutes + deck_target_slide_count alongside the
 *   resized array so AssetRow can show "N slides · M min".
 *
 * Called from generate-speaker-script BEFORE the script is drafted, but is
 * also safe to call directly.
 */

const SLIDE_FIELDS = ["slides", "pitch_deck", "sponsor_deck"];

function pickSlides(content: any): { field: string; slides: any[] } | null {
  if (!content || typeof content !== "object") return null;
  for (const f of SLIDE_FIELDS) {
    if (Array.isArray(content[f]) && content[f].length > 0) {
      return { field: f, slides: content[f] };
    }
  }
  for (const k of Object.keys(content)) {
    const v = (content as any)[k];
    if (v && typeof v === "object" && Array.isArray(v.slides) && v.slides.length > 0) {
      return { field: `${k}.slides`, slides: v.slides };
    }
  }
  return null;
}

function setNested(obj: any, dotted: string, value: any) {
  const parts = dotted.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = cur[parts[i]] ?? {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = makeServiceClient();
  try {
    const {
      author_id, book_id, node_id,
      target_slide_count: targetSlideCountArg,
      target_minutes: targetMinutesArg,
    } = await req.json();

    if (!author_id) throw new Error("author_id required");
    if (!node_id) throw new Error("node_id required");
    const targetSlideCount = Math.max(4, Math.min(40, Number(targetSlideCountArg) || 0));
    const targetMinutes = Math.max(15, Math.min(720, Number(targetMinutesArg) || 0));
    if (!targetSlideCount) throw new Error("target_slide_count required");

    const { data: author } = await supabase
      .from("author_profiles")
      .select("id, pen_name, user_id")
      .eq("id", author_id).single();
    if (!author) throw new Error("Author not found");

    let q = supabase
      .from("author_nodes")
      .select("id, book_id, content_json, personalised_name, node_name")
      .eq("author_id", author_id).eq("node_id", node_id);
    if (book_id) q = q.eq("book_id", book_id);
    const { data: rows } = await q.limit(1);
    const nodeRow = rows?.[0];
    if (!nodeRow) return failResponse(`No ${node_id} content found. Generate the deck first.`);

    const picked = pickSlides(nodeRow.content_json);
    if (!picked) return failResponse(`No slide deck found in ${node_id}.`);

    const current = picked.slides.length;
    const delta = Math.abs(current - targetSlideCount);

    // BP-09 has hard-locked deck counts (workshop=14, corporate=10) per spec.
    if (node_id === "BP-09") {
      console.log("resize-slide-deck: BP-09 deck count is locked, skipping");
      return new Response(JSON.stringify({
        success: true, skipped: "bp09_deck_locked",
        slides: picked.slides, slides_count: current, field: picked.field,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (delta < 2) {
      return new Response(JSON.stringify({
        success: true, skipped: "within_tolerance",
        slides: picked.slides, slides_count: current, field: picked.field,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { ctx, bookTitle, coreThesis } = await buildAuthorContext(
      supabase, author_id, author.user_id ?? null, nodeRow.book_id ?? book_id ?? null, node_id,
    );

    const deckTitle = nodeRow.personalised_name || nodeRow.node_name || node_id;
    const direction = current < targetSlideCount ? "EXPAND" : "CONTRACT";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return failResponse("AI service not configured");

    // Detect schema fields used by the existing deck so we preserve them.
    const sample = picked.slides[0] || {};
    const schemaFields = Object.keys(sample).filter(k =>
      ["title", "headline", "body", "bullets", "notes", "speaker_notes", "evidence", "layout_hint", "stat", "tiers"].includes(k),
    );

    const sys = `You are ABBY reshaping a slide deck for ${author.pen_name}'s "${deckTitle}" (book: "${bookTitle}").

GOAL: ${direction} the deck from ${current} slides to exactly ${targetSlideCount} slides so it matches a ${targetMinutes}-minute session.

HARD RULES:
- Output ONLY valid JSON. No markdown.
- PRESERVE the cover/title slide (slide 1) and the final CTA slide verbatim.
- PRESERVE any agenda slide near the start verbatim.
- ${direction === "EXPAND"
        ? `When expanding: split each content/module slide into deeper sub-topics drawn from the book's frameworks. Each new slide must reference a real framework name, story, stat or stage from the book — never generic filler. Keep schema identical to the input slides.`
        : `When contracting: merge adjacent module slides, keeping the strongest framework callbacks and most concrete evidence. Drop redundancy, never drop content slides that introduce a new framework stage.`}
- Keep the SAME schema as the input slides. Each slide must include these fields when present in the input: ${JSON.stringify(schemaFields)}.
- NEVER use the emdash or endash. Use commas, periods or " - " for ranges.
- NEVER include dollar amounts in slide bodies (pricing belongs on the offer/CTA slide only).
- Output exactly ${targetSlideCount} slides in order.`;

    const user = `Author: ${author.pen_name}
Book: ${bookTitle}
Core thesis: ${coreThesis}
Frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
Audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
Deck: ${deckTitle}
Target slide count: ${targetSlideCount}
Target session length: ${targetMinutes} minutes

Existing slides (in order):
${JSON.stringify(picked.slides, null, 2)}

Return JSON in this exact shape:
{
  "slides": [ /* exactly ${targetSlideCount} slides, same schema as input */ ]
}`;

    const res = await fetchAiGateway({
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        response_format: { type: "json_object" },
        max_completion_tokens: 16000,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
    }, "resize-slide-deck");
    if (!res.ok) throw new Error(aiGatewayErrorMessage(res.status, await res.text()));
    const data = await res.json();
    const parsed = parseAiJson(data.choices?.[0]?.message?.content || "");
    const newSlides = Array.isArray(parsed?.slides) ? parsed.slides.map(normaliseSlide) : null;
    if (!newSlides || newSlides.length === 0) {
      return failResponse("Resize returned no slides. Please try again.");
    }

    // Persist back into content_json at the same field path. Also store
    // runtime metadata so the UI can show "N slides · M min".
    const nextContent = { ...(nodeRow.content_json || {}) };
    setNested(nextContent, picked.field, newSlides);
    nextContent.deck_runtime_minutes = targetMinutes;
    nextContent.deck_target_slide_count = targetSlideCount;
    // Invalidate any previously-generated speaker_script so it gets rebuilt
    // against the new deck. The caller (generate-speaker-script) will
    // immediately regenerate it; direct callers will trigger regeneration on
    // the next download.
    if (nextContent.speaker_script) delete nextContent.speaker_script;

    const { error: updErr } = await supabase
      .from("author_nodes")
      .update({ content_json: nextContent })
      .eq("id", nodeRow.id);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({
      success: true,
      slides: newSlides,
      slides_count: newSlides.length,
      field: picked.field,
      previous_count: current,
      direction,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = errorMessage(err);
    console.error("resize-slide-deck error:", msg);
    return failResponse(msg);
  }
});
