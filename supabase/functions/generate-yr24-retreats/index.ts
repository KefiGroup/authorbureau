import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { author_id } = await req.json();
    if (!author_id) throw new Error("author_id is required");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: author } = await supabase.from("author_profiles").select("pen_name, genres").eq("id", author_id).single();
    if (!author) throw new Error("Author not found");
    const { data: ctx } = await supabase.from("author_context").select("*").eq("author_id", author_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!ctx) throw new Error("No author context found");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST", headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-5", messages: [
        { role: "system", content: "You are ABBY. Personalise everything. Respond with valid JSON only." },
        { role: "user", content: `Design a complete retreat experience for ${author.pen_name}'s book '${ctx.book_title}'. Core thesis: ${ctx.core_thesis}. Audience: ${JSON.stringify(ctx.target_audience_persona)}. Frameworks: ${JSON.stringify(ctx.key_frameworks)}.
Generate JSON: {"retreat_title","tagline","retreat_concept","retreat_options":[2: Weekend($3000/person, 3 days/2 nights, 10-15 ppl) and Week-Long($10000/person, 7 days/6 nights, 8-10 ppl), each with format/duration/location_type/group_size/price_per_person_usd/includes[5-7]],"sample_itinerary":[3 days, each with day/title/morning/afternoon/evening],"transformation_arc","abby_summary"}` }
      ], temperature: 0.7 }),
    });
    if (!aiRes.ok) throw new Error(`AI error: ${aiRes.status}`);
    const aiData = await aiRes.json();
    let raw = aiData.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const content = JSON.parse(raw);
    await supabase.from("author_nodes").update({ status: "content_ready", content_json: content, personalised_name: content.retreat_title }).eq("author_id", author_id).eq("node_id", "YR-24");
    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) { console.error("generate-yr24 error:", err.message); return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
});
