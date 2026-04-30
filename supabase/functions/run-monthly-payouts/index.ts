import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_PAYOUT_USD = 50;
// Per the Payout Agreement, the 8% platform fee covers ALL payment-processing
// costs (Stripe checkout fees, Stripe Connect transfer fees). The author
// always receives exactly net_usd (92%) — payout fees are NEVER deducted.
const STRIPE_TRANSFER_FEE_USD = 0;

interface Earning {
  id: string;
  author_id: string;
  gross_usd: number;
  stripe_fee_usd: number;
  platform_fee_usd: number;
  net_usd: number;
  earned_at: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Optional admin guard: if a user JWT is supplied (non-cron call),
    // require admin role. Cron calls send the service-role key in
    // Authorization, which decodes as role 'service_role' — those bypass.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (token && token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      try {
        const { data: userRes } = await admin.auth.getUser(token);
        if (userRes?.user) {
          const { data: roleRow } = await admin.from("user_roles")
            .select("role").eq("user_id", userRes.user.id).eq("role", "admin").maybeSingle();
          if (!roleRow) {
            return new Response(JSON.stringify({ error: "forbidden" }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
      } catch { /* allow cron / service-role */ }
    }

    const now = new Date();
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    const periodStart = new Date(Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth(), 1));
    const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
    const periodTag = fmtDate(periodStart).slice(0, 7);

    // 1. Pull all unpaid, non-refunded earnings up to period end
    const { data: earnings, error: ernErr } = await admin
      .from("author_earnings")
      .select("id, author_id, gross_usd, stripe_fee_usd, platform_fee_usd, net_usd, earned_at")
      .eq("paid_out", false)
      .eq("refunded", false)
      .lte("earned_at", periodEnd.toISOString());
    if (ernErr) throw ernErr;

    const byAuthor = new Map<string, Earning[]>();
    for (const e of (earnings || []) as Earning[]) {
      if (!byAuthor.has(e.author_id)) byAuthor.set(e.author_id, []);
      byAuthor.get(e.author_id)!.push(e);
    }

    // 2. Pull payout settings + author profiles
    const authorIds = [...byAuthor.keys()];
    const safeIds = authorIds.length ? authorIds : ["00000000-0000-0000-0000-000000000000"];

    const { data: settings } = await admin
      .from("author_payout_settings")
      .select("author_id, payout_method, minimum_payout_usd")
      .in("author_id", safeIds);
    const settingsByAuthor = new Map<string, any>();
    (settings || []).forEach((s: any) => settingsByAuthor.set(s.author_id, s));

    const { data: profiles } = await admin
      .from("author_profiles")
      .select("id, pen_name, user_id, stripe_account_id, stripe_onboarding_complete")
      .in("id", safeIds);
    const profileByAuthor = new Map<string, any>();
    (profiles || []).forEach((p: any) => profileByAuthor.set(p.id, p));

    // 3. Process each author
    const createdPayouts: { author_id: string; net: number; method: string; status: string }[] = [];
    const skippedNoMethod: { author_id: string; net: number }[] = [];
    let stripeTotal = 0;
    let stripeAuthors = 0;
    let stripeFailures = 0;

    for (const [authorId, ernList] of byAuthor) {
      const settingRow = settingsByAuthor.get(authorId);
      const profile = profileByAuthor.get(authorId);
      const min = Number(settingRow?.minimum_payout_usd ?? MIN_PAYOUT_USD);
      const method = settingRow?.payout_method as ("stripe" | undefined);

      const gross = ernList.reduce((s, e) => s + Number(e.gross_usd), 0);
      const stripeFees = ernList.reduce((s, e) => s + Number(e.stripe_fee_usd), 0);
      const platformFees = ernList.reduce((s, e) => s + Number(e.platform_fee_usd), 0);
      const netBeforePayoutFee = ernList.reduce((s, e) => s + Number(e.net_usd), 0);

      if (netBeforePayoutFee < min) continue;
      if (method !== "stripe" || !profile?.stripe_onboarding_complete) {
        skippedNoMethod.push({ author_id: authorId, net: netBeforePayoutFee });
        continue;
      }

      // Internal-margin reporting only — never deducted from author share.
      const payoutFee = STRIPE_TRANSFER_FEE_USD;

      // Author always receives exactly 92% of gross.
      const net = Math.round(netBeforePayoutFee * 100) / 100;
      if (net <= 0) continue;

      const { data: payout, error: payErr } = await admin.from("author_payouts_v2").insert({
        author_id: authorId,
        period_start: fmtDate(periodStart),
        period_end: fmtDate(periodEnd),
        gross_usd: gross,
        total_stripe_fees_usd: stripeFees,
        total_platform_fees_usd: platformFees,
        payout_fee_usd: payoutFee,
        net_usd: net,
        payout_method: "stripe",
        status: "queued",
      }).select().single();
      if (payErr) { console.error("[payouts] insert failed", payErr); continue; }

      // Link earnings to this payout
      await admin.from("author_earnings").update({ payout_id: payout.id, paid_out: true })
        .in("id", ernList.map((e) => e.id));

      // Auto-transfer via Stripe Connect Express
      try {
        const transfer = await stripe.transfers.create({
          amount: Math.round(net * 100),
          currency: "usd",
          destination: profile.stripe_account_id,
          transfer_group: `PAYOUT_${periodTag}_${authorId}`,
          description: `Authors Bureau royalties ${fmtDate(periodStart)} → ${fmtDate(periodEnd)}`,
          metadata: { author_id: authorId, payout_id: payout.id, period: periodTag },
        });
        await admin.from("author_payouts_v2").update({
          status: "paid",
          external_reference: transfer.id,
          paid_at: new Date().toISOString(),
        }).eq("id", payout.id);
        createdPayouts.push({ author_id: authorId, net, method: "stripe", status: "paid" });
        stripeTotal += net;
        stripeAuthors++;
      } catch (transferErr) {
        const msg = transferErr instanceof Error ? transferErr.message : String(transferErr);
        console.error(`[payouts] stripe transfer failed for author ${authorId}:`, msg);
        await admin.from("author_payouts_v2").update({
          status: "failed",
          notes: `Stripe transfer failed: ${msg}`,
        }).eq("id", payout.id);
        await admin.from("author_earnings").update({ payout_id: null, paid_out: false })
          .in("id", ernList.map((e) => e.id));
        stripeFailures++;
        createdPayouts.push({ author_id: authorId, net, method: "stripe", status: "failed" });
      }
    }

    // 4. Send PayPal batch (one API call for all PayPal payouts)
    if (paypalQueue.length > 0 && PAYPAL_CLIENT_ID && PAYPAL_SECRET) {
      const senderBatchId = `AB-${periodTag}-${Date.now()}`;
      try {
        const batchId = await createPayPalBatch(
          paypalQueue.map((q) => ({
            email: q.email,
            amount: q.net,
            ref: q.ref,
            note: `Authors Bureau royalties ${fmtDate(periodStart)} – ${fmtDate(periodEnd)}`,
            sender_item_id: q.payoutId,
          })),
          senderBatchId,
        );
        // Mark all queued PayPal payouts as 'paid' (fire-and-forget; the
        // paypal-payouts-webhook will downgrade them to 'failed' if any
        // individual transfer fails on PayPal's side).
        for (const q of paypalQueue) {
          await admin.from("author_payouts_v2").update({
            status: "paid",
            external_reference: batchId,
            paid_at: new Date().toISOString(),
          }).eq("id", q.payoutId);
          createdPayouts.push({ author_id: q.authorId, net: q.net, method: "paypal", status: "paid" });
          paypalTotal += q.net;
          paypalAuthors++;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[payouts] PayPal batch failed", msg);
        // Roll back all queued PayPal payouts
        for (const q of paypalQueue) {
          await admin.from("author_payouts_v2").update({
            status: "failed",
            notes: `PayPal batch failed: ${msg}`,
          }).eq("id", q.payoutId);
          await admin.from("author_earnings").update({ payout_id: null, paid_out: false })
            .in("id", q.ernIds);
          paypalFailures++;
          createdPayouts.push({ author_id: q.authorId, net: q.net, method: "paypal", status: "failed" });
        }
      }
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");

    // 5. Notify each author
    if (resendKey) {
      for (const p of createdPayouts) {
        const profile = profileByAuthor.get(p.author_id);
        if (!profile?.user_id) continue;
        const { data: userRes } = await admin.auth.admin.getUserById(profile.user_id);
        const email = userRes?.user?.email;
        if (!email) continue;

        const subject = p.status === "paid"
          ? `Your $${p.net.toFixed(2)} payout has been sent`
          : `Action needed: your payout failed`;

        const html = p.status === "failed"
          ? `<div style="font-family: Georgia, serif; max-width:600px; margin:0 auto; padding:40px 20px;">
              <h2>Hi ${profile.pen_name || "there"},</h2>
              <p>We tried to transfer <strong>$${p.net.toFixed(2)} USD</strong> to you via ${p.method.toUpperCase()} but the transfer failed.</p>
              <p>${p.method === "stripe"
                ? `This usually means your Stripe account needs additional verification. Please log into your <a href="https://authorsbureau.com/account-settings?tab=payouts">Payout Settings</a> and complete any outstanding requirements.`
                : `Please double-check the PayPal email on your <a href="https://authorsbureau.com/account-settings?tab=payouts">Payout Settings</a>. If you've recently changed it, we'll automatically retry next month.`}</p>
              <p>We'll automatically retry on the next run.</p>
              <hr/><p style="font-size:12px;color:#888;">Authors Bureau · For Multiplier Pte Ltd · Singapore</p>
            </div>`
          : `<div style="font-family: Georgia, serif; max-width:600px; margin:0 auto; padding:40px 20px;">
              <h2>Hi ${profile.pen_name || "there"},</h2>
              <p>Great news — your monthly payout of <strong>$${p.net.toFixed(2)} USD</strong> has been sent via <strong>${p.method === "stripe" ? "Stripe" : "PayPal"}</strong> and should arrive within 1–3 business days.</p>
              <p>View details in your <a href="https://authorsbureau.com/earnings">Earnings dashboard</a>.</p>
              <hr/><p style="font-size:12px;color:#888;">Authors Bureau · For Multiplier Pte Ltd · Singapore</p>
            </div>`;

        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Authors Bureau <notify@notify.authorsbureau.com>",
              to: [email], subject, html,
            }),
          });
        } catch (e) { console.error("[payouts] author email failed", e); }
      }

      // 6. Reminder email to authors with pending earnings but no payout method
      for (const s of skippedNoMethod) {
        const profile = profileByAuthor.get(s.author_id);
        if (!profile?.user_id) continue;
        const { data: userRes } = await admin.auth.admin.getUserById(profile.user_id);
        const email = userRes?.user?.email;
        if (!email) continue;
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Authors Bureau <notify@notify.authorsbureau.com>",
              to: [email],
              subject: `You have $${s.net.toFixed(2)} waiting — connect your payout account`,
              html: `<div style="font-family: Georgia, serif; max-width:600px; margin:0 auto; padding:40px 20px;">
                <h2>Hi ${profile.pen_name || "there"},</h2>
                <p>You've earned <strong>$${s.net.toFixed(2)} USD</strong> in royalties on Authors Bureau, but we don't have a way to pay you yet.</p>
                <p>Set up your payout method (Stripe Express or PayPal) and we'll send the funds on the next 1st of the month.</p>
                <p><a href="https://authorsbureau.com/account-settings?tab=payouts" style="background:#0F2D4A;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Connect Payout Account →</a></p>
                <hr/><p style="font-size:12px;color:#888;">Authors Bureau · For Multiplier Pte Ltd · Singapore</p>
              </div>`,
            }),
          });
        } catch (e) { console.error("[payouts] reminder email failed", e); }
      }
    }

    // 7. Owner alert — Stripe failures or PayPal not configured
    const ownerAlerts: string[] = [];
    if (stripeFailures > 0) ownerAlerts.push(`${stripeFailures} Stripe transfer(s) failed`);
    if (paypalFailures > 0) ownerAlerts.push(`${paypalFailures} PayPal payout(s) failed`);
    if (skippedPayPalNotConfigured.length > 0) {
      const total = skippedPayPalNotConfigured.reduce((s, x) => s + x.net, 0);
      ownerAlerts.push(`${skippedPayPalNotConfigured.length} PayPal author(s) waiting ($${total.toFixed(2)}) — PAYPAL_CLIENT_ID / PAYPAL_SECRET not set in Lovable Cloud secrets`);
    }
    if (ownerAlerts.length > 0 && resendKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Authors Bureau <notify@notify.authorsbureau.com>",
            to: ["paulinet77@gmail.com"],
            subject: `[Payouts] ${periodTag} run — ${ownerAlerts.length} issue(s) need attention`,
            html: `<p>The ${periodTag} payout run completed with the following issues:</p><ul>${ownerAlerts.map((a) => `<li>${a}</li>`).join("")}</ul><p>Check the admin payouts dashboard for details.</p>`,
          }),
        });
      } catch (e) { console.error("[payouts] owner alert failed", e); }
    }

    return new Response(JSON.stringify({
      ok: true,
      period: `${fmtDate(periodStart)} → ${fmtDate(periodEnd)}`,
      payouts_created: createdPayouts.length,
      total_amount_usd: Math.round((stripeTotal + paypalTotal) * 100) / 100,
      stripe: { authors: stripeAuthors, total: Math.round(stripeTotal * 100) / 100, failures: stripeFailures },
      paypal: { authors: paypalAuthors, total: Math.round(paypalTotal * 100) / 100, failures: paypalFailures, configured: !!(PAYPAL_CLIENT_ID && PAYPAL_SECRET) },
      reminders_sent: skippedNoMethod.length,
      paypal_pending_setup: skippedPayPalNotConfigured.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[run-monthly-payouts] error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
