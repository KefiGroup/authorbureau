import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { author_id } = await req.json();
    if (!author_id) throw new Error("author_id is required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: author } = await supabase
      .from("author_profiles")
      .select("pen_name, genres")
      .eq("id", author_id)
      .single();
    if (!author) throw new Error("Author not found");

    const { data: ctx } = await supabase
      .from("author_context")
      .select("book_title, book_subtitle, core_thesis, key_frameworks, target_audience_persona, unique_insights, commercial_angles")
      .eq("author_id", author_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!ctx) throw new Error("Author context not found. Please complete your book profile first.");

    const genre = author.genres?.[0] || "non-fiction";
    const niche = genre;

    const userPrompt = `Create a complete webinar system for ${author.pen_name}'s book '${ctx.book_title}'.

Author details:
- Author name: ${author.pen_name}
- Book title: ${ctx.book_title}
- Book subtitle: ${ctx.book_subtitle || "N/A"}
- Core thesis: ${ctx.core_thesis}
- Target audience: ${JSON.stringify(ctx.target_audience_persona)}
- Key frameworks: ${JSON.stringify(ctx.key_frameworks)}
- Unique insights: ${JSON.stringify(ctx.unique_insights)}
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
    {
      "send_time": "Immediately after registration",
      "subject": "Email subject line",
      "preview_text": "Email preview text (under 90 characters)",
      "body_summary": "2-3 sentences summarising what this email says and its purpose"
    },
    {
      "send_time": "24 hours before the webinar",
      "subject": "Email subject line",
      "preview_text": "Email preview text",
      "body_summary": "2-3 sentences"
    },
    {
      "send_time": "1 hour before the webinar",
      "subject": "Email subject line",
      "preview_text": "Email preview text",
      "body_summary": "2-3 sentences"
    },
    {
      "send_time": "24 hours after the webinar",
      "subject": "Email subject line",
      "preview_text": "Email preview text",
      "body_summary": "2-3 sentences summarising the replay offer or next step"
    }
  ],
  "promotion_strategy": {
    "launch_timeline": "Recommended number of days to promote before the webinar (e.g., 14 days)",
    "channels": ["Channel 1 (e.g., Email list)", "Channel 2 (e.g., Social media)", "Channel 3 (e.g., LinkedIn)"],
    "promotional_posts": [
      { "day": "Day 1 (Announcement)", "platform": "LinkedIn", "caption": "Full promotional post caption (100-150 words)" },
      { "day": "Day 7 (Reminder)", "platform": "Instagram", "caption": "Full promotional post caption (80-120 words)" },
      { "day": "Day 13 (Last chance)", "platform": "Email", "caption": "Full last-chance email subject and body summary" }
    ]
  },
  "abby_summary": "A 2-3 sentence summary from ABBY explaining what she created and why this webinar system will grow this author's audience and revenue"
}

The webinar_topics array must have exactly 3 items, each covering a different angle of the book's content.
Make everything specific to this author's book, niche, and audience. Never use generic placeholder text.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          {
            role: "system",
            content: "You are ABBY, the AI business agent for Authors Bureau. You help authors turn their books into complete business empires. You are warm, expert, and encouraging. You always personalise everything to the author's specific book, audience, and niche. Never be generic. Always respond with valid JSON only — no markdown, no code fences.",
          },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

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

    await supabase
      .from("author_nodes")
      .update({
        status: "content_ready",
        content_json: parsed,
        personalised_name: personalName,
      })
      .eq("author_id", author_id)
      .eq("node_id", "BP-05");

    return new Response(JSON.stringify({ success: true, content: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-bp05 error:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
