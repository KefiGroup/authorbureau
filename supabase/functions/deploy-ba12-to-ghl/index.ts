import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { author_id } = await req.json();
    if (!author_id) throw new Error("author_id is required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: author } = await supabase.from("author_profiles").select("ghl_sub_account_id, pen_name, author_slug").eq("id", author_id).single();
    if (!author) throw new Error("Author not found");
    const authorSlug = author.author_slug || (author.pen_name || "").toLowerCase().replace(/\s+/g, "-");

    const { data: node } = await supabase.from("author_nodes").select("content_json").eq("author_id", author_id).eq("node_id", "BA-12").single();
    if (!node?.content_json) throw new Error("BA-12 content not found");

    const content = node.content_json as any;
    const items = content.membership_tiers || [];
    const paymentLinks: any[] = [];
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");

    for (const item of items) {
      const name = item.tier_name || "BA-12 Product";
      const price = item.price_monthly_usd || 97;
      let url = `https://buy.stripe.com/mock_BA-12_${author_id.slice(0, 8)}`;
      if (STRIPE_SECRET_KEY) {
        try {
          const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
          const product = await stripe.products.create({ name, metadata: { author_id, node_id: "BA-12" } });
          const sp = await stripe.prices.create({ product: product.id, unit_amount: Math.round(price * 100), currency: "usd" });
          const pl = await stripe.paymentLinks.create({ line_items: [{ price: sp.id, quantity: 1 }] });
          url = pl.url;
        } catch (e) { console.error("Stripe error:", e.message); }
      }
      paymentLinks.push({ name, url });
    }

    content.payment_links = paymentLinks;
    const ghlId = paymentLinks[0]?.url || "memberships-" + author_id.slice(0, 8);

    let locationId = author.ghl_sub_account_id;
    const GHL_AGENCY_KEY = Deno.env.get("GHL_AGENCY_KEY");
    if (locationId && GHL_AGENCY_KEY) {
      try {
        await fetch(`${GHL_BASE_URL}/opportunities/`, { method: "POST", headers: { Authorization: `Bearer ${GHL_AGENCY_KEY}`, "Content-Type": "application/json", Version: "2021-07-28" }, body: JSON.stringify({ locationId, name: "BA-12 - " + author.pen_name, pipelineId: "memberships", status: "open" }) });
      } catch (e) { console.error("GHL error:", e); }
    }

    const micrositeUrl = `https://authorsbureau.com/${authorSlug}/membership`;
    await supabase.from("author_nodes").update({ status: "live", ghl_resource_id: ghlId, content_json: content, activated_at: new Date().toISOString(), microsite_url: micrositeUrl, payment_link: paymentLinks[0]?.url || null }).eq("author_id", author_id).eq("node_id", "BA-12");

    return new Response(JSON.stringify({ success: true, payment_links: paymentLinks }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("deploy-ba12-to-ghl error:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
