/**
 * cancel-subscription
 * -------------------
 * Cancels a member's Stripe subscription at period end. The subscriber must
 * be the authenticated user (matched by subscriber_user_id or email).
 *
 * Body: { subscription_id: string }   (our public.subscriptions.id)
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) throw new Error("Invalid auth token");
    const user = userData.user;

    const { subscription_id } = await req.json();
    if (!subscription_id) throw new Error("subscription_id is required");

    const { data: sub, error: subErr } = await admin
      .from("subscriptions")
      .select("id, stripe_subscription_id, subscriber_user_id, subscriber_email, author_id, status")
      .eq("id", subscription_id)
      .maybeSingle();
    if (subErr || !sub) throw new Error("Subscription not found");

    const isOwner =
      sub.subscriber_user_id === user.id ||
      (user.email && sub.subscriber_email?.toLowerCase() === user.email.toLowerCase());
    if (!isOwner) throw new Error("You don't have permission to cancel this subscription");

    if (!sub.stripe_subscription_id) throw new Error("Subscription not connected to Stripe");

    // Find the connected account for the author so we can call Stripe with the right header
    const { data: author } = await admin
      .from("author_profiles")
      .select("stripe_connected_account_id, stripe_account_id")
      .eq("id", sub.author_id)
      .maybeSingle();

    const connectedId = author?.stripe_connected_account_id || author?.stripe_account_id;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const cancelled = await stripe.subscriptions.update(
      sub.stripe_subscription_id,
      { cancel_at_period_end: true },
      connectedId ? { stripeAccount: connectedId } : undefined,
    );

    await admin
      .from("subscriptions")
      .update({
        status: "cancelling",
        cancelled_at: new Date().toISOString(),
        current_period_end: cancelled.cancel_at
          ? new Date(cancelled.cancel_at * 1000).toISOString()
          : null,
      })
      .eq("id", sub.id);

    return new Response(
      JSON.stringify({ success: true, cancel_at_period_end: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[cancel-subscription]", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
