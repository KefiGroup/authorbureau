import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, makeServiceClient, parseAiJson, errorMessage,
  buildAuthorContext, snapshotAuthorNode, upsertAuthorNode,
  failResponse, aiGatewayErrorMessage,
} from "../_shared/builder-helpers.ts";

const NODE_ID = "YR-23";
const NODE_NAME = "Mastermind";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  let priorNodeState: Record<string, unknown> | null = null;
  let parsedAuthorId: string | null = null;
  const supabase = makeServiceClient();
  try {
    const { author_id } = await req.json();
    if (!author_id) throw new Error("author_id is required");
    parsedAuthorId = author_id;
    const { data: author } = await supabase.from("author_profiles").select("pen_name, genres, user_id").eq("id", author_id).single();
    if (!author) throw new Error("Author not found");
    priorNodeState = await snapshotAuthorNode(supabase, author_id, NODE_ID);
    const { ctx, bookTitle, coreThesis } = await buildAuthorContext(supabase, author_id, author.user_id ?? null);
    if (!bookTitle) throw new Error("No book found. Please add a book first.");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST", headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-5", messages: [
        { role: "system", content: "You are ABBY. Personalise everything. Respond with ONLY valid JSON (no markdown)." },
        { role: "user", content: `Design an exclusive mastermind programme for ${author.pen_name}'s book '${bookTitle}'. Core thesis: ${coreThesis}. Audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}. Frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}.
Generate JSON: {"mastermind_title","tagline","programme_promise","membership_tiers":[2 items: Inner Circle($5000/yr, 12 members) and Elite Circle($15000/yr, 6 members), each with tier_name/price_annual_usd/group_size/meeting_cadence/benefits[4-5]],"curriculum_pillars":[4],"application_questions":[5],"sales_page":{"headline","subheadline","who_its_for","what_youll_get":[4],"cta_button_text"},"abby_summary"}` }
      ], temperature: 0.3, max_completion_tokens: 16000 }),
    });
    if (!aiRes.ok) return failResponse(aiGatewayErrorMessage(aiRes.status, await aiRes.text()));
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");
    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready", current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.mastermind_title,
      price_usd: Number(content.membership_tiers?.[0]?.price_annual_usd ?? 5000),
      currency: "usd", delivery_type: "mastermind",
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
