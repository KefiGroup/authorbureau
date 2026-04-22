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
    action?: "save" | "load" | "list-audio" | "publish";
    authorId?: string;
    nodeId?: string;
    nodeName?: string;
    bookId?: string;
    content?: Record<string, unknown>;
    currentStep?: number;
    micrositeUrl?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const action = body.action ?? "save";
  const { authorId, nodeId, nodeName, content, currentStep, bookId, micrositeUrl } = body;

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
  // Tolerant match: project-local auth.uid() may differ from shared-backend
  // user_id. Accept either: matching user_id OR matching JWT email vs the
  // owning auth.users.email.
  const { data: profile, error: profileErr } = await admin
    .from("author_profiles")
    .select("id, user_id")
    .eq("id", authorId)
    .maybeSingle();
  if (profileErr) {
    console.error("[save-author-node] profile lookup failed:", profileErr.message);
    return json(500, { error: "Profile lookup failed" });
  }
  if (!profile) {
    return json(404, { error: "Author profile not found" });
  }
  let ownerOk = profile.user_id === userId;
  if (!ownerOk && claims?.email && profile.user_id) {
    try {
      const { data: ownerUser } = await admin.auth.admin.getUserById(profile.user_id);
      const ownerEmail = ownerUser?.user?.email?.toLowerCase();
      if (ownerEmail && ownerEmail === claims.email.toLowerCase()) {
        ownerOk = true;
      }
    } catch (e) {
      console.warn("[save-author-node] auth.users lookup failed", (e as Error).message);
    }
  }
  if (!ownerOk) {
    console.warn("[save-author-node] ownership mismatch", {
      authorId,
      sub: userId,
      profileUser: profile.user_id,
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
    // Read both prefixes (canonical user_id-keyed AND legacy author_profile_id-keyed)
    // to support files written by all generations of the BA-11 pipeline.
    const userPrefix = `${userId}/${bookId}`;
    const profilePrefix = `${authorId}/${bookId}`;
    const fileRegex = /^chapter-0*(\d+)\.mp3$/i;

    const collected: { rawNum: number; name: string; publicUrl: string }[] = [];
    for (const prefix of [userPrefix, profilePrefix]) {
      const { data: files, error: listErr } = await admin.storage
        .from("audiobook-audio")
        .list(prefix, { limit: 200, sortBy: { column: "name", order: "asc" } });
      if (listErr) {
        console.warn(
          "[save-author-node:list-audio] list failed for",
          prefix,
          listErr.message,
        );
        continue;
      }
      for (const f of files ?? []) {
        if (f.name === "submission-package.zip") continue;
        if (/-chunk-/i.test(f.name)) continue;
        const m = f.name.match(fileRegex);
        if (!m) continue;
        const path = `${prefix}/${f.name}`;
        const { data: pub } = admin.storage
          .from("audiobook-audio")
          .getPublicUrl(path);
        collected.push({
          rawNum: parseInt(m[1], 10),
          name: f.name,
          publicUrl: pub.publicUrl,
        });
      }
    }
    // De-duplicate by publicUrl in case both prefixes return the same file.
    const seen = new Set<string>();
    const deduped = collected.filter((c) => {
      if (seen.has(c.publicUrl)) return false;
      seen.add(c.publicUrl);
      return true;
    });
    // Sort by raw filename number then re-index sequentially from 0 so we don't
    // have to guess which padding/indexing convention wrote the file.
    deduped.sort((a, b) => a.rawNum - b.rawNum);
    const chapters = deduped.map((c, i) => ({
      index: i,
      name: c.name,
      publicUrl: c.publicUrl,
    }));
    console.log("[save-author-node:list-audio] returning", chapters.length, "chapters");
    return json(200, { chapters });
  }

  // ---- PUBLISH ----
  // Flips an existing author_nodes row to status='live', sets microsite_url,
  // activated_at, current_step=3, and merges {activated:true} into content_json.
  // Bypasses the RLS/uid mismatch that breaks direct PostgREST updates.
  if (action === "publish") {
    const { data: node, error: nodeErr } = await admin
      .from("author_nodes")
      .select("id, content_json")
      .eq("author_id", authorId)
      .eq("node_id", nodeId)
      .maybeSingle();
    if (nodeErr) {
      console.error("[save-author-node:publish] lookup failed:", nodeErr.message);
      return json(500, { error: nodeErr.message });
    }
    if (!node) {
      return json(404, { error: "Node has no draft to publish. Generate content first." });
    }
    const mergedContent = {
      ...((node.content_json ?? {}) as Record<string, unknown>),
      activated: true,
      _currentStep: 3,
    };
    const { error: updErr } = await admin
      .from("author_nodes")
      .update({
        status: "live",
        activated_at: new Date().toISOString(),
        microsite_url: micrositeUrl ?? null,
        current_step: 3,
        content_json: mergedContent,
      })
      .eq("id", node.id);
    if (updErr) {
      console.error("[save-author-node:publish] update failed:", updErr.message);
      return json(500, { error: updErr.message });
    }
    console.log("[save-author-node:publish] published", { nodeId, authorId, micrositeUrl });
    return json(200, { ok: true, status: "live", micrositeUrl: micrositeUrl ?? null });
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
