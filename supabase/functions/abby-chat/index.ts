import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAiGateway } from "../_shared/builder-helpers.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { message, conversation_history = [] } = await req.json();
    if (!message || typeof message !== "string" || message.length > 3000) {
      return new Response(JSON.stringify({ error: "Invalid message" }), { status: 400, headers: corsHeaders });
    }

    // Load author context
    const { data: profile } = await supabase
      .from("author_profiles")
      .select("id, pen_name, subscription_tier, onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "No author profile found" }), { status: 404, headers: corsHeaders });
    }

    const authorId = profile.id;
    const penName = profile.pen_name || "Author";

    // Load book context
    const { data: context } = await supabase
      .from("author_context")
      .select("book_title, core_thesis, key_frameworks, target_audience_persona")
      .eq("author_id", authorId)
      .limit(1)
      .maybeSingle();

    // Load nodes summary
    const { data: nodes } = await supabase
      .from("author_nodes")
      .select("node_id, node_name, status")
      .eq("author_id", authorId);

    const liveNodes = (nodes || []).filter((n: any) => n.status === "live");
    const notStartedNodes = (nodes || []).filter((n: any) => n.status === "not_started");

    // Load last 3 revenue snapshots
    const { data: snapshots } = await supabase
      .from("author_revenue_snapshots")
      .select("*")
      .eq("author_id", authorId)
      .order("snapshot_date", { ascending: false })
      .limit(3);

    const latest = snapshots?.[0] || {};
    const prev = snapshots?.[1] || {};

    // Calculate trend
    const revMtd = (latest as any).stripe_revenue_mtd_usd || 0;
    const prevMtd = (prev as any).stripe_revenue_mtd_usd || 0;
    let trendDesc = "no previous data available";
    if (prevMtd > 0) {
      const pctChange = ((revMtd - prevMtd) / prevMtd * 100).toFixed(0);
      trendDesc = Number(pctChange) >= 0 ? `up ${pctChange}% from last period` : `down ${Math.abs(Number(pctChange))}% from last period`;
    }

    // Load unread nudges
    const { data: nudges } = await supabase
      .from("abby_nudges")
      .select("title, content")
      .eq("author_id", authorId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(5);

    const systemPrompt = `You are ABBY, the AI business coach for Authors Bureau. You are warm, encouraging, specific, and always action-oriented.

AUTHOR CONTEXT:
- Name: ${penName}
- Book: "${context?.book_title || "Not yet added"}"
- Core thesis: ${context?.core_thesis || "Not available"}
- Target audience: ${JSON.stringify(context?.target_audience_persona || "Not defined")}
- Subscription tier: ${profile.subscription_tier}

BUSINESS STATUS:
- Nodes live: ${liveNodes.length} of 28 total
- Live nodes: ${liveNodes.map((n: any) => n.node_name).join(", ") || "None yet"}
- Not yet started: ${notStartedNodes.map((n: any) => n.node_name).join(", ") || "None"}
- Email subscribers: ${(latest as any).email_subscribers || 0}
- Pipeline value: $${(latest as any).pipeline_value_usd || 0}
- Revenue this month: $${revMtd}
- Revenue this year: $${(latest as any).stripe_revenue_ytd_usd || 0}
- Revenue trend: ${trendDesc}

${nudges && nudges.length > 0 ? `RECENT COACHING NUDGES (reference if relevant):\n${nudges.map((n: any) => `- ${n.title}: ${n.content}`).join("\n")}` : ""}

YOUR RULES:
1. Always be specific — reference the author's actual data, book title, and node names
2. Never mention GHL, Stripe, Supabase, Thinkific, Transistor, or any technical tools
3. Always suggest one concrete next action at the end of your response
4. Celebrate wins, no matter how small
5. Keep responses to 3-5 sentences unless the question requires more detail
6. Use markdown formatting for lists and emphasis where helpful
7. Never make the author feel behind or inadequate
8. If asked about revenue projections, use the actual node data to calculate realistic estimates`;

    // Call AI
    const aiResp = await fetchAiGateway({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversation_history.slice(-40),
          { role: "user", content: message },
        ],
        max_completion_tokens: 800,
      }),
    }, "abby-chat");

    if (!aiResp.ok) {
      console.error("AI error:", await aiResp.text());
      return new Response(JSON.stringify({ error: "AI generation failed" }), { status: 500, headers: corsHeaders });
    }

    const aiData = await aiResp.json();
    const reply = aiData.choices?.[0]?.message?.content || "I'm here to help! Could you rephrase your question?";

    // Save both messages to abby_conversations
    await supabase.from("abby_conversations").insert([
      { author_id: authorId, role: "user", content: message },
      { author_id: authorId, role: "abby", content: reply },
    ]);

    return new Response(JSON.stringify({ success: true, reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("abby-chat error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
