// @ts-nocheck — Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, makeServiceClient, fetchAiGateway, parseAiJson,
  errorMessage, failResponse, aiGatewayErrorMessage,
  buildAuthorContext, normaliseSlide,
} from "../_shared/builder-helpers.ts";

/**
 * Sprint 12 — generate-speaker-script
 * Companion document to a node's slide deck. Produces a structured
 * speaker_script object stored at content_json.speaker_script that
 * carries hook, talking points, transitions, facilitation prompts,
 * timing cues and closing anchors PER slide.
 *
 * Body: { author_id, book_id, node_id }
 *
 * IMPORTANT: NEVER mutate `status` or `current_step` here — that bug
 * forced authors to re-Activate Live nodes after Sprint 11 regen.
 */

const SLIDE_FIELDS = ["slides", "pitch_deck", "sponsor_deck"];

function pickSlides(content: any): { field: string; slides: any[] } | null {
  if (!content || typeof content !== "object") return null;
  for (const f of SLIDE_FIELDS) {
    if (Array.isArray(content[f]) && content[f].length > 0) {
      return { field: f, slides: content[f] };
    }
    // Also support nested e.g. workshop.slides
    for (const k of Object.keys(content)) {
      const v = (content as any)[k];
      if (v && typeof v === "object" && Array.isArray(v.slides) && v.slides.length > 0) {
        return { field: `${k}.slides`, slides: v.slides };
      }
    }
  }
  return null;
}

function defaultRuntimeMinutes(nodeId: string): number {
  switch (nodeId) {
    case "BP-05": return 60;     // webinar
    case "BA-10": return 90;     // course overview
    case "BA-13": return 60;     // group coaching pitch
    case "BA-16": return 30;     // affiliate pitch
    case "BA-18": return 30;     // JV pitch
    case "YR-22": return 240;    // half-day default
    case "YR-25": return 45;     // certification pitch
    case "YR-27": return 45;     // fundraising pitch
    case "YR-28": return 45;     // sponsor pitch
    default: return 60;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = makeServiceClient();
  try {
    const { author_id, book_id, node_id } = await req.json();
    if (!author_id) throw new Error("author_id required");
    if (!node_id) throw new Error("node_id required");

    const { data: author } = await supabase
      .from("author_profiles")
      .select("id, pen_name, user_id")
      .eq("id", author_id).single();
    if (!author) throw new Error("Author not found");

    // Load the node row (book-scoped if book_id given)
    let q = supabase
      .from("author_nodes")
      .select("id, book_id, content_json, personalised_name, node_name")
      .eq("author_id", author_id)
      .eq("node_id", node_id);
    if (book_id) q = q.eq("book_id", book_id);
    const { data: nodeRows } = await q.limit(1);
    const nodeRow = nodeRows?.[0];
    if (!nodeRow) return failResponse(`No ${node_id} content found. Generate the deck first.`);

    const picked = pickSlides(nodeRow.content_json);
    if (!picked) return failResponse(`No slide deck found in ${node_id}. Generate the deck first.`);

    const slides = picked.slides.map(normaliseSlide);

    const { ctx, bookTitle, coreThesis } = await buildAuthorContext(
      supabase, author_id, author.user_id ?? null, nodeRow.book_id ?? book_id ?? null, node_id,
    );

    const deckTitle = nodeRow.personalised_name || nodeRow.node_name || node_id;
    const targetMinutes = defaultRuntimeMinutes(node_id);

    const slidesPayload = slides.map((s: any, i: number) => ({
      slide_index: i + 1,
      title: s.title || "",
      headline: s.headline || "",
      bullets: Array.isArray(s.bullets) ? s.bullets : [],
      evidence: s.evidence || "",
    }));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return failResponse("AI service not configured");

    const sys = `You are ABBY writing a professional speaker script for ${author.pen_name}'s ${deckTitle}, based on the book "${bookTitle}".

HARD RULES:
- Output ONLY valid JSON. No markdown.
- Write in ${author.pen_name}'s first-person voice when natural ("I", "my").
- Each slide's narration MUST reference the same framework, story or stat that appears in the slide's evidence/bullets — never generic filler.
- NEVER use the emdash or endash character. Use commas, periods or " - " for ranges.
- NEVER include dollar amounts or pricing tier labels in the script body.
- timing_minutes per slide must sum to roughly ${targetMinutes}, distributed sensibly (cover/agenda/cta short, content modules longer).
- talking_points: 4-8 short narration sentences the speaker can read verbatim.
- facilitation_prompts: 1-3 questions to ask the room (only when relevant; an empty array is allowed for cover/divider/CTA slides).`;

    const user = `Author: ${author.pen_name}
Book: ${bookTitle}
Core thesis: ${coreThesis}
Frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
Audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
Deck: ${deckTitle}
Target total runtime (minutes): ${targetMinutes}

Slides to script (in order):
${JSON.stringify(slidesPayload, null, 2)}

Return JSON exactly in this shape:
{
  "deck_title": "${deckTitle}",
  "total_runtime_minutes": ${targetMinutes},
  "intro": "Opening hook for the whole session, 3-5 sentences.",
  "slides": [
    {
      "slide_index": 1,
      "title": "...",
      "timing_minutes": 4,
      "opening_hook": "Story or stat that opens this slide.",
      "talking_points": ["sentence 1", "sentence 2", "..."],
      "transition_in": "How to arrive at this slide from the previous one.",
      "transition_out": "Bridge into the next slide.",
      "facilitation_prompts": ["Ask the room: ..."],
      "closing_anchor": "The one line they must remember."
    }
  ],
  "outro": "Final CTA and thank-you, 3-5 sentences."
}`;

    const aiRes = await fetchAiGateway({
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5",
        response_format: { type: "json_object" },
        max_completion_tokens: 16000,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
    }, "generate-speaker-script");

    if (!aiRes.ok) return failResponse(aiGatewayErrorMessage(aiRes.status, await aiRes.text()));
    const aiData = await aiRes.json();
    const script = parseAiJson(aiData.choices?.[0]?.message?.content || "");

    if (!script || !Array.isArray(script.slides) || script.slides.length === 0) {
      return failResponse("Speaker script generation returned no slides. Please try again.");
    }

    // Merge into content_json WITHOUT touching status / current_step.
    const newContent = { ...(nodeRow.content_json || {}), speaker_script: script };
    const { error: updErr } = await supabase
      .from("author_nodes")
      .update({ content_json: newContent })
      .eq("id", nodeRow.id);
    if (updErr) throw updErr;

    return new Response(
      JSON.stringify({ success: true, script, slides_count: script.slides.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = errorMessage(err);
    console.error("generate-speaker-script error:", msg);
    return failResponse(msg);
  }
});
