import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveUser } from "../_shared/resolve-user.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { id: userId, email: resolvedEmail } = await resolveUser(authHeader);
    const userEmail = resolvedEmail || "";

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
