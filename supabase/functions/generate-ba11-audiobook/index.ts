import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, makeServiceClient, parseAiJson, errorMessage, failResponse,
  verifyAuthUser, aiGatewayErrorMessage,
  buildAuthorContext, snapshotAuthorNode, upsertAuthorNode,
} from "../_shared/builder-helpers.ts";

const NODE_ID = "BA-11";
const NODE_NAME = "Audiobook";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let priorNodeState: Record<string, unknown> | null = null;
  let parsedAuthorId: string | null = null;
  let parsedBookId: string | null = null;
  const supabase = makeServiceClient();

  try {
    let body: any;
    try { body = await req.json(); }
    catch { return failResponse("Invalid request body"); }
    const { author_id, book_id } = body ?? {};
    if (!author_id) return failResponse("author_id is required");
    parsedAuthorId = author_id;
    parsedBookId = book_id ?? null;

    const { data: author } = await supabase
      .from("author_profiles")
      .select("pen_name, genres, user_id")
      .eq("id", author_id).single();
    if (!author) return failResponse("Author not found");

    const authCheck = await verifyAuthUser(supabase, author.user_id);
    if (!authCheck.ok) {
      return failResponse(
        "Your author account needs to be re-linked before Abby can save this. Please contact support.",
        { code: authCheck.code, author_profile_id: author_id, stale_user_id: author.user_id },
      );
    }

    priorNodeState = await snapshotAuthorNode(supabase, author_id, NODE_ID, book_id ?? null);
    const { ctx, book, bookTitle, bookSubtitle, coreThesis, contextBlocked } = await buildAuthorContext(supabase, author_id, author.user_id ?? null, book_id, NODE_ID);
    if (contextBlocked) {
      return failResponse("Please run the book analysis (BP-00) for this specific book before generating " + NODE_NAME + ". This prevents content from leaking between your books.");
    }
    if (!bookTitle) return failResponse("No book found. Please add a book first.");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return failResponse("AI service not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are ABBY, the AI business agent for Authors Bureau. Personalise everything to the author's specific book. Respond with ONLY valid JSON (no markdown, no code fences)." },
          { role: "user", content: `Create a complete audiobook production package for ${author.pen_name}'s book '${bookTitle}'.

Book context:
- Author: ${author.pen_name}
- Title: ${bookTitle}
- Subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis || "Use book description and context to infer."}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
- Unique insights: ${JSON.stringify(ctx?.unique_insights ?? [])}
- Genre: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}

Generate JSON: {"audiobook_title","narrator_style","estimated_duration_hours":6,"narrator_brief":"3-4 sentences","chapter_guides":[5 items with chapter_number/chapter_title/key_emphasis_points(2 items)/pacing_note/pronunciation_notes],"distribution_platforms":[3 items with platform/royalty_rate/timeline],"production_checklist":[5 items],"suggested_retail_price_usd":19.99,"abby_summary"}

Make everything specific to this book. No placeholders.` },
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
      personalised_name: content.audiobook_title,
      price_usd: Number(content.suggested_retail_price_usd ?? 19.99),
      currency: "usd",
      delivery_type: "audiobook",
    }, book?.id ?? book_id ?? null);

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    if (priorNodeState && parsedAuthorId) {
      try { await upsertAuthorNode(supabase, parsedAuthorId, NODE_ID, NODE_NAME, priorNodeState, parsedBookId); }
      catch (e) { console.error(`generate-${NODE_ID} restore error:`, errorMessage(e)); }
    }
    const message = errorMessage(err);
    console.error(`generate-${NODE_ID} error:`, message);
    return failResponse(message);
  }
});
