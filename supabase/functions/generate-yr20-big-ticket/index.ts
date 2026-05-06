import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAiGateway, corsHeaders, makeServiceClient, parseAiJson, errorMessage,
  buildAuthorContext, snapshotAuthorNode, upsertAuthorNode,
  failResponse, aiGatewayErrorMessage,
} from "../_shared/builder-helpers.ts";
import { getCanonicalNodeLabel } from "../_shared/canonical-node-labels.ts";

const NODE_ID = "YR-20";
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
    const { ctx, book, bookTitle, coreThesis, contextBlocked } = await buildAuthorContext(supabase, author_id, author.user_id ?? null, book_id, NODE_ID);
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
        { role: "user", content: `Design 3 premium big-ticket transformation packages for ${author.pen_name}'s book '${bookTitle}'. Core thesis: ${coreThesis}. Audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}. Frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}.
Generate JSON: {"offers":[3 items at $5000/$12000/$25000 each with offer_name/price_usd/duration/format/transformation_promise/what_included[5-7]/ideal_client/urgency_element],"sales_conversation_guide":{"opening","discovery_questions":[3],"presenting_the_offer","handling_objections":["Objection + response","Objection + response"]},"abby_summary"}` }
      ], max_completion_tokens: 16000 }),
    }, "generate-yr20-big-ticket");
    if (!aiRes.ok) return failResponse(aiGatewayErrorMessage(aiRes.status, await aiRes.text()));
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");
    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready", current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.offers?.[0]?.offer_name,
      price_usd: Number(content.offers?.[1]?.price_usd ?? 12000),
      currency: "usd", delivery_type: "high_ticket",
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
