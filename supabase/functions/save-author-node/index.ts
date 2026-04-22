// save-author-node — proxies author_nodes upsert/load for shared-backend-authenticated users.
// PostgREST in Cloud rejects the shared Manus JWT (kid mismatch), so all 28 builders that
// autosave through builder-autosave.ts must route through this edge function.
//
// Actions:
//   - "save" (default): upsert content_json + current_step + status (never downgrades from "live")
//   - "load": return content_json + status + current_step for the (authorId, nodeId) pair
//
// Auth: in-code JWT decode (matches check-subscription / ba11-voice-preview pattern).
// Authorization: server-side ownership check — the resolved sub must match author_profiles.user_id
// for the requested authorId.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

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

function decodeJwtSub(token: string): { sub?: string; email?: string } | null {
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

Deno.serve(async (req: Request) => {
  console.log("[save-author-node] request started", { method: req.method });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const authHeader =
    req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { error: "Missing Authorization bearer token" });
  }
  const token = authHeader.slice(7).trim();
  const claims = decodeJwtSub(token);
  if (!claims?.sub) {
    return json(401, { error: "Could not resolve user identity from token" });
  }
  const userId = claims.sub;

  let body: {
    action?: "save" | "load" | "list-audio";
    authorId?: string;
    nodeId?: string;
    nodeName?: string;
    bookId?: string;
    content?: Record<string, unknown>;
    currentStep?: number;
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const action = body.action ?? "save";
  const { authorId, nodeId, nodeName, content, currentStep, bookId } = body;

  // list-audio uses authorId + bookId only — nodeId is not required.
  if (action === "list-audio") {
    if (!authorId) return json(400, { error: "authorId is required" });
  } else if (!authorId || !nodeId) {
    return json(400, { error: "authorId and nodeId are required" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: "Server misconfiguration: SUPABASE env missing" });
  }
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Server-side ownership check — confirm the JWT sub owns this author profile.
  const { data: profile, error: profileErr } = await admin
    .from("author_profiles")
    .select("id, user_id")
    .eq("id", authorId)
    .maybeSingle();
  if (profileErr) {
    console.error("[save-author-node] profile lookup failed:", profileErr.message);
    return json(500, { error: "Profile lookup failed" });
  }
  if (!profile || profile.user_id !== userId) {
    console.warn("[save-author-node] ownership mismatch", {
      authorId,
      sub: userId,
      profileUser: profile?.user_id,
    });
    return json(403, { error: "Not authorized for this author profile" });
  }

  // ---- LOAD ----
  if (action === "load") {
    const { data: node, error } = await admin
      .from("author_nodes")
      .select("content_json, status, microsite_url, activated_at, current_step")
      .eq("author_id", authorId)
      .eq("node_id", nodeId)
      .maybeSingle();
    if (error) {
      console.error("[save-author-node] load failed:", error.message);
      return json(500, { error: error.message });
    }
    if (!node) {
      return json(200, { content: null, status: null, currentStep: 0, isLive: false });
    }
    const cj = (node.content_json ?? null) as Record<string, unknown> | null;
    const isLive =
      node.status === "live" || !!node.activated_at || !!node.microsite_url;
    const savedStep = Number(
      (cj && (cj as { _currentStep?: unknown })._currentStep) ??
        node.current_step ??
        0,
    );
    return json(200, {
      content: cj,
      status: node.status ?? null,
      currentStep: savedStep,
      isLive,
    });
  }

  // ---- LIST-AUDIO ----
  // Lists audiobook chapter MP3s for (authorId, bookId) and returns ordered
  // [{ index, publicUrl }] so BA-11 resume can re-attach permanent storage URLs
  // when content_json contains stale blob: URLs.
  if (action === "list-audio") {
    if (!bookId) {
      return json(400, { error: "bookId is required for list-audio" });
    }
    const prefix = `${authorId}/${bookId}`;
    const { data: files, error: listErr } = await admin.storage
      .from("audiobook-audio")
      .list(prefix, { limit: 200, sortBy: { column: "name", order: "asc" } });
    if (listErr) {
      console.error("[save-author-node:list-audio] list failed:", listErr.message);
      return json(500, { error: listErr.message });
    }
    const chapters = (files ?? [])
      .filter((f) => /^chapter-(\d+)\.mp3$/i.test(f.name))
      .map((f) => {
        const m = f.name.match(/^chapter-(\d+)\.mp3$/i);
        const num = m ? parseInt(m[1], 10) : 0;
        const path = `${prefix}/${f.name}`;
        const { data: pub } = admin.storage
          .from("audiobook-audio")
          .getPublicUrl(path);
        return { index: num - 1, name: f.name, publicUrl: pub.publicUrl };
      })
      .sort((a, b) => a.index - b.index);
    return json(200, { chapters });
  }

  // ---- SAVE (default) ----
  if (!content || typeof content !== "object") {
    return json(400, { error: "content is required for save" });
  }
  if (!nodeName) {
    return json(400, { error: "nodeName is required for save" });
  }

  const { data: existing, error: existingErr } = await admin
    .from("author_nodes")
    .select("id, status, activated_at, microsite_url")
    .eq("author_id", authorId)
    .eq("node_id", nodeId)
    .maybeSingle();
  if (existingErr) {
    console.error("[save-author-node] existing lookup failed:", existingErr.message);
    return json(500, { error: existingErr.message });
  }

  const isAlreadyLive =
    existing?.status === "live" ||
    !!existing?.activated_at ||
    !!existing?.microsite_url;
  const status = isAlreadyLive ? "live" : "content_ready";

  const payload = {
    content_json: { ...content, _currentStep: currentStep ?? 0 },
    current_step: currentStep ?? 0,
    status,
  };

  if (existing) {
    const { error } = await admin
      .from("author_nodes")
      .update(payload)
      .eq("id", existing.id);
    if (error) {
      console.error("[save-author-node] update failed:", error.message);
      return json(500, { error: error.message });
    }
    console.log("[save-author-node] updated", { nodeId, authorId });
    return json(200, { ok: true, mode: "update", status });
  } else {
    const { error } = await admin.from("author_nodes").insert({
      author_id: authorId,
      node_id: nodeId,
      node_name: nodeName,
      ...payload,
    });
    if (error) {
      console.error("[save-author-node] insert failed:", error.message);
      return json(500, { error: error.message });
    }
    console.log("[save-author-node] inserted", { nodeId, authorId });
    return json(200, { ok: true, mode: "insert", status });
  }
});
