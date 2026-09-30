// audit-test-fixture — provisions and exercises the permanent synthetic test
// fixture used by the daily audit.
//
// Actions:
//   ensure   — create/repair the test author, test reader, pseudo book, manuscript
//   journey  — run the end-to-end reader journey and report pass/fail
//   cleanup  — remove the synthetic reader's traces (keeps the fixture itself)
//
// Auth: service role, cron secret, or an admin user JWT.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveUser } from "../_shared/resolve-user.ts";
import {
  ensureTestFixture,
  TEST_READER_EMAIL,
  TEST_BOOK_TITLE,
} from "../_shared/test-fixture.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SUPERADMIN_EMAILS = ["paulinet77@gmail.com", "mitchcarson@rocketmail.com"];

async function authorize(req: Request, admin: ReturnType<typeof createClient>) {
  const cronHdr = req.headers.get("x-cron-secret") || "";
  const CRON_SECRET = Deno.env.get("CROSS_PLATFORM_SECRET") || "";
  if (cronHdr && CRON_SECRET && cronHdr === CRON_SECRET) return true;

  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  if (token === (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "")) return true;

  try {
    const resolved = await resolveUser(auth);
    if (resolved.email && SUPERADMIN_EMAILS.includes(resolved.email.toLowerCase())) return true;
    if (!resolved.id) return false;
    const { data } = await admin
      .from("user_roles").select("role")
      .eq("user_id", resolved.id).eq("role", "admin").maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

export interface JourneyResult {
  passed: boolean;
  steps: Array<{ step: string; ok: boolean; detail: string }>;
}

async function cleanupReader(admin: ReturnType<typeof createClient>, authorUserId: string) {
  // Never let a bounced synthetic send permanently suppress the test address.
  await admin.from("suppressed_emails").delete().eq("email", TEST_READER_EMAIL);

  const { data: subs } = await admin
    .from("author_subscribers").select("id")
    .eq("author_id", authorUserId).eq("email", TEST_READER_EMAIL);
  const ids = (subs || []).map((s: any) => s.id);
  if (ids.length) {
    await admin.from("email_flow_enrollments").delete().in("subscriber_id", ids);
    await admin.from("author_subscribers").delete().in("id", ids);
  }
  await admin.from("crm_contacts").delete().eq("email", TEST_READER_EMAIL);
}

async function runJourney(admin: ReturnType<typeof createClient>): Promise<JourneyResult> {
  const steps: JourneyResult["steps"] = [];
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Step 1 — fixture exists
  let fixture;
  try {
    fixture = await ensureTestFixture(admin);
    steps.push({
      step: "fixture",
      ok: true,
      detail: fixture.created.length
        ? `repaired: ${fixture.created.join(", ")}`
        : `${TEST_BOOK_TITLE} fixture intact`,
    });
  } catch (e) {
    steps.push({ step: "fixture", ok: false, detail: (e as Error).message });
    return { passed: false, steps };
  }

  // Step 2 — manuscript readable
  try {
    const { data } = await admin
      .from("generated_assets").select("content")
      .eq("book_id", fixture.bookId).eq("asset_type", "source_material")
      .limit(1).maybeSingle();
    const len = (data?.content || "").length;
    steps.push({ step: "manuscript", ok: len > 1000, detail: `${len} characters stored` });
  } catch (e) {
    steps.push({ step: "manuscript", ok: false, detail: (e as Error).message });
  }

  // Step 3 — reset the synthetic reader so the journey genuinely re-runs
  try {
    await cleanupReader(admin, fixture.authorUserId);
    steps.push({ step: "reset_reader", ok: true, detail: "previous synthetic reader cleared" });
  } catch (e) {
    steps.push({ step: "reset_reader", ok: false, detail: (e as Error).message });
  }

  // Step 4 — reader signs up through the test book
  let enrolledCount = 0;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/enroll-subscriber`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE}` },
      body: JSON.stringify({
        email: TEST_READER_EMAIL,
        name: "Audit Reader",
        author_profile_id: fixture.authorProfileId,
        node_id: "BP-01",
        book_id: fixture.bookId,
        source: "daily_audit",
        source_detail: "synthetic journey",
      }),
    });
    const data = await res.json();
    enrolledCount = (data?.enrollments || []).filter((e: any) => e.status === "active").length;
    steps.push({
      step: "signup",
      ok: res.ok && data?.ok === true,
      detail: res.ok
        ? `${enrolledCount} active email sequence enrolment(s)`
        : `enroll-subscriber returned ${res.status}`,
    });
  } catch (e) {
    steps.push({ step: "signup", ok: false, detail: (e as Error).message });
  }

  // Step 5 — flag the synthetic subscriber/contact as test data
  try {
    await admin.from("author_subscribers")
      .update({ is_test: true }).eq("email", TEST_READER_EMAIL);
    await admin.from("crm_contacts")
      .update({ is_test: true }).eq("email", TEST_READER_EMAIL);
    steps.push({ step: "flag_test_data", ok: true, detail: "synthetic reader excluded from real counts" });
  } catch (e) {
    steps.push({ step: "flag_test_data", ok: false, detail: (e as Error).message });
  }

  // Step 6 — welcome email actually queued/sent
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/process-email-flows`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE}` },
      body: JSON.stringify({ trigger: "daily-audit-synthetic" }),
    }).catch(() => {});
    await new Promise((r) => setTimeout(r, 4000));

    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: sent } = await admin
      .from("email_send_log").select("id, status, created_at")
      .eq("recipient_email", TEST_READER_EMAIL)
      .gte("created_at", since);
    const n = (sent || []).length;
    steps.push({
      step: "welcome_email",
      ok: n > 0 || enrolledCount === 0,
      detail: n > 0
        ? `${n} welcome email(s) dispatched to the test reader`
        : enrolledCount === 0
          ? "no sequence built on the test book yet — nothing to send"
          : "enrolled but no email dispatched within 15 minutes",
    });
  } catch (e) {
    steps.push({ step: "welcome_email", ok: false, detail: (e as Error).message });
  }

  // Step 7 — module ledger for the test book
  try {
    const { data: nodes } = await admin
      .from("author_nodes").select("node_id, status")
      .eq("author_id", fixture.authorProfileId).eq("book_id", fixture.bookId);
    const live = (nodes || []).filter((n: any) => n.status === "live").length;
    steps.push({
      step: "modules",
      ok: true,
      detail: `${live} of 28 modules live on the test book`,
    });
  } catch (e) {
    steps.push({ step: "modules", ok: false, detail: (e as Error).message });
  }

  return { passed: steps.every((s) => s.ok), steps };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  if (!(await authorize(req, admin))) {
    return json({ success: false, status: 401, message: "unauthorized" }, 401);
  }

  let action = "journey";
  try {
    const body = await req.json();
    if (typeof body?.action === "string") action = body.action;
  } catch { /* default */ }

  try {
    if (action === "ensure") {
      const fixture = await ensureTestFixture(admin);
      return json({ success: true, status: 200, message: "fixture ready", fixture });
    }
    if (action === "cleanup") {
      const fixture = await ensureTestFixture(admin);
      await cleanupReader(admin, fixture.authorUserId);
      return json({ success: true, status: 200, message: "synthetic reader cleared" });
    }
    const result = await runJourney(admin);
    return json({
      success: true,
      status: 200,
      message: result.passed ? "synthetic journey passed" : "synthetic journey has failures",
      result,
    });
  } catch (e) {
    return json({ success: false, status: 500, message: (e as Error).message }, 500);
  }
});

export { runJourney };
