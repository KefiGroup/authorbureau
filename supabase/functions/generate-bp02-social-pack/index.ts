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

    // Fetch author + context + BP-02 content
    const { data: author } = await supabase
      .from("author_profiles")
      .select("pen_name, user_id")
      .eq("id", author_id)
      .single();

    const authorName = author?.pen_name || "Author";

    const { data: context } = await supabase
      .from("author_context")
      .select("book_title, target_audience_persona")
      .eq("author_id", author_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const bookTitle = context?.book_title || "your book";
    const audience = context?.target_audience_persona
      ? JSON.stringify(context.target_audience_persona)
      : "readers";

    const { data: node } = await supabase
      .from("author_nodes")
      .select("content_json, microsite_url")
      .eq("author_id", author_id)
      .eq("node_id", "BP-02")
      .single();

    const contentJson = node?.content_json as any;
    if (!contentJson) throw new Error("No BP-02 content found. Build your lead magnet first.");

    const leadMagnetTitle = contentJson.lead_magnets?.[0]?.title || contentJson.funnel_name || "Lead Magnet";
    const optinUrl = node?.microsite_url || "https://authorsbureau.com";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `Generate a complete social media distribution pack for ${authorName}'s lead magnet "${leadMagnetTitle}" from the book "${bookTitle}".

Opt-in URL: ${optinUrl}
Target audience: ${audience}

Return valid JSON only (no markdown, no code fences) with these exact keys:

{
  "linkedin_posts": [
    { "type": "announcement", "caption": "150-word announcement post", "hashtags": ["relevant"] },
    { "type": "value", "caption": "200-word value post sharing an insight from the quiz topic", "hashtags": ["relevant"] },
    { "type": "social_proof", "caption": "Post template for sharing testimonial/result (with placeholder for real testimonial)", "hashtags": ["relevant"] }
  ],
  "instagram_posts": [
    { "type": "carousel", "caption": "Carousel caption for 5-slide post", "slide_topics": ["Slide 1 topic", "Slide 2", "Slide 3", "Slide 4", "Slide 5 CTA"], "hashtags": ["relevant"] },
    { "type": "story", "frames": [
      { "frame": 1, "text": "Hook frame", "sticker_suggestion": "poll or question sticker" },
      { "frame": 2, "text": "Value frame" },
      { "frame": 3, "text": "CTA frame with swipe-up link" }
    ]},
    { "type": "reel", "script": "30-second reel script with hook, value, and CTA", "caption": "Reel caption", "hashtags": ["relevant"] }
  ],
  "facebook_posts": [
    { "type": "community_group", "caption": "Post for Facebook groups (educational, not salesy)", "hashtags": [] },
    { "type": "personal_profile", "caption": "Personal announcement post", "hashtags": [] }
  ],
  "twitter_thread": [
    { "tweet_number": 1, "text": "Hook tweet building curiosity" },
    { "tweet_number": 2, "text": "Insight tweet" },
    { "tweet_number": 3, "text": "Surprising stat or fact" },
    { "tweet_number": 4, "text": "Personal story or example" },
    { "tweet_number": 5, "text": "CTA tweet with link" }
  ],
  "email_to_list": {
    "subject_variants": ["Subject line 1", "Subject line 2", "Subject line 3"],
    "body": "150-word email body announcing the quiz/lead magnet"
  },
  "visual_assets_brief": [
    {
      "format": "square",
      "dimensions": "1080x1080",
      "background_color": "#hex",
      "headline_text": "Main text overlay",
      "subheadline_text": "Supporting text",
      "cta_text": "CTA text",
      "include_book_cover": true
    },
    {
      "format": "story",
      "dimensions": "1080x1920",
      "background_color": "#hex",
      "headline_text": "Main text overlay",
      "subheadline_text": "Supporting text",
      "cta_text": "CTA text",
      "include_book_cover": false
    },
    {
      "format": "linkedin_banner",
      "dimensions": "1200x627",
      "background_color": "#hex",
      "headline_text": "Main text overlay",
      "subheadline_text": "Supporting text",
      "cta_text": "CTA text",
      "include_book_cover": true
    }
  ]
}

Make everything specific to "${bookTitle}" and "${leadMagnetTitle}". Include the opt-in URL "${optinUrl}" in all CTAs. Never be generic.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: "You are ABBY, the AI business agent for Authors Bureau. Generate social media content that is warm, expert, and specific to the author's book. Return valid JSON only." },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 5000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", errText);
      throw new Error(`AI generation failed (${aiResponse.status})`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    const cleaned = rawContent.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    let parsedContent: Record<string, unknown>;
    try {
      parsedContent = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsedContent = JSON.parse(match[0].replace(/,\s*([}\]])/g, "$1"));
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    // Store in cross_builder_pushes
    const { data: bookData } = await supabase
      .from("books")
      .select("id")
      .eq("author_id", author?.user_id || author_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bookData?.id) {
      await supabase.from("cross_builder_pushes").insert({
        author_id,
        book_id: bookData.id,
        source_builder: "lead-magnet",
        destination_builder: "social-media",
        push_type: "social-distribution-pack",
        title: `Social Pack: ${leadMagnetTitle}`,
        description: "Social media distribution pack for lead magnet promotion",
        content_json: parsedContent,
        status: "pending",
      });
    }

    return new Response(
      JSON.stringify({ success: true, content: parsedContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("generate-bp02-social-pack error:", errMessage);
    return new Response(
      JSON.stringify({ success: false, error: errMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
