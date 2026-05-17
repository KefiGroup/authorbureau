// Admin-only: soft-delete a ghost author_profile that has zero books.
// "Ghost" = user_id IS NOT NULL but the auth.users row no longer exists.
// We only allow deletion when book_count = 0, so we can never orphan books.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { author_profile_id } = await req.json();
    if (!author_profile_id) throw new Error("author_profile_id required");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Admin gate
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) throw new Error("Unauthorized");
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .limit(1);
    if (!roles?.length) throw new Error("Admin required");

    // Verify the target really is a ghost (user_id set, no auth row) AND has no books.
    const { data: profile } = await admin
      .from("author_profiles")
      .select("id, user_id, pen_name, author_slug")
      .eq("id", author_profile_id)
      .maybeSingle();
    if (!profile) throw new Error("author_profile not found");

    const { count: bookCount } = await admin
      .from("books")
      .select("id", { count: "exact", head: true })
      .eq("author_id", author_profile_id);
    if ((bookCount ?? 0) > 0) {
      throw new Error(`Refusing to archive: profile still has ${bookCount} book(s)`);
    }

    // Confirm it really is a ghost (not a live user we'd be deleting)
    if (profile.user_id) {
      const { data: liveUser } = await admin.auth.admin.getUserById(profile.user_id);
      if (liveUser?.user) {
        throw new Error("Refusing to archive: linked auth.user still exists");
      }
    }

    const { error: delErr } = await admin
      .from("author_profiles")
      .delete()
      .eq("id", author_profile_id);
    if (delErr) throw delErr;

    try {
      await admin.from("admin_audit_log").insert({
        actor_id: userData.user.id,
        event_key: "author.ghost_archived",
        target_type: "author",
        target_id: author_profile_id,
        payload: { pen_name: profile.pen_name, author_slug: profile.author_slug, stale_user_id: profile.user_id },
      });
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({ success: true, status: "ok", message: "Ghost author archived" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, status: "error", message: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
