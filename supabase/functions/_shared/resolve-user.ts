// Canonical user-resolver for edge functions.
//
// Handles three sources of truth in order:
//   1. Cloud (project-local) Supabase token via anon client
//   2. Shared-backend token via shared anon client + email reconciliation to
//      a Cloud auth.users row using the service role
//   3. Best-effort JWT decode fallback so we never silently 401 a real user
//
// All edge functions that need to identify the calling user MUST import this
// helper instead of writing a custom resolveUser(). Custom resolvers have
// caused recurring "ABBY hit a snag" auth failures (BA-11 manuscript split,
// etc.) and counter / ownership drift across the platform.
//
// Returns null only when every method genuinely fails.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ResolvedUser {
  id: string | null;       // Cloud auth.users.id, if reconcilable
  email: string | null;    // best-known email (used for owner_email fallbacks)
  source: "cloud" | "shared" | "jwt" | "none";
}

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_BACKEND_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

export async function resolveUser(authHeader: string | null): Promise<ResolvedUser> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const token = (authHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { id: null, email: null, source: "none" };

  // 1. Cloud token
  try {
    const cloud = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
    const { data } = await cloud.auth.getUser(token);
    if (data?.user?.id) {
      return { id: data.user.id, email: data.user.email ?? null, source: "cloud" };
    }
  } catch (_e) { /* fall through */ }

  // 2. Shared backend token → reconcile email to Cloud user
  let sharedEmail: string | null = null;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  try {
    const shared = createClient(SHARED_BACKEND_URL, SHARED_BACKEND_ANON, { auth: { persistSession: false } });
    const { data } = await shared.auth.getUser(token);
    if (data?.user?.email) {
      sharedEmail = data.user.email;
      const { data: users } = await admin.auth.admin.listUsers();
      const match = users?.users?.find(
        (u) => (u.email || "").toLowerCase() === sharedEmail!.toLowerCase()
      );
      if (match) return { id: match.id, email: sharedEmail, source: "shared" };
      // Couldn't reconcile — still return the email so callers can fall back to owner_email
      return { id: null, email: sharedEmail, source: "shared" };
    }
  } catch (_e) { /* fall through */ }

  // SECURITY: We intentionally do NOT decode the JWT payload to derive a user
  // id. A base64 JWT body is trivially forgeable and carries no signature
  // guarantee, so returning a real auth.users.id from an unverified token would
  // allow admin/identity impersonation (an attacker could forge
  // {"sub":"...","email":"admin@..."} and pass downstream role checks).
  //
  // The only thing we may safely surface from an unverified shared-backend
  // token is the email that the shared backend itself already verified in
  // step 2 — and even then we return id:null so callers cannot treat it as an
  // authenticated identity, only as an owner_email hint that must be
  // re-validated by ownership/role checks.
  return { id: null, email: sharedEmail, source: sharedEmail ? "shared" : "none" };
}
