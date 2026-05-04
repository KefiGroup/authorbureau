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
          { role: "system", content: `You are ABBY, the AI business agent for Authors Bureau. You build ${NODE_NAME} kits — sales pitches, slide decks, scripts — that help authors sell books and book speaking gigs at workshops, signings, and corporate lunches. Always personalise to the author's book, framework, and audience. Always respond with valid JSON only — no markdown, no code fences.\n\nHARD CONTENT RULES (output that violates these will fail QA):\n- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.\n- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.\n- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.\n- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).` },
          { role: "user", content: `Build a ${NODE_NAME} kit for ${author.pen_name}'s book "${bookTitle}".

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
      { "n": 1, "layout": "title", "eyebrow": "WORKSHOP", "headline": "${bookTitle}", "subhead": "A live session with ${author.pen_name}", "speaker_notes": "Welcome the room. Thank the host. Set the promise in one sentence." },
      { "n": 2, "layout": "stat", "eyebrow": "THE PROBLEM", "headline": "A real, audience-felt headline that names pain point 1 as a sentence (not a label)", "stat": { "value": "e.g. 73%", "label": "Short label that quantifies the pain (replace with a real, source-able stat from the audience or genre)" }, "subhead": "One sentence on why this number matters today.", "speaker_notes": "Ask for a show of hands. Normalize the feeling." },
      { "n": 3, "layout": "two_column", "eyebrow": "THE PROBLEM", "headline": "Sentence headline naming pain point 2", "columns": { "left": { "h": "What it looks like", "body": "2-3 sentences describing the lived experience." }, "right": { "h": "What it costs", "body": "2-3 sentences quantifying the real cost — time, money, relationships, momentum." } }, "speaker_notes": "Use one personal example and one audience example. Keep it grounded." },
      { "n": 4, "layout": "bullets", "eyebrow": "THE PROBLEM", "headline": "Sentence headline naming pain point 3", "bullets": ["Concrete bullet 1, max 12 words", "Concrete bullet 2, max 12 words", "Concrete bullet 3, max 12 words"], "speaker_notes": "Make this practical. Name systems and protections, not theory." },
      { "n": 5, "layout": "framework_grid", "eyebrow": "THE METHOD", "headline": "Name of the framework, written out", "subhead": "One-line promise of what the framework delivers", "chips": [ { "label": "Letter or step 1", "name": "Stage name 1" }, { "label": "Letter or step 2", "name": "Stage name 2" }, { "label": "Letter or step 3", "name": "Stage name 3" }, { "label": "Letter or step 4", "name": "Stage name 4" } ], "speaker_notes": "Say the full name once. Tell them they will pick a stage in the live exercise." },
      { "n": 6, "layout": "framework", "eyebrow": "PILLAR 1 OF 3", "headline": "Sentence headline for the first cluster of stages", "bullets": ["Sub-stage 1: one-line description", "Sub-stage 2: one-line description", "Why this pillar matters: one line"], "speaker_notes": "Emphasize permission to be imperfect, then pivot to self-awareness." },
      { "n": 7, "layout": "framework", "eyebrow": "PILLAR 2 OF 3", "headline": "Sentence headline for the second cluster", "bullets": ["Sub-stage 1: one-line description", "Sub-stage 2: one-line description", "Why this pillar matters: one line"], "speaker_notes": "Give a quick example of saying no, focusing on one direction." },
      { "n": 8, "layout": "framework", "eyebrow": "PILLAR 3 OF 3", "headline": "Sentence headline for the final cluster", "bullets": ["Sub-stage 1: one-line description", "Sub-stage 2: one-line description", "Sub-stage 3: one-line description", "Sub-stage 4: one-line description"], "speaker_notes": "Deliver as a sequence: people, pressure, vision, service." },
      { "n": 9, "layout": "case_study", "eyebrow": "CASE STUDY 1", "headline": "Short, named case-study headline (sentence form)", "case": { "challenge": "1-2 sentences naming the situation.", "move": "1-2 sentences naming the move they made, tied to a framework stage.", "result": "1 sentence with a concrete outcome (number, change, or shift)." }, "speaker_notes": "Keep it principle-based. Do not overshare details." },
      { "n": 10, "layout": "case_study", "eyebrow": "CASE STUDY 2", "headline": "Short, named case-study headline (sentence form)", "case": { "challenge": "1-2 sentences naming the situation.", "move": "1-2 sentences naming the move they made.", "result": "1 sentence with a concrete outcome." }, "speaker_notes": "Name the reality, then the choice, then the first aligned action." },
      { "n": 11, "layout": "exercise", "eyebrow": "LIVE EXERCISE", "headline": "Name of the exercise as a sentence the audience will do", "steps": ["Step 1: short imperative (max 10 words)", "Step 2: short imperative", "Step 3: short imperative"], "subhead": "You have 3 minutes. Specificity beats ambition.", "speaker_notes": "Walk the room. Encourage specificity and small actions." },
      { "n": 12, "layout": "offer", "eyebrow": "TAKE IT WITH YOU", "headline": "Get the book at the back of the room", "bullets": ["Signed to your current stage", "Bonus framework one-pager inside", "Reader community access"], "speaker_notes": "Calm and invitational. Repeat the benefit, not the price." },
      { "n": 13, "layout": "qr", "eyebrow": "SCAN TO CONTINUE", "headline": "Grab your copy and the bonus", "bullets": ["Framework one-pager (PDF)", "Discussion prompts for your team", "Three reflection questions"], "speaker_notes": "Pause long enough for everyone to scan." },
      { "n": 14, "layout": "thanks", "eyebrow": "THANK YOU", "headline": "Tell me your stage after the talk", "subhead": "Find me at the table. Bring one specific question.", "speaker_notes": "End with one clear invitation. Move to the table." }
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
      { "n": 1, "layout": "title", "eyebrow": "CORPORATE BRIEFING", "headline": "${bookTitle}, for [Company]", "subhead": "A working session with ${author.pen_name}", "speaker_notes": "Welcome the room, name the host, set the promise in one line." },
      { "n": 2, "layout": "stat", "eyebrow": "WHY THIS MATTERS", "headline": "A real, business-felt sentence headline naming the change pressure your team faces (not a label)", "stat": { "value": "e.g. 73%", "label": "Short label that quantifies the business pain (use a credible stat from the genre/audience)" }, "subhead": "One sentence on why this number matters for this team right now.", "speaker_notes": "Anchor in the host company's reality. Invite a nod, not a debate." },
      { "n": 3, "layout": "stat", "eyebrow": "THE COST", "headline": "Sentence headline that names what unaddressed change is costing the business", "stat": { "value": "e.g. 1 in 4", "label": "Time, money, attrition, or productivity cost expressed as a number" }, "subhead": "One sentence on the visible symptoms leaders are already seeing.", "speaker_notes": "Keep this sober, not alarmist. Tie cost to a metric the room already tracks." },
      { "n": 4, "layout": "framework_grid", "eyebrow": "THE METHOD", "headline": "Name of the framework, written out as a sentence", "subhead": "The operating model your team can use this quarter.", "chips": [ { "label": "Letter or step 1", "name": "Stage name 1" }, { "label": "Letter or step 2", "name": "Stage name 2" }, { "label": "Letter or step 3", "name": "Stage name 3" }, { "label": "Letter or step 4", "name": "Stage name 4" } ], "speaker_notes": "Say the framework name once. Promise we'll apply it to three business outcomes next." },
      { "n": 5, "layout": "framework", "eyebrow": "APPLICATION 1 OF 3", "headline": "Sentence headline tying the framework to productivity", "bullets": ["Concrete move 1 named with a framework stage (max 12 words)", "Concrete move 2 named with a framework stage", "Concrete move 3 named with a framework stage", "What changes in the weekly cadence as a result"], "speaker_notes": "Give one example of the move at a real company size. Keep it operational." },
      { "n": 6, "layout": "framework", "eyebrow": "APPLICATION 2 OF 3", "headline": "Sentence headline tying the framework to leadership", "bullets": ["Concrete leadership move 1 named with a framework stage", "Concrete leadership move 2 named with a framework stage", "Concrete leadership move 3 named with a framework stage", "What changes in 1:1s and decisions as a result"], "speaker_notes": "Frame this as repeatable coaching language, not personality." },
      { "n": 7, "layout": "framework", "eyebrow": "APPLICATION 3 OF 3", "headline": "Sentence headline tying the framework to retention", "bullets": ["Concrete retention move 1 named with a framework stage", "Concrete retention move 2 named with a framework stage", "Concrete retention move 3 named with a framework stage", "What changes in onboarding or stay-conversations as a result"], "speaker_notes": "Connect to the cost slide. Make the link from method to dollars saved." },
      { "n": 8, "layout": "two_column", "eyebrow": "ROI SNAPSHOT", "headline": "Sentence headline naming the measurable shift the team can expect in 90 days", "columns": { "left": { "h": "What you measure", "body": "3 metrics on separate lines: ramp time, decision velocity, voluntary attrition (or substitute the audience's actual KPIs)." }, "right": { "h": "What changes", "body": "3 outcomes on separate lines, each tied to one framework stage and one metric on the left." } }, "speaker_notes": "Read across, not down. Pair each metric with its movement." },
      { "n": 9, "layout": "bullets", "eyebrow": "ROLLOUT", "headline": "Sentence headline naming the 3-phase rollout (e.g. Seed, Scale, Sustain)", "bullets": ["Phase 1: bulk books + 60-minute kickoff workshop (week 1)", "Phase 2: manager toolkit + team discussion guides (weeks 2-4)", "Phase 3: 30-day check-in + executive recap (week 8)"], "speaker_notes": "Frame this as low-risk and operationally light. Name the owner inside the company." },
      { "n": 10, "layout": "offer", "eyebrow": "NEXT STEPS", "headline": "Pick a starting tier and a pilot team this week", "bullets": ["Bulk books delivered signed and personalised", "Manager toolkit and discussion guides included", "60-minute live workshop with the author"], "tiers": [ { "name": "Team pilot", "books": 10, "highlight": "Best for one team" }, { "name": "Department rollout", "books": 50, "highlight": "Most popular" }, { "name": "Company-wide", "books": 200, "highlight": "Includes on-site workshop" } ], "speaker_notes": "Anchor on the middle tier. Offer a single follow-up call to choose the right shape." }
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
- Workshop slides: exactly 14, each with the EXACT layout shown in the schema (do not change layout values, do not add or remove slides).
- For workshop slides, "headline" must be a real sentence the speaker reads aloud, NEVER a wireframe label like "Pain point 1", "Framework pillar 2", "Title slide", "Offer slide", "Case study 1", "Live exercise", "Thank you" — those are forbidden as headlines.
- "eyebrow" is a 1-4 word ALL-CAPS tag (e.g. "PILLAR 1 OF 3"). Never put the headline in eyebrow.
- For layout "stat", produce a real number with units in stat.value (e.g. "73%", "1 in 4", "12 years"). If you cannot find a credible stat, use a striking ratio drawn from the book.
- For layout "framework_grid", chips length must equal the actual number of stages in the author's framework (between 4 and 9).
- For layout "framework", bullets length is 3-4. For "bullets" layout, exactly 3 bullets. For "exercise", exactly 3 steps.
- For layout "case_study", populate case.challenge, case.move, case.result — each a complete sentence, never "...".
- Corporate slides: exactly 10, each with the EXACT layout shown in the schema (do not change layout values, do not add or remove slides). For corporate slides, "headline" must be a real sentence the speaker reads aloud, NEVER a wireframe label like "Title slide", "Why this matters to your business", "The cost of not addressing this", "Framework overview", "Application: Productivity", "ROI snapshot", "How to roll this out", "Next steps" — those are forbidden as headlines (they describe the slide, they are not the slide). For corporate stat slides, stat.value must be a real number with units. For corporate framework slides, bullets must reference the actual book's framework stages by name. For corporate offer (slide 10), tiers length is exactly 3, in ascending book quantity. QA seed questions: exactly 8. Inscription templates: exactly 5. Objection responses: exactly 5. Reading passages: exactly 3. Talk outline: exactly 5 sections. Followup emails: exactly 3.
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
