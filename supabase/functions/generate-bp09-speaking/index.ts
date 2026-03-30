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
          { role: "user", content: `Create a book sales and events strategy for ${author.pen_name}'s book '${ctx.book_title}'.

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
  "sales_kit_title": "e.g., ${ctx.book_title} — Event Sales Kit",
  "tagline": "Short punchy tagline for the sales kit",
  "event_types": [
    {
      "number": 1,
      "type": "Event type (e.g., 'Book Signing', 'Conference Booth', 'Workshop Back-of-Room')",
      "description": "2-3 sentences",
      "ideal_audience_size": "e.g., 50-200 attendees",
      "expected_conversion_rate": "e.g., 30-50%",
      "materials_needed": ["Material 1", "Material 2", "Material 3"],
      "tip": "One practical tip"
    }
  ],
  "pricing_tiers": [
    { "name": "Standard Paperback", "price_usd": 19.99, "description": "Regular edition" },
    { "name": "Signed Copy", "price_usd": 29.99, "description": "Personally signed by the author" },
    { "name": "Bundle (Book + Workbook)", "price_usd": 39.99, "description": "Book plus companion workbook" }
  ],
  "sales_materials": ["One-page sell sheet", "QR code card linking to online store", "Business cards with book cover", "Email capture sign-up sheet", "Table/booth display banner"],
  "post_event_sequence": ["Send thank-you email within 24 hours", "Add to email list with event tag", "Offer exclusive 48-hour bundle deal", "Invite to webinar or next event"],
  "revenue_projection": {
    "events_per_month": 2,
    "avg_books_sold": 40,
    "avg_revenue_per_event": 800,
    "monthly_projection": 1600
  },
  "who_its_for": "2-3 sentences",
  "suggested_price_usd": 19.99,
  "pricing_rationale": "Base book price for standard edition",
  "sales_page": {
    "headline": "Get your copy of ${ctx.book_title}",
    "subheadline": "Supporting subheadline",
    "pain_point": "2-3 sentences",
    "solution_statement": "2-3 sentences",
    "cta_button_text": "Buy Now"
  },
  "abby_summary": "2-3 sentence summary"
}

event_types must have exactly 3 items. pricing_tiers must have exactly 3 items. Make everything specific.` }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) throw new Error(`AI gateway error: ${aiRes.status}`);
    const aiData = await aiRes.json();
    let raw = aiData.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const content = JSON.parse(raw);

    await supabase.from("author_nodes").update({ status: "content_ready", content_json: content, personalised_name: content.sales_kit_title }).eq("author_id", author_id).eq("node_id", "BP-09");

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("generate-bp09 error:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
