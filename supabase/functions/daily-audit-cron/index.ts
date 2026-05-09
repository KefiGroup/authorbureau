// daily-audit-cron — invoked by pg_cron once per day. Runs the audit and,
// if status is amber/red, emails each admin a branded report.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logError } from "../_shared/log-error.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });

  try {
    // 1. Run audit (service-role bearer authorizes us)
    const auditRes = await fetch(`${SUPABASE_URL}/functions/v1/daily-audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE}` },
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

    // 2. Only email when there's something to act on
    let emailedCount = 0;
    if (report.status !== "green") {
      const { data: admins } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const adminIds = (admins || []).map((r) => r.user_id).filter(Boolean);
      if (adminIds.length > 0) {
        // Resolve emails via auth admin API
        const { data: usersList } = await admin.auth.admin.listUsers();
        const emailById = new Map<string, string>();
        for (const u of usersList?.users ?? []) {
          if (u.id && u.email) emailById.set(u.id, u.email);
        }

        const today = new Date().toISOString().slice(0, 10);
        const dashboardUrl = "https://authorsbureau.com/admin?tab=daily-audit";

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
                idempotencyKey: `daily-audit-${today}-${adminId}`,
                templateData: {
                  status: report.status,
                  issueCount: report.issue_count,
                  generatedAt: report.generated_at,
                  failCount: report.fail_count,
                  warnCount: report.warn_count,
                  checks: report.checks.map((c) => ({
                    key: c.key, label: c.label, severity: c.severity, count: c.count, message: c.message,
                  })),
                  dashboardUrl,
                },
              }),
            });
            emailedCount++;
          } catch (e) {
            await logError({ source: "cron", function_name: "daily-audit-cron", severity: "warning", error: e, context: { adminId } });
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true, status: 200, message: "ok",
      audit_status: report.status, issues: report.issue_count, emailed: emailedCount,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    await logError({ source: "cron", function_name: "daily-audit-cron", severity: "error", error: e });
    return new Response(JSON.stringify({ success: false, status: 500, message: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
