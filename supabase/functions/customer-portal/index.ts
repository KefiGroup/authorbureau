import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function resolveUserEmail(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("No authorization header provided");
  const token = authHeader.replace("Bearer ", "");

  // Try local Cloud auth first
  const localClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
  const { data: localUser } = await localClient.auth.getUser(token);
  if (localUser?.user?.email) {
    console.log("[customer-portal] Resolved via local auth:", localUser.user.email);
    return localUser.user.email;
  }

  // Fallback: shared backend
  const sharedUrl = "https://wuftdpnekscrsghqtssd.supabase.co";
  const sharedKey = Deno.env.get("SHARED_BACKEND_SERVICE_ROLE_KEY");
  if (sharedKey) {
    const sharedClient = createClient(sharedUrl, sharedKey, { auth: { persistSession: false } });
    const { data: sharedUser } = await sharedClient.auth.getUser(token);
    if (sharedUser?.user?.email) {
      console.log("[customer-portal] Resolved via shared backend:", sharedUser.user.email);
      return sharedUser.user.email;
    }
  }

  // Fallback: decode JWT claims
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.email) {
      console.log("[customer-portal] Resolved via JWT decode:", payload.email);
      return payload.email;
    }
  } catch { /* ignore */ }

  throw new Error("Could not resolve user email from token");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const email = await resolveUserEmail(req);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found for this user");
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${origin}/dashboard`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[customer-portal] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
