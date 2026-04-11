import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

async function resolveUserEmail(token: string): Promise<string> {
  const localClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
  const { data: localUser } = await localClient.auth.getUser(token);
  if (localUser?.user?.email) {
    logStep("Resolved via local auth", { email: localUser.user.email });
    return localUser.user.email;
  }

  const sharedKey = Deno.env.get("SHARED_BACKEND_SERVICE_ROLE_KEY");
  if (sharedKey) {
    const sharedClient = createClient(SHARED_BACKEND_URL, sharedKey, { auth: { persistSession: false } });
    const { data: sharedUser } = await sharedClient.auth.getUser(token);
    if (sharedUser?.user?.email) {
      logStep("Resolved via shared backend", { email: sharedUser.user.email });
      return sharedUser.user.email;
    }
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.email) {
      logStep("Resolved via JWT decode", { email: payload.email });
      return payload.email;
    }
  } catch { /* ignore */ }

  throw new Error("Could not resolve user email");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const email = await resolveUserEmail(token);
    logStep("User resolved", { email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;
    let tier = "free";

    // Product-to-tier mapping
    const TIER_MAP: Record<string, string> = {
      "prod_UB6BxxNnqv6UpV": "brand",
      "prod_UB6BfcKCAYrgp0": "build",
      "prod_UB6BVLnks6JWoJ": "yield",
    };

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      try {
        const endVal = subscription.current_period_end;
        subscriptionEnd = typeof endVal === "number"
          ? new Date(endVal * 1000).toISOString()
          : typeof endVal === "string"
          ? new Date(endVal).toISOString()
          : null;
      } catch { subscriptionEnd = null; }
      productId = subscription.items.data[0].price.product;
      tier = TIER_MAP[productId as string] || "free";
      logStep("Active subscription found", { subscriptionId: subscription.id, productId, tier, endDate: subscriptionEnd });

      // Sync tier to author_profiles so DB stays in sync
      try {
        const adminClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } }
        );
        const { error: updateErr } = await adminClient
          .from("author_profiles")
          .update({ subscription_tier: tier })
          .eq("user_id", email)  // author_profiles doesn't have user_id by email; find by stripe customer
          ;
        // Try matching by the user email via a join approach
        // Actually, we need to find the author by their account email
        const { data: profiles } = await adminClient
          .from("author_profiles")
          .select("id, subscription_tier")
          .or(`user_id.eq.${email}`)
          .limit(1);
        
        // Better approach: look up user_id from auth, then update
        const localClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } }
        );
        const { data: authUser } = await localClient.auth.getUser(token);
        if (authUser?.user?.id) {
          const { error: syncErr } = await localClient
            .from("author_profiles")
            .update({ subscription_tier: tier })
            .eq("user_id", authUser.user.id);
          if (syncErr) {
            logStep("Failed to sync tier to DB", { error: syncErr.message });
          } else {
            logStep("Synced tier to author_profiles", { tier });
          }
        }
      } catch (syncError) {
        logStep("Tier sync error (non-fatal)", { error: String(syncError) });
      }
    } else {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
