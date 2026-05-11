// One-time admin backfill: iterate active/trialing/past_due Stripe subscriptions
// and call sync-stripe-subscriber-to-crm for each. Idempotent.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Admin gate: require caller to be admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization");
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: userData, error: userErr } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) throw new Error("Unauthorized");
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .limit(1);
    if (!roles || roles.length === 0) throw new Error("Admin required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-stripe-subscriber-to-crm`;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const results: Array<{ subscription_id: string; status: string; result?: unknown; error?: string }> = [];
    const statuses = ["active", "trialing", "past_due"] as const;

    for (const status of statuses) {
      let starting_after: string | undefined = undefined;
      while (true) {
        const page: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
          status,
          limit: 100,
          starting_after,
        });
        for (const sub of page.data) {
          try {
            const r = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceKey}`,
              },
              body: JSON.stringify({ subscription_id: sub.id }),
            });
            const j = await r.json().catch(() => ({}));
            results.push({ subscription_id: sub.id, status: sub.status, result: j });
          } catch (e) {
            results.push({
              subscription_id: sub.id,
              status: sub.status,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }
        if (!page.has_more) break;
        starting_after = page.data[page.data.length - 1].id;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "ok",
        message: `Backfilled ${results.length} subscriptions`,
        count: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, status: "error", message: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
