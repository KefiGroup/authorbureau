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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: author } = await supabase
      .from("author_profiles")
      .select("pen_name")
      .eq("id", author_id)
      .single();

    if (!author) throw new Error("Author not found");

    const { data: ctx } = await supabase
      .from("author_context")
      .select("book_title")
      .eq("author_id", author_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get live nodes
    const { data: liveNodes } = await supabase
      .from("author_nodes")
      .select("node_id, node_name, activated_at")
      .eq("author_id", author_id)
      .eq("status", "live")
      .order("activated_at", { ascending: false });

    const nodesLive = liveNodes?.length || 0;
    const lastNode = liveNodes?.[0];

    // Get latest snapshot
    const { data: snapshot } = await supabase
      .from("author_revenue_snapshots")
      .select("*")
      .eq("author_id", author_id)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          {
            role: "system",
            content: "You are ABBY, the AI business coach for Authors Bureau. Generate a short, encouraging, and actionable daily insight. Do not mention GHL, Stripe, Supabase, or any technical tools. Respond with plain text only, 2-3 sentences.",
          },
          {
            role: "user",
            content: `Generate a daily insight for this author:
- Author name: ${author.pen_name || "Author"}
- Book title: ${ctx?.book_title || "their book"}
- Nodes live: ${nodesLive} of 28 total
- Email subscribers: ${snapshot?.email_subscribers || 0}
- Pipeline value: $${snapshot?.pipeline_value_usd || 0}
- Revenue this month: $${snapshot?.stripe_revenue_mtd_usd || 0}
- Most recently activated node: ${lastNode?.node_name || "None yet"}

Write 2-3 sentences. Be specific, positive, and suggest one concrete next action.`,
          },
        ],
        temperature: 0.8,
        max_tokens: 200,
      }),
    });

    if (!aiRes.ok) throw new Error(`AI error: ${aiRes.status}`);
    const aiData = await aiRes.json();
    const insight = aiData.choices?.[0]?.message?.content?.trim() || "Keep building your author business — every node you activate brings you closer to your revenue goals!";

    return new Response(
      JSON.stringify({ success: true, insight, nodes_live: nodesLive }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-daily-insight error:", err.message);
    return new Response(
      JSON.stringify({
        success: true,
        insight: "Welcome to your Revenue Dashboard! Start activating nodes to see your earnings grow.",
        nodes_live: 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
