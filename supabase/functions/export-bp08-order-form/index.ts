import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const escape = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function orderFormHtml(penName: string, bookTitle: string, content: any): string {
  const editions = Array.isArray(content?.editions) ? content.editions : [];
  const bundle = content?.bundle_offer;
  const editionRows = editions.map((ed: any, i: number) => `
    <tr>
      <td style="padding:8px;border:1px solid #CCC;">☐</td>
      <td style="padding:8px;border:1px solid #CCC;"><strong>${escape(ed.name || `Edition ${i + 1}`)}</strong>${ed.print_specs ? `<br><span style="font-size:11px;color:#666;">${escape(ed.print_specs)}</span>` : ""}</td>
      <td style="padding:8px;border:1px solid #CCC;text-align:right;">$${escape(ed.suggested_price_usd ?? "")}</td>
      <td style="padding:8px;border:1px solid #CCC;text-align:center;">_____</td>
    </tr>
  `).join("");
  const bundleRow = bundle ? `
    <tr style="background:#F8F8FF;">
      <td style="padding:8px;border:1px solid #CCC;">☐</td>
      <td style="padding:8px;border:1px solid #CCC;"><strong>${escape(bundle.name || "Bundle")}</strong>${bundle.savings_note ? `<br><span style="font-size:11px;color:#0a7;">${escape(bundle.savings_note)}</span>` : ""}</td>
      <td style="padding:8px;border:1px solid #CCC;text-align:right;">$${escape(bundle.suggested_price_usd ?? "")}</td>
      <td style="padding:8px;border:1px solid #CCC;text-align:center;">_____</td>
    </tr>
  ` : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escape(bookTitle)} — Special Edition Order Form</title>
<style>
  body { font-family: Georgia, serif; max-width: 760px; margin: 40px auto; padding: 0 30px; color: #1A1A2E; line-height: 1.5; }
  h1 { color: #1E2761; font-size: 26px; margin-bottom: 2px; }
  .sub { color: #666; font-size: 13px; margin-bottom: 18px; }
  h2 { color: #1E2761; font-size: 16px; border-bottom: 2px solid #CADCFC; padding-bottom: 4px; margin-top: 22px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; margin: 8px 0 16px; }
  th { background: #1E2761; color: #FFF; padding: 8px; border: 1px solid #1E2761; text-align: left; font-size: 12px; }
  .field { display: flex; align-items: baseline; margin: 8px 0; font-size: 13px; }
  .field label { width: 130px; font-weight: bold; color: #555; }
  .field .line { flex: 1; border-bottom: 1px solid #999; min-height: 18px; }
  .pay { display: flex; gap: 18px; flex-wrap: wrap; font-size: 13px; margin: 6px 0 14px; }
  .pay span { white-space: nowrap; }
  .sig-row { display: flex; gap: 24px; margin-top: 24px; }
  .sig { flex: 1; }
  .sig .line { border-bottom: 1px solid #333; min-height: 36px; }
  .sig label { font-size: 11px; color: #666; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 10px; color: #888; text-align: center; }
  @media print { body { margin: 20px; max-width: none; } }
</style></head><body>
<h1>${escape(bookTitle)} — Special Edition Order Form</h1>
<div class="sub">Author: ${escape(penName)} · Date: _________________</div>

<h2>Buyer details</h2>
<div class="field"><label>Full name</label><span class="line"></span></div>
<div class="field"><label>Email</label><span class="line"></span></div>
<div class="field"><label>Phone</label><span class="line"></span></div>
<div class="field"><label>Delivery address</label><span class="line"></span></div>
<div class="field"><label>&nbsp;</label><span class="line"></span></div>
<div class="field"><label>City / Country</label><span class="line"></span></div>

<h2>Edition selection</h2>
<table>
  <thead><tr><th style="width:36px;">✓</th><th>Edition</th><th style="width:90px;text-align:right;">Price (USD)</th><th style="width:70px;text-align:center;">Qty</th></tr></thead>
  <tbody>
    ${editionRows}
    ${bundleRow}
  </tbody>
</table>

<h2>Personalisation (optional)</h2>
<div class="field"><label>Inscribe to</label><span class="line"></span></div>
<div class="field"><label>Message</label><span class="line"></span></div>
<div class="field"><label>&nbsp;</label><span class="line"></span></div>

<h2>Payment method</h2>
<div class="pay">
  <span>☐ Cash</span>
  <span>☐ Bank transfer</span>
  <span>☐ Card / PayPal</span>
  <span>☐ Invoice me</span>
  <span>☐ Other: ____________</span>
</div>
<div class="field"><label>Total paid (USD)</label><span class="line"></span></div>

<div class="sig-row">
  <div class="sig"><div class="line"></div><label>Buyer signature</label></div>
  <div class="sig"><div class="line"></div><label>Author / seller signature</label></div>
</div>

<div class="footer">Powered by Authors Bureau · This is a manual order form. The author handles fulfillment, signing, and payment off-platform.</div>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { author_id } = await req.json();
    if (!author_id) throw new Error("author_id is required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: author } = await supabase.from("author_profiles").select("pen_name").eq("id", author_id).single();
    const { data: ctx } = await supabase.from("author_context").select("book_title").eq("author_id", author_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { data: node } = await supabase.from("author_nodes").select("content_json").eq("author_id", author_id).eq("node_id", "BP-08").single();
    if (!node?.content_json) throw new Error("BP-08 special editions not found");

    const penName = author?.pen_name || "Author";
    const bookTitle = ctx?.book_title || "Your Book";
    const html = orderFormHtml(penName, bookTitle, node.content_json);
    const filename = `${penName.replace(/\s+/g, "_")}_special_edition_order_form.html`;

    return new Response(JSON.stringify({ success: true, filename, html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("export-bp08-order-form error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
