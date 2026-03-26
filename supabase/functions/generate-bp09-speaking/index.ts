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

    const { data: author } = await supabase.from("author_profiles").select("pen_name, genres").eq("id", author_id).single();
    if (!author) throw new Error("Author not found");

    const { data: ctx } = await supabase.from("author_context").select("*").eq("author_id", author_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!ctx) throw new Error("No author context found.");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const aiRes = await fetch("https://ai-gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: "You are ABBY, the AI business agent for Authors Bureau. Always personalise everything. Always respond with valid JSON only — no markdown, no code fences." },
          { role: "user", content: `Create a complete speaking business for ${author.pen_name}'s book '${ctx.book_title}'.

Author details:
- Author name: ${author.pen_name}
- Book title: ${ctx.book_title}
- Book subtitle: ${ctx.book_subtitle || "N/A"}
- Core thesis: ${ctx.core_thesis}
- Target audience: ${JSON.stringify(ctx.target_audience_persona)}
- Key frameworks: ${JSON.stringify(ctx.key_frameworks)}
- Unique insights: ${JSON.stringify(ctx.unique_insights)}
- Genre/Niche: ${author.genres?.[0] || "General"}

Generate as JSON with these exact keys:
{
  "speaker_title": "e.g., Author Name — Keynote Speaker & Author",
  "tagline": "Short punchy speaker tagline",
  "signature_talks": [
    {
      "number": 1,
      "title": "Talk title",
      "subtitle": "One-line subtitle",
      "duration_options": ["30 minutes", "45 minutes", "60 minutes"],
      "description": "2-3 sentences",
      "key_takeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
      "ideal_audience": "One sentence",
      "opening_hook": "Compelling one-sentence hook"
    }
  ],
  "recommended_talk": 1,
  "speaker_bio_short": "2-3 sentence speaker bio",
  "speaker_bio_long": "5-6 sentence full speaker bio",
  "speaking_topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"],
  "fee_structure": {
    "keynote_fee_usd": 5000,
    "half_day_fee_usd": 3000,
    "virtual_fee_usd": 1500,
    "fee_note": "One sentence about what's included"
  },
  "booking_page": { "headline": "...", "subheadline": "...", "cta_button_text": "Book to Speak" },
  "abby_summary": "2-3 sentence summary"
}

signature_talks must have exactly 3 items. Make everything specific.` }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) throw new Error(`AI gateway error: ${aiRes.status}`);
    const aiData = await aiRes.json();
    let raw = aiData.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const content = JSON.parse(raw);

    const recIdx = (content.recommended_talk || 1) - 1;
    await supabase.from("author_nodes").update({ status: "content_ready", content_json: content, personalised_name: content.signature_talks?.[recIdx]?.title || content.speaker_title }).eq("author_id", author_id).eq("node_id", "BP-09");

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("generate-bp09 error:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
