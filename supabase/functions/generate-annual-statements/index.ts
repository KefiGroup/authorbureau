import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Generates a simple HTML "earnings statement" per author for the prior tax year
 * and stores it in the `payouts` bucket under `statements/<author_id>/<year>.html`.
 * (Authors download it from their Earnings dashboard. PDF rendering can be added later.)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const body = await req.json().catch(() => ({}));
    const taxYear: number = body.tax_year ?? (new Date().getUTCFullYear() - 1);
    const yearStart = `${taxYear}-01-01`;
    const yearEnd = `${taxYear}-12-31`;

    const { data: payouts } = await admin.from("author_payouts_v2")
      .select("author_id, gross_usd, net_usd, period_start, period_end, status, paid_at, external_reference, payout_method")
      .eq("status", "paid").gte("period_start", yearStart).lte("period_end", yearEnd);

    const byAuthor = new Map<string, any[]>();
    (payouts || []).forEach((p: any) => {
      if (!byAuthor.has(p.author_id)) byAuthor.set(p.author_id, []);
      byAuthor.get(p.author_id)!.push(p);
    });

    let generated = 0;
    for (const [authorId, rows] of byAuthor) {
      const totalGross = rows.reduce((s, r) => s + Number(r.gross_usd), 0);
      const totalNet = rows.reduce((s, r) => s + Number(r.net_usd), 0);
      const { data: profile } = await admin.from("author_profiles").select("pen_name, user_id").eq("id", authorId).maybeSingle();

      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Annual Earnings Statement ${taxYear}</title>
<style>body{font-family:Georgia,serif;max-width:780px;margin:40px auto;padding:24px;color:#1a1a1a}h1{font-size:22px}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}th{background:#f5f5f5}</style>
</head><body>
<h1>Annual Earnings Statement — ${taxYear}</h1>
<p><strong>Author:</strong> ${profile?.pen_name || "—"}<br/>
<strong>Issued by:</strong> For Multiplier Pte Ltd (Authors Bureau), Singapore<br/>
<strong>Generated:</strong> ${new Date().toISOString().slice(0,10)}</p>
<p>This statement summarises payouts made to you in tax year ${taxYear}. You are responsible for declaring this income in your country of tax residence.</p>
<table><thead><tr><th>Period</th><th>Method</th><th>Reference</th><th>Gross USD</th><th>Net paid USD</th><th>Paid on</th></tr></thead>
<tbody>${rows.map((r) => `<tr><td>${r.period_start} → ${r.period_end}</td><td>${r.payout_method}</td><td>${r.external_reference || ""}</td><td>$${Number(r.gross_usd).toFixed(2)}</td><td>$${Number(r.net_usd).toFixed(2)}</td><td>${r.paid_at ? r.paid_at.slice(0,10) : ""}</td></tr>`).join("")}</tbody>
<tfoot><tr><th colspan="3">Totals</th><th>$${totalGross.toFixed(2)}</th><th>$${totalNet.toFixed(2)}</th><th></th></tr></tfoot></table>
<p style="font-size:11px;color:#888;margin-top:24px">Authors Bureau is the Merchant of Record for all reader purchases. Net amounts reflect the 8% platform fee (which covers Stripe and other payment-gateway processing) and any payout transfer fee already deducted.</p>
</body></html>`;

      const path = `statements/${authorId}/${taxYear}.html`;
      await admin.storage.from("payouts").upload(path, new Blob([html], { type: "text/html" }), { upsert: true });

      await admin.from("author_annual_statements").upsert({
        author_id: authorId, tax_year: taxYear,
        total_gross_usd: Math.round(totalGross * 100) / 100,
        total_net_paid_usd: Math.round(totalNet * 100) / 100,
        pdf_storage_path: path,
      }, { onConflict: "author_id,tax_year" });
      generated++;
    }

    return new Response(JSON.stringify({ ok: true, tax_year: taxYear, generated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
