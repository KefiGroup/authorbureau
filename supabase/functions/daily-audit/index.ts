// daily-audit — single-source-of-truth audit aggregator.
//
// Auth: admin user JWT, OR service-role (cron/CLI). Returns a JSON report
// covering errors, stuck-live nodes, slug parity, connector health, cron
// freshness, email queue, content quality, ghost UIDs, and book-author
// orphans. Persists each run into public.daily_audit_runs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logError } from "../_shared/log-error.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SUPERADMIN_EMAILS = ["paulinet77@gmail.com", "mitchcarson@rocketmail.com"];

type Severity = "ok" | "warn" | "fail";
interface CheckResult {
  key: string;
  label: string;
  severity: Severity;
  count: number;
  message: string;
  link?: string;
  details?: unknown;
}

// Required library_asset.kind per node — only "adopter" builders that write a
// real asset (Sprint 55). All other live nodes legitimately rely on the
// deriveLibraryAsset fallback and only need a delivery_url.
const REQUIRED_KIND: Record<string, string> = {
  "BP-01": "email_sequence",
  "BP-03": "docx",
  "BP-04": "external_url",
  "BP-06": "docx",
  "BP-09": "external_url",
  "BA-11": "audio_zip",
  "BA-14": "podcast_pack",
};
const ADOPTER_NODES = new Set(Object.keys(REQUIRED_KIND));

async function authorize(req: Request, admin: ReturnType<typeof createClient>) {
  // Internal cron path: shared secret bypasses gateway header rewriting.
  const cronSecretHdr = req.headers.get("x-cron-secret") || req.headers.get("X-Cron-Secret") || "";
  const CRON_SECRET = Deno.env.get("CROSS_PLATFORM_SECRET") || "";
  if (cronSecretHdr && CRON_SECRET && cronSecretHdr === CRON_SECRET) {
    return { ok: true, actor: "service-role" };
  }
  const auth = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!token) return { ok: false, reason: "missing token" };
  if (token === SERVICE) return { ok: true, actor: "service-role" };
  try {
    const { data } = await admin.auth.getUser(token);
    const u = data?.user;
    if (!u) return { ok: false, reason: "invalid token" };
    if (u.email && SUPERADMIN_EMAILS.includes(u.email.toLowerCase())) {
      return { ok: true, actor: u.email };
    }
    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", u.id)
      .eq("role", "admin")
      .maybeSingle();
    if (role) return { ok: true, actor: u.email || u.id };
    return { ok: false, reason: "not admin" };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const auth = await authorize(req, admin);
  if (!auth.ok) {
    return json({ success: false, status: 401, message: `unauthorized: ${auth.reason}` }, 401);
  }

  let triggeredBy: "manual" | "cron" | "cli" = "manual";
  try {
    const body = req.method !== "GET" ? await req.json().catch(() => ({})) : {};
    if (body && typeof body.triggeredBy === "string") {
      const t = body.triggeredBy;
      if (t === "cron" || t === "cli" || t === "manual") triggeredBy = t;
    } else if (auth.actor === "service-role") {
      triggeredBy = "cron";
    }
  } catch { /* ignore */ }

  const checks: CheckResult[] = [];
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const since25h = new Date(Date.now() - 25 * 3600 * 1000).toISOString();

  // 1. Errors (24h)
  try {
    const { data } = await admin
      .from("system_error_log")
      .select("severity, message, function_name, created_at, resolved_at")
      .gte("created_at", since24h)
      .order("created_at", { ascending: false });
    const rows = data || [];
    const critical = rows.filter((r) => r.severity === "critical");
    const errors = rows.filter((r) => r.severity === "error");
    const warnings = rows.filter((r) => r.severity === "warning");
    const unresolvedCritical = critical.filter((r) => !r.resolved_at);
    const sev: Severity = unresolvedCritical.length > 0 ? "fail" : errors.length > 0 ? "warn" : "ok";
    checks.push({
      key: "errors_24h",
      label: "Errors (24h)",
      severity: sev,
      count: rows.length,
      message: `${critical.length} critical (${unresolvedCritical.length} unresolved), ${errors.length} error, ${warnings.length} warning`,
      link: "/admin?tab=errors",
      details: { unresolved_critical: unresolvedCritical.slice(0, 10) },
    });
  } catch (e) {
    checks.push({ key: "errors_24h", label: "Errors (24h)", severity: "warn", count: 0, message: `query failed: ${(e as Error).message}` });
  }

  // 2. Stuck-live nodes
  try {
    const { data } = await admin
      .from("author_nodes")
      .select("id, author_id, node_id, content_json")
      .eq("status", "live");
    const stuck = (data || []).filter((row) => {
      const a: any = row.content_json?.library_asset;
      return !(a?.url && a?.kind === REQUIRED_KIND[row.node_id]);
    });
    checks.push({
      key: "stuck_live",
      label: "Stuck-live nodes (legacy fallback)",
      severity: stuck.length > 50 ? "warn" : "ok",
      count: stuck.length,
      message: `${stuck.length} live node(s) without uniform library_asset (re-publish to upgrade)`,
      link: "/admin?tab=books",
      details: { sample: stuck.slice(0, 10).map((s) => ({ id: s.id, node_id: s.node_id, author_id: s.author_id })) },
    });
  } catch (e) {
    checks.push({ key: "stuck_live", label: "Stuck-live nodes", severity: "warn", count: 0, message: `query failed: ${(e as Error).message}` });
  }

  // 3. Canonical label / slug parity (DB side: node_registry rows)
  try {
    const { data } = await admin.from("node_registry").select("node_id, microsite_slug, canonical_label");
    const rows = data || [];
    const expected = 28;
    const missing = expected - rows.length;
    const noLabel = rows.filter((r) => !r.canonical_label).length;
    const sev: Severity = missing !== 0 ? "fail" : noLabel > 0 ? "warn" : "ok";
    checks.push({
      key: "node_registry",
      label: "Node registry parity",
      severity: sev,
      count: rows.length,
      message: missing === 0 ? `${rows.length}/28 nodes registered, ${noLabel} missing canonical label` : `expected 28 nodes, found ${rows.length}`,
      details: { missing_label: rows.filter((r) => !r.canonical_label).slice(0, 10) },
    });
  } catch (e) {
    checks.push({ key: "node_registry", label: "Node registry parity", severity: "warn", count: 0, message: `query failed: ${(e as Error).message}` });
  }

  // 4. Connector health (secrets present)
  const secrets = {
    stripe: !!Deno.env.get("STRIPE_SECRET_KEY"),
    stripe_webhook: !!Deno.env.get("STRIPE_WEBHOOK_SECRET"),
    resend: !!Deno.env.get("RESEND_API_KEY"),
    elevenlabs: !!Deno.env.get("ELEVENLABS_API_KEY"),
    buffer: !!Deno.env.get("BUFFER_API_KEY"),
    lovable_ai: !!Deno.env.get("LOVABLE_API_KEY"),
    perplexity: !!Deno.env.get("PERPLEXITY_API_KEY"),
    firecrawl: !!Deno.env.get("FIRECRAWL_API_KEY"),
  };
  const missingSecrets = Object.entries(secrets).filter(([, v]) => !v).map(([k]) => k);
  checks.push({
    key: "connectors",
    label: "Connector secrets",
    severity: missingSecrets.includes("stripe") || missingSecrets.includes("resend") ? "fail" : missingSecrets.length > 0 ? "warn" : "ok",
    count: missingSecrets.length,
    message: missingSecrets.length === 0 ? "All connector secrets present" : `Missing: ${missingSecrets.join(", ")}`,
    details: secrets,
  });

  // 5. Cron freshness
  try {
    const [payout, statement, emailSync] = await Promise.all([
      admin.from("author_payouts_v2").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("author_annual_statements").select("generated_at").order("generated_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("email_sync_log").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const lastPayout = payout?.data?.created_at ?? null;
    const lastEmailSync = emailSync?.data?.created_at ?? null;
    const stale = lastEmailSync && lastEmailSync < since25h;
    checks.push({
      key: "cron_freshness",
      label: "Cron freshness",
      severity: stale ? "warn" : "ok",
      count: stale ? 1 : 0,
      message: stale ? "Email sync hasn't run in >25h" : "Cron jobs healthy",
      details: {
        last_payout_at: lastPayout,
        last_statement_at: statement?.data?.generated_at ?? null,
        last_email_sync_at: lastEmailSync,
      },
    });
  } catch (e) {
    checks.push({ key: "cron_freshness", label: "Cron freshness", severity: "warn", count: 0, message: `query failed: ${(e as Error).message}` });
  }

  // 6. Email queue health (24h, deduped by message_id)
  try {
    const { data } = await admin
      .from("email_send_log")
      .select("message_id, status, created_at")
      .gte("created_at", since24h);
    const latestPerId = new Map<string, string>();
    for (const r of data || []) {
      const key = r.message_id || `${r.status}-${r.created_at}`;
      latestPerId.set(key, r.status);
    }
    let sent = 0, dlq = 0, failed = 0, suppressed = 0, pending = 0;
    for (const s of latestPerId.values()) {
      if (s === "sent") sent++;
      else if (s === "dlq") dlq++;
      else if (s === "failed" || s === "bounced" || s === "complained") failed++;
      else if (s === "suppressed") suppressed++;
      else if (s === "pending") pending++;
    }
    const sev: Severity = dlq > 5 ? "fail" : dlq > 0 || failed > 5 ? "warn" : "ok";
    checks.push({
      key: "email_queue",
      label: "Email queue (24h)",
      severity: sev,
      count: dlq + failed,
      message: `sent ${sent} · dlq ${dlq} · failed ${failed} · suppressed ${suppressed} · pending ${pending}`,
      details: { sent, dlq, failed, suppressed, pending, total_unique: latestPerId.size },
    });
  } catch (e) {
    checks.push({ key: "email_queue", label: "Email queue (24h)", severity: "warn", count: 0, message: `query failed: ${(e as Error).message}` });
  }

  // 7. Content quality (24h)
  try {
    const { data } = await admin
      .from("content_quality_log")
      .select("rule")
      .gte("created_at", since24h);
    const counts: Record<string, number> = {};
    for (const r of data || []) counts[r.rule] = (counts[r.rule] ?? 0) + 1;
    const total = (data || []).length;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    checks.push({
      key: "content_quality",
      label: "Content quality violations (24h)",
      severity: total > 50 ? "warn" : "ok",
      count: total,
      message: total === 0 ? "No violations in last 24h" : `${total} total — top: ${top.slice(0, 3).map(([k, v]) => `${k}(${v})`).join(", ")}`,
      link: "/admin/content-quality",
      details: { top },
    });
  } catch (e) {
    checks.push({ key: "content_quality", label: "Content quality (24h)", severity: "warn", count: 0, message: `query failed: ${(e as Error).message}` });
  }

  // 8. Ghost author UIDs (24h)
  try {
    const { count } = await admin
      .from("auth_uid_warnings")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h);
    const c = count ?? 0;
    checks.push({
      key: "ghost_uids",
      label: "Ghost author UIDs (24h)",
      severity: c > 0 ? "warn" : "ok",
      count: c,
      message: c === 0 ? "No ghost UIDs detected" : `${c} author_profile rows pointing to non-existent auth.users`,
    });
  } catch (e) {
    checks.push({ key: "ghost_uids", label: "Ghost author UIDs", severity: "warn", count: 0, message: `query failed: ${(e as Error).message}` });
  }

  // 9. Book-author orphans
  try {
    const [{ data: books }, { data: profiles }] = await Promise.all([
      admin.from("books").select("id, author_id").not("author_id", "is", null),
      admin.from("author_profiles").select("id"),
    ]);
    const profileIds = new Set((profiles || []).map((p) => p.id));
    const orphans = (books || []).filter((b) => b.author_id && !profileIds.has(b.author_id));
    checks.push({
      key: "book_orphans",
      label: "Book ownership orphans",
      severity: orphans.length > 0 ? "warn" : "ok",
      count: orphans.length,
      message: orphans.length === 0 ? "All books linked to valid author profiles" : `${orphans.length} book(s) with missing author profile`,
      details: { sample: orphans.slice(0, 10) },
    });
  } catch (e) {
    checks.push({ key: "book_orphans", label: "Book ownership orphans", severity: "warn", count: 0, message: `query failed: ${(e as Error).message}` });
  }

  // Summary
  const failCount = checks.filter((c) => c.severity === "fail").length;
  const warnCount = checks.filter((c) => c.severity === "warn").length;
  const overall: "green" | "amber" | "red" = failCount > 0 ? "red" : warnCount > 0 ? "amber" : "green";
  const issueCount = checks.reduce((acc, c) => acc + (c.severity !== "ok" ? c.count : 0), 0);

  const report = {
    generated_at: new Date().toISOString(),
    triggered_by: triggeredBy,
    status: overall,
    issue_count: issueCount,
    fail_count: failCount,
    warn_count: warnCount,
    checks,
  };

  // Persist
  try {
    await admin.from("daily_audit_runs").insert({
      status: overall,
      issue_count: issueCount,
      triggered_by: triggeredBy,
      report,
    });
  } catch (e) {
    await logError({ source: "edge_function", function_name: "daily-audit", severity: "warning", error: e, context: { phase: "persist" } });
  }

  return json({ success: true, status: 200, message: "audit complete", report });
});
