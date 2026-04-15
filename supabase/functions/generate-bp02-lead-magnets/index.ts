import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { author_id } = await req.json();
    if (!author_id) throw new Error("author_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: author, error: authorErr } = await supabase
      .from("author_profiles")
      .select("pen_name, user_id, ghl_sub_account_id, subscription_tier")
      .eq("id", author_id)
      .single();
    if (authorErr || !author) throw new Error("Author profile not found");

    const { data: context } = await supabase
      .from("author_context")
      .select("book_title, book_subtitle, core_thesis, key_frameworks, target_audience_persona, unique_insights, commercial_angles")
      .eq("author_id", author_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fallback to books table if no author_context exists
    let bookTitle = context?.book_title || "";
    let bookSubtitle = context?.book_subtitle || "";
    let coreThesis = context?.core_thesis || "";
    if (!bookTitle) {
      const { data: book } = await supabase
        .from("books")
        .select("title, subtitle, description")
        .eq("author_id", author.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (book) {
        bookTitle = book.title || "";
        bookSubtitle = book.subtitle || "";
        coreThesis = book.description || "";
      }
    }
    if (!bookTitle) throw new Error("No book found. Please add a book first.");

    // Pull enrichment from generated_assets (business plan + source material)
    const { data: businessPlanAsset } = await supabase
      .from("generated_assets")
      .select("content")
      .eq("author_id", author.user_id)
      .eq("asset_type", "business_plan")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: sourceMaterialAsset } = await supabase
      .from("generated_assets")
      .select("content")
      .eq("author_id", author.user_id)
      .eq("asset_type", "source_material")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const businessPlanExcerpt = businessPlanAsset?.content ? businessPlanAsset.content.substring(0, 3000) : "";
    const sourceMaterialExcerpt = sourceMaterialAsset?.content ? sourceMaterialAsset.content.substring(0, 2000) : "";

    const keyFrameworks = context?.key_frameworks ? JSON.stringify(context.key_frameworks) : "N/A";
    const audiencePersona = context?.target_audience_persona ? JSON.stringify(context.target_audience_persona) : "readers interested in personal growth";
    const uniqueInsights = context?.unique_insights ? JSON.stringify(context.unique_insights) : "N/A";
    const commercialAngles = context?.commercial_angles ? JSON.stringify(context.commercial_angles) : "N/A";
    const authorName = author.pen_name || "Author";

    const systemPrompt = `You are ABBY, the AI business agent for Authors Bureau. You help authors turn their books into complete business empires. You are warm, expert, and encouraging. You always personalise everything to the author's specific book, audience, and niche. Never be generic. Always respond with valid JSON only — no markdown, no code fences.

CRITICAL GENERATION CONSTRAINTS:
- All lead magnets must be designed as SIMPLE 2-3 MINUTE actions focused on ASSESSMENT and SELF-DIAGNOSIS only.
- Quizzes: 8-10 multiple-choice questions MAXIMUM. Self-scoring. Results gated behind contact form.
- Do NOT include "Next-step plans", action items, or exercises.
- Content must acknowledge that the reader is STUCK and provide exactly 3 specific product recommendations per scoring tier.
- FORBIDDEN PHRASES: "Next step", "pick 1", "action step", "your task", "try this", "exercise", "I will ___ for".
- All lead magnets must collect: First Name, Email, and Phone Number before delivering value.`;

    const userPrompt = `Create a complete lead magnet system for ${authorName}'s book '${bookTitle}'.

Book details:
- Title: ${bookTitle}
- Subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis || "N/A"}
- Target audience: ${audiencePersona}
- Key frameworks: ${keyFrameworks}
- Unique insights: ${uniqueInsights}
- Commercial angles: ${commercialAngles}

Generate the following as a JSON object with these exact keys:

{
  "lead_magnets": [
    {
      "number": 1,
      "type": "Type (e.g., Quiz/Assessment, Checklist, Cheat Sheet)",
      "title": "Compelling title",
      "description": "One sentence describing value and transformation",
      "why_it_works": "Why this attracts this author's audience",
      "pages_or_length": "Estimated length (e.g., 10-question quiz, 1-page checklist)",
      "best_channel": "Best marketing channel (e.g., LinkedIn, Instagram)",
      "channel_reason": "Why this channel is ideal",
      "contact_gate": {
        "fields": ["first_name", "email", "phone"],
        "gate_moment": "Where the gate appears",
        "gate_headline": "Compelling headline for the contact form",
        "gate_subheadline": "Supporting text"
      }
    }
  ],
  "recommended_lead_magnet": 1,
  "recommended_reason": "Why this is the strongest choice",

  "headline_variants": [
    {
      "type": "identity",
      "headline": "Identity-based headline (e.g., 'Are You a ____ or a ____?')",
      "why": "Why this angle works"
    },
    {
      "type": "outcome",
      "headline": "Outcome-based headline (e.g., 'Discover Your ____ Score')",
      "why": "Why this angle works"
    },
    {
      "type": "curiosity",
      "headline": "Curiosity-based headline (e.g., 'The 3-Minute Test That Reveals...')",
      "why": "Why this angle works"
    }
  ],

  "quiz_structure": {
    "quiz_title": "Title of the quiz",
    "quiz_description": "One sentence describing purpose",
    "questions": [
      {
        "number": 1,
        "text": "Multiple-choice question (self-diagnosis style)",
        "options": [
          { "label": "Option A", "points": 1 },
          { "label": "Option B", "points": 2 },
          { "label": "Option C", "points": 3 },
          { "label": "Option D", "points": 4 }
        ]
      }
    ],
    "scoring_tiers": [
      {
        "min": 0,
        "max": 8,
        "label": "Tier label",
        "description": "3-sentence description acknowledging the reader is STUCK",
        "tips_from_book": ["Specific tip 1 from the book", "Specific tip 2 from the book"],
        "cta_text": "CTA linking to book sales page",
        "product_recommendations": [
          { "type": "Workbook", "title": "Specific recommendation", "reason": "Why this helps" },
          { "type": "Home Study", "title": "Specific recommendation", "reason": "Why this helps" },
          { "type": "Online Course", "title": "Specific recommendation", "reason": "Why this helps" }
        ]
      }
    ]
  },

  "optin_page": {
    "headline": "Main headline (use the best headline_variant)",
    "subheadline": "Supporting subheadline",
    "bullet_points": ["Benefit 1", "Benefit 2", "Benefit 3", "Benefit 4"],
    "cta_button_text": "First-person CTA with specific outcome (e.g., 'Show Me My Success Blocker')",
    "privacy_note": "Short privacy reassurance",
    "color_palette": {
      "primary": "#hex",
      "secondary": "#hex",
      "accent": "#hex",
      "background": "#hex",
      "text": "#hex"
    }
  },

  "thankyou_page": {
    "headline": "Thank you headline",
    "message": "2-3 sentences thanking them",
    "show_result_immediately": true,
    "result_intro": "Text introducing their quiz result on the thank-you page",
    "next_step": "What to do next",
    "book_cta": "CTA to purchase the full book"
  },

  "nurture_sequence": [
    {
      "email_number": 1,
      "send_delay_days": 0,
      "subject": "Subject line for immediate result delivery",
      "purpose": "Deliver personalised result with category name, description, and 2 tips",
      "body_outline": "3-4 sentence outline of email body"
    },
    {
      "email_number": 2,
      "send_delay_days": 2,
      "subject": "Subject line for empathy/story email",
      "purpose": "Story behind their result — empathy building",
      "body_outline": "3-4 sentence outline"
    },
    {
      "email_number": 3,
      "send_delay_days": 4,
      "subject": "Subject line for high-value content",
      "purpose": "One thing people in their category do differently",
      "body_outline": "3-4 sentence outline"
    },
    {
      "email_number": 4,
      "send_delay_days": 6,
      "subject": "Subject line for book chapter reference",
      "purpose": "Specific chapter reference that solves their problem — soft book intro",
      "body_outline": "3-4 sentence outline"
    },
    {
      "email_number": 5,
      "send_delay_days": 8,
      "subject": "Subject line for direct offer",
      "purpose": "Direct offer — book sales page link with time-limited bonus",
      "body_outline": "3-4 sentence outline"
    }
  ],

  "marketing_strategy": {
    "primary_platform": "Best overall marketing platform",
    "primary_reason": "Why this platform suits this author",
    "secondary_platform": "Complementary platform",
    "secondary_reason": "Why this adds reach",
    "promotion_tips": ["Tip 1", "Tip 2", "Tip 3"]
  },

  "social_media_posts": [
    { "platform": "instagram", "caption": "Ready-to-post caption", "hashtags": ["relevant"], "cta": "Take the free quiz → link" },
    { "platform": "linkedin", "caption": "Professional post", "hashtags": ["relevant"], "cta": "Get your free guide → link" },
    { "platform": "facebook", "caption": "Engaging post", "hashtags": ["relevant"], "cta": "Download free → link" },
    { "platform": "x", "caption": "Short punchy tweet", "hashtags": ["relevant"], "cta": "Grab it free → link" }
  ],

  "quiz_insights_for_social": [
    "Insight 1 suitable for standalone social post",
    "Insight 2 that sparks engagement",
    "Insight 3 positioning author as expert"
  ],

  "funnel_name": "${authorName} Free Guide Funnel",
  "abby_summary": "2-3 sentence summary explaining what was created and why"
}

IMPORTANT RULES:
1. lead_magnets array: exactly 3 items, each different type. At least one MUST be Quiz/Assessment.
2. quiz_structure: exactly 8-10 questions. Each has exactly 4 options with ascending points (1-4).
3. scoring_tiers: exactly 5 tiers covering the full point range. Each has 3 product recommendations AND 2 specific tips from the book.
4. headline_variants: exactly 3 (identity, outcome, curiosity). Each must be compelling and specific to this book.
5. nurture_sequence: exactly 5 emails with the specified purposes and send delays.
6. optin_page.cta_button_text: MUST be first-person with specific outcome (e.g., "Show Me My Success Blocker" NOT "Submit" or "Get Results").
7. thankyou_page.show_result_immediately: always true — deliver the quiz result on the page, not just via email.
8. social_media_posts: exactly 4 posts (instagram, linkedin, facebook, x).
9. quiz_insights_for_social: exactly 3 insights.
10. All lead magnets must include contact_gate collecting first_name, email, phone.
11. For quizzes: contact gate appears AFTER completion, BEFORE showing results.
12. Make everything specific to this author's book and audience. Never generic.
13. Quiz must be self-scoring with auto-tally points.
14. color_palette: suggest brand-appropriate colors based on the book's genre and audience.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 8000,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", errText);
      if (aiResponse.status === 429) throw new Error("Rate limited — please try again in a moment");
      if (aiResponse.status === 402) throw new Error("AI credits exhausted — please add funds");
      throw new Error(`AI generation failed (${aiResponse.status})`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    const cleaned = rawContent
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    let parsedContent: Record<string, unknown>;
    try {
      parsedContent = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsedContent = JSON.parse(match[0].replace(/,\s*([}\]])/g, "$1"));
        } catch {
          // Retry: ask AI to fix the JSON
          console.log("First parse failed, retrying with JSON-fix prompt...");
          const retryResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "openai/gpt-5",
              messages: [
                { role: "system", content: "You are a JSON repair tool. Return ONLY valid JSON, no prose." },
                { role: "user", content: `Fix this into valid JSON:\n${rawContent.slice(0, 12000)}` },
              ],
              max_completion_tokens: 8000,
              response_format: { type: "json_object" },
            }),
          });
          const retryData = await retryResp.json();
          const retryRaw = retryData.choices?.[0]?.message?.content || "";
          parsedContent = JSON.parse(retryRaw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim());
        }
      } else {
        // Retry: ask AI to fix the JSON
        console.log("No JSON object found, retrying with JSON-fix prompt...");
        const retryResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-5",
            messages: [
              { role: "system", content: "You are a JSON repair tool. Return ONLY valid JSON, no prose." },
              { role: "user", content: `Fix this into valid JSON:\n${rawContent.slice(0, 12000)}` },
            ],
            max_completion_tokens: 8000,
            response_format: { type: "json_object" },
          }),
        });
        const retryData = await retryResp.json();
        const retryRaw = retryData.choices?.[0]?.message?.content || "";
        parsedContent = JSON.parse(retryRaw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim());
      }
    }

    // Validate content has expected structure before saving
    if (!parsedContent.lead_magnets || !parsedContent.optin_page) {
      console.error("AI returned incomplete content, skipping DB save:", Object.keys(parsedContent));
    } else {
      // Upsert: check if row exists, then update or insert
      const { data: existingNode } = await supabase
        .from("author_nodes")
        .select("id")
        .eq("author_id", author_id)
        .eq("node_id", "BP-02")
        .maybeSingle();

      const nodePayload = {
        status: "content_ready",
        content_json: parsedContent,
        personalised_name: (parsedContent as any).funnel_name || "Lead Magnets",
      };

      if (existingNode) {
        const { error: updateErr } = await supabase
          .from("author_nodes")
          .update(nodePayload)
          .eq("author_id", author_id)
          .eq("node_id", "BP-02");
        if (updateErr) console.error("Failed to update author_nodes:", updateErr);
      } else {
        const { error: insertErr } = await supabase
          .from("author_nodes")
          .insert({
            author_id,
            node_id: "BP-02",
            node_name: "Lead Magnets",
            ...nodePayload,
          });
        if (insertErr) console.error("Failed to insert author_nodes:", insertErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, content: parsedContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-bp02 error:", err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
