import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { author_id, price_override } = await req.json();
    if (!author_id) throw new Error("author_id is required");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: author } = await supabase.from("author_profiles").select("pen_name, author_slug").eq("id", author_id).single();
    if (!author) throw new Error("Author not found");
    const { data: node } = await supabase.from("author_nodes").select("content_json").eq("author_id", author_id).eq("node_id", "YR-25").single();
    if (!node?.content_json) throw new Error("YR-25 content not found");
    const content = node.content_json as any;
    const items = (content.certification_levels || []).map((l:any) => ({ name: l.level, price: l.price_usd, desc: content.certification_title }));
    const paymentLinks: any[] = [];
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    for (const item of items) {
      let url = `https://buy.stripe.com/mock_YR-25_${author_id.slice(0,8)}_${item.name.slice(0,8)}`;
      if (STRIPE_SECRET_KEY) {
        try {
          const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
          const product = await stripe.products.create({ name: item.name, description: item.desc || "", metadata: { author_id, node_id: "YR-25" } });
          const sp = await stripe.prices.create({ product: product.id, unit_amount: Math.round(item.price * 100), currency: "usd"  });
          const pl = await stripe.paymentLinks.create({ line_items: [{ price: sp.id, quantity: 1 }] });
          url = pl.url;
        } catch (e) {
    const eMessage = e instanceof Error ? e.message : String(e); console.error("Stripe error:", eMessage); }
      }
      paymentLinks.push({ label: item.name, url });
    }
    content.payment_links = paymentLinks;
    const micrositeUrl = author.author_slug ? `https://authorsbureau.com/${author.author_slug}/certification` : null;
    await supabase.from("author_nodes").update({ status: "live", content_json: content, activated_at: new Date().toISOString(), microsite_url: micrositeUrl, payment_link: paymentLinks[0]?.url || null }).eq("author_id", author_id).eq("node_id", "YR-25");
    return new Response(JSON.stringify({ success: true, payment_links: paymentLinks }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err); console.error("deploy-yr25-to-thinkific error:", errMessage); return new Response(JSON.stringify({ success: false, error: errMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
});