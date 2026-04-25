/**
 * setup-stripe-product
 * --------------------
 * Creates a Stripe Product + Price on the AUTHOR'S connected Stripe account
 * (Stripe Connect, Express). Stores stripe_product_id, stripe_price_id, and a
 * Checkout URL on the matching `author_nodes` row so commerce builders
 * (BP-06 → BP-09) can show "Live, ready to sell" and link to the buy page.
 *
 * Body:
 *   { node_id: string, name: string, price: number, currency?: string,
 *     description?: string, success_url?: string, cancel_url?: string }
 *
 * Auth: requires an author bearer token (resolved via local + shared backend).
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";

async function resolveUserId(token: string): Promise<string> {
  const local = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
  const { data: localUser } = await local.auth.getUser(token);
  if (localUser?.user?.id) return localUser.user.id;

  const sharedKey = Deno.env.get("SHARED_BACKEND_SERVICE_ROLE_KEY");
  if (sharedKey) {
    const shared = createClient(SHARED_BACKEND_URL, sharedKey, {
      auth: { persistSession: false },
    });
    const { data: sharedUser } = await shared.auth.getUser(token);
    if (sharedUser?.user?.id) return sharedUser.user.id;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.sub) return payload.sub as string;
  } catch {
    /* ignore */
  }
  throw new Error("Not authenticated");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");
    const userId = await resolveUserId(token);

    const body = await req.json();
    const {
      node_id,
      name,
      price,
      currency = "usd",
      description,
      success_url,
      cancel_url,
    } = body ?? {};

    if (!node_id || typeof node_id !== "string") {
      throw new Error("node_id is required");
    }
    if (!name || typeof name !== "string") {
      throw new Error("name is required");
    }
    if (typeof price !== "number" || price <= 0) {
      throw new Error("price must be a positive number");
    }

    // 1. Resolve author profile + connected Stripe account
    const { data: profile, error: profileErr } = await admin
      .from("author_profiles")
      .select("id, user_id, stripe_account_id, stripe_onboarding_complete, author_slug")
      .eq("user_id", userId)
      .maybeSingle();
    if (profileErr) throw profileErr;
    if (!profile) throw new Error("Author profile not found");
    if (!profile.stripe_account_id || !profile.stripe_onboarding_complete) {
      throw new Error("Stripe account is not connected. Complete Stripe onboarding first.");
    }

    // 2. Resolve the node row
    const { data: node, error: nodeErr } = await admin
      .from("author_nodes")
      .select("id, node_id, author_id, stripe_product_id, stripe_price_id")
      .eq("author_id", profile.id)
      .eq("node_id", node_id)
      .maybeSingle();
    if (nodeErr) throw nodeErr;
    if (!node) throw new Error(`Node "${node_id}" not found for this author`);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // 3. Create product on the connected account (Stripe-Account header)
    const product = await stripe.products.create(
      {
        name,
        description: description?.slice(0, 500),
        metadata: {
          node_id,
          author_node_row_id: node.id,
          author_id: profile.id,
          author_user_id: userId,
        },
      },
      { stripeAccount: profile.stripe_account_id }
    );

    const stripePrice = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: Math.round(price * 100),
        currency: currency.toLowerCase(),
      },
      { stripeAccount: profile.stripe_account_id }
    );

    // 4. Create a reusable Checkout Session — destination charges to the connected account.
    //    (We use payment_link for a stable, sharable URL.)
    const link = await stripe.paymentLinks.create(
      {
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        metadata: {
          node_id,
          author_node_row_id: node.id,
          author_id: profile.id,
          author_user_id: userId,
        },
        after_completion: success_url
          ? { type: "redirect", redirect: { url: success_url } }
          : undefined,
      },
      { stripeAccount: profile.stripe_account_id }
    );

    // 5. Persist back onto author_nodes
    const { error: updateErr } = await admin
      .from("author_nodes")
      .update({
        stripe_product_id: product.id,
        stripe_price_id: stripePrice.id,
        checkout_url: link.url,
      })
      .eq("id", node.id);
    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({
        success: true,
        stripe_product_id: product.id,
        stripe_price_id: stripePrice.id,
        checkout_url: link.url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[setup-stripe-product] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
