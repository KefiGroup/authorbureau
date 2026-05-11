// Admin-only: send a Supabase Auth invite to a ghost author profile so they
// can claim their existing dashboard. Email is resolved from books.owner_email.
// New auth user signs up via the link → trigger handle_claim_author_profile()
// rewires author_profiles.user_id to the new auth.users.id.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { author_profile_id, email: emailOverride, redirect_to } = await req.json();
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

    // Resolve target email
    let email = (emailOverride || "").toLowerCase().trim() || null;
    if (!email) {
      const { data: book } = await admin
        .from("books")
        .select("owner_email")
        .eq("author_id", author_profile_id)
        .not("owner_email", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      email = book?.owner_email?.toLowerCase() ?? null;
    }
    if (!email) throw new Error("No email found for this author profile");

    // Send invite with metadata so the trigger rewires the profile on signup
    const redirectTo =
      redirect_to ||
      `${Deno.env.get("SUPABASE_URL")?.includes("tubpbslfrxyfhldkcyyq") ? "https://authorsbureau.com" : ""}/auth?claim=${author_profile_id}`;

    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { claim_author_profile_id: author_profile_id },
      redirectTo,
    });

    if (inviteErr) {
      // If user already exists, send a magic link (password recovery) with same metadata
      if (/already.*registered|already.*exists/i.test(inviteErr.message)) {
        const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo, data: { claim_author_profile_id: author_profile_id } },
        });
        if (linkErr) throw linkErr;
        return new Response(
          JSON.stringify({
            success: true,
            status: "ok",
            message: "User already existed; magic-link generated",
            email,
            action_link: link?.properties?.action_link,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw inviteErr;
    }

    // Audit log
    try {
      await admin.from("admin_audit_log").insert({
        actor_id: userData.user.id,
        event_key: "author.claim_invite_sent",
        target_type: "author",
        target_id: author_profile_id,
        payload: { email, invited_user_id: invited?.user?.id },
      });
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({
        success: true,
        status: "ok",
        message: `Invite sent to ${email}`,
        email,
        invited_user_id: invited?.user?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, status: "error", message: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
