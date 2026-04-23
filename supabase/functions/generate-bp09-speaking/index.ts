import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { author_id } = await req.json();
    if (!author_id) throw new Error("author_id is required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: author } = await supabase.from("author_profiles").select("pen_name, genres, bio_short, bio_long").eq("id", author_id).single();
    if (!author) throw new Error("Author not found");

    const { data: ctx } = await supabase.from("author_context").select("*").eq("author_id", author_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!ctx) throw new Error("No author context found.");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5.2",
        max_completion_tokens: 12000,
        messages: [
          { role: "system", content: "You are ABBY, the AI business agent for Authors Bureau. You build live-audience conversion toolkits — sales pitches, slide decks, scripts — that help authors sell books and book speaking gigs at workshops, signings, and corporate lunches. Always personalise to the author's book, framework, and audience. Always respond with valid JSON only — no markdown, no code fences." },
          { role: "user", content: `Build a Live Audience Conversion Toolkit for ${author.pen_name}'s book "${ctx.book_title}".

Author details:
- Pen name: ${author.pen_name}
- Bio: ${author.bio_short || author.bio_long || "N/A"}
- Book title: ${ctx.book_title}
- Book subtitle: ${ctx.book_subtitle || "N/A"}
- Core thesis: ${ctx.core_thesis}
- Target audience: ${JSON.stringify(ctx.target_audience_persona)}
- Key frameworks: ${JSON.stringify(ctx.key_frameworks)}
- Unique insights: ${JSON.stringify(ctx.unique_insights)}
- Genre/Niche: ${author.genres?.[0] || "General"}

Generate a JSON object with EXACTLY these keys (no extras, no markdown):

{
  "kit_title": "${ctx.book_title} — Live Audience Conversion Toolkit",
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
      { "n": 1, "title": "Title slide", "body": "${ctx.book_title} by ${author.pen_name}", "speaker_notes": "Welcome the room. Thank the host." },
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
      { "n": 1, "title": "Title slide", "body": "${ctx.book_title} — for [Company]", "speaker_notes": "..." },
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

    if (!aiRes.ok) throw new Error(`AI gateway error: ${aiRes.status}`);
    const aiData = await aiRes.json();
    let raw = aiData.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const content = JSON.parse(raw);

    await supabase.from("author_nodes").update({ status: "content_ready", content_json: content, personalised_name: content.kit_title }).eq("author_id", author_id).eq("node_id", "BP-09");

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("generate-bp09 error:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
