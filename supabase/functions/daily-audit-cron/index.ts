// daily-audit-cron — invoked by pg_cron once per day. Runs the audit, computes
// deltas vs yesterday, gathers shipped sprint activity, generates an ABBY
// takeaway, persists a daily_ops_reports row, and ALWAYS emails admins
// (regardless of severity).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logError } from "../_shared/log-error.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SEV_RANK: Record<string, number> = { ok: 0, warn: 1, fail: 2 };

async function generateTakeaway(
  resolved: any[], opened: any[], sprints: any[], status: string,
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return "";
  try {
    const summary = `Status: ${status}. Resolved: ${resolved.map(r=>r.label).join(', ') || 'none'}. New issues: ${opened.map(o=>`${o.label} (${o.to})`).join(', ') || 'none'}. Shipped: ${sprints.map(s=>s.title).join(', ') || 'none'}.`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: "You are ABBY, the Authors Bureau ops advisor. Reply with ONE single sentence (max 25 words) summarising what mattered today and what to watch tomorrow. No emojis, no preamble." },
          { role: "user", content: summary },
        ],
      }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return (data?.choices?.[0]?.message?.content || "").toString().trim().slice(0, 240);
  } catch { return ""; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });

  try {
    // 1. Run audit
    const CRON_SECRET = Deno.env.get("CROSS_PLATFORM_SECRET") || "";
    const auditRes = await fetch(`${SUPABASE_URL}/functions/v1/daily-audit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE}`,
        "x-cron-secret": CRON_SECRET,
      },
      body: JSON.stringify({ triggeredBy: "cron" }),
    });
    const auditData = await auditRes.json();
    if (!auditRes.ok || !auditData?.report) {
      await logError({ source: "cron", function_name: "daily-audit-cron", severity: "error", message: "audit call failed", context: { status: auditRes.status, body: auditData } });
      return new Response(JSON.stringify({ success: false, status: 500, message: "audit failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const report = auditData.report as {
      status: "green" | "amber" | "red";
      issue_count: number;
      generated_at: string;
      fail_count: number;
      warn_count: number;
      checks: Array<{ key: string; label: string; severity: string; count: number; message: string }>;
    };

    // 2. Compute deltas vs the previous run (excluding the one we just inserted)
    const { data: prevRuns } = await admin
      .from("daily_audit_runs")
      .select("report, generated_at")
      .order("generated_at", { ascending: false })
      .limit(2);
    const prevReport = (prevRuns && prevRuns.length > 1 ? prevRuns[1].report : null) as
      | { checks?: Array<{ key: string; label: string; severity: string; message: string }> }
      | null;
    const prevByKey = new Map<string, { severity: string; message: string; label: string }>();
    for (const c of prevReport?.checks ?? []) {
      prevByKey.set(c.key, { severity: c.severity, message: c.message, label: c.label });
    }
    const resolved: any[] = [];
    const opened: any[] = [];
    for (const c of report.checks) {
      const prev = prevByKey.get(c.key);
      if (!prev) continue;
      const prevR = SEV_RANK[prev.severity] ?? 0;
      const currR = SEV_RANK[c.severity] ?? 0;
      if (prevR > 0 && currR === 0) {
        resolved.push({ key: c.key, label: c.label, from: prev.severity, message: c.message });
      } else if (currR > prevR) {
        opened.push({ key: c.key, label: c.label, to: c.severity, message: c.message });
      }
    }

    // 3. Sprint / dev activity in the last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: sprintRows } = await admin
      .from("dev_activity_log")
      .select("sprint_id, title, summary, category, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20);
    const sprints = (sprintRows || []).map((r) => ({
      sprint_id: r.sprint_id || undefined,
      title: r.title,
      summary: r.summary || undefined,
      category: r.category,
    }));

    // 4. ABBY one-line takeaway
    const takeaway = await generateTakeaway(resolved, opened, sprints, report.status);

    // 5. Persist the daily_ops_reports row (idempotent on report_date)
    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      status: report.status,
      issueCount: report.issue_count,
      generatedAt: report.generated_at,
      failCount: report.fail_count,
      warnCount: report.warn_count,
      checks: report.checks,
      resolved,
      opened,
      sprints,
      takeaway,
    };
    await admin
      .from("daily_ops_reports")
      .upsert({ report_date: today, payload }, { onConflict: "report_date" });

    // 6. Email all admins (always, even on green)
    const dashboardUrl = "https://authorsbureau.com/admin?tab=daily-audit";
    let emailedCount = 0;
    const { data: admins } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminIds = (admins || []).map((r) => r.user_id).filter(Boolean);
    if (adminIds.length > 0) {
      const { data: usersList } = await admin.auth.admin.listUsers();
      const emailById = new Map<string, string>();
      for (const u of usersList?.users ?? []) {
        if (u.id && u.email) emailById.set(u.id, u.email);
      }
      for (const adminId of adminIds) {
        const email = emailById.get(adminId);
        if (!email) continue;
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE}` },
            body: JSON.stringify({
              templateName: "daily-audit-report",
              recipientEmail: email,
              idempotencyKey: `daily-ops-${today}-${adminId}`,
              templateData: { ...payload, dashboardUrl },
            }),
          });
          emailedCount++;
        } catch (e) {
          await logError({ source: "cron", function_name: "daily-audit-cron", severity: "warning", error: e, context: { adminId } });
        }
      }
    }

    await admin
      .from("daily_ops_reports")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("report_date", today);

    return new Response(JSON.stringify({
      success: true, status: 200, message: "ok",
      audit_status: report.status, issues: report.issue_count,
      resolved: resolved.length, opened: opened.length, sprints: sprints.length,
      emailed: emailedCount,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    await logError({ source: "cron", function_name: "daily-audit-cron", severity: "error", error: e });
    return new Response(JSON.stringify({ success: false, status: 500, message: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
