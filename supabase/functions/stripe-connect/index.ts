import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";

async function resolveUser(token: string): Promise<{ id: string; email: string }> {
  const localClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
  const { data: localUser } = await localClient.auth.getUser(token);
  if (localUser?.user?.id && localUser?.user?.email) {
    return { id: localUser.user.id, email: localUser.user.email };
  }

  const sharedKey = Deno.env.get("SHARED_BACKEND_SERVICE_ROLE_KEY");
  if (sharedKey) {
    const sharedClient = createClient(SHARED_BACKEND_URL, sharedKey, { auth: { persistSession: false } });
    const { data: sharedUser } = await sharedClient.auth.getUser(token);
    if (sharedUser?.user?.id && sharedUser?.user?.email) {
      const { data: profile } = await localClient
        .from("author_profiles")
        .select("user_id")
        .or(`user_id.eq.${sharedUser.user.id}`)
        .maybeSingle();
      const userId = profile?.user_id || sharedUser.user.id;
      return { id: userId, email: sharedUser.user.email };
    }
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.sub && payload.email) {
      return { id: payload.sub, email: payload.email };
    }
  } catch { /* ignore */ }

  throw new Error("Not authenticated");
}

/**
 * Sprint 42 — Stripe Connect Express is now used PAYOUTS ONLY.
 * Authors Bureau remains Merchant of Record and collects all reader payments
 * via the master Stripe account. Express accounts here only receive
 * `stripe.transfers.create()` calls on the 1st of each month and therefore
 * request the `transfers` capability only (no `card_payments`).
 */
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
    const user = await resolveUser(token);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const { action } = await req.json();
    const origin = req.headers.get("origin") || "https://authorbureau.lovable.app";

    const { data: profile } = await supabaseAdmin
      .from("author_profiles")
      .select("stripe_account_id, stripe_onboarding_complete, pen_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (action === "status") {
      if (!profile?.stripe_account_id) {
        return new Response(JSON.stringify({ connected: false, onboarding_complete: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const account = await stripe.accounts.retrieve(profile.stripe_account_id);
        // For payout-only Express, we only need transfers active.
        const transfersActive = account.capabilities?.transfers === "active";
        const isComplete = transfersActive && account.details_submitted;

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
            transfers_enabled: transfersActive,
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

      if (!accountId) {
        // Payout-only Express: request transfers capability only.
        const account = await stripe.accounts.create({
          type: "express",
          email: user.email,
          metadata: { user_id: user.id, purpose: "payout_only" },
          capabilities: {
            transfers: { requested: true },
          },
          business_profile: {
            name: profile?.pen_name || undefined,
            product_description: "Royalty payouts from Authors Bureau marketplace",
          },
        });
        accountId = account.id;

        await supabaseAdmin
          .from("author_profiles")
          .update({ stripe_account_id: accountId })
          .eq("user_id", user.id);
      }

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${origin}/account-settings?tab=payouts&stripe_refresh=true`,
        return_url: `${origin}/account-settings?tab=payouts&stripe_connected=true`,
        type: "account_onboarding",
      });

      return new Response(JSON.stringify({ url: accountLink.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[stripe-connect] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
