// admin-list-ghost-authors
//
// Returns author_profiles whose user_id has no matching account in EITHER
// the Cloud auth.users table OR the shared-backend (PublishNow) auth.users
// table. The legacy SQL RPC `admin_list_ghost_authors` only checked Cloud,
// so every PublishNow-signed-up author was falsely flagged as a ghost.
//
// If the shared backend cannot be reached (missing or invalid service-role
// key), we return `warning: "shared_backend_unavailable"` and an empty
// ghost list rather than parading real authors as ghosts.
//
// Admin-gated via canonical resolveUser + user_roles lookup.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveUser } from "../_shared/resolve-user.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const resolved = await resolveUser(authHeader);
    if (!resolved.id) return json({ error: "Admin access required" }, 403);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SHARED_SERVICE_ROLE = Deno.env.get("SHARED_BACKEND_SERVICE_ROLE_KEY") || "";

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Admin gate via user_roles
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", resolved.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) return json({ error: "Admin access required" }, 403);

    // 1. Pull all candidate "ghosts" using the existing SQL RPC (Cloud check).
    const { data: rawGhosts, error: rpcErr } = await admin.rpc("admin_list_ghost_authors");
    if (rpcErr) return json({ error: rpcErr.message }, 500);

    const candidates = (rawGhosts as Array<{
      author_profile_id: string;
      pen_name: string | null;
      author_slug: string | null;
      ghost_user_id: string | null;
      best_email: string | null;
      book_count: number;
      created_at: string;
    }>) || [];

    if (candidates.length === 0) {
      return json({ ghosts: [], candidate_count: 0, shared_user_count: 0, reconciled_out: 0 });
    }

    // 2. Build the set of emails registered on the shared backend.
    const sharedEmails = new Set<string>();
    let sharedBackendError: string | null = null;

    if (!SHARED_SERVICE_ROLE) {
      sharedBackendError = "missing_key";
    } else {
      try {
        const shared = createClient(SHARED_BACKEND_URL, SHARED_SERVICE_ROLE);
        for (let page = 1; page <= 20; page++) {
          const { data, error } = await shared.auth.admin.listUsers({ page, perPage: 1000 });
          if (error) {
            console.error("[admin-list-ghost-authors] shared listUsers error:", error.message);
            sharedBackendError = error.message;
            break;
          }
          const users = data?.users || [];
          for (const u of users) {
            if (u.email) sharedEmails.add(u.email.toLowerCase());
          }
          if (users.length < 1000) break;
        }
      } catch (e) {
        console.error("[admin-list-ghost-authors] shared backend lookup failed:", e);
        sharedBackendError = e instanceof Error ? e.message : String(e);
      }
    }

    // If we couldn't reconcile against the shared backend, refuse to return
    // candidate "ghosts" — they may be real PublishNow authors. Surface the
    // condition to the UI instead.
    if (sharedBackendError) {
      return json({
        ghosts: [],
        candidate_count: candidates.length,
        shared_user_count: 0,
        reconciled_out: 0,
        warning: "shared_backend_unavailable",
        warning_detail: sharedBackendError,
      });
    }

    // 3. Filter out candidates whose email is a real shared-backend account.
    const trueGhosts = candidates.filter((g) => {
      const email = (g.best_email || "").toLowerCase();
      if (!email) return true; // no email at all → still ghost
      return !sharedEmails.has(email);
    });

    return json({
      ghosts: trueGhosts,
      candidate_count: candidates.length,
      shared_user_count: sharedEmails.size,
      reconciled_out: candidates.length - trueGhosts.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});
