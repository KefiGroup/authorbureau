import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, makeServiceClient, parseAiJson, errorMessage, failResponse,
  verifyAuthUser, aiGatewayErrorMessage,
  buildAuthorContext, snapshotAuthorNode, upsertAuthorNode,
} from "../_shared/builder-helpers.ts";

const NODE_ID = "BA-12";
const NODE_NAME = "Membership";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let priorNodeState: Record<string, unknown> | null = null;
  let parsedAuthorId: string | null = null;
  const supabase = makeServiceClient();

  try {
    let body: any;
    try { body = await req.json(); }
    catch { return failResponse("Invalid request body"); }
    const { author_id } = body ?? {};
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
    const { ctx, book, bookTitle, coreThesis } =
      await buildAuthorContext(supabase, author_id, author.user_id ?? null);
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
          { role: "system", content: "You are ABBY for Authors Bureau. Design a 3-tier monthly membership community personalised to the author's book. Respond with ONLY valid JSON (no markdown, no code fences)." },
          { role: "user", content: `Design a 3-tier monthly membership for ${author.pen_name}'s book '${bookTitle}'.

Book context:
- Author: ${author.pen_name}
- Title: ${bookTitle}
- Core thesis: ${coreThesis || "Use book description and context to infer."}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
- Genre: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}

Return JSON in this EXACT shape (field names matter):
{
  "membership_title": "string (memorable, branded)",
  "tagline": "string",
  "who_its_for": "string",
  "transformation_promise": "string",
  "tiers": [
    { "name": "Insider",   "price": 17,  "description": "string", "benefits": ["3-4 specific benefits"] },
    { "name": "Member",    "price": 47,  "description": "string", "benefits": ["4-5 specific benefits"] },
    { "name": "VIP",       "price": 97,  "description": "string", "benefits": ["5-6 specific benefits"] }
  ],
  "content_calendar": "string (3-5 sentences describing what members get monthly: live calls, Q&As, workshops, content drops)",
  "welcome_emails": [
    { "day": 0, "subject": "string", "body": "4-6 sentences signed by ${author.pen_name}" },
    { "day": 2, "subject": "string", "body": "string" },
    { "day": 5, "subject": "string", "body": "string" }
  ],
  "abby_summary": "string"
}

3 tiers exactly. Prices ascending. No generic placeholders.` },
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
    const tiers = Array.isArray(content.tiers) ? content.tiers : [];
    const entryPrice = Number(tiers[0]?.price ?? content.monthly_price_usd ?? 27);

    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready",
      current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.membership_title || content.membership_name,
      price_usd: entryPrice,
      currency: "usd",
      delivery_type: "membership",
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
