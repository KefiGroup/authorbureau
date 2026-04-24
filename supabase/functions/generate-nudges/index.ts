import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { data: profile } = await supabase
      .from("author_profiles")
      .select("id, pen_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ success: true, nudges_created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authorId = profile.id;
    const penName = profile.pen_name || "Author";

    // Load current nodes
    const { data: nodes } = await supabase
      .from("author_nodes")
      .select("node_id, node_name, status, activated_at")
      .eq("author_id", authorId);

    const allNodes = nodes || [];
    const liveNodes = allNodes.filter((n: any) => n.status === "live");
    const nodesLive = liveNodes.length;
    const bpNodesLive = liveNodes.filter((n: any) => n.node_id.startsWith("BP")).length;

    // Load latest snapshots for trend comparison
    const { data: snapshots } = await supabase
      .from("author_revenue_snapshots")
      .select("*")
      .eq("author_id", authorId)
      .order("snapshot_date", { ascending: false })
      .limit(2);

    const latest = (snapshots?.[0] || {}) as any;
    const prev = (snapshots?.[1] || {}) as any;

    const emailSubs = latest.email_subscribers || 0;
    const emailSubsYesterday = prev.email_subscribers || 0;
    const revenueMtd = latest.stripe_revenue_mtd_usd || 0;
    const revenueMtdYesterday = prev.stripe_revenue_mtd_usd || 0;
    const revenueYtd = latest.stripe_revenue_ytd_usd || 0;
    const revenueYtdYesterday = prev.stripe_revenue_ytd_usd || 0;
    const nodesLiveYesterday = prev.nodes_live || 0;
    const bpNodesLiveYesterday = Math.min(bpNodesLive, nodesLiveYesterday); // approximate

    // Days since last node activation
    const activationDates = allNodes
      .filter((n: any) => n.activated_at)
      .map((n: any) => new Date(n.activated_at).getTime());
    const lastActivation = activationDates.length ? Math.max(...activationDates) : 0;
    const daysSinceLastActivation = lastActivation ? Math.floor((Date.now() - lastActivation) / (1000 * 60 * 60 * 24)) : 999;

    // Next recommended node
    const nodeOrder = [
      "BP-01", "BP-02", "BP-03", "BP-04", "BP-05", "BP-06", "BP-07", "BP-08", "BP-09",
      "BA-10", "BA-11", "BA-12", "BA-13", "BA-14", "BA-15", "BA-16", "BA-17", "BA-18",
      "YR-19", "YR-20", "YR-21", "YR-22", "YR-23", "YR-24", "YR-25", "YR-26", "YR-27", "YR-28",
    ];
    const liveIds = new Set(liveNodes.map((n: any) => n.node_id));
    const nextNode = nodeOrder.find((id) => !liveIds.has(id));
    const nextNodeObj = allNodes.find((n: any) => n.node_id === nextNode);
    const nextRecommendedNode = nextNodeObj?.node_name || "Email Marketing";
    const nextRecommendedNodeUrl = `/node-builder/${nextNode || "BP-01"}`;

    // Last live node name
    const lastLiveNode = liveNodes.length
      ? liveNodes.sort((a: any, b: any) => new Date(b.activated_at || 0).getTime() - new Date(a.activated_at || 0).getTime())[0]?.node_name
      : "";

    // Projected annual revenue (rough: $500/node/month)
    const projectedAnnual = nodesLive * 500 * 12;

    const data = {
      pen_name: penName,
      nodes_live: nodesLive,
      nodes_live_yesterday: nodesLiveYesterday,
      bp_nodes_live: bpNodesLive,
      bp_nodes_live_yesterday: bpNodesLiveYesterday,
      email_subscribers: emailSubs,
      email_subscribers_yesterday: emailSubsYesterday,
      revenue_mtd: revenueMtd,
      revenue_mtd_yesterday: revenueMtdYesterday,
      revenue_ytd: revenueYtd,
      revenue_ytd_yesterday: revenueYtdYesterday,
      days_since_last_node_activation: daysSinceLastActivation,
      next_recommended_node: nextRecommendedNode,
      next_recommended_node_url: nextRecommendedNodeUrl,
      last_live_node: lastLiveNode,
      projected_annual_revenue: projectedAnnual,
    };

    // ─── Seasonal Special Edition triggers (BP-08) ───
    // Universal occasions mirroring src/lib/special-edition-calendar.ts
    const SEASONAL_OCCASIONS: Array<{
      id: string;
      label: string;
      emoji: string;
      peakMonth: number; // 1-12
      peakDay: number;
      defaultEdition: string;
      defaultPrice: number;
    }> = [
      { id: "valentines", label: "Valentine's Day", emoji: "💝", peakMonth: 2, peakDay: 14, defaultEdition: "Signed Limited", defaultPrice: 49 },
      { id: "mothers-day", label: "Mother's Day", emoji: "🌷", peakMonth: 5, peakDay: 12, defaultEdition: "Hardcover Collector's", defaultPrice: 69 },
      { id: "fathers-day", label: "Father's Day", emoji: "🛡", peakMonth: 6, peakDay: 15, defaultEdition: "Signed Edition", defaultPrice: 59 },
      { id: "graduation", label: "Graduation", emoji: "🎓", peakMonth: 5, peakDay: 30, defaultEdition: "Gift Set", defaultPrice: 79 },
      { id: "back-to-school", label: "Back to School", emoji: "📚", peakMonth: 9, peakDay: 1, defaultEdition: "Signed + Workbook", defaultPrice: 69 },
      { id: "christmas", label: "Christmas / Holiday", emoji: "🎁", peakMonth: 12, peakDay: 15, defaultEdition: "Hardcover Gift Set", defaultPrice: 99 },
      { id: "new-year", label: "New Year", emoji: "✨", peakMonth: 1, peakDay: 1, defaultEdition: "Limited Numbered", defaultPrice: 59 },
    ];

    const nowDate = new Date();
    const today0 = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());

    function nextOccPeak(o: { peakMonth: number; peakDay: number }) {
      const y = nowDate.getFullYear();
      const t = new Date(y, o.peakMonth - 1, o.peakDay);
      if (t.getTime() >= today0.getTime()) return t;
      return new Date(y + 1, o.peakMonth - 1, o.peakDay);
    }

    // BP-08 has live editions tagged this year? skip those occasions
    const bp08Live = allNodes.filter((n: any) => n.node_id === "BP-08" && n.status === "live");
    const liveOccasionsThisYear = new Set<string>();
    for (const n of bp08Live) {
      const cj = (n as any).content_json || {};
      const occ = cj.occasion as string | undefined;
      const yr = (n as any).activated_at ? new Date((n as any).activated_at).getFullYear() : null;
      if (occ && yr === nowDate.getFullYear()) liveOccasionsThisYear.add(occ);
    }

    const seasonalTriggers = SEASONAL_OCCASIONS.flatMap((o) => {
      const peak = nextOccPeak(o);
      const days = Math.round((peak.getTime() - today0.getTime()) / (1000 * 60 * 60 * 24));
      const weeks = Math.round(days / 7);
      const peakYear = peak.getFullYear();

      // Skip if author already shipped this occasion this year
      if (liveOccasionsThisYear.has(o.id)) return [];

      const out: any[] = [];
      // Fire 8-week trigger when 7-9 weeks out (1-week tolerance for daily cron)
      if (weeks >= 7 && weeks <= 9) {
        out.push({
          id: `special_edition_${o.id}_${peakYear}_w8`,
          dedupeKey: `special_edition_${o.id}_${peakYear}_w8`,
          condition: () => true,
          title: `${o.emoji} ${o.label} is ${weeks} weeks away`,
          content: `${data.pen_name}, authors who launch a themed edition by week 6 sell 3x more. Want me to draft a ${o.defaultEdition} ${o.label} Edition of "${data.pen_name ? "your book" : "your book"}" now? Pre-filled with the recommended price ($${o.defaultPrice}) and bonus content list — you just review and generate.`,
          action_label: `Draft ${o.label} Edition`,
          action_url: `/node-builder/BP-08?occasion=${o.id}&autostart=1`,
        });
      }
      // Fire 4-week last-call when 3-5 weeks out
      if (weeks >= 3 && weeks <= 5) {
        out.push({
          id: `special_edition_${o.id}_${peakYear}_w4`,
          dedupeKey: `special_edition_${o.id}_${peakYear}_w4`,
          condition: () => true,
          title: `⏰ Last call: ${o.label} in ${weeks} weeks`,
          content: `${data.pen_name}, this is the final window to ship a ${o.label} edition before the peak gift-buying period closes. The bundle approach (book + companion PDF + author audio note) sells best at this stage. One click and Abby drafts it.`,
          action_label: `Draft ${o.label} Bundle`,
          action_url: `/node-builder/BP-08?occasion=${o.id}&autostart=1`,
        });
      }
      return out;
    });

    // Define nudge triggers
    const triggers = [
      {
        id: "first_node_live",
        condition: () => data.nodes_live >= 1 && data.nodes_live_yesterday === 0,
        title: "🎉 Your first node is live!",
        content: `Congratulations, ${data.pen_name}! Your ${data.last_live_node} is now live. This is the first step in building your author business empire. Your next move: activate your Lead Magnets node to start growing your email list.`,
        action_label: "Activate Lead Magnets",
        action_url: "/node-builder/BP-02",
      },
      {
        id: "subscriber_milestone_100",
        condition: () => data.email_subscribers >= 100 && data.email_subscribers_yesterday < 100,
        title: "🎯 100 subscribers milestone!",
        content: `You've crossed 100 email subscribers, ${data.pen_name}! That's a real audience. With 100 engaged readers, your webinar node could generate your first event revenue. Ready to take the stage?`,
        action_label: "Build Your Webinar",
        action_url: "/node-builder/BP-05",
      },
      {
        id: "subscriber_milestone_1000",
        condition: () => data.email_subscribers >= 1000 && data.email_subscribers_yesterday < 1000,
        title: "🚀 1,000 subscribers — Build Authority unlocked!",
        content: `${data.pen_name}, you've hit 1,000 subscribers! Build Authority is now unlocked. This is where your business transforms from a side project into a real authority platform. Start with your Online Course.`,
        action_label: "Explore Build Authority",
        action_url: "/build-authority",
      },
      {
        id: "subscriber_milestone_5000",
        condition: () => data.email_subscribers >= 5000 && data.email_subscribers_yesterday < 5000,
        title: "💎 5,000 subscribers — Yield Revenue unlocked!",
        content: `${data.pen_name}, you've reached 5,000 subscribers! Yield Revenue is now unlocked — these are your highest-ticket offers. Start with 1-on-1 Coaching to create your first premium package.`,
        action_label: "Explore Yield Revenue",
        action_url: "/yield-revenue",
      },
      {
        id: "first_revenue",
        condition: () => data.revenue_mtd > 0 && data.revenue_mtd_yesterday === 0,
        title: "💰 Your first revenue!",
        content: `${data.pen_name}, you've earned your first revenue through Authors Bureau! This is the moment everything becomes real. Keep activating nodes — each one adds a new revenue stream.`,
        action_label: "View Revenue Dashboard",
        action_url: "/revenue-dashboard",
      },
      {
        id: "revenue_milestone_10k",
        condition: () => data.revenue_ytd >= 10000 && data.revenue_ytd_yesterday < 10000,
        title: "🏆 $10,000 revenue milestone!",
        content: `${data.pen_name}, you've crossed $10,000 in revenue! You're officially running a real author business. Your next milestone: $50,000. The fastest path there is activating your Mastermind or Retreat nodes.`,
        action_label: "View Yield Revenue",
        action_url: "/yield-revenue",
      },
      {
        id: "inactive_7_days",
        condition: () => data.days_since_last_node_activation >= 7 && data.nodes_live < 28,
        title: "👋 ABBY misses you!",
        content: `Hi ${data.pen_name}! It's been a week since you last activated a node. You have ${28 - data.nodes_live} nodes still to build. Your next recommended node is ${data.next_recommended_node} — it takes about 5 minutes to activate.`,
        action_label: `Activate ${data.next_recommended_node}`,
        action_url: data.next_recommended_node_url,
      },
      {
        id: "all_bp_live",
        condition: () => data.bp_nodes_live === 9 && data.bp_nodes_live_yesterday < 9,
        title: "🌟 All Brand Products nodes live!",
        content: `${data.pen_name}, you've completed the entire Brand Products hub! All 9 nodes are live. Your brand empire is built. Now it's time to build your authority — head to Build Authority to start growing your audience.`,
        action_label: "Explore Build Authority",
        action_url: "/build-authority",
      },
      {
        id: "all_28_live",
        condition: () => data.nodes_live === 28 && data.nodes_live_yesterday < 28,
        title: "🎊 All 28 nodes live — you've built the full empire!",
        content: `${data.pen_name}, you've done it! All 28 nodes are live. You have a complete author business empire. ABBY is incredibly proud of you. Your projected annual revenue is $${data.projected_annual_revenue.toLocaleString()}. Now it's time to focus on scaling what's working.`,
        action_label: "View Revenue Dashboard",
        action_url: "/revenue-dashboard",
      },
      ...seasonalTriggers,
    ];

    const today = new Date().toISOString().slice(0, 10);
    let nudgesCreated = 0;

    for (const trigger of triggers) {
      try {
        if (!trigger.condition()) continue;

        // Seasonal nudges dedupe across the whole year (id includes year);
        // milestone nudges dedupe per day.
        const isSeasonal = trigger.id.startsWith("special_edition_");
        const sinceIso = isSeasonal
          ? `${nowDate.getFullYear()}-01-01T00:00:00Z`
          : `${today}T00:00:00Z`;

        const { data: existing } = await supabase
          .from("abby_nudges")
          .select("id")
          .eq("author_id", authorId)
          .eq("nudge_type", trigger.id)
          .gte("created_at", sinceIso)
          .limit(1);

        if (existing && existing.length > 0) continue;

        await supabase.from("abby_nudges").insert({
          author_id: authorId,
          nudge_type: trigger.id,
          title: trigger.title,
          content: trigger.content,
          action_label: trigger.action_label,
          action_url: trigger.action_url,
        });
        nudgesCreated++;
      } catch (e) {
        console.error(`Nudge trigger ${trigger.id} error:`, e);
      }
    }

    return new Response(JSON.stringify({ success: true, nudges_created: nudgesCreated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-nudges error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
