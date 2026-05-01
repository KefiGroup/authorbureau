import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, makeServiceClient, parseAiJson, errorMessage,
  buildAuthorContext, snapshotAuthorNode, upsertAuthorNode,
  failResponse, aiGatewayErrorMessage,
} from "../_shared/builder-helpers.ts";

const NODE_ID = "BP-06";
const NODE_NAME = "Workbook";

// Mirror of src/lib/workbook-pdf.ts normalizeOutcome — keeps copy clean even if the model slips.
function normalizeOutcome(raw?: string): string {
  if (!raw) return "";
  let s = String(raw).trim();
  for (let pass = 0; pass < 2; pass++) {
    s = s.replace(
      /^(you['\u2019]?ll|you will|you can|you['\u2019]?ll be able to|you['\u2019]?re going to|you are going to|readers? (will|can)|the readers? (will|can)|by the end[^,]*,\s*(you|readers?) (will|can))\s+/i,
      "",
    );
  }
  s = s.replace(/^be able to\s+/i, "");
  if (s.length > 1 && /^[A-Z][a-z]/.test(s)) s = s[0].toLowerCase() + s.slice(1);
  return s;
}

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

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5",
        max_completion_tokens: 12000,
        messages: [
          { role: "system", content: "You are ABBY, the AI business agent for Authors Bureau. You help authors turn their books into complete business empires. You are warm, expert, and encouraging. Always personalise everything. Always respond with valid JSON only — no markdown, no code fences.\n\nHARD CONTENT RULES (output that violates these will fail QA):\n- NEVER use the emdash character (\u2014) or endash (\u2013). Use commas, periods, or \" - \" for ranges only.\n- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.\n- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.\n- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns)." },
          { role: "user", content: `Create a companion workbook for ${author.pen_name}'s book '${bookTitle}'.

Author details:
- Author name: ${author.pen_name}
- Book title: ${bookTitle}
- Book subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
- Unique insights: ${JSON.stringify(ctx?.unique_insights ?? [])}
- Genre/Niche: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}

Generate the following as a JSON object with these EXACT keys and EXACT shapes:
{
  "workbook_title": "Compelling workbook title (e.g., 'The [Book Title] Workbook')",
  "workbook_subtitle": "One-line subtitle",
  "tagline": "Punchy tagline — MAX 8 WORDS, no period",
  "page_count": "e.g., 45 pages",
  "format": "8.5 × 11\\" PDF + Word — Amazon KDP-ready (do not change this value)",
  "transformation_promise": "ONE sentence, second person ('you'), present-tense action verb, MAX 30 words.",
  "sections": [
    {
      "number": 1,
      "title": "Section title",
      "description": "2-3 sentences describing what this section covers",
      "exercises": ["Exercise 1", "Exercise 2", "Exercise 3"],
      "outcome": "VERB PHRASE only. Must NOT start with 'You', 'Readers', 'By the end', 'will', 'can', or 'be able to'. Start with a lowercase action verb."
    }
  ],
  "who_its_for": "Start with 'For…'. MAX 60 words.",
  "what_youll_get": [
    {
      "name": "Exact deliverable name",
      "type": "canvas | planner | tracker | playbook | story | vision | worksheet",
      "purpose": "ONE sentence: what the reader uses it for",
      "linked_section": 1
    }
  ],
  "pricing_recommendation": "free" | "paid",
  "suggested_price_usd": 0,
  "free_rationale": "Why FREE works: 2-3 sentences.",
  "paid_rationale": "Why PAID works: 2-3 sentences referencing market price bands.",
  "pricing_rationale": "Short single-sentence summary of the recommended path",
  "sales_page": {
    "headline": "Sales page headline",
    "subheadline": "Supporting subheadline",
    "pain_point": "2-3 sentences",
    "solution_statement": "2-3 sentences",
    "cta_button_text": "e.g., Download Free Workbook"
  },
  "abby_summary": "2-3 sentence summary from ABBY"
}

CRITICAL STRUCTURE RULES:
- "sections" array MUST have EXACTLY 5 items, mapped to the book's chapters/themes.
- "what_youll_get" array MUST have EXACTLY 4 items. Each item MUST be an OBJECT with name/type/purpose/linked_section.
- "linked_section" must be a section number (1-5).
- Re-check every "outcome" before returning.

PRICING GUIDANCE — Recommend whichever path serves THIS author best, but ALWAYS provide both rationales.
Make everything specific to this author's book.` }
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

    if (Array.isArray(content.sections)) {
      content.sections = content.sections.map((s: Record<string, unknown>) => ({
        ...s,
        outcome: normalizeOutcome(s.outcome as string | undefined),
      }));
    }

    content.abby_recommendation = content.pricing_recommendation === "paid" ? "paid" : "free";
    content.abby_recommended_price_usd = Number(content.suggested_price_usd) || 0;

    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready",
      current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.workbook_title,
      price_usd: Number(content.suggested_price_usd ?? 0),
      currency: "usd",
      delivery_type: "workbook",
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
