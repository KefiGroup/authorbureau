/**
 * process-purchase
 * ----------------
 * Stripe webhook handler. Listens to `checkout.session.completed` events from
 * BOTH the platform account and connected (Express) accounts, then:
 *   1. Inserts a row into `purchases` (idempotent on stripe_checkout_session_id)
 *   2. Computes 5% platform_fee + author_earnings
 *   3. Links to the originating author_nodes row + product (when metadata present)
 *   4. Sets payout_eligible_at = now + author's refund_window_days (default 14)
 *
 * Required secret: STRIPE_WEBHOOK_SECRET
 *
 * NOTE: This function MUST be called with verify_jwt = false because Stripe
 * does not send a Supabase JWT. We verify the Stripe signature instead.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const PLATFORM_FEE_RATE = 0.05; // 5% — see business/post-consultation-pricing-logic

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("[process-purchase] STRIPE_WEBHOOK_SECRET not configured");
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[process-purchase] Signature verification failed:", msg);
    return new Response(JSON.stringify({ error: `Invalid signature: ${msg}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    if (event.type !== "checkout.session.completed") {
      // Acknowledge but do not process other event types yet
      console.log(`[process-purchase] Ignoring event type: ${event.type}`);
      return new Response(JSON.stringify({ received: true, ignored: event.type }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const sessionId = session.id;

    // Idempotency: skip if we already recorded this session
    const { data: existing } = await admin
      .from("purchases")
      .select("id")
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();
    if (existing) {
      console.log(`[process-purchase] Already processed ${sessionId}`);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metadata = session.metadata ?? {};
    const customerEmail =
      session.customer_details?.email ??
      session.customer_email ??
      (typeof session.customer === "string" ? null : session.customer?.email) ??
      "unknown@unknown";
    const customerName =
      session.customer_details?.name ?? metadata.customer_name ?? null;

    // Amount: use amount_total (cents); fallback to line items if missing
    const amountCents = session.amount_total ?? 0;
    const amount = amountCents / 100;
    const currency = (session.currency ?? "usd").toUpperCase();

    // Resolve author + product from metadata
    let authorRowId = metadata.author_id || null;
    const authorUserId = metadata.author_user_id || null;
    const nodeRowId = metadata.author_node_row_id || null;
    const nodeId = metadata.node_id || null;
    const productType = metadata.product_type || (nodeId ?? "node");
    const productId = metadata.product_id || nodeRowId || null;
    const productTitle =
      metadata.product_title ||
      session.line_items?.data?.[0]?.description ||
      `Purchase ${sessionId.slice(-8)}`;

    // If we only have author_user_id, look up the author_profiles.id
    if (!authorRowId && authorUserId) {
      const { data: prof } = await admin
        .from("author_profiles")
        .select("id")
        .eq("user_id", authorUserId)
        .maybeSingle();
      if (prof?.id) authorRowId = prof.id;
    }

    if (!authorRowId) {
      console.error(`[process-purchase] No author_id resolvable for session ${sessionId}`);
      return new Response(JSON.stringify({ error: "Missing author_id metadata" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!productId) {
      console.error(`[process-purchase] No product_id resolvable for session ${sessionId}`);
      return new Response(JSON.stringify({ error: "Missing product_id metadata" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refund window
    const { data: payoutSettings } = await admin
      .from("author_payout_settings")
      .select("refund_window_days")
      .eq("author_id", authorRowId)
      .maybeSingle();
    const refundDays = payoutSettings?.refund_window_days ?? 14;
    const eligibleAt = new Date(Date.now() + refundDays * 24 * 60 * 60 * 1000);

    const platformFee = +(amount * PLATFORM_FEE_RATE).toFixed(2);
    const authorEarnings = +(amount - platformFee).toFixed(2);

    const { error: insertErr } = await admin.from("purchases").insert({
      customer_email: customerEmail,
      customer_name: customerName,
      author_id: authorRowId,
      product_type: productType,
      product_id: productId,
      product_title: productTitle,
      amount,
      platform_fee: platformFee,
      author_earnings: authorEarnings,
      currency,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      stripe_checkout_session_id: sessionId,
      payout_status: "pending",
      payout_eligible_at: eligibleAt.toISOString(),
    });
    if (insertErr) {
      console.error("[process-purchase] Insert failed:", insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bump revenue_to_date on the originating node when we have one
    if (nodeRowId) {
      const { data: nodeRow } = await admin
        .from("author_nodes")
        .select("revenue_to_date")
        .eq("id", nodeRowId)
        .maybeSingle();
      if (nodeRow) {
        await admin
          .from("author_nodes")
          .update({ revenue_to_date: Number(nodeRow.revenue_to_date ?? 0) + amount })
          .eq("id", nodeRowId);
      }
    }

    // Best-effort CRM capture (non-blocking)
    try {
      await admin.functions.invoke("crm-auto-capture", {
        body: {
          email: customerEmail,
          name: customerName,
          source: "purchase",
          source_detail: `${productType}: ${productTitle}`,
          author_id: authorUserId ?? authorRowId,
        },
      });
    } catch (e) {
      console.warn("[process-purchase] crm-auto-capture failed:", e);
    }

    return new Response(JSON.stringify({ received: true, session_id: sessionId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[process-purchase] Unhandled error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
