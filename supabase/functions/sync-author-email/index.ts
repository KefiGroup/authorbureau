import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cross-platform-secret",
};

function bad(status: number, message: string, extra: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({ success: false, status, message, ...extra }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function ok(data: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ success: true, status: 200, message: "synced", ...data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return bad(405, "Method not allowed");

  // --- Auth: shared secret from PublishNow.io ---
  const expected = Deno.env.get("CROSS_PLATFORM_SECRET");
  const provided =
    req.headers.get("x-cross-platform-secret") ||
    (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!expected || !provided || provided !== expected) {
    return bad(401, "Unauthorized");
  }

  let body: { old_email?: string; new_email?: string; user_id?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return bad(400, "Invalid JSON body");
  }

  const oldEmailRaw = (body.old_email ?? "").trim().toLowerCase();
  const newEmailRaw = (body.new_email ?? "").trim().toLowerCase();
  const userIdInput = body.user_id?.trim() || null;
  const source = (body.source || "publishnow").slice(0, 64);

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(newEmailRaw)) return bad(400, "Invalid new_email");
  if (oldEmailRaw && !emailRe.test(oldEmailRaw)) return bad(400, "Invalid old_email");
  if (!oldEmailRaw && !userIdInput) {
    return bad(400, "Provide either old_email or user_id");
  }
  if (oldEmailRaw && oldEmailRaw === newEmailRaw) {
    return ok({ noop: true, reason: "old_email == new_email" });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // --- Resolve target user ---
  let userId = userIdInput;
  if (!userId && oldEmailRaw) {
    // listUsers is paginated; scan up to 5 pages of 1000 (50k users) — sufficient for this workspace.
    let page = 1;
    while (page <= 5 && !userId) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return bad(500, "Failed to look up user", { error: error.message });
      const match = data.users.find((u) => (u.email ?? "").toLowerCase() === oldEmailRaw);
      if (match) userId = match.id;
      if (data.users.length < 1000) break;
      page += 1;
    }
  }

  if (!userId) {
    // Log a noop so we know PublishNow tried to sync someone we don't know about
    await supabase.from("email_sync_log").insert({
      old_email: oldEmailRaw || null,
      new_email: newEmailRaw,
      source,
      auth_updated: false,
      books_updated_count: 0,
      settings_updated: false,
      error_message: "No matching auth user on Authors Bureau",
    });
    return ok({ noop: true, reason: "user_not_found_on_authors_bureau" });
  }

  // Snapshot the user's current email if old_email wasn't supplied
  let resolvedOldEmail = oldEmailRaw;
  if (!resolvedOldEmail) {
    const { data: u } = await supabase.auth.admin.getUserById(userId);
    resolvedOldEmail = (u?.user?.email ?? "").toLowerCase();
  }

  // Idempotent: if already on new email, just touch downstream rows.
  let authUpdated = false;
  if (resolvedOldEmail !== newEmailRaw) {
    const { error: authErr } = await supabase.auth.admin.updateUserById(userId, {
      email: newEmailRaw,
      email_confirm: true, // PublishNow already verified — silent update
    });
    if (authErr) {
      await supabase.from("email_sync_log").insert({
        user_id: userId,
        old_email: resolvedOldEmail || null,
        new_email: newEmailRaw,
        source,
        error_message: `auth update failed: ${authErr.message}`,
      });
      return bad(500, "Failed to update auth email", { error: authErr.message });
    }
    authUpdated = true;
  }

  // --- Update books.owner_email (used by get-author-book ownership fallback) ---
  let booksCount = 0;
  if (resolvedOldEmail) {
    const { data: booksData, error: booksErr } = await supabase
      .from("books")
      .update({ owner_email: newEmailRaw })
      .eq("owner_email", resolvedOldEmail)
      .select("id");
    if (booksErr) {
      console.error("books update failed:", booksErr.message);
    } else {
      booksCount = booksData?.length ?? 0;
    }
  }
  // Also catch any books linked by author_id whose owner_email is still stale
  const { data: byAuthor, error: byAuthorErr } = await supabase
    .from("books")
    .update({ owner_email: newEmailRaw })
    .eq("author_id", userId)
    .neq("owner_email", newEmailRaw)
    .select("id");
  if (!byAuthorErr && byAuthor) booksCount += byAuthor.length;

  // --- Update author_email_settings.reply_to_email if it still matches the old email ---
  let settingsUpdated = false;
  if (resolvedOldEmail) {
    const { data: settings } = await supabase
      .from("author_email_settings")
      .select("author_id, reply_to_email")
      .eq("author_id", userId)
      .maybeSingle();
    if (settings && (settings.reply_to_email ?? "").toLowerCase() === resolvedOldEmail) {
      const { error: setErr } = await supabase
        .from("author_email_settings")
        .update({ reply_to_email: newEmailRaw })
        .eq("author_id", userId);
      if (!setErr) settingsUpdated = true;
    }
  }

  await supabase.from("email_sync_log").insert({
    user_id: userId,
    old_email: resolvedOldEmail || null,
    new_email: newEmailRaw,
    source,
    auth_updated: authUpdated,
    books_updated_count: booksCount,
    settings_updated: settingsUpdated,
  });

  return ok({
    user_id: userId,
    auth_updated: authUpdated,
    books_updated_count: booksCount,
    settings_updated: settingsUpdated,
  });
});
