import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function resolveUser(token: string, cloudAdmin: ReturnType<typeof createClient>) {
  let userId: string | null = null;
  let userEmail: string | null = null;
  let via = "none";

  // 1) JWT decode (works for both backends)
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload?.sub) {
      userId = payload.sub;
      userEmail = payload.email || payload.user_metadata?.email || null;
      via = "jwt";
    }
  } catch (_) { /* ignore */ }

  // 2) Try cloud auth verification
  try {
    const { data: { user: cloudUser } } = await cloudAdmin.auth.getUser(token);
    if (cloudUser) {
      userId = cloudUser.id;
      userEmail = cloudUser.email ?? userEmail;
      via = "cloud";
    }
  } catch (_) { /* ignore */ }

  // 3) Shared backend
  if (!userId || !userEmail) {
    try {
      const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
      const { data: { user: sharedUser } } = await sharedClient.auth.getUser(token);
      if (sharedUser) {
        userEmail = sharedUser.email ?? userEmail;
        userId = userId || sharedUser.id;
        via = via === "none" ? "shared" : `${via}+shared`;
      }
    } catch (_) { /* ignore */ }
  }

  // 4) Map shared id -> local id by email
  if (userEmail) {
    try {
      const { data: { users } } = await cloudAdmin.auth.admin.listUsers();
      const match = users?.find(
        (u: any) => u.email?.toLowerCase() === userEmail!.toLowerCase()
      );
      if (match) userId = match.id;
    } catch (_) { /* ignore */ }
  }

  return { userId, userEmail, via };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return jsonResp({ success: false, code: "no_token", error: "No auth token" }, 401);
    }

    const { book_id } = await req.json().catch(() => ({}));
    if (!book_id) {
      return jsonResp({ success: false, code: "missing_book_id", error: "Missing book_id" }, 400);
    }

    const cloudAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { userId, userEmail, via } = await resolveUser(token, cloudAdmin);
    console.log("[get-book-manuscript] resolveUser:", { book_id, userId, userEmail, via });

    if (!userId && !userEmail) {
      return jsonResp({ success: false, code: "unauthorized", error: "Could not resolve user from token" }, 401);
    }

    // Build candidate author_ids: userId + author_profiles.id where user_id = userId
    const candidates = new Set<string>();
    if (userId) candidates.add(userId);
    if (userId) {
      const { data: profiles } = await cloudAdmin
        .from("author_profiles")
        .select("id")
        .eq("user_id", userId);
      (profiles ?? []).forEach((p: any) => candidates.add(p.id));
    }

    const { data: book } = await cloudAdmin
      .from("books")
      .select("id, author_id, owner_email")
      .eq("id", book_id)
      .maybeSingle();

    if (!book) {
      console.log("[get-book-manuscript] Book not found:", book_id);
      return jsonResp({ success: false, code: "book_not_found", error: "Book not found" }, 404);
    }

    const ownsByAuthor = book.author_id && candidates.has(book.author_id);
    const ownsByEmail =
      !!userEmail && !!book.owner_email &&
      book.owner_email.toLowerCase() === userEmail.toLowerCase();

    console.log("[get-book-manuscript] ownership:", {
      bookAuthorId: book.author_id,
      ownerEmail: book.owner_email,
      candidates: Array.from(candidates),
      ownsByAuthor, ownsByEmail,
    });

    if (!ownsByAuthor && !ownsByEmail) {
      return jsonResp({ success: false, code: "forbidden", error: "Not authorized for this book" }, 403);
    }

    // Service-role read of latest source_material — try ALL author_ids that
    // ever wrote a source_material row for this book, not just current user's.
    const { data: assets } = await cloudAdmin
      .from("generated_assets")
      .select("content, author_id, updated_at, created_at")
      .eq("book_id", book_id)
      .eq("asset_type", "source_material")
      .order("updated_at", { ascending: false });

    const match = (assets ?? []).find(
      (a: any) => typeof a?.content === "string" && a.content.trim().length > 0,
    );

    if (!match) {
      console.log("[get-book-manuscript] No source_material asset found for book:", book_id, "rows:", assets?.length ?? 0);
      return jsonResp({
        success: false,
        code: "no_manuscript",
        error: "No manuscript stored for this book yet.",
        content: null,
      });
    }

    const content = (match.content as string).trim();
    console.log("[get-book-manuscript] Returning manuscript:", {
      book_id, asset_author_id: match.author_id, length: content.length,
    });

    return jsonResp({
      success: true,
      content,
      characterCount: content.length,
      updated_at: match.updated_at ?? match.created_at ?? null,
    });
  } catch (err: any) {
    console.error("get-book-manuscript error:", err?.message || err);
    return jsonResp({ success: false, code: "internal_error", error: err?.message || "Internal error" }, 500);
  }
});
