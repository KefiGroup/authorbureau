// @ts-nocheck — Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAiGateway, corsHeaders, makeServiceClient, buildAuthorContext, upsertAuthorNode,
  failResponse, errorMessage,
} from "../_shared/builder-helpers.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { author_id, book_id } = await req.json();
    if (!author_id) throw new Error("author_id is required");

    const supabase = makeServiceClient();

    const { data: author } = await supabase
      .from("author_profiles")
      .select("pen_name, genres, user_id")
      .eq("id", author_id)
      .single();
    if (!author) throw new Error("Author not found");

    const ctxBundle = await buildAuthorContext(supabase, author_id, author.user_id ?? null, book_id ?? null, "BP-05");
    if (ctxBundle.contextBlocked) {
      return new Response(
        JSON.stringify({
          success: false,
          status: "context_blocked",
          node_id: "BP-05",
          error: "Please run the book analysis for this specific book before generating Webinars. This prevents content from leaking between your books.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const ctx = ctxBundle.ctx;
    const resolvedBookId = ctxBundle.book?.id ?? book_id ?? null;
    const bookTitle = ctxBundle.bookTitle;
    if (!bookTitle) throw new Error("No book found. Please add a book first.");

    const genre = author.genres?.[0] || ctxBundle.book?.genre || "non-fiction";
    const niche = genre;

    const userPrompt = `Create a complete webinar system for ${author.pen_name}'s book '${bookTitle}'.

Author details:
- Author name: ${author.pen_name}
- Book title: ${bookTitle}
- Book subtitle: ${ctxBundle.bookSubtitle || "N/A"}
- Core thesis: ${ctxBundle.coreThesis}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona || {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks || [])}
- Unique insights: ${JSON.stringify(ctx?.unique_insights || [])}
- Niche: ${niche}

Generate the following as a JSON object with these exact keys:

{
  "webinar_topics": [
    {
      "number": 1,
      "title": "Compelling webinar title (specific, benefit-driven, creates curiosity)",
      "subtitle": "One-line subtitle that clarifies the promise",
      "duration_minutes": 60,
      "format": "Format type (e.g., Live Training, Q&A Session, Workshop, Masterclass)",
      "description": "2-3 sentences describing what attendees will learn and the transformation they will experience",
      "key_points": ["Key teaching point 1", "Key teaching point 2", "Key teaching point 3", "Key teaching point 4"],
      "ideal_for": "One sentence describing exactly who this webinar is for",
      "hook": "A compelling one-sentence hook to open the webinar (creates urgency or curiosity)"
    }
  ],
  "recommended_webinar": 1,
  "recommended_reason": "One sentence explaining why webinar #1 is the best starting point for this author",
  "registration_page": {
    "headline": "Main headline for the registration page (powerful, specific, benefit-driven)",
    "subheadline": "Supporting subheadline (1-2 sentences)",
    "bullet_points": ["What attendees will learn 1", "What attendees will learn 2", "What attendees will learn 3", "What attendees will learn 4"],
    "presenter_bio": "A 2-3 sentence bio positioning the author as the expert for this webinar",
    "cta_button_text": "Registration button text (e.g., Reserve My Spot)",
    "urgency_note": "A short urgency or scarcity note (e.g., Limited spots available)"
  },
  "follow_up_emails": [
    { "send_time": "Immediately after registration", "subject": "...", "preview_text": "...", "body_summary": "..." },
    { "send_time": "24 hours before the webinar", "subject": "...", "preview_text": "...", "body_summary": "..." },
    { "send_time": "1 hour before the webinar", "subject": "...", "preview_text": "...", "body_summary": "..." },
    { "send_time": "24 hours after the webinar", "subject": "...", "preview_text": "...", "body_summary": "..." }
  ],
  "promotion_strategy": {
    "launch_timeline": "Recommended number of days to promote before the webinar (e.g., 14 days)",
    "channels": ["Channel 1", "Channel 2", "Channel 3"],
    "promotional_posts": [
      { "day": "Day 1 (Announcement)", "platform": "LinkedIn", "caption": "..." },
      { "day": "Day 7 (Reminder)", "platform": "Instagram", "caption": "..." },
      { "day": "Day 13 (Last chance)", "platform": "Email", "caption": "..." }
    ]
  },
  "abby_summary": "A 2-3 sentence summary from ABBY explaining what she created and why this webinar system will grow this author's audience and revenue",
  "slides": [
    { "title": "string (webinar #1 title)", "body": "subtitle / promise", "notes": "speaker notes", "layout_hint": "hero" },
    { "title": "The problem", "body": "string", "notes": "string", "layout_hint": "split" },
    { "title": "Why most approaches fail", "body": "string", "notes": "string", "layout_hint": "bullets" },
    { "title": "The shift", "body": "string", "notes": "string", "layout_hint": "stat" },
    { "title": "Key point 1", "body": "string", "notes": "string", "layout_hint": "split" },
    { "title": "Key point 2", "body": "string", "notes": "string", "layout_hint": "split" },
    { "title": "Key point 3", "body": "string", "notes": "string", "layout_hint": "split" },
    { "title": "Key point 4", "body": "string", "notes": "string", "layout_hint": "split" },
    { "title": "Case study / proof", "body": "string", "notes": "string", "layout_hint": "quote" },
    { "title": "Next step", "body": "offer / call to action", "notes": "string", "layout_hint": "divider" }
  ]
}

The webinar_topics array must have exactly 3 items, each covering a different angle of the book's content.
Make everything specific to this author's book, niche, and audience. Never use generic placeholder text.`;

    const aiRes = await fetchAiGateway({
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: "You are ABBY, the AI business agent for Authors Bureau. You help authors turn their books into complete business empires. You are warm, expert, and encouraging. You always personalise everything to the author's specific book, audience, and niche. Never be generic. Always respond with valid JSON only — no markdown, no code fences.\n\nHARD CONTENT RULES (output that violates these will fail QA):\n- NEVER use the emdash character (\u2014) or endash (\u2013). Use commas, periods, or \" - \" for ranges only.\n- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.\n- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.\n- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns)." },
          { role: "user", content: userPrompt },
        ],
      }),
    }, "generate-bp05-webinars");

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", errText);
      throw new Error("AI generation failed");
    }

    const aiData = await aiRes.json();
    let raw = aiData.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(raw);

    const recIdx = (parsed.recommended_webinar || 1) - 1;
    const personalName = parsed.webinar_topics?.[recIdx]?.title || parsed.webinar_topics?.[0]?.title || "Author Webinar";

    await upsertAuthorNode(supabase, author_id, "BP-05", "Webinars", {
      status: "content_ready",
      content_json: parsed,
      personalised_name: personalName,
    }, resolvedBookId);

    return new Response(JSON.stringify({ success: true, content: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-bp05 error:", errorMessage(err));
    return failResponse(errorMessage(err));
  }
});
