import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes } = await userClient.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });

    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { payout_id, external_reference } = await req.json();
    if (!payout_id) throw new Error("payout_id required");

    const { data: payout, error } = await admin.from("author_payouts_v2").update({
      status: "paid",
      external_reference: external_reference || null,
      paid_at: new Date().toISOString(),
    }).eq("id", payout_id).select().single();
    if (error) throw error;

    // Email author
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const { data: profile } = await admin.from("author_profiles").select("pen_name, user_id").eq("id", payout.author_id).maybeSingle();
    if (resendKey && profile?.user_id) {
      const { data: u } = await admin.auth.admin.getUserById(profile.user_id);
      const email = u?.user?.email;
      if (email) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Authors Bureau <notify@notify.authorsbureau.com>",
              to: [email],
              subject: `Payout sent: $${Number(payout.net_usd).toFixed(2)} via ${String(payout.payout_method).toUpperCase()}`,
              html: `<div style="font-family: Georgia, serif; max-width:600px; margin:0 auto; padding:40px 20px;">
                <h2>Hi ${profile.pen_name || "there"},</h2>
                <p>Your <strong>$${Number(payout.net_usd).toFixed(2)} USD</strong> payout has been sent via ${String(payout.payout_method).toUpperCase()}.</p>
                <p><strong>Reference:</strong> ${external_reference || "—"}</p>
                <p>View details in your <a href="https://authorsbureau.com/earnings">Earnings dashboard</a>.</p>
                <hr/><p style="font-size:12px;color:#888;">Authors Bureau · For Multiplier Pte Ltd · Singapore</p>
              </div>`,
            }),
          });
        } catch (e) { console.error("[mark-payout-paid] email failed", e); }
      }
    }

    return new Response(JSON.stringify({ ok: true, payout }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[mark-payout-paid]", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
