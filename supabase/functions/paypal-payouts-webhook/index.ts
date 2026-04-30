// PayPal Payouts webhook receiver.
//
// Subscribe in PayPal Developer dashboard to events:
//   PAYMENT.PAYOUTS-ITEM.SUCCEEDED
//   PAYMENT.PAYOUTS-ITEM.FAILED
//   PAYMENT.PAYOUTS-ITEM.UNCLAIMED
//   PAYMENT.PAYOUTS-ITEM.RETURNED
// Webhook URL: https://tubpbslfrxyfhldkcyyq.supabase.co/functions/v1/paypal-payouts-webhook
//
// We update author_payouts_v2.status accordingly (paid → failed when PayPal
// reports a problem) and roll back the linked author_earnings so the next
// monthly run will retry. Sender_item_id is set to the payout_id at send time.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, paypal-transmission-id, paypal-transmission-time, paypal-transmission-sig, paypal-cert-url, paypal-auth-algo",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const event = await req.json();
    const eventType = event?.event_type as string | undefined;
    const item = event?.resource;
    const payoutId = item?.payout_item?.sender_item_id ?? item?.sender_item_id;
    const itemTransactionId = item?.payout_item_id ?? item?.transaction_id;

    console.log(`[paypal-webhook] event=${eventType} payout_id=${payoutId} txn=${itemTransactionId}`);

    if (!eventType || !payoutId) {
      return new Response(JSON.stringify({ ok: true, ignored: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const FAIL_EVENTS = new Set([
      "PAYMENT.PAYOUTS-ITEM.FAILED",
      "PAYMENT.PAYOUTS-ITEM.RETURNED",
      "PAYMENT.PAYOUTS-ITEM.BLOCKED",
      "PAYMENT.PAYOUTS-ITEM.DENIED",
      "PAYMENT.PAYOUTS-ITEM.REFUNDED",
    ]);
    const SUCCESS_EVENTS = new Set([
      "PAYMENT.PAYOUTS-ITEM.SUCCEEDED",
    ]);

    const { data: payout } = await admin.from("author_payouts_v2")
      .select("id, author_id, net_usd, status").eq("id", payoutId).maybeSingle();
    if (!payout) {
      console.warn(`[paypal-webhook] payout ${payoutId} not found`);
      return new Response(JSON.stringify({ ok: true, not_found: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (FAIL_EVENTS.has(eventType)) {
      await admin.from("author_payouts_v2").update({
        status: "failed",
        notes: `PayPal: ${eventType} (${item?.errors?.[0]?.message || item?.transaction_status || "no detail"})`,
      }).eq("id", payoutId);
      // Roll back earnings so they retry next month
      await admin.from("author_earnings").update({ payout_id: null, paid_out: false })
        .eq("payout_id", payoutId);

      // Email author
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const { data: profile } = await admin.from("author_profiles")
          .select("pen_name, user_id").eq("id", payout.author_id).maybeSingle();
        if (profile?.user_id) {
          const { data: userRes } = await admin.auth.admin.getUserById(profile.user_id);
          const email = userRes?.user?.email;
          if (email) {
            try {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  from: "Authors Bureau <notify@notify.authorsbureau.com>",
                  to: [email],
                  subject: `Action needed: your PayPal payout could not be delivered`,
                  html: `<div style="font-family: Georgia, serif; max-width:600px; margin:0 auto; padding:40px 20px;">
                    <h2>Hi ${profile.pen_name || "there"},</h2>
                    <p>We tried to send <strong>$${Number(payout.net_usd).toFixed(2)} USD</strong> to your PayPal account but the transfer was not completed.</p>
                    <p>Please open your <a href="https://authorsbureau.com/account-settings?tab=payouts">Payout Settings</a> and double-check the PayPal email on file. We'll automatically retry on the next monthly run.</p>
                    <hr/><p style="font-size:12px;color:#888;">Authors Bureau · For Multiplier Pte Ltd · Singapore</p>
                  </div>`,
                }),
              });
            } catch (e) { console.error("[paypal-webhook] email failed", e); }
          }
        }
      }
    } else if (SUCCESS_EVENTS.has(eventType) && itemTransactionId) {
      // Confirm and store the per-item transaction id for accounting
      await admin.from("author_payouts_v2").update({
        status: "paid",
        external_reference: itemTransactionId,
      }).eq("id", payoutId);
    }

    return new Response(JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[paypal-webhook] error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
