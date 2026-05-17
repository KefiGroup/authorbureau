// Admin-only: list ghost author_profiles (user_id set but auth.users row missing),
// plus their best-known email (from books.owner_email) and book count.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) throw new Error("Unauthorized");
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .limit(1);
    if (!roles?.length) throw new Error("Admin required");

    // Pull all profiles with a non-null user_id, then filter out the live ones.
    const { data: profiles } = await admin
      .from("author_profiles")
      .select("id, pen_name, author_slug, user_id, created_at")
      .not("user_id", "is", null);

    const userIds = Array.from(new Set((profiles || []).map((p) => p.user_id as string)));
    const liveSet = new Set<string>();
    // Check existence one-by-one via admin.getUserById (no bulk API). Cap at 50.
    for (const uid of userIds.slice(0, 200)) {
      try {
        const { data } = await admin.auth.admin.getUserById(uid);
        if (data?.user) liveSet.add(uid);
      } catch { /* treat as missing */ }
    }

    const ghosts = (profiles || []).filter((p) => !liveSet.has(p.user_id as string));

    // Enrich with best email + book count
    const enriched = await Promise.all(
      ghosts.map(async (g) => {
        const [{ data: book }, { count: bookCount }] = await Promise.all([
          admin
            .from("books")
            .select("owner_email")
            .eq("author_id", g.id)
            .not("owner_email", "is", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          admin
            .from("books")
            .select("id", { count: "exact", head: true })
            .eq("author_id", g.id),
        ]);
        return {
          author_profile_id: g.id,
          pen_name: g.pen_name,
          author_slug: g.author_slug,
          ghost_user_id: g.user_id,
          best_email: (book?.owner_email as string | null)?.toLowerCase() ?? null,
          book_count: bookCount ?? 0,
          created_at: g.created_at,
        };
      }),
    );

    return new Response(
      JSON.stringify({ success: true, status: "ok", message: "ok", ghosts: enriched }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, status: "error", message: msg, ghosts: [] }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
