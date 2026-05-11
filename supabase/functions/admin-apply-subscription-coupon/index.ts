// One-off admin tool: attach a Stripe coupon to an existing subscription.
// Run via: supabase.functions.invoke('admin-apply-subscription-coupon', { body: { subscriptionId, couponId } })
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { subscriptionId, couponId } = await req.json();
    if (!subscriptionId || !couponId) throw new Error("subscriptionId and couponId required");
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const updated = await stripe.subscriptions.update(subscriptionId, {
      discounts: [{ coupon: couponId }],
    });
    return new Response(JSON.stringify({
      success: true,
      id: updated.id,
      discounts: updated.discounts,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
