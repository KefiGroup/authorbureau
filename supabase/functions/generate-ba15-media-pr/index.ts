import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, makeServiceClient, parseAiJson, errorMessage, failResponse,
  verifyAuthUser, aiGatewayErrorMessage,
  buildAuthorContext, snapshotAuthorNode, upsertAuthorNode,
} from "../_shared/builder-helpers.ts";

const NODE_ID = "BA-15";
const NODE_NAME = "Media & PR";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let priorNodeState: Record<string, unknown> | null = null;
  let parsedAuthorId: string | null = null;
  const supabase = makeServiceClient();

  try {
    let body: any;
    try { body = await req.json(); }
    catch { return failResponse("Invalid request body"); }
    const { author_id, book_id } = body ?? {};
    if (!author_id) return failResponse("author_id is required");
    parsedAuthorId = author_id;

    const { data: author } = await supabase
      .from("author_profiles").select("pen_name, genres, user_id").eq("id", author_id).single();
    if (!author) return failResponse("Author not found");

    const authCheck = await verifyAuthUser(supabase, author.user_id);
    if (!authCheck.ok) {
      return failResponse(
        "Your author account needs to be re-linked before Abby can save this. Please contact support.",
        { code: authCheck.code, author_profile_id: author_id, stale_user_id: author.user_id },
      );
    }

    priorNodeState = await snapshotAuthorNode(supabase, author_id, NODE_ID);
    const { ctx, book, bookTitle, bookSubtitle, coreThesis } =
      await buildAuthorContext(supabase, author_id, author.user_id ?? null, book_id);
    if (!bookTitle) return failResponse("No book found. Please add a book first.");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return failResponse("AI service not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are ABBY for Authors Bureau. Personalise everything to the author's book. Respond with ONLY valid JSON (no markdown, no code fences). All listed fields must be PLAIN STRINGS unless explicitly an object/array." },
          { role: "user", content: `Create a complete media kit and PR strategy for ${author.pen_name}'s book '${bookTitle}'.

Book context:
- Author: ${author.pen_name}
- Title: ${bookTitle}
- Subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis || "Use book description and context to infer."}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
- Genre: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}

Return JSON in this EXACT shape (note: press_release and pitch_template are STRINGS, not objects):
{
  "media_kit_title": "string",
  "speaker_headline": "string (one-line credentials)",
  "media_kit_content": "string (3-5 sentences: bio, expertise, signature topics)",
  "press_release": "string (full press release: headline + 3-4 paragraphs + boilerplate, plain text with newlines)",
  "pitch_template": "string (full media pitch email: subject line + opening + hook + credentials + CTA, plain text with newlines)",
  "target_media_outlets": [
    { "outlet": "string", "type": "string", "audience": "string", "pitch_angle": "string" }
  ],
  "talking_points": ["5 specific talking points"],
  "abby_summary": "string"
}

5 outlets. press_release and pitch_template MUST be strings. No placeholders.` },
        ],
      }),
    });
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error(`generate-${NODE_ID} ai-gateway error:`, aiRes.status, errText.slice(0, 500));
      return failResponse(aiGatewayErrorMessage(aiRes.status, errText));
    }
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");

    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready",
      current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.speaker_headline,
      currency: "usd",
      delivery_type: "media_pr",
    });

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    if (priorNodeState && parsedAuthorId) {
      try { await upsertAuthorNode(supabase, parsedAuthorId, NODE_ID, NODE_NAME, priorNodeState); }
      catch (e) { console.error(`generate-${NODE_ID} restore error:`, errorMessage(e)); }
    }
    const message = errorMessage(err);
    console.error(`generate-${NODE_ID} error:`, message);
    return failResponse(message);
  }
});
