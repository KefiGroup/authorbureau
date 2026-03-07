import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const { action } = await req.json();
    const origin = req.headers.get("origin") || "https://authorbureau.lovable.app";

    // Get existing profile
    const { data: profile } = await supabaseAdmin
      .from("author_profiles")
      .select("stripe_account_id, stripe_onboarding_complete, pen_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (action === "status") {
      // Check current Stripe Connect status
      if (!profile?.stripe_account_id) {
        return new Response(JSON.stringify({ connected: false, onboarding_complete: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify with Stripe
      try {
        const account = await stripe.accounts.retrieve(profile.stripe_account_id);
        const isComplete = account.charges_enabled && account.details_submitted;

        // Update DB if status changed
        if (isComplete && !profile.stripe_onboarding_complete) {
          await supabaseAdmin
            .from("author_profiles")
            .update({ stripe_onboarding_complete: true })
            .eq("user_id", user.id);
        }

        return new Response(
          JSON.stringify({
            connected: true,
            onboarding_complete: isComplete,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        return new Response(JSON.stringify({ connected: false, onboarding_complete: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "onboard") {
      let accountId = profile?.stripe_account_id;

      // Create account if needed
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          email: user.email,
          metadata: { user_id: user.id },
          business_profile: {
            name: profile?.pen_name || undefined,
          },
        });
        accountId = account.id;

        await supabaseAdmin
          .from("author_profiles")
          .update({ stripe_account_id: accountId })
          .eq("user_id", user.id);
      }

      // Create onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${origin}/dashboard?section=overview&stripe_refresh=true`,
        return_url: `${origin}/dashboard?section=overview&stripe_connected=true`,
        type: "account_onboarding",
      });

      return new Response(JSON.stringify({ url: accountLink.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
