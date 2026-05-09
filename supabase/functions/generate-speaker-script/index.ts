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

/** Recommend a slide count when the author picks a runtime but no explicit count. */
function recommendSlideCount(targetMinutes: number): number {
  if (targetMinutes <= 30) return 6;
  if (targetMinutes <= 45) return 8;
  if (targetMinutes <= 60) return 10;
  if (targetMinutes <= 90) return 12;
  if (targetMinutes <= 180) return 14;
  if (targetMinutes <= 240) return 16;   // half-day
  if (targetMinutes <= 300) return 18;
  return 22;                              // full-day
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = makeServiceClient();
  try {
    const { author_id, book_id, node_id, target_minutes: targetMinutesArg, target_slide_count: targetSlideCountArg } = await req.json();
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

    let picked = pickSlides(nodeRow.content_json);
    if (!picked) return failResponse(`No slide deck found in ${node_id}. Generate the deck first.`);

    const deckTitle = nodeRow.personalised_name || nodeRow.node_name || node_id;
    const targetMinutes = Math.max(15, Math.min(720, Number(targetMinutesArg) || defaultRuntimeMinutes(node_id)));
    const targetSlideCount = Number(targetSlideCountArg) || recommendSlideCount(targetMinutes);

    // Resize the deck FIRST if the count drifts from the runtime by 2+ slides
    // (BP-09 has a locked count and is skipped server-side by resize-slide-deck).
    if (Math.abs(picked.slides.length - targetSlideCount) >= 2 && node_id !== "BP-09") {
      try {
        const resizeUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/resize-slide-deck`;
        const resizeRes = await fetch(resizeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            author_id, book_id: nodeRow.book_id ?? book_id ?? null, node_id,
            target_slide_count: targetSlideCount, target_minutes: targetMinutes,
          }),
        });
        if (resizeRes.ok) {
          // Re-fetch the node to pick up the new slides.
          let q2 = supabase
            .from("author_nodes")
            .select("id, book_id, content_json, personalised_name, node_name")
            .eq("author_id", author_id).eq("node_id", node_id);
          if (book_id) q2 = q2.eq("book_id", book_id);
          const { data: rows2 } = await q2.limit(1);
          if (rows2?.[0]) {
            (nodeRow as any).content_json = rows2[0].content_json;
            const repicked = pickSlides(rows2[0].content_json);
            if (repicked) picked = repicked;
          }
        } else {
          console.warn("resize-slide-deck failed, scripting against existing deck:", await resizeRes.text());
        }
      } catch (e) {
        console.warn("resize-slide-deck threw, scripting against existing deck:", e);
      }
    }

    const slides = picked.slides.map(normaliseSlide);

    const { ctx, bookTitle, coreThesis } = await buildAuthorContext(
      supabase, author_id, author.user_id ?? null, nodeRow.book_id ?? book_id ?? null, node_id,
    );
    const requireExercises = targetMinutes >= 90;
    const wordTarget = Math.round(targetMinutes * 130); // ~130 wpm spoken
    const tokenBudget = targetMinutes >= 240 ? 24000 : 16000;

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
- timing_minutes per slide must sum to roughly ${targetMinutes}, distributed sensibly (cover/agenda/CTA short, content modules long).
- facilitation_prompts: 1-3 questions to ask the room (only when relevant; an empty array is allowed for cover/divider/CTA slides).

CONTENT DEPTH (CRITICAL — match runtime):
- Target session length: ${targetMinutes} minutes.
- At ~130 words-per-minute spoken pace plus exercise/debrief overhead, the FULL script (talking_points + exercise text combined across ALL slides) MUST contain roughly ${wordTarget} words. Distribute realistically.
- For COVER / AGENDA / CTA / divider slides: keep talking_points to 3-5 sentences.
- For CONTENT / MODULE slides: write 8-14 substantive talking-point sentences, AND include 1-2 book_callbacks (named framework, story or stat from the book — never generic).
${requireExercises ? `- Every CONTENT/MODULE slide MUST include an "exercise" block: { instructions, time_minutes, debrief_questions: [3-5 questions] }. Cover/agenda/CTA slides may omit exercise (use null).
- Insert a "break_cue" string on slides that fall on a ~60-minute boundary (e.g. "BREAK · 15 min · Resume at hh:mm"). At least ${Math.floor(targetMinutes / 90)} break cues total.` : `- Exercises and break cues are NOT required for sessions under 90 minutes.`}
`;

    const user = `Author: ${author.pen_name}
Book: ${bookTitle}
Core thesis: ${coreThesis}
Frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
Audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
Deck: ${deckTitle}
Target total runtime (minutes): ${targetMinutes}
Target slide count guidance: ${targetSlideCount} (existing deck has ${slides.length} — script the existing slides; if the deck is much shorter than the runtime needs, expand each content slide with deeper talking points and exercises rather than inventing new slides).

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
      "book_callbacks": ["Named framework or story from the book"],
      "transition_in": "How to arrive at this slide from the previous one.",
      "transition_out": "Bridge into the next slide.",
      "facilitation_prompts": ["Ask the room: ..."],
      ${requireExercises ? `"exercise": { "instructions": "What participants do, step by step.", "time_minutes": 12, "debrief_questions": ["q1", "q2", "q3"] },
      "break_cue": null,
      ` : ``}"closing_anchor": "The one line they must remember."
    }
  ],
  "outro": "Final CTA and thank-you, 3-5 sentences."
}`;

    // For long runtimes (>=120 min) chunk the slides and run two parallel calls
    // to stay under the 150s edge idle timeout.
    const chunkIt = targetMinutes >= 120 && slidesPayload.length >= 4;
    const half = Math.ceil(slidesPayload.length / 2);
    const chunks = chunkIt ? [slidesPayload.slice(0, half), slidesPayload.slice(half)] : [slidesPayload];

    async function runChunk(slidesChunk: any[], chunkIndex: number, totalChunks: number) {
      const isFirst = chunkIndex === 0;
      const isLast = chunkIndex === totalChunks - 1;
      const chunkMin = Math.round(targetMinutes * (slidesChunk.length / slidesPayload.length));
      const chunkWordTarget = Math.round(chunkMin * 130);
      const chunkUser = `${user}

CHUNK INFO: You are scripting slides ${slidesChunk[0].slide_index}-${slidesChunk[slidesChunk.length-1].slide_index} of ${slidesPayload.length}.
This chunk represents ~${chunkMin} minutes of the session and should contain roughly ${chunkWordTarget} words of content.
${isFirst ? `Include the "intro" field in your response.` : `Set "intro" to "" (empty string) — only the first chunk has an intro.`}
${isLast ? `Include the "outro" field in your response.` : `Set "outro" to "" (empty string) — only the last chunk has an outro.`}
Return ONLY these slides in the "slides" array.`;

      const res = await fetchAiGateway({
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai/gpt-5-mini",
          response_format: { type: "json_object" },
          max_completion_tokens: 16000,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: chunkUser },
          ],
        }),
      }, `generate-speaker-script-chunk-${chunkIndex}`);
      if (!res.ok) throw new Error(aiGatewayErrorMessage(res.status, await res.text()));
      const data = await res.json();
      return parseAiJson(data.choices?.[0]?.message?.content || "");
    }

    let script: any;
    if (chunkIt) {
      const [a, b] = await Promise.all(chunks.map((c, i) => runChunk(c, i, chunks.length)));
      if (!a?.slides?.length || !b?.slides?.length) {
        return failResponse("Speaker script generation returned an incomplete response. Please try again.");
      }
      script = {
        deck_title: a.deck_title || deckTitle,
        total_runtime_minutes: targetMinutes,
        intro: a.intro || "",
        slides: [...a.slides, ...b.slides],
        outro: b.outro || "",
      };
    } else {
      script = await runChunk(chunks[0], 0, 1);
      if (!script || !Array.isArray(script.slides) || script.slides.length === 0) {
        return failResponse("Speaker script generation returned no slides. Please try again.");
      }
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
