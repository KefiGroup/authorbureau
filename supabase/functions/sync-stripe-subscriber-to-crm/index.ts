// Sync a Stripe paying subscriber into the platform CRM (crm_contacts + lead_activities).
// Idempotent. Safe to call from check-subscription, webhooks, or backfill.
// Input: { email?, stripe_customer_id?, subscription_id? } — any one is enough.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TIER_MAP: Record<string, string> = {
  prod_UB6BxxNnqv6UpV: "brand",
  prod_UB6BfcKCAYrgp0: "build",
  prod_UB6BVLnks6JWoJ: "yield",
  prod_UDQttfkI82vPTf: "brand",
  prod_UDQtofrWi6NpKc: "build",
  prod_UDQtP7TtNPX0jm: "yield",
};

const log = (s: string, d?: unknown) =>
  console.log(`[SYNC-CRM] ${s}${d ? " " + JSON.stringify(d) : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { email: rawEmail, stripe_customer_id, subscription_id } = body ?? {};

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Resolve subscription/customer/email
    let sub: Stripe.Subscription | null = null;
    let customer: Stripe.Customer | null = null;

    if (subscription_id) {
      sub = await stripe.subscriptions.retrieve(subscription_id, { expand: ["customer"] });
      customer = sub.customer as Stripe.Customer;
    } else if (stripe_customer_id) {
      customer = (await stripe.customers.retrieve(stripe_customer_id)) as Stripe.Customer;
    } else if (rawEmail) {
      const found = await stripe.customers.list({ email: rawEmail, limit: 1 });
      if (found.data.length === 0) {
        return new Response(JSON.stringify({ success: true, status: "no_customer" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      customer = found.data[0];
    } else {
      throw new Error("Provide email, stripe_customer_id, or subscription_id");
    }

    if (!sub && customer) {
      const list = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 5 });
      sub = list.data.find((s) => ["active", "trialing", "past_due"].includes(s.status)) ?? null;
    }

    const email = (customer?.email || rawEmail || "").toLowerCase();
    if (!email) throw new Error("Could not resolve email");

    const productId = sub?.items.data[0]?.price.product as string | undefined;
    const tier = (productId && TIER_MAP[productId]) || "unknown";
    const couponId = sub?.discount?.coupon?.id ?? null;

    // Resolve platform admin user_id (crm_contacts.author_id stores user_id per legacy convention)
    const { data: admins } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1);
    const platformAdminUserId = admins?.[0]?.user_id;
    if (!platformAdminUserId) throw new Error("No admin user found to own platform CRM contacts");

    // Resolve author_profile.id for lead_activities (FK to author_profiles.id)
    let authorProfileId: string | null = null;
    const { data: profByEmail } = await admin
      .from("books")
      .select("author_id")
      .ilike("owner_email", email)
      .limit(1);
    authorProfileId = profByEmail?.[0]?.author_id ?? null;
    if (!authorProfileId) {
      const { data: adminProf } = await admin
        .from("author_profiles")
        .select("id")
        .eq("user_id", platformAdminUserId)
        .limit(1);
      authorProfileId = adminProf?.[0]?.id ?? null;
    }

    // Upsert contact (case-insensitive on email, scoped to platform admin author_id)
    const { data: existing } = await admin
      .from("crm_contacts")
      .select("id, stage")
      .eq("author_id", platformAdminUserId)
      .ilike("email", email)
      .limit(1);

    let contactId: string;
    if (existing && existing.length > 0) {
      contactId = existing[0].id;
      await admin
        .from("crm_contacts")
        .update({
          full_name: fullName,
          source: "stripe_subscription",
          stage: sub ? "customer" : existing[0].stage,
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", contactId);
      log("Updated existing contact", { contactId, email });
    } else {
      const { data: created, error: insErr } = await admin
        .from("crm_contacts")
        .insert({
          author_id: platformAdminUserId,
          full_name: fullName,
          email,
          source: "stripe_subscription",
          stage: sub ? "customer" : "new_lead",
          last_activity_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      contactId = created!.id;
      log("Inserted new contact", { contactId, email });
    }

    // Tags: paying_subscriber + tier
    const tagsToAdd = ["paying_subscriber"];
    if (tier !== "unknown") tagsToAdd.push(`tier:${tier}`);
    if (couponId) tagsToAdd.push(`coupon:${couponId}`);
    for (const tag of tagsToAdd) {
      await admin
        .from("crm_contact_tags")
        .upsert(
          { author_id: platformAdminUserId, contact_id: contactId, tag },
          { onConflict: "contact_id,tag", ignoreDuplicates: true },
        );
    }

    // Lead activity (idempotent on subscription_id via metadata check)
    if (sub && authorProfileId) {
      const { data: existingActivity } = await admin
        .from("lead_activities")
        .select("id")
        .eq("lead_id", contactId)
        .eq("activity_type", "subscription_started")
        .contains("metadata", { subscription_id: sub.id })
        .limit(1);
      if (!existingActivity || existingActivity.length === 0) {
        await admin.from("lead_activities").insert({
          lead_id: contactId,
          author_id: authorProfileId,
          activity_type: "subscription_started",
          metadata: {
            subscription_id: sub.id,
            customer_id: customer?.id,
            product_id: productId,
            tier,
            coupon: couponId,
            status: sub.status,
          },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "ok",
        message: "synced",
        contact_id: contactId,
        email,
        tier,
        has_subscription: !!sub,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { msg });
    return new Response(
      JSON.stringify({ success: false, status: "error", message: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
