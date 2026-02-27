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

    // Resolve user from shared backend
    const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
    const { data: { user: sharedUser } } = await sharedClient.auth.getUser(token);

    if (!sharedUser) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = sharedUser.id;
    const userEmail = sharedUser.email || "";
    console.log("dashboard-state: userId=", userId, "email=", userEmail);

    // Use service role to query local DB (bypasses RLS mismatch)
    const cloudAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch profile
    const { data: profile, error: profileErr } = await cloudAdmin
      .from("author_profiles")
      .select("directory_status, pen_name, bio_short, bio_long, photo_url, tagline, genres")
      .eq("user_id", userId)
      .maybeSingle();
    console.log("dashboard-state: profile=", JSON.stringify(profile), "err=", profileErr);

    // Count books (by author_id + owner_email, deduplicated)
    const { data: booksByAuthor, error: booksErr } = await cloudAdmin
      .from("books")
      .select("id")
      .eq("author_id", userId);
    console.log("dashboard-state: booksByAuthor=", booksByAuthor?.length, "err=", booksErr);

    const { data: booksByEmail } = userEmail
      ? await cloudAdmin
          .from("books")
          .select("id")
          .eq("owner_email", userEmail)
          .neq("author_id", userId)
      : { data: [] };

    const allIds = new Set([
      ...(booksByAuthor || []).map((b: any) => b.id),
      ...(booksByEmail || []).map((b: any) => b.id),
    ]);
    console.log("dashboard-state: totalBooks=", allIds.size);

    return new Response(
      JSON.stringify({ profile: profile || null, bookCount: allIds.size }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("dashboard-state error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
