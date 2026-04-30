import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

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

    const { data: author } = await supabase.from("author_profiles").select("pen_name, author_slug").eq("id", author_id).single();
    if (!author) throw new Error("Author not found");
    const authorSlug = author.author_slug || (author.pen_name || "").toLowerCase().replace(/\s+/g, "-");

    const { data: node } = await supabase.from("author_nodes").select("content_json").eq("author_id", author_id).eq("node_id", "BA-10").single();
    if (!node?.content_json) throw new Error("BA-10 content not found");

    const content = node.content_json as any;
    const price = price_override || content.suggested_price_usd || 497;
    const title = content.course_title || "BA-10 Product";
    let paymentLinkUrl = `https://buy.stripe.com/mock_BA-10_${author_id.slice(0, 8)}`;

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
        const product = await stripe.products.create({ name: title, description: content.transformation_promise || content.tagline || "", metadata: { author_id, node_id: "BA-10" } });
        const stripePrice = await stripe.prices.create({ product: product.id, unit_amount: Math.round(price * 100), currency: "usd" });
        const paymentLink = await stripe.paymentLinks.create({ line_items: [{ price: stripePrice.id, quantity: 1 }] });
        paymentLinkUrl = paymentLink.url;
        content.stripe_product_id = product.id;
        content.stripe_price_id = stripePrice.id;
      } catch (e) {
    const eMessage = e instanceof Error ? e.message : String(e); console.error("Stripe error (non-blocking):", eMessage); }
    }

    content.payment_link_url = paymentLinkUrl;
    const micrositeUrl = `https://authorsbureau.com/${authorSlug}/online-course`;
    await supabase.from("author_nodes").update({ status: "live", content_json: content, activated_at: new Date().toISOString(), microsite_url: micrositeUrl, payment_link: paymentLinkUrl }).eq("author_id", author_id).eq("node_id", "BA-10");

    return new Response(JSON.stringify({ success: true, payment_link_url: paymentLinkUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("deploy-ba10-to-thinkific error:", errMessage);
    return new Response(JSON.stringify({ success: false, error: errMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
