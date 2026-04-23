import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_PAYOUT_USD = 50;
const WISE_FEE_USD = 1.5;
const PAYPAL_FEE_PCT = 0.02;
// Stripe transfers between platform balance and connected account are FREE
// (Stripe only charges processing fees at the time the customer paid).
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

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
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
      .select("author_id, payout_method, paypal_email_v2, wise_recipient, minimum_payout_usd")
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
    const wiseRows: string[] = ["author_id,legal_name,country,bank_account_or_email,amount_usd,reference"];
    const paypalRows: string[] = ["email,amount_usd,reference,note"];
    const createdPayouts: { author_id: string; net: number; method: string; status: string }[] = [];
    const skippedNoMethod: { author_id: string; net: number }[] = [];
    let wiseTotal = 0, paypalTotal = 0, stripeTotal = 0;
    let wiseAuthors = 0, paypalAuthors = 0, stripeAuthors = 0, stripeFailures = 0;

    for (const [authorId, ernList] of byAuthor) {
      const settingRow = settingsByAuthor.get(authorId);
      const profile = profileByAuthor.get(authorId);
      const min = Number(settingRow?.minimum_payout_usd ?? MIN_PAYOUT_USD);
      const method = settingRow?.payout_method as ("wise" | "paypal" | "stripe" | undefined);

      const gross = ernList.reduce((s, e) => s + Number(e.gross_usd), 0);
      const stripeFees = ernList.reduce((s, e) => s + Number(e.stripe_fee_usd), 0);
      const platformFees = ernList.reduce((s, e) => s + Number(e.platform_fee_usd), 0);
      const netBeforePayoutFee = ernList.reduce((s, e) => s + Number(e.net_usd), 0);

      if (netBeforePayoutFee < min) continue;
      if (!method) {
        skippedNoMethod.push({ author_id: authorId, net: netBeforePayoutFee });
        continue;
      }
      // Stripe method requires onboarding complete
      if (method === "stripe" && !profile?.stripe_onboarding_complete) {
        skippedNoMethod.push({ author_id: authorId, net: netBeforePayoutFee });
        continue;
      }

      let payoutFee = 0;
      if (method === "wise") payoutFee = WISE_FEE_USD;
      else if (method === "paypal") payoutFee = Math.round(netBeforePayoutFee * PAYPAL_FEE_PCT * 100) / 100;
      else payoutFee = STRIPE_TRANSFER_FEE_USD;

      const net = Math.round((netBeforePayoutFee - payoutFee) * 100) / 100;
      if (net <= 0) continue;

      const ref = `AB-${periodTag}-${authorId.slice(0, 8)}`;

      const { data: payout, error: payErr } = await admin.from("author_payouts_v2").insert({
        author_id: authorId,
        period_start: fmtDate(periodStart),
        period_end: fmtDate(periodEnd),
        gross_usd: gross,
        total_stripe_fees_usd: stripeFees,
        total_platform_fees_usd: platformFees,
        payout_fee_usd: payoutFee,
        net_usd: net,
        payout_method: method,
        status: "queued",
      }).select().single();
      if (payErr) { console.error("[payouts] insert failed", payErr); continue; }

      // Link earnings
      await admin.from("author_earnings").update({ payout_id: payout.id, paid_out: true })
        .in("id", ernList.map((e) => e.id));

      if (method === "stripe") {
        // Auto-transfer via Stripe Connect Express
        try {
          const transfer = await stripe.transfers.create({
            amount: Math.round(net * 100),
            currency: "usd",
            destination: profile.stripe_account_id,
            transfer_group: `PAYOUT_${periodTag}_${authorId}`,
            description: `Authors Bureau royalties ${fmtDate(periodStart)} → ${fmtDate(periodEnd)}`,
            metadata: {
              author_id: authorId,
              payout_id: payout.id,
              period: periodTag,
            },
          });
          await admin.from("author_payouts_v2").update({
            status: "paid",
            external_reference: transfer.id,
            paid_at: new Date().toISOString(),
          }).eq("id", payout.id);
          createdPayouts.push({ author_id: authorId, net, method, status: "paid" });
          stripeTotal += net;
          stripeAuthors++;
        } catch (transferErr) {
          const msg = transferErr instanceof Error ? transferErr.message : String(transferErr);
          console.error(`[payouts] stripe transfer failed for author ${authorId}:`, msg);
          await admin.from("author_payouts_v2").update({
            status: "failed",
            notes: `Stripe transfer failed: ${msg}`,
          }).eq("id", payout.id);
          // Roll back earnings so they retry next month
          await admin.from("author_earnings").update({ payout_id: null, paid_out: false })
            .in("id", ernList.map((e) => e.id));
          stripeFailures++;
          createdPayouts.push({ author_id: authorId, net, method, status: "failed" });
        }
      } else if (method === "wise") {
        const wr = settingRow.wise_recipient || {};
        wiseRows.push([
          authorId, csvEscape(wr.legal_name || profile?.pen_name || ""), csvEscape(wr.country || ""),
          csvEscape(wr.bank_account || wr.wise_email || ""), net.toFixed(2), ref,
        ].join(","));
        wiseTotal += net; wiseAuthors++;
        createdPayouts.push({ author_id: authorId, net, method, status: "queued" });
      } else {
        paypalRows.push([
          csvEscape(settingRow.paypal_email_v2 || ""), net.toFixed(2), ref,
          csvEscape(`Authors Bureau royalties ${fmtDate(periodStart)}–${fmtDate(periodEnd)}`),
        ].join(","));
        paypalTotal += net; paypalAuthors++;
        createdPayouts.push({ author_id: authorId, net, method, status: "queued" });
      }
    }

    // 4. Upload CSVs and create batch records (Wise/PayPal only)
    if (wiseAuthors > 0) {
      const path = `batches/${periodTag}/wise-${periodTag}.csv`;
      await admin.storage.from("payouts").upload(path, new Blob([wiseRows.join("\n")], { type: "text/csv" }), { upsert: true });
      const { data: batch } = await admin.from("payout_batches").insert({
        provider: "wise", period_start: fmtDate(periodStart), period_end: fmtDate(periodEnd),
        csv_storage_path: path, total_authors: wiseAuthors, total_amount_usd: Math.round(wiseTotal * 100) / 100,
      }).select().single();
      if (batch) await admin.from("author_payouts_v2").update({ csv_batch_id: batch.id })
        .eq("payout_method", "wise").eq("period_start", fmtDate(periodStart)).is("csv_batch_id", null);
    }
    if (paypalAuthors > 0) {
      const path = `batches/${periodTag}/paypal-${periodTag}.csv`;
      await admin.storage.from("payouts").upload(path, new Blob([paypalRows.join("\n")], { type: "text/csv" }), { upsert: true });
      const { data: batch } = await admin.from("payout_batches").insert({
        provider: "paypal", period_start: fmtDate(periodStart), period_end: fmtDate(periodEnd),
        csv_storage_path: path, total_authors: paypalAuthors, total_amount_usd: Math.round(paypalTotal * 100) / 100,
      }).select().single();
      if (batch) await admin.from("author_payouts_v2").update({ csv_batch_id: batch.id })
        .eq("payout_method", "paypal").eq("period_start", fmtDate(periodStart)).is("csv_batch_id", null);
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");

    // 5. Notify each author whose payout went out (or failed for stripe)
    if (resendKey) {
      for (const p of createdPayouts) {
        const profile = profileByAuthor.get(p.author_id);
        if (!profile?.user_id) continue;
        const { data: userRes } = await admin.auth.admin.getUserById(profile.user_id);
        const email = userRes?.user?.email;
        if (!email) continue;

        const subject = p.status === "paid"
          ? `Your $${p.net.toFixed(2)} payout has been sent`
          : p.status === "failed"
          ? `Action needed: your payout failed`
          : `Your $${p.net.toFixed(2)} payout is being processed`;

        const html = p.status === "failed"
          ? `<div style="font-family: Georgia, serif; max-width:600px; margin:0 auto; padding:40px 20px;">
              <h2>Hi ${profile.pen_name || "there"},</h2>
              <p>We tried to transfer <strong>$${p.net.toFixed(2)} USD</strong> to your Stripe Express account but the transfer failed.</p>
              <p>This usually means your Stripe account needs additional verification. Please log into your <a href="https://authorsbureau.com/account-settings?tab=payouts">Payout Settings</a> and complete any outstanding requirements. We'll automatically retry on the next run.</p>
              <hr/><p style="font-size:12px;color:#888;">Authors Bureau · For Multiplier Pte Ltd · Singapore</p>
            </div>`
          : `<div style="font-family: Georgia, serif; max-width:600px; margin:0 auto; padding:40px 20px;">
              <h2>Hi ${profile.pen_name || "there"},</h2>
              <p>${p.status === "paid"
                ? `Great news — your monthly payout of <strong>$${p.net.toFixed(2)} USD</strong> has been sent via <strong>Stripe</strong> and should arrive in your bank within 1–3 business days.`
                : `Great news — your monthly payout of <strong>$${p.net.toFixed(2)} USD</strong> is being processed via ${p.method.toUpperCase()}. You should receive funds within 1–3 business days.`}</p>
              <p>View details in your <a href="https://authorsbureau.com/earnings">Earnings dashboard</a>.</p>
              <hr/><p style="font-size:12px;color:#888;">Authors Bureau · For Multiplier Pte Ltd · Singapore</p>
            </div>`;

        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Authors Bureau <notify@notify.authorsbureau.com>",
              to: [email],
              subject,
              html,
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
                <p>Set up your payout method (Stripe Express, Wise, or PayPal) and we'll send the funds on the next 1st of the month.</p>
                <p><a href="https://authorsbureau.com/account-settings?tab=payouts" style="background:#0F2D4A;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Connect Payout Account →</a></p>
                <hr/><p style="font-size:12px;color:#888;">Authors Bureau · For Multiplier Pte Ltd · Singapore</p>
              </div>`,
            }),
          });
        } catch (e) { console.error("[payouts] reminder email failed", e); }
      }
    }

    // 7. Notify owner of any stripe failures
    if (stripeFailures > 0 && resendKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Authors Bureau <notify@notify.authorsbureau.com>",
            to: ["paulinet77@gmail.com"],
            subject: `[Payouts] ${stripeFailures} Stripe transfer(s) failed for ${periodTag}`,
            html: `<p>${stripeFailures} Stripe Express transfer(s) failed during the ${periodTag} payout run. Affected authors have been notified and their earnings remain in 'pending' state for retry. Check the admin payouts dashboard for details.</p>`,
          }),
        });
      } catch (e) { console.error("[payouts] owner alert failed", e); }
    }

    return new Response(JSON.stringify({
      ok: true,
      period: `${fmtDate(periodStart)} → ${fmtDate(periodEnd)}`,
      payouts_created: createdPayouts.length,
      total_amount_usd: Math.round((wiseTotal + paypalTotal + stripeTotal) * 100) / 100,
      stripe: { authors: stripeAuthors, total: Math.round(stripeTotal * 100) / 100, failures: stripeFailures },
      wise: { authors: wiseAuthors, total: Math.round(wiseTotal * 100) / 100 },
      paypal: { authors: paypalAuthors, total: Math.round(paypalTotal * 100) / 100 },
      reminders_sent: skippedNoMethod.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[run-monthly-payouts] error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
