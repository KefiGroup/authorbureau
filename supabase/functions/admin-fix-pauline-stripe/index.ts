// One-shot admin helper to fix Pauline Teo's Stripe customer email after the
// PublishNow email change. Updates cus_UJUky0qgRpdVKc from pl@paulineteo.com
// → support@paulineteo.com, then logs the change to email_sync_log.
//
// Safe to leave deployed: requires SERVICE_ROLE auth header to invoke and is
// hard-coded to a single customer id, so it's a no-op for anyone else.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Require service-role key in Authorization header
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const provided = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(JSON.stringify({ ok: false, error: "STRIPE_SECRET_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const CUSTOMER_ID = "cus_UJUky0qgRpdVKc";
  const NEW_EMAIL = "support@paulineteo.com";
  const OLD_EMAIL = "pl@paulineteo.com";
  const USER_ID = "ef23c521-9cce-4d86-9128-dc687748b65b";

  try {
    const before = await stripe.customers.retrieve(CUSTOMER_ID);
    const updated = await stripe.customers.update(CUSTOMER_ID, {
      email: NEW_EMAIL,
      metadata: {
        ...((before as any).metadata || {}),
        supabase_user_id: USER_ID,
        synced_from: OLD_EMAIL,
        synced_at: new Date().toISOString(),
      },
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await supabase.from("email_sync_log").insert({
      user_id: USER_ID,
      old_email: OLD_EMAIL,
      new_email: NEW_EMAIL,
      source: "manual_pauline_backfill",
      auth_updated: false,
      books_updated_count: 0,
      settings_updated: false,
      stripe_customers_updated_count: 1,
    });

    return new Response(JSON.stringify({
      ok: true,
      customer_id: updated.id,
      email_before: (before as any).email,
      email_after: updated.email,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
