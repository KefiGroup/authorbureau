import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_PAYOUT_USD = 50;
const WISE_FEE_USD = 1.5;   // typical small batch fee
const PAYPAL_FEE_PCT = 0.02; // ~2% mass-pay

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

    // Period = previous calendar month (UTC)
    const now = new Date();
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    const periodStart = new Date(Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth(), 1));
    const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

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

    // 2. Pull payout settings for involved authors
    const authorIds = [...byAuthor.keys()];
    const { data: settings } = await admin
      .from("author_payout_settings")
      .select("author_id, payout_method, paypal_email_v2, wise_recipient, minimum_payout_usd")
      .in("author_id", authorIds.length ? authorIds : ["00000000-0000-0000-0000-000000000000"]);
    const settingsByAuthor = new Map<string, any>();
    (settings || []).forEach((s: any) => settingsByAuthor.set(s.author_id, s));

    const { data: profiles } = await admin
      .from("author_profiles").select("id, pen_name, user_id").in("id", authorIds.length ? authorIds : ["00000000-0000-0000-0000-000000000000"]);
    const profileByAuthor = new Map<string, any>();
    (profiles || []).forEach((p: any) => profileByAuthor.set(p.id, p));

    // 3. Process each author
    const wiseRows: string[] = ["author_id,legal_name,country,bank_account_or_email,amount_usd,reference"];
    const paypalRows: string[] = ["email,amount_usd,reference,note"];
    const createdPayouts: { author_id: string; net: number; method: string }[] = [];
    let wiseTotal = 0, paypalTotal = 0, wiseAuthors = 0, paypalAuthors = 0;

    for (const [authorId, ernList] of byAuthor) {
      const settingRow = settingsByAuthor.get(authorId);
      const min = Number(settingRow?.minimum_payout_usd ?? MIN_PAYOUT_USD);
      const method = settingRow?.payout_method as ("wise" | "paypal" | undefined);

      const gross = ernList.reduce((s, e) => s + Number(e.gross_usd), 0);
      const stripeFees = ernList.reduce((s, e) => s + Number(e.stripe_fee_usd), 0);
      const platformFees = ernList.reduce((s, e) => s + Number(e.platform_fee_usd), 0);
      const netBeforePayoutFee = ernList.reduce((s, e) => s + Number(e.net_usd), 0);

      if (netBeforePayoutFee < min) continue;
      if (!method) continue; // skip authors without payout method — will roll over

      const payoutFee = method === "wise" ? WISE_FEE_USD : Math.round(netBeforePayoutFee * PAYPAL_FEE_PCT * 100) / 100;
      const net = Math.round((netBeforePayoutFee - payoutFee) * 100) / 100;
      if (net <= 0) continue;

      const profile = profileByAuthor.get(authorId);
      const ref = `AB-${fmtDate(periodStart).slice(0, 7)}-${authorId.slice(0, 8)}`;

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

      createdPayouts.push({ author_id: authorId, net, method });

      if (method === "wise") {
        const wr = settingRow.wise_recipient || {};
        wiseRows.push([
          authorId, csvEscape(wr.legal_name || profile?.pen_name || ""), csvEscape(wr.country || ""),
          csvEscape(wr.bank_account || wr.wise_email || ""), net.toFixed(2), ref,
        ].join(","));
        wiseTotal += net; wiseAuthors++;
      } else {
        paypalRows.push([
          csvEscape(settingRow.paypal_email_v2 || ""), net.toFixed(2), ref,
          csvEscape(`Authors Bureau royalties ${fmtDate(periodStart)}–${fmtDate(periodEnd)}`),
        ].join(","));
        paypalTotal += net; paypalAuthors++;
      }
    }

    // 4. Upload CSVs and create batch records
    const periodTag = fmtDate(periodStart).slice(0, 7);
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

    // 5. Notify each author
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      for (const p of createdPayouts) {
        const profile = profileByAuthor.get(p.author_id);
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
              subject: `Your $${p.net.toFixed(2)} payout is being processed`,
              html: `<div style="font-family: Georgia, serif; max-width:600px; margin:0 auto; padding:40px 20px;">
                <h2>Hi ${profile.pen_name || "there"},</h2>
                <p>Great news — your monthly payout of <strong>$${p.net.toFixed(2)} USD</strong> is being processed via ${p.method.toUpperCase()}.</p>
                <p>You should receive funds within 1–3 business days. We'll email you again once the transfer completes with the confirmation reference.</p>
                <p>View details in your <a href="https://authorsbureau.com/earnings">Earnings dashboard</a>.</p>
                <hr/><p style="font-size:12px;color:#888;">Authors Bureau · For Multiplier Pte Ltd · Singapore</p>
              </div>`,
            }),
          });
        } catch (e) { console.error("[payouts] author email failed", e); }
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      period: `${fmtDate(periodStart)} → ${fmtDate(periodEnd)}`,
      payouts_created: createdPayouts.length,
      total_amount_usd: Math.round((wiseTotal + paypalTotal) * 100) / 100,
      wise: { authors: wiseAuthors, total: Math.round(wiseTotal * 100) / 100 },
      paypal: { authors: paypalAuthors, total: Math.round(paypalTotal * 100) / 100 },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[run-monthly-payouts] error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
