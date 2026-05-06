// Generate + send ABBY's daily business report for a single author.
// Triggered by: abby-daily-report-dispatcher (cron) OR manual UI invoke.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAiGateway } from "../_shared/builder-helpers.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { author_id, dry_run = false, frequency: bodyFreq } = await req.json();
    if (!author_id) throw new Error("author_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Author + email
    const { data: author } = await supabase
      .from("author_profiles")
      .select("id, pen_name, user_id, author_slug, report_frequency")
      .eq("id", author_id)
      .maybeSingle();
    if (!author) throw new Error("Author not found");

    const frequency: "daily" | "weekly" | "monthly" =
      (bodyFreq as any) || (author as any).report_frequency || "weekly";
    const periodLabel = frequency === "daily" ? "Yesterday"
      : frequency === "weekly" ? "This week" : "This month";
    const frequencyLabel = frequency === "daily" ? "daily"
      : frequency === "weekly" ? "weekly" : "monthly";
    const windowDays = frequency === "daily" ? 1 : frequency === "weekly" ? 7 : 30;

    const { data: userData } = await supabase.auth.admin.getUserById(author.user_id);
    const email = userData?.user?.email;
    if (!email) throw new Error("No email for author");

    // 2. Stats — period window scaled to author's chosen frequency
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setUTCDate(now.getUTCDate() - windowDays);
    periodStart.setUTCHours(0, 0, 0, 0);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [leadsPeriodRes, purchasesPeriodRes, purchasesMonthRes, nodesRes, hotLeadsRes] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true })
        .eq("author_id", author_id)
        .gte("created_at", periodStart.toISOString()),
      supabase.from("purchases").select("amount")
        .eq("author_id", author_id)
        .gte("created_at", periodStart.toISOString())
        .is("refunded_at", null),
      supabase.from("purchases").select("amount")
        .eq("author_id", author_id)
        .gte("created_at", monthStart.toISOString())
        .is("refunded_at", null),
      supabase.from("author_nodes").select("node_id, node_name", { count: "exact" })
        .eq("author_id", author_id)
        .eq("status", "live"),
      supabase.from("leads").select("id, name, email, abby_score")
        .eq("author_id", author_id)
        .gte("abby_score", 60)
        .order("last_activity_at", { ascending: false })
        .limit(5),
    ]);

    const revenuePeriod = (purchasesPeriodRes.data || []).reduce(
      (s: number, r: any) => s + Number(r.amount || 0), 0,
    );
    const revenueMonth = (purchasesMonthRes.data || []).reduce(
      (sum: number, r: any) => sum + Number(r.amount || 0), 0,
    );

    const stats = {
      leadsPeriod: leadsPeriodRes.count || 0,
      revenuePeriod,
      revenueMonth,
      activeNodes: nodesRes.count || 0,
      hotLeads: hotLeadsRes.data?.length || 0,
    };

    // 3. AI insight (Lovable AI Gateway, gemini-3-flash-preview for fast chat)
    let insight = "Keep building — every node you activate brings new revenue.";
    let topAction = "Open your dashboard and review your hot leads.";

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (apiKey) {
      try {
        const aiRes = await fetchAiGateway({
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: "You are ABBY, an AI business advisor for indie authors. Reply with valid JSON only: {\"insight\": string (2 sentences, encouraging + specific), \"top_action\": string (1 concrete action, max 15 words)}. No markdown, no preamble.",
              },
              {
                role: "user",
                content: `Author: ${author.pen_name || "the author"}
Cadence: ${frequencyLabel} report (${periodLabel})
${periodLabel}: ${stats.leadsPeriod} new leads, $${stats.revenuePeriod} revenue
Revenue MTD: $${stats.revenueMonth}
Live nodes: ${stats.activeNodes} of 28
Hot leads waiting: ${stats.hotLeads}

Generate this report's insight and top action.`,
              },
            ],
            max_completion_tokens: 300,
          }),
        }, "abby-daily-report");
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const raw = aiData.choices?.[0]?.message?.content?.trim() || "";
          const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
          try {
            const parsed = JSON.parse(cleaned);
            if (parsed.insight) insight = parsed.insight;
            if (parsed.top_action) topAction = parsed.top_action;
          } catch { /* fallback to defaults */ }
        }
      } catch (e) {
        console.warn("AI insight failed:", e);
      }
    }

    if (dry_run) {
      return new Response(
        JSON.stringify({ success: true, status: 200, message: "dry run", stats, insight, topAction, email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. Send transactional email
    const today = now.toISOString().slice(0, 10);
    const sendRes = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "abby-daily-report",
        recipientEmail: email,
        idempotencyKey: `abby-${frequency}-${author_id}-${today}`,
        templateData: {
          authorName: author.pen_name || "Author",
          insight,
          topAction,
          frequencyLabel,
          periodLabel,
          leadsPeriod: stats.leadsPeriod,
          revenuePeriod: stats.revenuePeriod,
          revenueMonth: stats.revenueMonth,
          activeNodes: stats.activeNodes,
          hotLeads: stats.hotLeads,
          dashboardUrl: "https://authorsbureau.com/dashboard",
        },
      },
    });

    return new Response(
      JSON.stringify({ success: true, status: 200, message: "Sent", stats, sent_to: email, send_result: sendRes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("abby-daily-report error:", msg);
    return new Response(
      JSON.stringify({ success: false, status: 500, message: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
