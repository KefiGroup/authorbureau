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
    const { bookTitle, isbn, amazonUrl, author_id } = await req.json();
    if (!bookTitle) throw new Error("bookTitle is required");
    if (!author_id) throw new Error("author_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    // Get author profile for context
    const { data: author } = await supabase
      .from("author_profiles")
      .select("pen_name, genres")
      .eq("id", author_id)
      .single();

    const searchContext = [
      `Book title: "${bookTitle}"`,
      isbn ? `ISBN: ${isbn}` : null,
      amazonUrl ? `Amazon URL: ${amazonUrl}` : null,
      author?.pen_name ? `Author: ${author.pen_name}` : null,
    ].filter(Boolean).join("\n");

    const aiRes = await fetch("https://ai-gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          {
            role: "system",
            content: `You are ABBY, the AI business agent for Authors Bureau. You research published books and extract commercial intelligence. Always respond with valid JSON only — no markdown, no code fences.`,
          },
          {
            role: "user",
            content: `Research this published book and extract commercial intelligence:

${searchContext}

Search Amazon and Google for this book. Extract and return JSON with these exact keys:
{
  "book_title": "Exact book title as published",
  "book_subtitle": "Subtitle if any, or null",
  "core_thesis": "The book's central argument or thesis in 2-3 sentences",
  "key_frameworks": ["Framework 1", "Framework 2", "Framework 3", "Framework 4", "Framework 5"],
  "target_audience_persona": {
    "demographics": "Age range, profession, life stage",
    "psychographics": "Values, pain points, aspirations",
    "buying_triggers": "What makes them buy this book"
  },
  "unique_insights": ["Insight 1", "Insight 2", "Insight 3"],
  "commercial_angles": ["Commercial angle 1", "Commercial angle 2", "Commercial angle 3"],
  "competitor_books": [
    {"title": "Competitor book 1", "author": "Author name", "differentiation": "How this book differs"}
  ],
  "review_themes": ["Common praise theme 1", "Common praise theme 2", "Common praise theme 3"],
  "review_count_estimate": 50,
  "genre": "Primary genre/category",
  "abby_message": "I found your book [Title]. I have analysed [X] reviews and identified [Y] commercial opportunities. Here is what stands out: [brief personalised insight]."
}

Be specific and personalised. If you cannot find the exact book, use the title and any available context to make reasonable inferences about the book's content and commercial potential. The review_count_estimate should be your best guess based on available data.`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) throw new Error(`AI gateway error: ${aiRes.status}`);
    const aiData = await aiRes.json();
    let raw = aiData.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const content = JSON.parse(raw);

    // Upsert author_context
    const contextPayload = {
      author_id,
      book_title: content.book_title || bookTitle,
      book_subtitle: content.book_subtitle || null,
      core_thesis: content.core_thesis || "",
      key_frameworks: content.key_frameworks || [],
      target_audience_persona: content.target_audience_persona || {},
      unique_insights: content.unique_insights || [],
      commercial_angles: content.commercial_angles || [],
      competitor_books: content.competitor_books || [],
      parsed_at: new Date().toISOString(),
    };

    // Check if context already exists
    const { data: existing } = await supabase
      .from("author_context")
      .select("id")
      .eq("author_id", author_id)
      .maybeSingle();

    if (existing) {
      await supabase.from("author_context").update(contextPayload).eq("id", existing.id);
    } else {
      await supabase.from("author_context").insert(contextPayload);
    }

    return new Response(
      JSON.stringify({
        success: true,
        content,
        abby_message: content.abby_message,
        review_count: content.review_count_estimate,
        commercial_opportunities: content.commercial_angles?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("parse-published-book error:", err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
