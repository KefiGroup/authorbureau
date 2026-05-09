// funnels-manage — owner-scoped CRUD proxy for the `funnels` table and
// `funnel_stage_overrides` table. Uses in-code JWT decode to support the
// shared-backend session (project Cloud PostgREST rejects shared JWTs at the
// gateway, which is why direct .from("funnels") owner queries become
// unreliable on refresh — the same pattern fixed by save-author-node).
//
// Actions:
//   - "list"           → list all funnels for the signed-in author
//   - "get"            → fetch one funnel + its overrides
//   - "save_copy"      → update headline/subheadline/body/cta/colors on a funnel
//   - "save_override"  → upsert/delete a funnel_stage_overrides row
//   - "set_status"     → live | paused | draft
//
// Auth: Authorization bearer JWT required. Ownership = JWT sub matches the
// funnel's author_profiles.user_id (with a tolerant email-fallback match,
// same as save-author-node).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function decodeJwt(token: string): { sub?: string; email?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const claims = JSON.parse(atob(padded));
    return { sub: claims.sub, email: claims.email };
  } catch {
    return null;
  }
}

async function resolveAuthorIdForUser(
  admin: ReturnType<typeof createClient>,
  userId: string,
  email?: string,
): Promise<string | null> {
  const { data: byUserId } = await admin
    .from("author_profiles")
    .select("id, user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (byUserId?.id) return byUserId.id as string;

  // Fallback: tolerant email match (covers shared-backend vs project-cloud user_id mismatch).
  if (email) {
    const { data: users } = await admin.auth.admin.listUsers();
    const owner = users?.users?.find(
      (u) => (u.email || "").toLowerCase() === email.toLowerCase(),
    );
    if (owner?.id) {
      const { data: byEmailMatch } = await admin
        .from("author_profiles")
        .select("id")
        .eq("user_id", owner.id)
        .maybeSingle();
      if (byEmailMatch?.id) return byEmailMatch.id as string;
    }
  }
  return null;
}

/** Confirm that a funnel row is owned by the signed-in user. */
async function assertFunnelOwnership(
  admin: ReturnType<typeof createClient>,
  funnelId: string,
  userId: string,
  email?: string,
): Promise<{ ok: boolean; authorId?: string; reason?: string }> {
  const { data: funnel } = await admin
    .from("funnels")
    .select("id, author_id")
    .eq("id", funnelId)
    .maybeSingle();
  if (!funnel) return { ok: false, reason: "Funnel not found" };

  const ownAuthorId = await resolveAuthorIdForUser(admin, userId, email);
  if (!ownAuthorId) return { ok: false, reason: "No author profile" };
  if (ownAuthorId !== funnel.author_id) {
    return { ok: false, reason: "Not your funnel" };
  }
  return { ok: true, authorId: ownAuthorId };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return json(401, { error: "Missing Authorization bearer token" });
  }
  const token = authHeader.slice(7).trim();
  const claims = decodeJwt(token);
  if (!claims?.sub) return json(401, { error: "Invalid token" });
  const userId = claims.sub;
  const userEmail = claims.email;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(500, { error: "Server misconfigured" });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON body" }); }

  const action = body?.action as string;
  if (!action) return json(400, { error: "action required" });

  // ---------- LIST ----------
  if (action === "list") {
    const authorId = await resolveAuthorIdForUser(admin, userId, userEmail);
    if (!authorId) {
      // Not an author yet — return empty list, not an error.
      return json(200, { funnels: [], authorId: null });
    }
    const { data, error } = await admin
      .from("funnels")
      .select("*")
      .eq("author_id", authorId)
      .order("created_at", { ascending: false });
    if (error) return json(500, { error: error.message });
    return json(200, { funnels: data ?? [], authorId });
  }

  // ---------- GET ----------
  if (action === "get") {
    const { funnel_id } = body;
    if (!funnel_id) return json(400, { error: "funnel_id required" });
    const own = await assertFunnelOwnership(admin, funnel_id, userId, userEmail);
    if (!own.ok) return json(403, { error: own.reason });

    const [{ data: funnel }, { data: overrides }] = await Promise.all([
      admin.from("funnels").select("*").eq("id", funnel_id).maybeSingle(),
      admin.from("funnel_stage_overrides").select("stage_id, field_overrides").eq("funnel_id", funnel_id),
    ]);
    return json(200, { funnel, overrides: overrides ?? [] });
  }

  // ---------- SAVE COPY ----------
  if (action === "save_copy") {
    const { funnel_id, patch } = body;
    if (!funnel_id || !patch || typeof patch !== "object") {
      return json(400, { error: "funnel_id and patch required" });
    }
    const own = await assertFunnelOwnership(admin, funnel_id, userId, userEmail);
    if (!own.ok) return json(403, { error: own.reason });

    // Whitelist editable columns to keep this safe.
    const allowed = [
      "headline", "subheadline", "body_copy",
      "cta_text", "cta_url",
      "background_color", "accent_color",
      "title",
    ];
    const safePatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const k of allowed) {
      if (k in patch) safePatch[k] = patch[k];
    }
    const { data, error } = await admin
      .from("funnels")
      .update(safePatch)
      .eq("id", funnel_id)
      .select()
      .single();
    if (error) return json(500, { error: error.message });
    return json(200, { funnel: data });
  }

  // ---------- SAVE OVERRIDE ----------
  if (action === "save_override") {
    const { funnel_id, stage_id, fields } = body;
    if (!funnel_id || !stage_id) return json(400, { error: "funnel_id and stage_id required" });
    const own = await assertFunnelOwnership(admin, funnel_id, userId, userEmail);
    if (!own.ok) return json(403, { error: own.reason });

    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields || {})) {
      if (v != null && String(v).trim().length > 0) cleaned[k] = String(v);
    }

    if (Object.keys(cleaned).length === 0) {
      const { error } = await admin
        .from("funnel_stage_overrides")
        .delete()
        .eq("funnel_id", funnel_id)
        .eq("stage_id", stage_id);
      if (error) return json(500, { error: error.message });
      return json(200, { ok: true, deleted: true });
    }

    const { error } = await admin
      .from("funnel_stage_overrides")
      .upsert(
        {
          funnel_id,
          author_id: own.authorId!,
          stage_id,
          field_overrides: cleaned,
        },
        { onConflict: "funnel_id,stage_id" },
      );
    if (error) return json(500, { error: error.message });
    return json(200, { ok: true });
  }

  // ---------- LIST OVERRIDES (bulk) ----------
  if (action === "list_overrides") {
    const { funnel_ids } = body;
    if (!Array.isArray(funnel_ids) || funnel_ids.length === 0) {
      return json(200, { overrides_by_funnel: {} });
    }
    const authorId = await resolveAuthorIdForUser(admin, userId, userEmail);
    if (!authorId) return json(200, { overrides_by_funnel: {} });

    // Filter to funnels owned by this author (defense in depth).
    const { data: ownedFunnels } = await admin
      .from("funnels")
      .select("id")
      .eq("author_id", authorId)
      .in("id", funnel_ids);
    const ownedIds = (ownedFunnels ?? []).map((f: any) => f.id as string);
    if (ownedIds.length === 0) return json(200, { overrides_by_funnel: {} });

    const { data: rows, error } = await admin
      .from("funnel_stage_overrides")
      .select("funnel_id, stage_id, field_overrides")
      .in("funnel_id", ownedIds);
    if (error) return json(500, { error: error.message });

    const map: Record<string, { stage_id: string; field_overrides: Record<string, string> }[]> = {};
    for (const id of ownedIds) map[id] = [];
    for (const r of rows ?? []) {
      const fid = (r as any).funnel_id as string;
      if (!map[fid]) map[fid] = [];
      map[fid].push({
        stage_id: (r as any).stage_id,
        field_overrides: (r as any).field_overrides || {},
      });
    }
    return json(200, { overrides_by_funnel: map });
  }

  // ---------- SET STATUS ----------
  if (action === "set_status") {
    const { funnel_id, status } = body;
    if (!funnel_id || !status) return json(400, { error: "funnel_id and status required" });
    if (!["live", "paused", "draft"].includes(status)) {
      return json(400, { error: "status must be live | paused | draft" });
    }
    const own = await assertFunnelOwnership(admin, funnel_id, userId, userEmail);
    if (!own.ok) return json(403, { error: own.reason });

    const update: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "live") update.published_at = new Date().toISOString();
    if (status !== "live") update.published_at = null;

    const { data, error } = await admin
      .from("funnels")
      .update(update)
      .eq("id", funnel_id)
      .select()
      .single();
    if (error) return json(500, { error: error.message });
    return json(200, { funnel: data });
  }

  return json(400, { error: `Unknown action: ${action}` });
});
