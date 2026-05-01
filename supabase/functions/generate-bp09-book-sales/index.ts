import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, makeServiceClient, parseAiJson, errorMessage,
  buildAuthorContext, snapshotAuthorNode, upsertAuthorNode,
  failResponse, aiGatewayErrorMessage,
} from "../_shared/builder-helpers.ts";
import { getCanonicalNodeLabel } from "../_shared/canonical-node-labels.ts";

const NODE_ID = "BP-09";
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
      .select("pen_name, genres, bio_short, bio_long, user_id")
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
        model: "openai/gpt-5.2",
        max_completion_tokens: 12000,
        messages: [
          { role: "system", content: "You are ABBY, the AI business agent for Authors Bureau. You build live-audience conversion toolkits — sales pitches, slide decks, scripts — that help authors sell books and book speaking gigs at workshops, signings, and corporate lunches. Always personalise to the author's book, framework, and audience. Always respond with valid JSON only — no markdown, no code fences.\n\nHARD CONTENT RULES (output that violates these will fail QA):\n- NEVER use the emdash character (\u2014) or endash (\u2013). Use commas, periods, or \" - \" for ranges only.\n- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.\n- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.\n- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns)." },
          { role: "user", content: `Build a Live Audience Conversion Toolkit for ${author.pen_name}'s book "${bookTitle}".

Author details:
- Pen name: ${author.pen_name}
- Bio: ${author.bio_short || author.bio_long || "N/A"}
- Book title: ${bookTitle}
- Book subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
- Unique insights: ${JSON.stringify(ctx?.unique_insights ?? [])}
- Genre/Niche: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}

Generate a JSON object with EXACTLY these keys (no extras, no markdown):

{
  "kit_title": "${bookTitle} — ${NODE_NAME} kit",
  "tagline": "Punchy one-liner positioning the toolkit",
  "abby_summary": "2-3 sentences explaining what's inside and how to use it",

  "shared_assets": {
    "bio_30s": "30-second host introduction (about 75 words)",
    "bio_60s": "60-second host introduction (about 150 words)",
    "bio_2min": "2-minute host introduction (about 300 words)",
    "elevator_pitch": "3-line elevator pitch for impromptu networking",
    "objection_responses": [
      { "objection": "I'll just buy it on Amazon later", "response": "..." },
      { "objection": "I don't read much", "response": "..." },
      { "objection": "Too expensive", "response": "..." },
      { "objection": "I'll think about it", "response": "..." },
      { "objection": "Can you sign it for my friend instead?", "response": "..." }
    ]
  },

  "workshop": {
    "talk_outline": [
      { "section": "Hook", "duration_min": 5, "content": "What to say/do", "speaker_notes": "Delivery tips" },
      { "section": "Story", "duration_min": 10, "content": "...", "speaker_notes": "..." },
      { "section": "Framework Teach", "duration_min": 25, "content": "...", "speaker_notes": "..." },
      { "section": "Live Exercise", "duration_min": 15, "content": "...", "speaker_notes": "..." },
      { "section": "Offer & Close", "duration_min": 5, "content": "...", "speaker_notes": "..." }
    ],
    "pitch_script": "Word-for-word 3-minute transition script that bridges teaching to book sale. Keep it personal, value-first, no hard sell.",
    "slides": [
      { "n": 1, "title": "Title slide", "body": "${bookTitle} by ${author.pen_name}", "speaker_notes": "Welcome the room. Thank the host." },
      { "n": 2, "title": "Pain point 1", "body": "...", "speaker_notes": "..." },
      { "n": 3, "title": "Pain point 2", "body": "...", "speaker_notes": "..." },
      { "n": 4, "title": "Pain point 3", "body": "...", "speaker_notes": "..." },
      { "n": 5, "title": "Framework introduction", "body": "...", "speaker_notes": "..." },
      { "n": 6, "title": "Framework pillar 1", "body": "...", "speaker_notes": "..." },
      { "n": 7, "title": "Framework pillar 2", "body": "...", "speaker_notes": "..." },
      { "n": 8, "title": "Framework pillar 3", "body": "...", "speaker_notes": "..." },
      { "n": 9, "title": "Case study 1", "body": "...", "speaker_notes": "..." },
      { "n": 10, "title": "Case study 2", "body": "...", "speaker_notes": "..." },
      { "n": 11, "title": "Live exercise", "body": "...", "speaker_notes": "..." },
      { "n": 12, "title": "Offer slide", "body": "Get the book — back of room", "speaker_notes": "..." },
      { "n": 13, "title": "QR code slide", "body": "Scan to grab your copy + bonus", "speaker_notes": "..." },
      { "n": 14, "title": "Thank you", "body": "Connect with me", "speaker_notes": "..." }
    ],
    "back_of_room_close": "Word-for-word 90-second script for what to say standing at the table after the talk",
    "handout_outline": "One-page handout text — title, 5 key takeaways, framework summary, where to learn more"
  },

  "book_signing": {
    "reading_passages": [
      { "chapter": "Chapter X", "why": "Why this passage hooks listeners", "bridge_to_next": "How to bridge to the next reading or Q&A" },
      { "chapter": "Chapter Y", "why": "...", "bridge_to_next": "..." },
      { "chapter": "Chapter Z", "why": "...", "bridge_to_next": "..." }
    ],
    "qa_seed_questions": [
      { "q": "Pre-planted question 1", "a": "Polished 60-90 second answer" },
      { "q": "Pre-planted question 2", "a": "..." },
      { "q": "Pre-planted question 3", "a": "..." },
      { "q": "Pre-planted question 4", "a": "..." },
      { "q": "Pre-planted question 5", "a": "..." },
      { "q": "Pre-planted question 6", "a": "..." },
      { "q": "Pre-planted question 7", "a": "..." },
      { "q": "Pre-planted question 8", "a": "..." }
    ],
    "signing_table_script": "30-second per-person script: greet, capture name, ask one question, sign with personalised inscription",
    "inscription_templates": [
      { "for": "the dreamer", "text": "Personalised inscription for someone with big aspirations" },
      { "for": "the rebuilder", "text": "..." },
      { "for": "the leader", "text": "..." },
      { "for": "the seeker", "text": "..." },
      { "for": "the gift-buyer", "text": "..." }
    ],
    "email_capture_ask": "Exact words to use to capture email at the table, plus what they get in return"
  },

  "corporate_lunch": {
    "slides": [
      { "n": 1, "title": "Title slide", "body": "${bookTitle} — for [Company]", "speaker_notes": "..." },
      { "n": 2, "title": "Why this matters to your business", "body": "...", "speaker_notes": "..." },
      { "n": 3, "title": "The cost of not addressing this", "body": "...", "speaker_notes": "..." },
      { "n": 4, "title": "Framework overview", "body": "...", "speaker_notes": "..." },
      { "n": 5, "title": "Application: Productivity", "body": "...", "speaker_notes": "..." },
      { "n": 6, "title": "Application: Leadership", "body": "...", "speaker_notes": "..." },
      { "n": 7, "title": "Application: Retention", "body": "...", "speaker_notes": "..." },
      { "n": 8, "title": "ROI snapshot", "body": "...", "speaker_notes": "..." },
      { "n": 9, "title": "How to roll this out", "body": "...", "speaker_notes": "..." },
      { "n": 10, "title": "Next steps", "body": "Bulk order + follow-up Q&A", "speaker_notes": "..." }
    ],
    "roi_talking_points": [
      { "metric": "Productivity uplift", "framing": "How this book's framework moves the metric" },
      { "metric": "Leadership pipeline", "framing": "..." },
      { "metric": "Employee retention", "framing": "..." }
    ],
    "bulk_proposal": {
      "tier_10": { "books": 10, "price_usd": 199, "includes": ["10 signed paperbacks", "Email follow-up template"] },
      "tier_50": { "books": 50, "price_usd": 899, "includes": ["50 signed paperbacks", "30-min team Q&A call", "Discussion guide"] },
      "tier_200": { "books": 200, "price_usd": 3299, "includes": ["200 signed paperbacks", "60-min on-site or virtual workshop", "Custom discussion guide", "Manager toolkit"] }
    },
    "followup_emails": [
      { "day": 1, "subject": "Thank you for hosting me at [Company]", "body": "..." },
      { "day": 7, "subject": "The ROI recap I promised", "body": "..." },
      { "day": 14, "subject": "Ready to roll this out across your team?", "body": "..." }
    ]
  }
}

Rules:
- Ground every word in the actual book thesis, frameworks, and audience above. No generic filler.
- Workshop slides: exactly 14. Corporate slides: exactly 10. QA seed questions: exactly 8. Inscription templates: exactly 5. Objection responses: exactly 5. Reading passages: exactly 3. Talk outline: exactly 5 sections. Followup emails: exactly 3.
- Speaker notes on every slide must be 1-2 sentences of practical delivery guidance.
- Pitch script and back-of-room close must be word-for-word, ready to read aloud.
- Bulk proposal pricing should reflect a realistic per-book discount as quantity scales.
- No emdashes (use commas, parentheses, or "and"). No markdown.` }
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
      personalised_name: content.kit_title,
      price_usd: 0,
      currency: "usd",
      delivery_type: "speaking_kit",
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
