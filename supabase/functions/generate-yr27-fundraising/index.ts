import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAiGateway, corsHeaders, makeServiceClient, parseAiJson, errorMessage,
  buildAuthorContext, snapshotAuthorNode, upsertAuthorNode,
  failResponse, aiGatewayErrorMessage,
} from "../_shared/builder-helpers.ts";

import { getCanonicalNodeLabel } from "../_shared/canonical-node-labels.ts";
const NODE_ID = "YR-27";
const NODE_NAME = getCanonicalNodeLabel(NODE_ID);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  let priorNodeState: Record<string, unknown> | null = null;
  let parsedAuthorId: string | null = null;
  let parsedBookId: string | null = null;
  const supabase = makeServiceClient();
  try {
    const { author_id, book_id } = await req.json();
    if (!author_id) throw new Error("author_id is required");
    parsedAuthorId = author_id;
    parsedBookId = book_id ?? null;
    const { data: author } = await supabase.from("author_profiles").select("pen_name, genres, user_id").eq("id", author_id).single();
    if (!author) throw new Error("Author not found");
    priorNodeState = await snapshotAuthorNode(supabase, author_id, NODE_ID, book_id ?? null);
    const { ctx, bookTitle, coreThesis, book, contextBlocked } = await buildAuthorContext(supabase, author_id, author.user_id ?? null, book_id, NODE_ID);
    if (contextBlocked) {
      return failResponse("Please run the book analysis (BP-00) for this specific book before generating " + NODE_NAME + ". This prevents content from leaking between your books.");
    }
    if (!bookTitle) throw new Error("No book found. Please add a book first.");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");
    const aiRes = await fetchAiGateway({
      method: "POST", headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-5", messages: [
        { role: "system", content: "You are ABBY. Personalise everything. Respond with ONLY valid JSON (no markdown).\n\nHARD CONTENT RULES (output that violates these will fail QA):\n- NEVER use the emdash character (\u2014) or endash (\u2013). Use commas, periods, or \" - \" for ranges only.\n- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.\n- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.\n- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns)." },
        { role: "user", content: `Design a fundraising campaign for ${author.pen_name}'s book '${bookTitle}'. Core thesis: ${coreThesis}. Audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}.
Generate JSON: {"campaign_title","tagline","cause_alignment","campaign_goal_usd":25000,"campaign_duration_days":30,"donation_tiers":[4: Supporter($25)/Champion($100)/Patron($500)/Benefactor($2500), each with tier_name/amount_usd/benefit],"donor_communication_plan":[5 emails at days 0/7/14/28/31, each with day/type/subject/summary],"impact_statement","abby_summary"}` }
      ], max_completion_tokens: 16000 }),
    }, "generate-yr27-fundraising");
    if (!aiRes.ok) return failResponse(aiGatewayErrorMessage(aiRes.status, await aiRes.text()));
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");
    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready", current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.campaign_title,
      price_usd: 100, currency: "usd", delivery_type: "fundraising",
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
