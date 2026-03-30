import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.7.0";

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { author_id, price_override } = await req.json();
    if (!author_id) throw new Error("author_id is required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: author } = await supabase.from("author_profiles").select("ghl_sub_account_id, pen_name, author_slug").eq("id", author_id).single();
    if (!author) throw new Error("Author not found");
    const penSlug = author.author_slug || (author.pen_name || "").toLowerCase().replace(/\s+/g, "-");

    const { data: node } = await supabase.from("author_nodes").select("content_json").eq("author_id", author_id).eq("node_id", "BP-08").single();
    if (!node?.content_json) throw new Error("BP-08 content not found");

    const content = node.content_json as any;
    const price = price_override || content.suggested_price_usd || 49;
    const title = content.edition_title || "Special Edition";
    let paymentLinkUrl = `https://buy.stripe.com/mock_BP-08_${author_id.slice(0, 8)}`;

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
        const product = await stripe.products.create({ name: title, description: content.tagline || "", metadata: { author_id, node_id: "BP-08" } });
        const stripePrice = await stripe.prices.create({ product: product.id, unit_amount: Math.round(price * 100), currency: "usd" });
        const paymentLink = await stripe.paymentLinks.create({ line_items: [{ price: stripePrice.id, quantity: 1 }] });
        paymentLinkUrl = paymentLink.url;
        content.stripe_product_id = product.id;
        content.stripe_price_id = stripePrice.id;
      } catch (e) { console.error("Stripe error:", e.message); }
    }

    let locationId = author.ghl_sub_account_id;
    if (!locationId) { try { const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/provision-ghl-subaccount`, { method: "POST", headers: { "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" }, body: JSON.stringify({ author_id }) }); const d = await r.json(); locationId = d?.ghl_subaccount_id || null; } catch (e) { console.error("GHL provision:", e); } }
    const GHL_AGENCY_KEY = Deno.env.get("GHL_AGENCY_KEY");
    if (locationId && GHL_AGENCY_KEY) { try { await fetch(`${GHL_BASE_URL}/opportunities/`, { method: "POST", headers: { Authorization: `Bearer ${GHL_AGENCY_KEY}`, "Content-Type": "application/json", Version: "2021-07-28" }, body: JSON.stringify({ locationId, name: title, pipelineId: "digital-products", status: "open", monetaryValue: price }) }); } catch (e) { console.error("GHL opp:", e); } }

    content.payment_link_url = paymentLinkUrl;
    const micrositeUrl = `https://authorsbureau.com/${penSlug}/special-edition`;
    await supabase.from("author_nodes").update({ status: "live", ghl_resource_id: paymentLinkUrl, content_json: content, activated_at: new Date().toISOString(), microsite_url: micrositeUrl, payment_link: paymentLinkUrl }).eq("author_id", author_id).eq("node_id", "BP-08");

    return new Response(JSON.stringify({ success: true, payment_link_url: paymentLinkUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("deploy-bp08 error:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
