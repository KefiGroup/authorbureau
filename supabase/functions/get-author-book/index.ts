import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type MissingField = "title" | "description" | "genre" | "cover";

function computeMissing(row: {
  title?: string | null;
  description?: string | null;
  genre?: string | null;
  cover_image_url?: string | null;
}): MissingField[] {
  const missing: MissingField[] = [];
  if (!row.title?.trim()) missing.push("title");
  if (!row.description?.trim()) missing.push("description");
  if (!row.genre?.trim()) missing.push("genre");
  if (!row.cover_image_url?.trim()) missing.push("cover");
  return missing;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SHARED_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
    const SHARED_ANON =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    let userId: string | null = null;
    let userEmail: string | null = null;

    // Try Cloud token first
    if (token) {
      try {
        const cloud = createClient(SUPABASE_URL, ANON);
        const { data } = await cloud.auth.getUser(token);
        if (data?.user) {
          userId = data.user.id;
          userEmail = data.user.email ?? null;
          console.log("[get-author-book] resolved via Cloud token:", userId, userEmail);
        }
      } catch (_e) {
        // fall through
      }

      // Fallback: shared backend token
      if (!userId) {
        try {
          const shared = createClient(SHARED_URL, SHARED_ANON);
          const { data } = await shared.auth.getUser(token);
          if (data?.user) {
            userEmail = data.user.email ?? null;
            console.log("[get-author-book] shared backend resolved email:", userEmail);
            // Reconcile to Cloud user by email
            if (userEmail) {
              const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
              const { data: users } = await admin.auth.admin.listUsers();
              const match = users?.users?.find(
                (u) => (u.email || "").toLowerCase() === userEmail!.toLowerCase()
              );
              if (match) {
                userId = match.id;
                console.log("[get-author-book] reconciled to Cloud userId:", userId);
              }
            }
          }
        } catch (_e) {
          // fall through
        }
      }
    }

    if (!userId && !userEmail) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", book: null, missingFields: [], isComplete: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service-role client — bypasses RLS for the unified ownership lookup
    const db = createClient(SUPABASE_URL, SERVICE_ROLE);

    const url = new URL(req.url);
    const requestedBookId = url.searchParams.get("bookId");

    // Build the union of possible author_id values for this user:
    //   1. auth.uid() itself
    //   2. any author_profiles.id where user_id = auth.uid()
    const authorIds = new Set<string>();
    if (userId) authorIds.add(userId);

    if (userId) {
      const { data: profiles } = await db
        .from("author_profiles")
        .select("id")
        .eq("user_id", userId);
      profiles?.forEach((p: any) => p?.id && authorIds.add(p.id));
    }

    const idList = Array.from(authorIds);
    console.log("[get-author-book] candidate author_ids:", idList, "email:", userEmail);

    // Query: author_id IN (idList) OR owner_email = userEmail
    let query = db
      .from("books")
      .select("id, title, author_name, genre, description, cover_image_url, owner_email, author_id")
      .order("created_at", { ascending: false });

    if (requestedBookId) {
      query = query.eq("id", requestedBookId);
    } else {
      const orParts: string[] = [];
      if (idList.length) orParts.push(`author_id.in.(${idList.join(",")})`);
      if (userEmail) orParts.push(`owner_email.eq.${userEmail}`);
      if (!orParts.length) {
        return new Response(
          JSON.stringify({ book: null, missingFields: [], isComplete: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      query = query.or(orParts.join(","));
    }

    const { data: books, error } = await query.limit(1);
    if (error) throw error;

    const row = books?.[0] ?? null;
    console.log("[get-author-book] resolved book:", row?.id, row?.title);

    if (!row) {
      return new Response(
        JSON.stringify({ book: null, missingFields: [], isComplete: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Self-heal owner_email if missing
    if (!row.owner_email && userEmail) {
      await db.from("books").update({ owner_email: userEmail }).eq("id", row.id);
    }

    const missingFields = computeMissing(row);
    const isComplete =
      !missingFields.includes("title") &&
      !(missingFields.includes("description") && missingFields.includes("genre"));

    return new Response(
      JSON.stringify({
        book: {
          id: row.id,
          title: row.title,
          author: row.author_name || undefined,
          genre: row.genre || undefined,
          description: row.description || undefined,
          coverUrl: row.cover_image_url || undefined,
        },
        missingFields,
        isComplete,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[get-author-book] error:", err?.message || err);
    return new Response(
      JSON.stringify({ error: err?.message || "Unknown error", book: null, missingFields: [], isComplete: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
