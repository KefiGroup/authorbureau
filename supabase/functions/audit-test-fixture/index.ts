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
import { ensureTestFixture, cleanupReader, runJourney } from "../_shared/test-fixture.ts";

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
