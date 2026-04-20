/**
 * create-checkout-session
 * -----------------------
 * Reader-facing edge function. Creates a Stripe Checkout Session for a single
 * `author_nodes` row using destination charges so funds flow to the author's
 * connected Stripe account, with a platform application_fee taken from
 * `platform_config.platform_fee_percent`.
 *
 * Public (no JWT required) — guest checkout supported.
 *
 * Input:  { author_node_id: string, customer_email?: string }
 * Output (success): { url: string }
 * Output (no Stripe Connect): { error: 'AUTHOR_PAYMENTS_NOT_SET_UP', author_id }
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_FEE = 0.05;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { author_node_id, customer_email } = await req.json();
    if (!author_node_id) throw new Error("author_node_id is required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Load node
    const { data: node, error: nodeErr } = await admin
      .from("author_nodes")
      .select("id, author_id, node_id, node_name, personalised_name, price_usd, currency, content_json, status")
      .eq("id", author_node_id)
      .maybeSingle();

    if (nodeErr || !node) throw new Error("Product not found");
    if (node.status !== "live") throw new Error("Product is not currently available");

    const price = Number(node.price_usd ?? 0);
    if (!price || price <= 0) throw new Error("Product price not set");

    // Load author + Stripe account
    const { data: author } = await admin
      .from("author_profiles")
      .select("id, user_id, pen_name, author_slug, stripe_connected_account_id, stripe_onboarding_complete")
      .eq("id", node.author_id)
      .maybeSingle();

    if (!author) throw new Error("Author not found");
    if (!author.stripe_connected_account_id || !author.stripe_onboarding_complete) {
      return new Response(
        JSON.stringify({ error: "AUTHOR_PAYMENTS_NOT_SET_UP", author_id: author.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Platform fee from config
    const { data: cfg } = await admin
      .from("platform_config")
      .select("value")
      .eq("key", "platform_fee_percent")
      .maybeSingle();
    const feePct = Number(cfg?.value ?? DEFAULT_FEE);

    const currency = (node.currency || "usd").toLowerCase();
    const amountCents = Math.round(price * 100);
    const applicationFeeCents = Math.round(amountCents * feePct);
    const productTitle = node.personalised_name || node.node_name || "Product";

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || "https://authorsbureau.com";
    const authorSlug = author.author_slug || "";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: customer_email || undefined,
      line_items: [{
        price_data: {
          currency,
          unit_amount: amountCents,
          product_data: { name: productTitle },
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: applicationFeeCents,
        transfer_data: { destination: author.stripe_connected_account_id },
      },
      success_url: `${origin}/${authorSlug}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${authorSlug}`,
      metadata: {
        author_id: author.id,
        author_user_id: author.user_id,
        author_node_row_id: node.id,
        product_id: node.id,
        node_id: node.node_id,
        product_type: node.node_id,
        product_title: productTitle,
        author_slug: authorSlug,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[create-checkout-session]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
