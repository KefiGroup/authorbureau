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

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: "You are ABBY, the AI business agent for Authors Bureau. Always personalise everything. Always respond with valid JSON only — no markdown, no code fences." },
          { role: "user", content: `Create special edition book concepts for ${author.pen_name}'s book '${ctx.book_title}'.

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
  "edition_title": "Special Edition collection title",
  "edition_subtitle": "One-line subtitle",
  "tagline": "Short punchy tagline",
  "editions": [
    {
      "number": 1,
      "name": "Edition name (e.g., 'Signed Collector's Edition')",
      "description": "2-3 sentences describing this edition",
      "includes": ["Item 1", "Item 2", "Item 3"],
      "print_specs": "e.g., Hardcover, gold foil, ribbon bookmark",
      "suggested_price_usd": 49
    }
  ],
  "bundle_offer": {
    "name": "Complete Collection Bundle",
    "description": "2-3 sentences",
    "includes_editions": [1, 2, 3],
    "suggested_price_usd": 129,
    "savings_note": "Save $X vs buying separately"
  },
  "who_its_for": "2-3 sentences",
  "marketing_angle": "2-3 sentences on positioning",
  "suggested_price_usd": 49,
  "pricing_rationale": "One sentence",
  "sales_page": {
    "headline": "Sales page headline",
    "subheadline": "Supporting subheadline",
    "exclusivity_statement": "2-3 sentences about limited availability",
    "cta_button_text": "e.g., Order Special Edition"
  },
  "abby_summary": "2-3 sentence summary"
}

editions must have exactly 3 items (e.g., Signed Edition, Gift Box Edition, VIP Edition). Make everything specific.` }
        ],
      }),
    });

    if (!aiRes.ok) throw new Error(`AI gateway error: ${aiRes.status}`);
    const aiData = await aiRes.json();
    let raw = aiData.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const content = JSON.parse(raw);

    await supabase.from("author_nodes").update({ status: "content_ready", content_json: content, personalised_name: content.edition_title }).eq("author_id", author_id).eq("node_id", "BP-08");

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("generate-bp08 error:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
