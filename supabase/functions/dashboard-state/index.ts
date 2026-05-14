import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "No auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve user: try shared backend first, fall back to local Cloud auth
    let userId: string | null = null;
    let userEmail = "";

    const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
    const { data: { user: sharedUser } } = await sharedClient.auth.getUser(token);

    if (sharedUser) {
      userId = sharedUser.id;
      userEmail = sharedUser.email || "";
    } else {
      // Fallback: validate against local Cloud auth
      const localClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const { data: { user: localUser } } = await localClient.auth.getUser();
      if (localUser) {
        userId = localUser.id;
        userEmail = localUser.email || "";
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("dashboard-state: userId=", userId, "email=", userEmail);

    // Use service role to query local DB (bypasses RLS mismatch)
    const cloudAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch profile for this user
    const { data: profile } = await cloudAdmin
      .from("author_profiles")
      .select("id, directory_status, pen_name, bio_short, bio_long, photo_url, tagline, genres")
      .eq("user_id", userId)
      .maybeSingle();

    // Collect all author identifiers that belong to this person.
    // CRITICAL: books.author_id is a FK to author_profiles.id (NOT auth.users.id).
    // We must include the profile id, plus the auth uid for legacy rows, plus
    // sibling profile ids so cross-platform duplicates don't drop a book.
    const allUserIds: string[] = [userId];
    const allAuthorIds: string[] = [];
    if ((profile as any)?.id) allAuthorIds.push((profile as any).id);

    if (profile?.pen_name) {
      const { data: siblingProfiles } = await cloudAdmin
        .from("author_profiles")
        .select("id, user_id")
        .eq("pen_name", profile.pen_name)
        .neq("user_id", userId);
      if (siblingProfiles) {
        for (const sp of siblingProfiles as any[]) {
          if (sp.user_id) allUserIds.push(sp.user_id);
          if (sp.id) allAuthorIds.push(sp.id);
        }
      }
    }
    const allAuthorRefs = Array.from(new Set([...allUserIds, ...allAuthorIds]));
    console.log("dashboard-state: allAuthorRefs=", allAuthorRefs);

    // Count books across all author refs + owner_email (deduplicated)
    const { data: booksByAuthor } = await cloudAdmin
      .from("books")
      .select("id")
      .in("author_id", allAuthorRefs);

    const { data: booksByEmail } = userEmail
      ? await cloudAdmin
          .from("books")
          .select("id")
          .eq("owner_email", userEmail)
      : { data: [] };

    // Also match by author_name = pen_name (cross-platform ID mismatch)
    const { data: booksByName } = profile?.pen_name
      ? await cloudAdmin
          .from("books")
          .select("id")
          .eq("author_name", profile.pen_name)
      : { data: [] };

    const allIds = new Set([
      ...(booksByAuthor || []).map((b: any) => b.id),
      ...(booksByEmail || []).map((b: any) => b.id),
      ...(booksByName || []).map((b: any) => b.id),
    ]);
    console.log("dashboard-state: totalBooks=", allIds.size);

    return new Response(
      JSON.stringify({ profile: profile || null, bookCount: allIds.size }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("dashboard-state error:", errMessage);
    return new Response(JSON.stringify({ error: errMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
