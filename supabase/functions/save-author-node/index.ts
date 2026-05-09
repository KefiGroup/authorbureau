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

// ---------------------------------------------------------------------------
// Sprint 54 — Uniform library_asset contract.
//
// On publish we attempt to synthesise a library_asset record from whatever
// substantive content the builder has already saved. This is intentionally
// conservative: if no real deliverable evidence exists, we leave
// library_asset unset and let the legacy readiness fallback handle it.
//
// Once individual builders are wired (per-category sprints) they can write
// library_asset themselves and this synthesis becomes a safety net.
// Source of truth: docs/02-business-rules/02-node-readiness-gates-full-spec.md
// ---------------------------------------------------------------------------

const REQUIRED_KIND: Record<string, string> = {
  "BP-01": "email_sequence", "BP-02": "docx", "BP-03": "docx",
  "BP-04": "external_url", "BP-05": "pptx", "BP-06": "docx",
  "BP-07": "docx", "BP-08": "docx", "BP-09": "external_url",
  "BA-10": "docx", "BA-11": "audio_zip", "BA-12": "docx",
  "BA-13": "docx", "BA-14": "podcast_pack", "BA-15": "docx",
  "BA-16": "docx", "BA-17": "docx", "BA-18": "docx",
  "YR-19": "docx", "YR-20": "docx", "YR-21": "pptx",
  "YR-22": "pptx", "YR-23": "docx", "YR-24": "docx",
  "YR-25": "docx", "YR-26": "docx", "YR-27": "docx",
  "YR-28": "docx",
};

function nonEmptyStr(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
function nonEmptyArr(v: unknown): v is unknown[] {
  return Array.isArray(v) && v.length > 0;
}

function deriveLibraryAsset(
  nodeId: string,
  content: Record<string, unknown>,
  micrositeUrl: string | null,
): { kind: string; url: string; pdf_url: string | null; txt_url: string | null; title: string; saved_at: string } | null {
  const kind = REQUIRED_KIND[nodeId];
  if (!kind) return null;

  const c = content as Record<string, any>;
  const title =
    (nonEmptyStr(c.title) && c.title) ||
    (nonEmptyStr(c.workbook_title) && c.workbook_title) ||
    (nonEmptyStr(c.show_title) && c.show_title) ||
    (nonEmptyStr(c.podcast_title) && c.podcast_title) ||
    (nonEmptyStr(c.hero_headline) && c.hero_headline) ||
    `${nodeId} deliverable`;
  const saved_at = new Date().toISOString();
  const pdf_url = nonEmptyStr(c.pdf_url) ? c.pdf_url : null;

  let url: string | null = null;
  switch (kind) {
    case "external_url": {
      // BP-04 microsite, BP-09 book sales: a public URL is the deliverable.
      url =
        (nonEmptyStr(c.amazon_url) && c.amazon_url) ||
        (nonEmptyStr(c.sales_page_url) && c.sales_page_url) ||
        (nonEmptyStr(c.public_url) && c.public_url) ||
        micrositeUrl ||
        null;
      break;
    }
    case "audio_zip": {
      // BA-11: a generated narration zip or any chapter file counts.
      url =
        (nonEmptyStr(c.audiobook_zip_url) && c.audiobook_zip_url) ||
        (nonEmptyStr(c.narration_script_url) && c.narration_script_url) ||
        (nonEmptyArr(c.chapters) && nonEmptyStr((c.chapters[0] as any)?.publicUrl) && (c.chapters[0] as any).publicUrl) ||
        null;
      break;
    }
    case "email_sequence": {
      // BP-01: a saved sequence id or a non-empty steps array is the deliverable.
      if (nonEmptyStr(c.email_sequence_id) && nonEmptyArr(c.steps)) {
        url = `sequence://${c.email_sequence_id}`;
      } else if (nonEmptyArr(c.sequence_steps)) {
        url = `sequence://${nodeId}-${Date.now()}`;
      }
      break;
    }
    case "podcast_pack": {
      // BA-14: an RSS feed or a built episodes pack.
      url =
        (nonEmptyStr(c.rss_url) && c.rss_url) ||
        (nonEmptyStr(c.rss_feed_url) && c.rss_feed_url) ||
        (nonEmptyArr(c.episodes) && `podcast-pack://${nodeId}`) ||
        null;
      break;
    }
    case "pptx": {
      url =
        (nonEmptyStr(c.pptx_url) && c.pptx_url) ||
        (nonEmptyStr(c.slides_url) && c.slides_url) ||
        pdf_url ||
        null;
      break;
    }
    case "docx":
    default: {
      // Any saved document, PDF, course id, or substantive built sections.
      url =
        (nonEmptyStr(c.docx_url) && c.docx_url) ||
        pdf_url ||
        (nonEmptyStr(c.course_id) && `course://${c.course_id}`) ||
        (nonEmptyArr(c.sections) && `built://${nodeId}`) ||
        (nonEmptyArr(c.modules) && `built://${nodeId}`) ||
        null;
      break;
    }
  }

  if (!url) return null;
  return {
    kind,
    url,
    pdf_url,
    txt_url: null,
    title,
    saved_at,
  };
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
    libraryAsset?: Record<string, unknown> | null;
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const action = body.action ?? "save";
  const { authorId, nodeId, nodeName, content, currentStep, bookId, micrositeUrl, libraryAsset } = body;

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
  // Per-book scoping: when bookId is provided, look up the book-specific row.
  // If none exists for that book, return empty (so the builder starts fresh
  // for that book) — DO NOT fall back to a different book's row.
  if (action === "load") {
    let q = admin
      .from("author_nodes")
      .select("content_json, status, microsite_url, activated_at, current_step")
      .eq("author_id", authorId)
      .eq("node_id", nodeId);
    if (bookId) q = q.eq("book_id", bookId);
    const { data: node, error } = await q.maybeSingle();
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
      micrositeUrl: node.microsite_url ?? null,
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
    console.log("[save-author-node:publish] request received", {
      authorId,
      nodeId,
      bookId: bookId ?? null,
      micrositeUrl: micrositeUrl ?? null,
      sub: userId,
    });
    let lookupQ = admin
      .from("author_nodes")
      .select("id, content_json, status, book_id")
      .eq("author_id", authorId)
      .eq("node_id", nodeId);
    if (bookId) lookupQ = lookupQ.eq("book_id", bookId);
    const { data: node, error: nodeErr } = await lookupQ.maybeSingle();
    if (nodeErr) {
      console.error("[save-author-node:publish] lookup failed:", nodeErr.message);
      return json(500, { error: nodeErr.message });
    }
    if (!node) {
      console.warn("[save-author-node:publish] no draft row found", { authorId, nodeId, bookId });
      return json(404, { error: "Node has no draft to publish. Generate content first." });
    }

    console.log("[save-author-node:publish] matched row, updating", {
      rowId: node.id,
      previousStatus: node.status,
      micrositeUrl: micrositeUrl ?? null,
    });
    const existingContent = (node.content_json ?? {}) as Record<string, unknown>;
    // Sprint 55: prefer caller-supplied library_asset (built from real uploaded
    // files). Fall back to conservative server-side synthesis from legacy
    // fields only if the caller didn't pass one.
    const callerAsset = libraryAsset && typeof libraryAsset === "object" && (libraryAsset as Record<string, unknown>).url
      ? (libraryAsset as Record<string, unknown>)
      : null;
    // Sprint 55 adopter contract: these builders MUST upload a real library_asset.
    // Refuse to publish them as `live` without one — prevents the silent-publish
    // bug where a transient upload failure leaves a node live with no deliverable.
    const ADOPTER_NODES = new Set(["BP-01", "BP-03", "BP-04", "BP-06", "BP-08", "BP-09", "BA-11", "BA-14"]);
    const previousAssetCheck = (existingContent.library_asset as Record<string, unknown> | undefined);
    if (ADOPTER_NODES.has(nodeId!) && !callerAsset && !(previousAssetCheck && previousAssetCheck.url)) {
      console.warn("[save-author-node:publish] adopter node missing library_asset", { nodeId, authorId });
      return new Response(
        JSON.stringify({ success: false, status: 422, message: `library_asset required for ${nodeId}` }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const derivedAsset = callerAsset ?? deriveLibraryAsset(nodeId!, existingContent, micrositeUrl ?? null);
    const previousAsset = existingContent.library_asset as Record<string, unknown> | undefined;
    const previousHistory = Array.isArray(existingContent.library_asset_history)
      ? (existingContent.library_asset_history as unknown[])
      : [];

    const nextHistory = derivedAsset && previousAsset
      ? [previousAsset, ...previousHistory].slice(0, 5)
      : previousHistory;

    const mergedContent: Record<string, unknown> = {
      ...existingContent,
      activated: true,
      _currentStep: 3,
      ...(derivedAsset ? { library_asset: derivedAsset, library_asset_history: nextHistory } : {}),
    };
    const updatePayload: Record<string, unknown> = {
      status: "live",
      activated_at: new Date().toISOString(),
      microsite_url: micrositeUrl ?? null,
      current_step: 3,
      content_json: mergedContent,
    };
    // Pin the row to this book if it was a legacy author-only row
    if (bookId && !node.book_id) updatePayload.book_id = bookId;
    const { error: updErr } = await admin
      .from("author_nodes")
      .update(updatePayload)
      .eq("id", node.id);
    if (updErr) {
      console.error("[save-author-node:publish] update failed:", updErr.message);
      return json(500, { error: updErr.message });
    }

    // ---------- Cascade publish to sister product tables ----------
    // BA-10 → courses; BA-12 → membership_content. The public sales pages
    // gate the Buy button on these rows being non-draft.
    try {
      if (nodeId === "BA-10") {
        // courses.author_id references auth.users.id, so resolve via author_profiles.user_id.
        const { data: ap } = await admin
          .from("author_profiles")
          .select("user_id")
          .eq("id", authorId)
          .maybeSingle();
        const ownerUserId = ap?.user_id;
        if (ownerUserId) {
          let q = admin.from("courses").update({ status: "live" }).eq("author_id", ownerUserId);
          if (bookId) q = q.eq("book_id", bookId);
          const { error: cErr } = await q;
          if (cErr) console.error("[save-author-node:publish] BA-10 courses cascade:", cErr.message);
          else console.log("[save-author-node:publish] BA-10 courses cascade OK", { ownerUserId, bookId });
        } else {
          console.warn("[save-author-node:publish] BA-10 cascade skipped — no user_id on author_profile");
        }
      } else if (nodeId === "BA-12") {
        const { error: mErr } = await admin
          .from("membership_content")
          .update({ status: "live" })
          .eq("author_id", authorId);
        if (mErr) console.error("[save-author-node:publish] BA-12 membership cascade:", mErr.message);
        else console.log("[save-author-node:publish] BA-12 membership cascade OK", { authorId });
      }
    } catch (cascadeErr) {
      console.error("[save-author-node:publish] cascade exception:", cascadeErr);
      // Never block publish on cascade failure — author_nodes is the source of truth.
    }

    console.log("[save-author-node:publish] published successfully", { rowId: node.id, nodeId, authorId, bookId, micrositeUrl });
    return json(200, { ok: true, status: "live", micrositeUrl: micrositeUrl ?? null });
  }

  // ---- SAVE (default) ----
  if (!content || typeof content !== "object") {
    return json(400, { error: "content is required for save" });
  }
  if (!nodeName) {
    return json(400, { error: "nodeName is required for save" });
  }

  let existingQ = admin
    .from("author_nodes")
    .select("id, status, activated_at, microsite_url, book_id, content_json")
    .eq("author_id", authorId)
    .eq("node_id", nodeId);
  if (bookId) existingQ = existingQ.eq("book_id", bookId);
  const { data: existing, error: existingErr } = await existingQ.maybeSingle();
  if (existingErr) {
    console.error("[save-author-node] existing lookup failed:", existingErr.message);
    return json(500, { error: existingErr.message });
  }

  const isAlreadyLive =
    existing?.status === "live" ||
    !!existing?.activated_at ||
    !!existing?.microsite_url;
  const status = isAlreadyLive ? "live" : "content_ready";

  // When the row is already live, merge new draft fields ON TOP of the existing
  // content_json so an autosave from the builder cannot wipe out publish-side
  // fields (library_asset, zip_url, chapter_urls, payment links, etc.). For
  // content_ready/draft rows we still replace, so cleared fields disappear.
  const existingContent = (existing?.content_json ?? {}) as Record<string, unknown>;
  const nextContent = isAlreadyLive
    ? { ...existingContent, ...(content as Record<string, unknown>), _currentStep: currentStep ?? 0 }
    : { ...(content as Record<string, unknown>), _currentStep: currentStep ?? 0 };

  const payload: Record<string, unknown> = {
    content_json: nextContent,
    current_step: currentStep ?? 0,
    status,
  };

  if (existing) {
    // Pin to this book if it was a legacy author-only row
    if (bookId && !existing.book_id) payload.book_id = bookId;
    const { error } = await admin
      .from("author_nodes")
      .update(payload)
      .eq("id", existing.id);
    if (error) {
      console.error("[save-author-node] update failed:", error.message);
      return json(500, { error: error.message });
    }
    console.log("[save-author-node] updated", { nodeId, authorId, bookId, mergedLive: isAlreadyLive });
    return json(200, { ok: true, mode: "update", status });
  } else {
    const insertPayload: Record<string, unknown> = {
      author_id: authorId,
      node_id: nodeId,
      node_name: nodeName,
      ...payload,
    };
    if (bookId) insertPayload.book_id = bookId;
    const { error } = await admin.from("author_nodes").insert(insertPayload);
    if (error) {
      console.error("[save-author-node] insert failed:", error.message);
      return json(500, { error: error.message });
    }
    console.log("[save-author-node] inserted", { nodeId, authorId, bookId });
    return json(200, { ok: true, mode: "insert", status });
  }
});
