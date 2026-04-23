/**
 * create-checkout-session
 * -----------------------
 * Reader-facing edge function. Creates a Stripe Checkout Session.
 *
 * Sprint 40: now supports BOTH one-off `payment` mode AND recurring
 * `subscription` mode. Mode is auto-detected:
 *   - If `mode: "subscription"` is passed, OR
 *   - If `membership_author_id` is passed, OR
 *   - If the author_node is BA-12 (membership) → subscription
 *   - Otherwise → one-off payment
 *
 * Inputs:
 *   { author_node_id?: string,
 *     membership_author_id?: string,   // for /:authorSlug/members
 *     course_id?: string,              // for /:authorSlug/course/...
 *     customer_email?: string,
 *     mode?: "payment" | "subscription" }
 *
 * Output (success): { url: string }
 * Output (no Stripe Connect): { error: 'AUTHOR_PAYMENTS_NOT_SET_UP', author_id }
 */
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_FEE = 0.08;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      author_node_id,
      membership_author_id,
      course_id,
      customer_email,
      mode: explicitMode,
    } = body ?? {};

    if (!author_node_id && !membership_author_id && !course_id) {
      throw new Error("author_node_id, membership_author_id, or course_id is required");
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // ============ Resolve product + author + price ============
    let authorId: string;
    let productTitle = "Product";
    let amountCents = 0;
    let currency = "usd";
    let mode: "payment" | "subscription" =
      explicitMode === "subscription" ? "subscription" : "payment";
    const metadata: Record<string, string> = {};

    if (membership_author_id) {
      mode = "subscription";
      authorId = membership_author_id;
      const { data: m } = await admin
        .from("membership_content")
        .select("name, monthly_price, currency, status")
        .eq("author_id", authorId)
        .maybeSingle();
      if (!m) throw new Error("Membership not found");
      if (m.status !== "live") throw new Error("Membership is not currently available");
      productTitle = m.name;
      currency = (m.currency || "usd").toLowerCase();
      amountCents = Math.round(Number(m.monthly_price) * 100);
      metadata.product_type = "membership";
      metadata.product_id = authorId;
    } else if (course_id) {
      authorId = ""; // populated below
      const { data: c } = await admin
        .from("courses")
        .select("id, author_id, title, price, currency, status, stripe_price_id")
        .eq("id", course_id)
        .maybeSingle();
      if (!c) throw new Error("Course not found");
      if (c.status !== "published" && c.status !== "live") {
        throw new Error("Course is not currently available");
      }
      authorId = c.author_id;
      productTitle = c.title;
      currency = (c.currency || "usd").toLowerCase();
      amountCents = Math.round(Number(c.price ?? 0) * 100);
      metadata.product_type = "online_course";
      metadata.product_id = c.id;
      metadata.course_id = c.id;
    } else {
      const { data: node } = await admin
        .from("author_nodes")
        .select("id, author_id, node_id, node_name, personalised_name, price_usd, currency, status, content_json")
        .eq("id", author_node_id)
        .maybeSingle();
      if (!node) throw new Error("Product not found");
      if (node.status !== "live") throw new Error("Product is not currently available");
      // Fall back to content_json.suggested_price_usd (Abby-generated workbooks store price there)
      const cj = (node.content_json ?? {}) as Record<string, unknown>;
      const price = Number(node.price_usd ?? cj.suggested_price_usd ?? cj.price ?? 0);
      if (!price || price <= 0) throw new Error("Product price not set");
      authorId = node.author_id;
      productTitle = node.personalised_name || node.node_name || "Product";
      currency = (node.currency || "usd").toLowerCase();
      amountCents = Math.round(price * 100);
      metadata.author_node_row_id = node.id;
      metadata.product_id = node.id;
      metadata.node_id = node.node_id;
      metadata.product_type = node.node_id;
      // BA-12 sold via author_node falls back to subscription too
      if (node.node_id === "BA-12") mode = "subscription";
    }

    if (!amountCents || amountCents <= 0) throw new Error("Product price not set");

    // ============ Resolve author (Authors Bureau is MoR — no Connect) ============
    const { data: author } = await admin
      .from("author_profiles")
      .select("id, user_id, pen_name, author_slug")
      .eq("id", authorId)
      .maybeSingle();
    if (!author) throw new Error("Author not found");

    const { data: cfg } = await admin
      .from("platform_config")
      .select("value")
      .eq("key", "platform_fee_percent")
      .maybeSingle();
    const feePct = Number(cfg?.value ?? DEFAULT_FEE);

    metadata.author_id = author.id;
    metadata.author_user_id = author.user_id;
    metadata.product_title = productTitle;
    metadata.author_slug = author.author_slug || "";
    metadata.platform_fee_percent = String(feePct);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || "https://authorsbureau.com";
    const authorSlug = author.author_slug || "";

    // ============ Build the session ============
    const success_url =
      mode === "subscription"
        ? `${origin}/${authorSlug}/members/welcome?session_id={CHECKOUT_SESSION_ID}`
        : metadata.product_type === "online_course"
          ? `${origin}/${authorSlug}/course/${metadata.course_id}/learn?session_id={CHECKOUT_SESSION_ID}`
          : `${origin}/${authorSlug}/thank-you?session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${origin}/${authorSlug}`;

    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
      price_data: {
        currency,
        unit_amount: amountCents,
        product_data: { name: productTitle },
        ...(mode === "subscription" ? { recurring: { interval: "month" } } : {}),
      },
      quantity: 1,
    };

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode,
      payment_method_types: ["card"],
      customer_email: customer_email || undefined,
      line_items: [lineItem],
      success_url,
      cancel_url,
      metadata,
      ...(mode === "subscription"
        ? { subscription_data: { metadata } }
        : { payment_intent_data: { metadata } }),
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

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
