// @ts-nocheck — Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAuthorContext, upsertAuthorNode } from "../_shared/builder-helpers.ts";

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
    const { author_id, book_id } = await req.json();
    if (!author_id) throw new Error("author_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: author, error: authorErr } = await supabase
      .from("author_profiles")
      .select("pen_name, genres, user_id")
      .eq("id", author_id)
      .single();
    if (authorErr || !author) throw new Error("Author profile not found");

    const ctxBundle = await buildAuthorContext(supabase, author_id, author.user_id, book_id ?? null, "BP-04");
    if (ctxBundle.contextBlocked) {
      return new Response(
        JSON.stringify({
          success: false,
          status: "context_blocked",
          node_id: "BP-04",
          error: "Please run the book analysis for this specific book before generating Author Website. This prevents content from leaking between your books.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const context = ctxBundle.ctx;
    const resolvedBookId = ctxBundle.book?.id ?? book_id ?? null;

    const authorName = author.pen_name || "Author";
    const bookTitle = ctxBundle.bookTitle;
    const bookSubtitle = ctxBundle.bookSubtitle;
    const coreThesis = ctxBundle.coreThesis;
    const keyFrameworks = context?.key_frameworks ? JSON.stringify(context.key_frameworks) : "N/A";
    const audiencePersona = context?.target_audience_persona ? JSON.stringify(context.target_audience_persona) : "general readers";
    const uniqueInsights = context?.unique_insights ? JSON.stringify(context.unique_insights) : "N/A";
    const genre = Array.isArray(author.genres) ? author.genres[0] || ctxBundle.book?.genre || "Non-fiction" : ctxBundle.book?.genre || "Non-fiction";

    if (!bookTitle) {
      throw new Error("No book found for this author. Please complete your book profile first.");
    }

    const systemPrompt = `You are ABBY, the AI business agent for Authors Bureau. You help authors turn their books into complete business empires. You are warm, expert, and encouraging.

CRITICAL ANTI-HALLUCINATION RULES:
1. You MUST write everything specifically for the EXACT book title, subtitle, and core thesis provided by the user. The book title appears verbatim in the user prompt — copy it exactly, never paraphrase or invent a new title.
2. NEVER substitute a different topic, niche, or domain — even if the title or thesis seems unusual or unfamiliar.
3. NEVER default to generic finance, business, self-help, leadership, or productivity content unless the user prompt explicitly says the book is about that topic.
4. The "site_name" must include the author's pen name exactly as provided. The "book_page.headline" and "book_page.book_description" MUST reference the exact book title verbatim at least once.
5. Derive the niche/genre ONLY from the "Genre/Niche" and "Core thesis" fields supplied. If both are missing, ask for them via "abby_summary" — do NOT fabricate.
6. Always respond with valid JSON only — no markdown, no code fences, no commentary outside the JSON object.`;

    const userPrompt = `Create complete author website copy for ${authorName}'s book '${bookTitle}'.

Author details:
- Author name: ${authorName}
- Book title: ${bookTitle}
- Book subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis || "N/A"}
- Target audience: ${audiencePersona}
- Key frameworks: ${keyFrameworks}
- Unique insights: ${uniqueInsights}
- Genre/Niche: ${genre}

Generate the following as a JSON object with these exact keys:
{
  "site_name": "The website name (e.g., ${authorName} | Author & Expert)",
  "tagline": "A compelling one-line tagline for the author brand",
  "homepage": {
    "hero_headline": "Main headline for the homepage hero section",
    "hero_subheadline": "Supporting subheadline (1-2 sentences)",
    "hero_cta_primary": "Primary CTA button text",
    "hero_cta_secondary": "Secondary CTA button text",
    "about_teaser": "A 2-3 sentence teaser about the author",
    "book_teaser": "A 2-3 sentence teaser about the book",
    "social_proof_headline": "Headline for the testimonials section",
    "placeholder_testimonials": [
      { "quote": "A realistic placeholder testimonial (2-3 sentences)", "name": "Reader Name", "title": "Title or Role" },
      { "quote": "A second realistic placeholder testimonial", "name": "Reader Name 2", "title": "Title or Role 2" }
    ]
  },
  "about_page": {
    "headline": "Headline for the About page",
    "bio_short": "A short 2-3 sentence bio",
    "bio_long": "A full 4-6 paragraph author bio",
    "credentials": ["Credential 1", "Credential 2", "Credential 3"],
    "personal_note": "A short personal note from the author (2-3 sentences)"
  },
  "book_page": {
    "headline": "Headline for the book page",
    "book_description": "Full book description (3-4 paragraphs)",
    "what_youll_learn": ["Takeaway 1", "Takeaway 2", "Takeaway 3", "Takeaway 4", "Takeaway 5"],
    "who_its_for": "A 2-3 sentence description of who this book is for",
    "buy_cta": "CTA button text for buying",
    "bonus_offer": "A free bonus offer for book buyers"
  },
  "contact_page": {
    "headline": "Headline for the contact page",
    "intro_text": "1-2 sentence intro",
    "speaking_topics": ["Topic 1", "Topic 2", "Topic 3"],
    "media_note": "A short note for media/press inquiries"
  },
  "seo": {
    "meta_title": "SEO meta title (under 60 characters)",
    "meta_description": "SEO meta description (under 160 characters)",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
  },
  "abby_summary": "A 2-3 sentence summary from ABBY explaining what she created"
}

Make everything specific to this author's book, niche, and audience. Never use generic placeholder text except where explicitly marked as 'placeholder' (testimonials only).`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    console.log("[generate-bp04] Inputs:", {
      author_id,
      authorName,
      bookTitle,
      hasContext: !!context,
      promptLength: userPrompt.length,
    });

    let aiResponse: Response;
    try {
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-5.2",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_completion_tokens: 6000,
        }),
      });
    } catch (fetchErr) {
      console.error("[generate-bp04] Network error calling AI gateway:", fetchErr);
      throw new Error("Network error reaching AI gateway");
    }

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[generate-bp04] AI gateway error", aiResponse.status, errText);
      if (aiResponse.status === 429) throw new Error("Rate limit exceeded — please try again in a moment");
      if (aiResponse.status === 402) throw new Error("Payment required — AI credits exhausted");
      throw new Error(`AI generation failed (status ${aiResponse.status})`);
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
        parsedContent = JSON.parse(match[0].replace(/,\s*([}\]])/g, "$1"));
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    try {
      await upsertAuthorNode(
        supabase,
        author_id,
        "BP-04",
        "Author Website",
        {
          status: "content_ready",
          content_json: parsedContent,
          personalised_name: (parsedContent as any).site_name || "Author Website",
        },
        resolvedBookId,
      );
    } catch (e) {
      console.error("Failed to upsert author_nodes BP-04:", e);
    }

    return new Response(
      JSON.stringify({ success: true, content: parsedContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("generate-bp04 error:", errMessage);
    return new Response(
      JSON.stringify({ success: false, error: errMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
