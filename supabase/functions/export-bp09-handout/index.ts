import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const escape = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function handoutHtml(penName: string, bookTitle: string, content: any): string {
  const w = content?.workshop || {};
  const outline = (w.talk_outline || []).map((o: any) =>
    `<li><strong>${escape(o.section)} (${escape(o.duration_min)} min):</strong> ${escape(o.content)}</li>`
  ).join("");
  const buyUrl = String(content?.amazon_url || content?.bookstore_url || "").trim();
  const buyBlock = buyUrl
    ? `<h2>Get the book</h2><p><a href="${escape(buyUrl)}" style="color:#1E2761;">${escape(buyUrl)}</a></p>`
    : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escape(bookTitle)} — Workshop Handout</title>
<style>
  body { font-family: Georgia, serif; max-width: 760px; margin: 40px auto; padding: 0 30px; color: #1A1A2E; line-height: 1.55; }
  h1 { color: #1E2761; font-size: 28px; margin-bottom: 4px; }
  .sub { color: #666; font-size: 14px; margin-bottom: 24px; }
  h2 { color: #1E2761; font-size: 18px; border-bottom: 2px solid #CADCFC; padding-bottom: 4px; margin-top: 28px; }
  ul { padding-left: 22px; } li { margin-bottom: 8px; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #888; text-align: center; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>${escape(bookTitle)}</h1>
<div class="sub">Workshop handout · by ${escape(penName)}</div>
<h2>Talk Outline</h2><ul>${outline}</ul>
<h2>Key Takeaways</h2>
<div>${escape(w.handout_outline || "")}</div>
<h2>Pitch Script</h2>
<p style="font-style: italic; background: #F5F5F5; padding: 14px; border-left: 3px solid #1E2761;">${escape(w.pitch_script || "")}</p>
${buyBlock}
<div class="footer">Powered by Authors Bureau</div>
</body></html>`;
}

function bulkProposalHtml(penName: string, bookTitle: string, content: any): string {
  const c = content?.corporate_lunch || {};
  const bp = c.bulk_proposal || {};
  const tier = (key: string, label: string) => {
    const t = bp[key] || {};
    const inc = (t.includes || []).map((i: string) => `<li>${escape(i)}</li>`).join("");
    return `<div class="tier"><h3>${label} — ${escape(t.books || "")} books</h3>
      <div class="price">$${escape(t.price_usd || "")}</div><ul>${inc}</ul></div>`;
  };
  const roi = (c.roi_talking_points || []).map((r: any) =>
    `<li><strong>${escape(r.metric)}:</strong> ${escape(r.framing)}</li>`
  ).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escape(bookTitle)} — Bulk Order Proposal</title>
<style>
  body { font-family: Georgia, serif; max-width: 760px; margin: 40px auto; padding: 0 30px; color: #1A1A2E; line-height: 1.55; }
  h1 { color: #1E2761; font-size: 28px; margin-bottom: 4px; }
  .sub { color: #666; font-size: 14px; margin-bottom: 24px; }
  h2 { color: #1E2761; font-size: 18px; border-bottom: 2px solid #CADCFC; padding-bottom: 4px; margin-top: 28px; }
  .tiers { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin: 14px 0; }
  .tier { border: 1px solid #CADCFC; padding: 16px; border-radius: 8px; }
  .tier h3 { color: #1E2761; margin: 0 0 6px; font-size: 15px; }
  .price { font-size: 22px; font-weight: bold; color: #1E2761; margin-bottom: 8px; }
  .tier ul { padding-left: 18px; font-size: 13px; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #888; text-align: center; }
  @media print { body { margin: 20px; } .tiers { grid-template-columns: 1fr 1fr 1fr; } }
</style></head><body>
<h1>${escape(bookTitle)}</h1>
<div class="sub">Bulk Order Proposal · by ${escape(penName)}</div>
<h2>Why this works for your team</h2>
<ul>${roi}</ul>
<h2>Bulk Order Tiers</h2>
<div class="tiers">${tier("tier_10", "Starter")}${tier("tier_50", "Team")}${tier("tier_200", "Enterprise")}</div>
<h2>Next Steps</h2>
<p>Reply to confirm your tier, signed-copy preferences, and target delivery date. We'll send invoice + dedication list within 24 hours.</p>
<div class="footer">Powered by Authors Bureau</div>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { author_id, document } = await req.json();
    if (!author_id || !document) throw new Error("author_id and document are required");
    if (document !== "handout" && document !== "bulk_proposal") throw new Error("document must be 'handout' or 'bulk_proposal'");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: author } = await supabase.from("author_profiles").select("pen_name").eq("id", author_id).single();
    const { data: ctx } = await supabase.from("author_context").select("book_title").eq("author_id", author_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { data: node } = await supabase.from("author_nodes").select("content_json").eq("author_id", author_id).eq("node_id", "BP-09").single();
    if (!node?.content_json) throw new Error("BP-09 toolkit not found");

    const penName = author?.pen_name || "Author";
    const bookTitle = ctx?.book_title || "Your Book";

    const html = document === "handout"
      ? handoutHtml(penName, bookTitle, node.content_json)
      : bulkProposalHtml(penName, bookTitle, node.content_json);

    const filename = `${penName.replace(/\s+/g, "_")}_${document}.html`;

    return new Response(JSON.stringify({ success: true, filename, html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("export-bp09-handout error:", errMessage);
    return new Response(JSON.stringify({ success: false, error: errMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
