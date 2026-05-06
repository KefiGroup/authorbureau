import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAiGateway, corsHeaders, makeServiceClient, parseAiJson, errorMessage,
  buildAuthorContext, snapshotAuthorNode, upsertAuthorNode,
  failResponse, aiGatewayErrorMessage,
} from "../_shared/builder-helpers.ts";

import { getCanonicalNodeLabel } from "../_shared/canonical-node-labels.ts";
const NODE_ID = "BP-07";
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

    const { data: author } = await supabase
      .from("author_profiles")
      .select("pen_name, genres, user_id")
      .eq("id", author_id).single();
    if (!author) throw new Error("Author not found");

    priorNodeState = await snapshotAuthorNode(supabase, author_id, NODE_ID, book_id ?? null);
    const { ctx, book, bookTitle, bookSubtitle, coreThesis, contextBlocked } =
      await buildAuthorContext(supabase, author_id, author.user_id ?? null, book_id, NODE_ID);
    if (contextBlocked) {
      return failResponse("Please run the book analysis (BP-00) for this specific book before generating " + NODE_NAME + ". This prevents content from leaking between your books.");
    }
    if (!bookTitle) throw new Error("No book found. Please add a book first.");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const aiRes = await fetchAiGateway({
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5",
        max_completion_tokens: 8192,
        messages: [
          { role: "system", content: "You are ABBY, the AI business agent for Authors Bureau. Always personalise everything. Always respond with valid JSON only — no markdown, no code fences.\n\nHARD CONTENT RULES (output that violates these will fail QA):\n- NEVER use the emdash character (\u2014) or endash (\u2013). Use commas, periods, or \" - \" for ranges only.\n- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.\n- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.\n- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns)." },
          { role: "user", content: `Create a self-paced home study course for ${author.pen_name}'s book '${bookTitle}'.

Author details:
- Author name: ${author.pen_name}
- Book title: ${bookTitle}
- Book subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
- Unique insights: ${JSON.stringify(ctx?.unique_insights ?? [])}
- Genre/Niche: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}

Generate as JSON with these exact keys:
{
  "programme_title": "Compelling home study programme title",
  "programme_subtitle": "One-line subtitle",
  "tagline": "Short punchy tagline",
  "duration": "e.g., 21 days",
  "format": "e.g., Daily reading + exercises, 15-30 min/day",
  "transformation_promise": "Core transformation",
  "study_weeks": [
    {
      "week": 1,
      "title": "Week title",
      "theme": "One-line theme",
      "days": [
        { "day": 1, "reading": "Chapter/section to read", "exercise": "Practical exercise", "reflection": "Reflection prompt", "action": "One concrete action item" }
      ]
    }
  ],
  "who_its_for": "2-3 sentences",
  "what_youll_get": ["Deliverable 1", "Deliverable 2", "Deliverable 3"],
  "suggested_price_usd": 47,
  "pricing_rationale": "One sentence",
  "sales_page": { "headline": "...", "subheadline": "...", "pain_point": "2-3 sentences", "solution_statement": "2-3 sentences", "cta_button_text": "Start Your Journey" },
  "abby_summary": "2-3 sentence summary"
}

study_weeks must have exactly 3 items (Week 1, Week 2, Week 3). Each week must have exactly 7 days. Make everything specific to this author's book content.` }
        ],
      }),
    }, "generate-bp07-home-study");

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
      personalised_name: content.programme_title,
      price_usd: Number(content.suggested_price_usd ?? 47),
      currency: "usd",
      delivery_type: "home_study",
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
