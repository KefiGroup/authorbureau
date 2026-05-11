import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Parent coupon IDs for each tier (fixed $-off coupons, duration: forever)
// Discount applies to first invoice AND every subsequent renewal cycle.
const COUPON_IDS: Record<string, string> = {
  starter: "4znjuHsM",   // BRAND-SPECIAL: $20 off forever
  pro: "MotCxLmb",       // BUILD-SPECIAL: $100 off forever
  enterprise: "mzy3vcL8", // YIELD-SPECIAL: $250 off forever
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Get author profile
    const { data: profile } = await supabase
      .from("author_profiles")
      .select("id, consultation_promo_codes, consultation_promo_expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "No author profile" }), { status: 404, headers: corsHeaders });
    }

    // Check if valid promos already exist
    if (profile.consultation_promo_codes && profile.consultation_promo_expires_at) {
      const expiresAt = new Date(profile.consultation_promo_expires_at);
      if (expiresAt > new Date()) {
        return new Response(JSON.stringify({
          success: true,
          promo_codes: profile.consultation_promo_codes,
          expires_at: profile.consultation_promo_expires_at,
          already_exists: true,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 min from now
    const expiresAtUnix = Math.floor(expiresAt.getTime() / 1000);

    const promoCodes: Record<string, string> = {};

    // Generate unique promo codes for each tier in parallel
    await Promise.all(
      Object.entries(COUPON_IDS).map(async ([tier, couponId]) => {
        const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        const code = `AB-${tier.toUpperCase().substring(0, 2)}-${suffix}`;

        const promoCode = await stripe.promotionCodes.create({
          coupon: couponId,
          code,
          max_redemptions: 1,
          expires_at: expiresAtUnix,
        });

        promoCodes[tier] = promoCode.code;
      })
    );

    // Store in author_profiles
    await supabase
      .from("author_profiles")
      .update({
        consultation_promo_codes: promoCodes,
        consultation_promo_expires_at: expiresAt.toISOString(),
      })
      .eq("id", profile.id);

    return new Response(JSON.stringify({
      success: true,
      promo_codes: promoCodes,
      expires_at: expiresAt.toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("generate-consultation-promos error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
