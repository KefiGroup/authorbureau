/**
 * generate-bp00-analysis
 * ----------------------
 * Runs ABBY's book analysis for a SPECIFIC book and writes an
 * author_context row keyed on (author_id, book_id).
 *
 * Each book gets its own analysis row. This is the prerequisite for every
 * framework-heavy generator (BP-01..05, BA-10..18, YR-19..28). If a generator
 * sees no context row for the active book it returns `contextBlocked` and the
 * UI prompts the author to run this function.
 *
 * Body: { author_id: string, book_id: string }
 * Returns: { success: true, content } | { success: false, error }
 */
// @ts-nocheck — Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAiGateway } from "../_shared/builder-helpers.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function fail(error: string, status = 200) {
  return new Response(
    JSON.stringify({ success: false, error }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { author_id, book_id } = await req.json();
    if (!author_id) return fail("author_id is required");
    if (!book_id) return fail("book_id is required — analysis must be book-specific");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return fail("AI service not configured");

    // Resolve author + book and verify ownership
    const { data: author } = await supabase
      .from("author_profiles")
      .select("pen_name, genres, user_id")
      .eq("id", author_id)
      .maybeSingle();
    if (!author) return fail("Author profile not found");

    const { data: book } = await supabase
      .from("books")
      .select("id, title, subtitle, description, genre, amazon_url, author_id, owner_email")
      .eq("id", book_id)
      .maybeSingle();
    if (!book) return fail("Book not found");

    // Ownership check (book.author_id is auth.users.id; author_profiles.user_id matches)
    let userEmail: string | null = null;
    if (author.user_id) {
      const { data: u } = await supabase.auth.admin.getUserById(author.user_id);
      userEmail = u?.user?.email ?? null;
    }
    const ownsByUser = author.user_id && book.author_id === author.user_id;
    const ownsByEmail = userEmail && book.owner_email === userEmail;
    if (!ownsByUser && !ownsByEmail) {
      return fail("This book does not belong to this author");
    }

    if (!book.title) return fail("Book is missing a title — please complete the book profile first");

    const searchContext = [
      `Book title: "${book.title}"`,
      book.subtitle ? `Subtitle: ${book.subtitle}` : null,
      book.description ? `Description: ${book.description}` : null,
      
      book.amazon_url ? `Amazon URL: ${book.amazon_url}` : null,
      author.pen_name ? `Author: ${author.pen_name}` : null,
      book.genre ? `Genre: ${book.genre}` : null,
    ].filter(Boolean).join("\n");

    const aiRes = await fetchAiGateway({
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
            content:
              "You are ABBY, the AI business agent for Authors Bureau. You research published books and extract commercial intelligence. CRITICAL: write everything specifically for the EXACT book title and description provided — never substitute a different topic, niche, or domain. Always respond with valid JSON only — no markdown, no code fences.",
          },
          {
            role: "user",
            content: `Research this book and extract commercial intelligence:

${searchContext}

Return JSON with these exact keys:
{
  "book_title": "Exact book title",
  "book_subtitle": "Subtitle or null",
  "core_thesis": "Central argument in 2-3 sentences, specific to THIS book",
  "key_frameworks": ["Framework 1","Framework 2","Framework 3","Framework 4","Framework 5"],
  "target_audience_persona": {
    "demographics": "Age, profession, life stage",
    "psychographics": "Values, pain points, aspirations",
    "buying_triggers": "What makes them buy this book"
  },
  "unique_insights": ["Insight 1","Insight 2","Insight 3"],
  "commercial_angles": ["Angle 1","Angle 2","Angle 3"],
  "competitor_books": [{"title":"...","author":"...","differentiation":"..."}],
  "review_themes": ["Theme 1","Theme 2","Theme 3"],
  "review_count_estimate": 50,
  "genre": "Primary genre",
  "abby_message": "I have analysed your book [Title] and identified [N] commercial opportunities. Here is what stands out: [brief specific insight]."
}

Be specific. Never default to generic finance, business, or self-help content unless that is exactly what THIS book is about.`,
          },
        ],
      }),
    }, "generate-bp00-analysis");

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("[bp00] AI gateway error", aiRes.status, txt);
      if (aiRes.status === 429) return fail("ABBY is overloaded — please retry in a few seconds");
      if (aiRes.status === 402) return fail("AI credits exhausted — please top up in Settings → Workspace → Usage");
      return fail(`AI generation failed (${aiRes.status})`);
    }

    const aiData = await aiRes.json();
    let raw: string = aiData.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    let content: any;
    try {
      content = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) return fail("AI response did not contain valid JSON");
      content = JSON.parse(m[0].replace(/,\s*([}\]])/g, "$1"));
    }

    const payload = {
      author_id,
      book_id,
      book_title: content.book_title || book.title,
      book_subtitle: content.book_subtitle || book.subtitle || null,
      core_thesis: content.core_thesis || book.description || "",
      key_frameworks: content.key_frameworks || [],
      target_audience_persona: content.target_audience_persona || {},
      unique_insights: content.unique_insights || [],
      commercial_angles: content.commercial_angles || [],
      competitor_books: content.competitor_books || [],
      parsed_at: new Date().toISOString(),
    };

    // Upsert by (author_id, book_id) — uniqueness enforced by partial index
    const { data: existing } = await supabase
      .from("author_context")
      .select("id")
      .eq("author_id", author_id)
      .eq("book_id", book_id)
      .maybeSingle();

    if (existing?.id) {
      const { error: upErr } = await supabase
        .from("author_context")
        .update(payload)
        .eq("id", existing.id);
      if (upErr) {
        console.error("[bp00] update failed", upErr);
        return fail(`Failed to save analysis: ${upErr.message}`);
      }
    } else {
      const { error: insErr } = await supabase.from("author_context").insert(payload);
      if (insErr) {
        console.error("[bp00] insert failed", insErr);
        return fail(`Failed to save analysis: ${insErr.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        content,
        abby_message: content.abby_message,
        review_count: content.review_count_estimate,
        commercial_opportunities: content.commercial_angles?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("generate-bp00-analysis error:", msg);
    return fail(msg);
  }
});
