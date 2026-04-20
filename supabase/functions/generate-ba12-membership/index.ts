/**
 * generate-ba12-membership
 * ------------------------
 * Sprint 40 rewrite: SINGLE-TIER monthly membership model.
 * Generates name, tagline, 5 benefits, sales copy, 3 welcome emails, monthly
 * newsletter template, and a suggested monthly price. Writes to:
 *   - membership_content   (one row per author, upserted)
 *   - author_nodes.BA-12   (status, mirror, price_usd)
 *
 * Body: { author_id: string }
 */
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: author } = await supabase
      .from("author_profiles")
      .select("pen_name, genres")
      .eq("id", author_id)
      .single();
    if (!author) throw new Error("Author not found");

    const { data: ctx } = await supabase
      .from("author_context")
      .select("*")
      .eq("author_id", author_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!ctx) throw new Error("No author context found. Please complete your book profile first.");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          {
            role: "system",
            content:
              "You are ABBY for Authors Bureau. Design a SINGLE-TIER monthly membership community. Respond with ONLY valid JSON (no markdown, no code fences).",
          },
          {
            role: "user",
            content: `Design a monthly membership for ${author.pen_name}'s book '${ctx.book_title}'.

Book context:
- Author: ${author.pen_name}
- Title: ${ctx.book_title}
- Core thesis: ${ctx.core_thesis}
- Target audience: ${JSON.stringify(ctx.target_audience_persona)}
- Key frameworks: ${JSON.stringify(ctx.key_frameworks)}
- Genre: ${author.genres?.[0] || "General"}

Return JSON exactly in this shape:
{
  "membership_name": "string (memorable, branded — NOT just 'Book Club')",
  "tagline": "string (one-line promise)",
  "who_its_for": "string",
  "transformation_promise": "string",
  "benefits": [
    "5 specific benefits — each one sentence, member-facing"
  ],
  "monthly_price_usd": 27,
  "pricing_rationale": "string (1-2 sentences)",
  "sales_copy": {
    "headline": "string",
    "subheadline": "string",
    "problem": "string",
    "promise": "string",
    "what_you_get": ["string","string","string","string","string"],
    "cta": "string"
  },
  "welcome_emails": [
    { "day": 0, "subject": "string", "body": "string (4-6 sentences, signed by ${author.pen_name})" },
    { "day": 2, "subject": "string", "body": "string" },
    { "day": 5, "subject": "string", "body": "string" }
  ],
  "monthly_newsletter_template": {
    "subject_pattern": "string e.g. '${author.pen_name} Insider — {month} {year}'",
    "sections": ["Coach's note","Featured framework","Member spotlight","This month's challenge"]
  },
  "abby_summary": "string (1-2 sentences telling the author what was created)"
}

Rules:
- Single tier only (no Bronze/Silver/Gold tiers)
- Make every benefit and email specific to the book and audience`,
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

    const monthlyPrice = Number(content.monthly_price_usd ?? 27);

    // Upsert membership_content
    await supabase
      .from("membership_content")
      .upsert(
        {
          author_id,
          name: content.membership_name,
          tagline: content.tagline ?? null,
          benefits: content.benefits ?? [],
          sales_copy: content.sales_copy ?? {},
          welcome_emails: content.welcome_emails ?? [],
          monthly_newsletter_template: content.monthly_newsletter_template ?? null,
          monthly_price: monthlyPrice,
          currency: "usd",
          status: "draft",
        },
        { onConflict: "author_id" },
      );

    // Mirror to author_nodes
    await supabase
      .from("author_nodes")
      .update({
        status: "in_progress",
        content_json: content,
        personalised_name: content.membership_name,
        price_usd: monthlyPrice,
        currency: "usd",
        delivery_type: "membership",
      })
      .eq("author_id", author_id)
      .eq("node_id", "BA-12");

    return new Response(JSON.stringify({ success: true, content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("generate-ba12-membership error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
