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
    if (!ctx) throw new Error("No author context found. Please complete your book profile first.");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const aiRes = await fetch("https://ai-gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: "You are ABBY, the AI business agent for Authors Bureau. You help authors turn their books into complete business empires. You are warm, expert, and encouraging. You always personalise everything to the author's specific book, audience, and niche. Never be generic. Always respond with valid JSON only — no markdown, no code fences." },
          { role: "user", content: `Create a complete online course for ${author.pen_name}'s book '${ctx.book_title}'.

Author details:
- Author name: ${author.pen_name}
- Book title: ${ctx.book_title}
- Book subtitle: ${ctx.book_subtitle || "N/A"}
- Core thesis: ${ctx.core_thesis}
- Target audience: ${JSON.stringify(ctx.target_audience_persona)}
- Key frameworks: ${JSON.stringify(ctx.key_frameworks)}
- Unique insights: ${JSON.stringify(ctx.unique_insights)}
- Genre/Niche: ${author.genres?.[0] || "General"}

Generate the following as a JSON object with these exact keys:
{
  "course_title": "Compelling course title (specific, transformation-focused)",
  "course_subtitle": "One-line subtitle",
  "tagline": "A short punchy tagline (under 10 words)",
  "duration": "e.g., 6 weeks, 8 modules",
  "format": "e.g., Video + Workbook, Self-paced",
  "transformation_promise": "One sentence: the core transformation students will experience",
  "modules": [
    {
      "number": 1,
      "title": "Module title",
      "description": "2-3 sentences describing what students learn",
      "lessons": ["Lesson 1", "Lesson 2", "Lesson 3"],
      "outcome": "One sentence: what students can DO after this module"
    }
  ],
  "who_its_for": "2-3 sentences describing the ideal student",
  "what_youll_get": ["Deliverable 1", "Deliverable 2", "Deliverable 3", "Deliverable 4"],
  "suggested_price_usd": 497,
  "pricing_rationale": "One sentence explaining the price",
  "sales_page": {
    "headline": "Sales page headline",
    "subheadline": "Supporting subheadline",
    "pain_point": "2-3 sentences describing the problem",
    "solution_statement": "2-3 sentences positioning the course as the solution",
    "cta_button_text": "e.g., Enrol Now"
  },
  "abby_summary": "2-3 sentence summary from ABBY"
}

The modules array must have exactly 6 items. Make everything specific to this author's book.` }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) throw new Error(`AI gateway error: ${aiRes.status}`);
    const aiData = await aiRes.json();
    let raw = aiData.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const content = JSON.parse(raw);

    await supabase.from("author_nodes").update({
      status: "content_ready",
      content_json: content,
      personalised_name: content.course_title,
    }).eq("author_id", author_id).eq("node_id", "BP-06");

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("generate-bp06 error:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
