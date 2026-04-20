/**
 * process-purchase
 * ----------------
 * Stripe webhook handler.
 *
 * Sprint 40: now also handles subscription lifecycle for BA-12 memberships
 * and inserts course_enrollments for BA-10 courses.
 *
 * Handled events:
 *   - checkout.session.completed                      (payment & subscription)
 *   - customer.subscription.updated                   (status changes)
 *   - customer.subscription.deleted                   (cancellation completed)
 *   - invoice.payment_succeeded                       (rolling renewal)
 *
 * Required secret: STRIPE_WEBHOOK_SECRET
 *
 * NOTE: deployed with verify_jwt = false (Stripe sends no Supabase JWT).
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const DEFAULT_PLATFORM_FEE_RATE = 0.05;

type Admin = ReturnType<typeof createClient>;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[process-purchase] sig verify failed:", msg);
    return new Response(JSON.stringify({ error: `Invalid signature: ${msg}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, admin, stripe);
    } else if (event.type === "customer.subscription.updated") {
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, admin);
    } else if (event.type === "customer.subscription.deleted") {
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, admin);
    } else if (event.type === "invoice.payment_succeeded") {
      await handleInvoicePaid(event.data.object as Stripe.Invoice, admin);
    } else {
      console.log(`[process-purchase] Ignoring event: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[process-purchase] Unhandled:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/* ─────────── Handlers ─────────── */

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, admin: Admin, _stripe: Stripe) {
  const sessionId = session.id;
  const metadata = session.metadata ?? {};

  // Idempotency on purchases
  const { data: existing } = await admin
    .from("purchases").select("id")
    .eq("stripe_checkout_session_id", sessionId).maybeSingle();
  if (existing) {
    console.log(`[process-purchase] Already processed ${sessionId}`);
    return;
  }

  const customerEmail =
    session.customer_details?.email ?? session.customer_email ?? "unknown@unknown";
  const customerName = session.customer_details?.name ?? metadata.customer_name ?? null;

  const amountCents = session.amount_total ?? 0;
  const amount = amountCents / 100;
  const currency = (session.currency ?? "usd").toUpperCase();

  let authorRowId = metadata.author_id || null;
  const authorUserId = metadata.author_user_id || null;
  const nodeRowId = metadata.author_node_row_id || null;
  const nodeId = metadata.node_id || null;
  const productType = metadata.product_type || (nodeId ?? "node");
  const productId = metadata.product_id || nodeRowId || null;
  const productTitle = metadata.product_title || `Purchase ${sessionId.slice(-8)}`;

  if (!authorRowId && authorUserId) {
    const { data: prof } = await admin
      .from("author_profiles").select("id").eq("user_id", authorUserId).maybeSingle();
    if (prof?.id) authorRowId = prof.id as string;
  }
  if (!authorRowId || !productId) {
    console.error(`[process-purchase] Missing author/product on ${sessionId}`);
    return;
  }

  const { data: payoutSettings } = await admin
    .from("author_payout_settings").select("refund_window_days").eq("author_id", authorRowId).maybeSingle();
  const refundDays = payoutSettings?.refund_window_days ?? 14;
  const eligibleAt = new Date(Date.now() + refundDays * 24 * 60 * 60 * 1000);

  const { data: feeCfg } = await admin
    .from("platform_config").select("value").eq("key", "platform_fee_percent").maybeSingle();
  const feeRate = Number(feeCfg?.value ?? DEFAULT_PLATFORM_FEE_RATE);
  const platformFee = +(amount * feeRate).toFixed(2);
  const authorEarnings = +(amount - platformFee).toFixed(2);

  // Insert purchases row (works for both payment and subscription first invoice)
  await admin.from("purchases").insert({
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

  if (nodeRowId) {
    const { data: nodeRow } = await admin
      .from("author_nodes").select("revenue_to_date").eq("id", nodeRowId).maybeSingle();
    if (nodeRow) {
      await admin.from("author_nodes").update({
        revenue_to_date: Number(nodeRow.revenue_to_date ?? 0) + amount,
      }).eq("id", nodeRowId);
    }
  }

  // ─── Online course → enrollment ───
  if (productType === "online_course" && metadata.course_id) {
    await ensureCourseEnrollment(admin, {
      courseId: metadata.course_id,
      email: customerEmail,
      name: customerName,
    });
  }

  // ─── Membership → subscription row ───
  if (productType === "membership" || session.mode === "subscription") {
    const subId = typeof session.subscription === "string" ? session.subscription : null;
    if (subId) {
      const userId = await resolveSubscriberUserId(admin, customerEmail);
      await admin.from("subscriptions").upsert({
        author_id: authorRowId,
        subscriber_email: customerEmail,
        subscriber_name: customerName,
        subscriber_user_id: userId,
        stripe_subscription_id: subId,
        stripe_customer_id:
          typeof session.customer === "string" ? session.customer : null,
        status: "active",
        price_usd: amount,
        currency: currency.toLowerCase(),
        current_period_start: new Date().toISOString(),
      }, { onConflict: "stripe_subscription_id" });
    }
  }

  // CRM capture (best-effort)
  try {
    await admin.functions.invoke("crm-auto-capture", {
      body: {
        email: customerEmail, name: customerName,
        source: "purchase",
        source_detail: `${productType}: ${productTitle}`,
        author_id: authorUserId ?? authorRowId,
      },
    });
  } catch (e) {
    console.warn("[process-purchase] crm capture failed", e);
  }
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription, admin: Admin) {
  await admin.from("subscriptions").update({
    status: sub.status,
    current_period_start: sub.current_period_start
      ? new Date(sub.current_period_start * 1000).toISOString() : null,
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString() : null,
    cancelled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
  }).eq("stripe_subscription_id", sub.id);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription, admin: Admin) {
  await admin.from("subscriptions").update({
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
    current_period_end: sub.ended_at
      ? new Date(sub.ended_at * 1000).toISOString() : new Date().toISOString(),
  }).eq("stripe_subscription_id", sub.id);
}

async function handleInvoicePaid(invoice: Stripe.Invoice, admin: Admin) {
  // Renewal: just refresh the period dates
  const subId = typeof invoice.subscription === "string" ? invoice.subscription : null;
  if (!subId) return;
  if (invoice.period_end) {
    await admin.from("subscriptions").update({
      status: "active",
      current_period_end: new Date(invoice.period_end * 1000).toISOString(),
    }).eq("stripe_subscription_id", subId);
  }
}

async function ensureCourseEnrollment(
  admin: Admin,
  args: { courseId: string; email: string; name: string | null },
) {
  // Look up the reader by email; do NOT auto-create an auth user — gating
  // happens client-side on /learn (redirect to reader login if needed).
  const userId = await resolveSubscriberUserId(admin, args.email);

  // Find author_id for the course
  const { data: course } = await admin
    .from("courses").select("author_id").eq("id", args.courseId).maybeSingle();
  if (!course) return;

  // Idempotent: if an enrollment exists for (course, user OR email) skip
  if (userId) {
    const { data: ex } = await admin
      .from("course_enrollments").select("id")
      .eq("course_id", args.courseId).eq("user_id", userId).maybeSingle();
    if (ex) return;
    await admin.from("course_enrollments").insert({
      course_id: args.courseId, user_id: userId,
      status: "active", progress_percent: 0,
    });
  }
  // If no user_id yet, the gate on /learn will prompt the buyer to sign in
  // with the same email; on first sign-in we'll back-fill (handled in UI).
}

async function resolveSubscriberUserId(admin: Admin, email: string): Promise<string | null> {
  if (!email) return null;
  try {
    // Use the auth admin API to find the user by email
    // deno-lint-ignore no-explicit-any
    const { data, error } = await (admin.auth as any).admin.listUsers({ page: 1, perPage: 200 });
    if (error || !data?.users) return null;
    // deno-lint-ignore no-explicit-any
    const u = (data.users as any[]).find((x) => (x.email ?? "").toLowerCase() === email.toLowerCase());
    return u?.id ?? null;
  } catch {
    return null;
  }
}
