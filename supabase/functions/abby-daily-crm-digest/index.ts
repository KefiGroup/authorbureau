// abby-daily-crm-digest
// Runs daily via pg_cron. For each author with at least one CRM contact,
// computes a 24h CRM intelligence summary and:
//   1. Upserts a row into crm_daily_digests (so the dashboard can render it)
//   2. Optionally emails the author via send-transactional-email (authorId set
//      so it inherits author-branded From/Reply-To).
//
// Trigger options:
//   POST {} → process all authors
//   POST { authorId } → process a single author (for manual re-run / testing)
//   POST { dryRun: true } → compute + persist but skip email send

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

interface DigestPayload {
  digest_date: string;
  new_leads_24h: number;
  top_new_leads: Array<{ id: string; full_name: string; abby_score: number; email: string | null }>;
  hot_leads_total: number;
  hot_leads_delta: number;
  email_opens_24h: number;
  email_clicks_24h: number;
  top_mover: { id: string; full_name: string; score_delta: number } | null;
  recommendation: string;
}

async function generateRecommendation(supabase: any, authorName: string, payload: DigestPayload): Promise<string> {
  if (!LOVABLE_API_KEY) {
    return defaultRecommendation(payload);
  }
  try {
    const summary = JSON.stringify({
      new_leads: payload.new_leads_24h,
      hot_leads_total: payload.hot_leads_total,
      hot_leads_delta: payload.hot_leads_delta,
      opens: payload.email_opens_24h,
      clicks: payload.email_clicks_24h,
      top_mover: payload.top_mover?.full_name ?? null,
    });
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          {
            role: "system",
            content:
              "You are ABBY, the AI Business Advisor for an author. In ONE concise sentence (max 30 words), recommend the single highest-leverage CRM next action for the next 24 hours. No emoji, no preamble.",
          },
          {
            role: "user",
            content: `Author: ${authorName}\n24h CRM stats: ${summary}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      console.warn(`[abby-daily-crm-digest] AI recommendation HTTP ${res.status}`);
      return defaultRecommendation(payload);
    }
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content?.trim();
    return (text && text.length > 0 ? text : defaultRecommendation(payload)).slice(0, 240);
  } catch (e) {
    console.warn("[abby-daily-crm-digest] AI recommendation failed", e);
    return defaultRecommendation(payload);
  }
}

function defaultRecommendation(p: DigestPayload): string {
  if (p.hot_leads_total > 0) {
    return `Reach out personally to your ${p.hot_leads_total} hot lead${p.hot_leads_total === 1 ? "" : "s"} today — they are your highest-converting opportunity.`;
  }
  if (p.new_leads_24h > 0) {
    return `Welcome your ${p.new_leads_24h} new lead${p.new_leads_24h === 1 ? "" : "s"} with a personal note to lift engagement.`;
  }
  return "Send a value-first nurture email to your warmest contacts to revive engagement.";
}

async function buildDigestForAuthor(
  supabase: any,
  authorId: string,
  digestDate: string,
): Promise<DigestPayload | null> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const prevSince = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  // 1. Total contact sanity check
  const { count: totalContacts } = await supabase
    .from("crm_contacts")
    .select("*", { count: "exact", head: true })
    .eq("author_id", authorId);
  if (!totalContacts || totalContacts === 0) return null;

  // 2. New leads in last 24h (top 3 by score)
  const { data: newLeads } = await supabase
    .from("crm_contacts")
    .select("id, full_name, abby_score, email")
    .eq("author_id", authorId)
    .gte("created_at", since)
    .order("abby_score", { ascending: false })
    .limit(3);

  const { count: newLeadsCount } = await supabase
    .from("crm_contacts")
    .select("*", { count: "exact", head: true })
    .eq("author_id", authorId)
    .gte("created_at", since);

  // 3. Hot leads (score >= 60) — current vs 24h ago
  const { count: hotNow } = await supabase
    .from("crm_contacts")
    .select("*", { count: "exact", head: true })
    .eq("author_id", authorId)
    .gte("abby_score", 60);

  // Approximate previous-day hot lead count using yesterday's digest if present
  const { data: prevDigest } = await supabase
    .from("crm_daily_digests")
    .select("payload")
    .eq("author_id", authorId)
    .lt("digest_date", digestDate)
    .order("digest_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const prevHotTotal = (prevDigest?.payload as any)?.hot_leads_total ?? hotNow ?? 0;
  const hotDelta = (hotNow ?? 0) - prevHotTotal;

  // 4. Email engagement in last 24h (lead_activities)
  const { count: opens } = await supabase
    .from("lead_activities")
    .select("*", { count: "exact", head: true })
    .eq("author_id", authorId)
    .eq("activity_type", "email_open")
    .gte("created_at", since);
  const { count: clicks } = await supabase
    .from("lead_activities")
    .select("*", { count: "exact", head: true })
    .eq("author_id", authorId)
    .eq("activity_type", "email_click")
    .gte("created_at", since);

  // 5. Top mover — contact with most score-bumping activities in last 24h.
  // Heuristic: count activity rows per lead_id, pick highest, look up name.
  const { data: recentActs } = await supabase
    .from("lead_activities")
    .select("lead_id, activity_type, metadata")
    .eq("author_id", authorId)
    .in("activity_type", ["email_open", "email_click", "nurture_autowired"])
    .gte("created_at", since);

  let topMover: DigestPayload["top_mover"] = null;
  if (recentActs && recentActs.length > 0) {
    const tally: Record<string, number> = {};
    for (const a of recentActs) {
      const delta = a.activity_type === "email_click" ? 5 : a.activity_type === "email_open" ? 2 : 0;
      tally[a.lead_id] = (tally[a.lead_id] || 0) + delta;
    }
    const [topId, topDelta] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0] || [];
    if (topId && topDelta > 0) {
      const { data: lead } = await supabase
        .from("crm_contacts")
        .select("id, full_name")
        .eq("author_id", authorId)
        .eq("id", topId)
        .maybeSingle();
      // crm_contacts.id may not match leads.id directly — try by email join via leads table fallback
      if (lead) {
        topMover = { id: lead.id, full_name: lead.full_name, score_delta: topDelta };
      } else {
        const { data: leadRow } = await supabase
          .from("leads")
          .select("id, email")
          .eq("id", topId)
          .maybeSingle();
        if (leadRow?.email) {
          const { data: contact } = await supabase
            .from("crm_contacts")
            .select("id, full_name")
            .eq("author_id", authorId)
            .eq("email", leadRow.email.toLowerCase())
            .maybeSingle();
          if (contact) {
            topMover = { id: contact.id, full_name: contact.full_name, score_delta: topDelta };
          }
        }
      }
    }
  }

  const partial: DigestPayload = {
    digest_date: digestDate,
    new_leads_24h: newLeadsCount ?? 0,
    top_new_leads: newLeads ?? [],
    hot_leads_total: hotNow ?? 0,
    hot_leads_delta: hotDelta,
    email_opens_24h: opens ?? 0,
    email_clicks_24h: clicks ?? 0,
    top_mover: topMover,
    recommendation: "",
  };
  return partial;
}

async function processAuthor(
  supabase: any,
  authorId: string,
  digestDate: string,
  dryRun: boolean,
): Promise<{ authorId: string; status: string; reason?: string }> {
  const partial = await buildDigestForAuthor(supabase, authorId, digestDate);
  if (!partial) return { authorId, status: "skipped", reason: "no_contacts" };

  // Look up author for personalization + email
  const { data: profile } = await supabase
    .from("author_profiles")
    .select("id, user_id, pen_name")
    .eq("id", authorId)
    .maybeSingle();
  if (!profile) return { authorId, status: "skipped", reason: "no_profile" };

  const { data: userRes } = await supabase.auth.admin.getUserById(profile.user_id);
  const recipientEmail = userRes?.user?.email;
  const authorName = profile.pen_name || userRes?.user?.email?.split("@")[0] || "Author";

  partial.recommendation = await generateRecommendation(supabase, authorName, partial);

  // Upsert digest row
  await supabase
    .from("crm_daily_digests")
    .upsert(
      { author_id: authorId, digest_date: digestDate, payload: partial as any },
      { onConflict: "author_id,digest_date" },
    );

  // Skip email if nothing meaningful happened (avoid noise)
  const meaningful =
    partial.new_leads_24h > 0 ||
    partial.email_opens_24h > 0 ||
    partial.email_clicks_24h > 0 ||
    partial.hot_leads_delta !== 0;

  if (dryRun || !meaningful || !recipientEmail) {
    return { authorId, status: meaningful ? "persisted_no_email" : "no_activity" };
  }

  try {
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "crm-daily-digest",
        recipientEmail,
        authorId,
        idempotencyKey: `crm-digest-${authorId}-${digestDate}`,
        templateData: {
          authorName,
          ...partial,
        },
      },
    });
    return { authorId, status: "sent" };
  } catch (e) {
    console.warn(`[abby-daily-crm-digest] send failed for ${authorId}`, e);
    return { authorId, status: "send_failed", reason: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const todayUTC = new Date().toISOString().slice(0, 10);

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const { authorId, dryRun = false } = body;

  if (authorId) {
    const result = await processAuthor(supabase, authorId, todayUTC, !!dryRun);
    return new Response(JSON.stringify({ success: true, status: 200, message: "ok", result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Process all authors with at least one CRM contact
  const { data: authors } = await supabase
    .from("crm_contacts")
    .select("author_id")
    .limit(10000);
  const uniqueAuthors = Array.from(new Set((authors ?? []).map((r: any) => r.author_id)));

  const results: Array<{ authorId: string; status: string; reason?: string }> = [];
  for (const a of uniqueAuthors) {
    try {
      results.push(await processAuthor(supabase, a, todayUTC, !!dryRun));
    } catch (e) {
      results.push({ authorId: a, status: "error", reason: String(e) });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      status: 200,
      message: `Processed ${results.length} authors`,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
