import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const AI_URL = "https://ai.lovable.dev/api/v1/chat/completions";

async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-5.2",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`AI call failed: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function parseJSON(raw: string): any {
  const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const match = cleaned.match(/[\[{][\s\S]*[}\]]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
    try { return JSON.parse(match[0].replace(/,\s*([}\]])/g, "$1")); } catch {}
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { book_id, author_id } = await req.json();
    if (!book_id || !author_id) {
      return new Response(JSON.stringify({ error: "book_id and author_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch book + author profile
    const [bookRes, profileRes] = await Promise.all([
      supabase.from("books").select("title, subtitle, description, genre, author_name").eq("id", book_id).single(),
      supabase.from("author_profiles").select("pen_name, bio_short, bio_long, tagline, genres").eq("id", author_id).single(),
    ]);

    if (bookRes.error || !bookRes.data) {
      return new Response(JSON.stringify({ error: "Book not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const book = bookRes.data;
    const profile = profileRes.data;

    // Check for existing manuscript/context
    const { data: contextData } = await supabase
      .from("author_context")
      .select("core_thesis, key_frameworks, target_audience_persona, unique_insights, commercial_angles")
      .eq("author_id", author_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const bookContext = `
Book: "${book.title}"${book.subtitle ? ` – ${book.subtitle}` : ""}
Genre: ${book.genre || "Non-fiction"}
Author: ${profile?.pen_name || book.author_name || "Unknown"}
Description: ${book.description || "N/A"}
Author Bio: ${profile?.bio_short || profile?.bio_long || "N/A"}
Tagline: ${profile?.tagline || "N/A"}
${contextData?.core_thesis ? `Core Thesis: ${contextData.core_thesis}` : ""}
${contextData?.key_frameworks ? `Key Frameworks: ${JSON.stringify(contextData.key_frameworks)}` : ""}
${contextData?.target_audience_persona ? `Target Audience: ${JSON.stringify(contextData.target_audience_persona)}` : ""}
${contextData?.unique_insights ? `Unique Insights: ${JSON.stringify(contextData.unique_insights)}` : ""}
`.trim();

    const systemPrompt = `You are ABBY, the AI marketing engine for Authors Bureau. You generate high-converting marketing content from book manuscripts and author profiles. Always respond with valid JSON.`;

    // Generate all 7 asset types in parallel
    const assetPrompts: Record<string, string> = {
      landing_page: `Generate landing page copy for this book. Return JSON: { "headline": "...", "subheadline": "...", "hero_description": "...", "benefits": ["..."], "cta_text": "...", "social_proof_text": "...", "about_author": "..." }\n\n${bookContext}`,
      lead_magnet_outline: `Create a compelling lead magnet outline (free PDF guide) derived from this book. Return JSON: { "title": "...", "subtitle": "...", "description": "...", "chapters": [{ "title": "...", "summary": "..." }], "opt_in_headline": "...", "opt_in_subheadline": "..." }\n\n${bookContext}`,
      social_calendar: `Create a 30-day social media content calendar. Return JSON: { "posts": [{ "day": 1, "platform": "LinkedIn|Instagram|Twitter", "type": "quote|tip|story|engagement", "content": "...", "hashtags": ["..."] }] }. Generate exactly 30 posts.\n\n${bookContext}`,
      blog_post: `Write 3 blog post drafts derived from the book's key themes. Return JSON: { "posts": [{ "title": "...", "meta_description": "...", "outline": ["..."], "intro_paragraph": "...", "word_count_target": 800 }] }\n\n${bookContext}`,
      amazon_aplus: `Generate Amazon A+ content for this book. Return JSON: { "brand_story": "...", "comparison_chart_items": [{ "feature": "...", "description": "..." }], "module_headlines": ["..."], "key_selling_points": ["..."] }\n\n${bookContext}`,
      ad_copy: `Create ad copy variations for Facebook and Google. Return JSON: { "facebook": [{ "headline": "...", "primary_text": "...", "description": "...", "cta": "..." }], "google": [{ "headline_1": "...", "headline_2": "...", "description": "..." }] }. Generate 3 variations each.\n\n${bookContext}`,
      review_kit: `Create a book review outreach kit. Return JSON: { "press_release": "...", "reviewer_pitch_email": { "subject": "...", "body": "..." }, "key_talking_points": ["..."], "suggested_interview_questions": ["..."], "one_sheet_bio": "..." }\n\n${bookContext}`,
    };

    const assetResults = await Promise.allSettled(
      Object.entries(assetPrompts).map(async ([type, prompt]) => {
        const raw = await callAI(prompt, systemPrompt);
        const parsed = parseJSON(raw);
        return { type, content: parsed || { raw_text: raw } };
      })
    );

    // Save to marketing_assets table
    const savedAssets: any[] = [];
    for (const result of assetResults) {
      if (result.status === "fulfilled") {
        const { type, content } = result.value;
        const { data, error } = await supabase.from("marketing_assets").upsert(
          {
            book_id,
            author_id,
            asset_type: type,
            content,
            status: "draft",
          },
          { onConflict: "book_id,author_id,asset_type", ignoreDuplicates: false }
        );
        // We need a unique constraint for upsert - fall back to delete+insert
        if (error?.code === "42P10") {
          // No unique constraint, use delete then insert
          await supabase.from("marketing_assets")
            .delete()
            .eq("book_id", book_id)
            .eq("author_id", author_id)
            .eq("asset_type", type);
          await supabase.from("marketing_assets").insert({
            book_id, author_id, asset_type: type, content, status: "draft",
          });
        }
        savedAssets.push({ type, status: "draft" });
      } else {
        console.error(`Failed to generate ${(result as any).reason}`);
        savedAssets.push({ type: "unknown", status: "failed", error: (result as any).reason?.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, assets: savedAssets, total: savedAssets.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("abby-generate-marketing-assets error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
