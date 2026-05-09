#!/usr/bin/env node
/**
 * scripts/daily-audit.mjs
 *
 * Calls the daily-audit edge function and prints a consolidated report.
 * Exit code 0 = green, 1 = amber/red (cron-friendly).
 *
 * Usage:
 *   node scripts/daily-audit.mjs            # markdown
 *   node scripts/daily-audit.mjs --json     # raw JSON
 *
 * Env required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

const asJson = process.argv.includes("--json");

const res = await fetch(`${SUPABASE_URL}/functions/v1/daily-audit`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE}` },
  body: JSON.stringify({ triggeredBy: "cli" }),
});
const data = await res.json();
if (!res.ok || !data?.report) {
  console.error("Audit failed:", data);
  process.exit(2);
}

const r = data.report;
if (asJson) {
  console.log(JSON.stringify(r, null, 2));
} else {
  console.log(`# Daily Audit — ${r.status.toUpperCase()}`);
  console.log(`Generated: ${r.generated_at} (${r.triggered_by})`);
  console.log(`Summary:   ${r.fail_count} fail · ${r.warn_count} warn · ${r.issue_count} issues`);
  console.log("");
  for (const c of r.checks) {
    const tag = c.severity === "ok" ? "  OK " : c.severity === "warn" ? " WARN" : " FAIL";
    console.log(`[${tag}] ${c.label.padEnd(40)} ${c.message}`);
  }
}

process.exit(r.status === "green" ? 0 : 1);
