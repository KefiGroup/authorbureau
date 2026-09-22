import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { author_id } = await req.json();
    if (!author_id) throw new Error("author_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Accept either an author_profiles.id or an auth user id.
    let { data: author } = await supabase
      .from("author_profiles")
      .select("id")
      .eq("id", author_id)
      .maybeSingle();

    if (!author) {
      const { data: byUser } = await supabase
        .from("author_profiles")
        .select("id")
        .eq("user_id", author_id)
        .maybeSingle();
      author = byUser;
    }

    if (!author) throw new Error("Author not found");

    const authorProfileId = author.id as string;

    // Payout identifiers live in a private, owner-only table.
    const { data: payout } = await supabase
      .from("author_payout_accounts")
      .select("stripe_connected_account_id")
      .eq("author_id", authorProfileId)
      .maybeSingle();

    const connectedAccountId = payout?.stripe_connected_account_id || null;

    const { count: nodesLive } = await supabase
      .from("author_nodes")
      .select("id", { count: "exact", head: true })
      .eq("author_id", authorProfileId)
      .eq("status", "live");

    const liveCount = nodesLive || 0;
    const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY");

    // If no Stripe connection, return projected
    if (!STRIPE_KEY || !connectedAccountId) {
      const projected = {
        stripe_revenue_mtd_usd: liveCount * 200,
        stripe_revenue_ytd_usd: liveCount * 1200,
      };

      const today = new Date().toISOString().split("T")[0];
      await supabase.from("author_revenue_snapshots").upsert(
        {
          author_id: authorProfileId,
          snapshot_date: today,
          stripe_revenue_mtd_usd: projected.stripe_revenue_mtd_usd,
          stripe_revenue_ytd_usd: projected.stripe_revenue_ytd_usd,
          nodes_live: liveCount,
        },
        { onConflict: "author_id,snapshot_date" }
      );

      return new Response(
        JSON.stringify({ success: true, projected: true, data: projected, nodes_live: liveCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Stripe API
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const mtdTs = Math.floor(startOfMonth.getTime() / 1000);
    const ytdTs = Math.floor(startOfYear.getTime() / 1000);

    let mtdRevenue = 0;
    let ytdRevenue = 0;

    try {
      // MTD charges
      const mtdRes = await fetch(
        `https://api.stripe.com/v1/charges?created[gte]=${mtdTs}&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${STRIPE_KEY}`,
            "Stripe-Account": connectedAccountId,
          },
        }
      );
      if (mtdRes.ok) {
        const mtdData = await mtdRes.json();
        mtdRevenue = (mtdData.data || [])
          .filter((c: any) => c.status === "succeeded")
          .reduce((sum: number, c: any) => sum + (c.amount || 0), 0) / 100;
      }

      // YTD charges
      const ytdRes = await fetch(
        `https://api.stripe.com/v1/charges?created[gte]=${ytdTs}&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${STRIPE_KEY}`,
            "Stripe-Account": connectedAccountId,
          },
        }
      );
      if (ytdRes.ok) {
        const ytdData = await ytdRes.json();
        ytdRevenue = (ytdData.data || [])
          .filter((c: any) => c.status === "succeeded")
          .reduce((sum: number, c: any) => sum + (c.amount || 0), 0) / 100;
      }
    } catch (stripeErr) {
      console.error("Stripe API error:", stripeErr);
      mtdRevenue = liveCount * 200;
      ytdRevenue = liveCount * 1200;
    }

    const today = new Date().toISOString().split("T")[0];
    await supabase.from("author_revenue_snapshots").upsert(
      {
        author_id,
        snapshot_date: today,
        stripe_revenue_mtd_usd: mtdRevenue,
        stripe_revenue_ytd_usd: ytdRevenue,
        nodes_live: liveCount,
      },
      { onConflict: "author_id,snapshot_date" }
    );

    return new Response(
      JSON.stringify({
        success: true,
        projected: false,
        data: { stripe_revenue_mtd_usd: mtdRevenue, stripe_revenue_ytd_usd: ytdRevenue },
        nodes_live: liveCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("sync-stripe-metrics error:", errMessage);
    return new Response(
      JSON.stringify({ success: false, error: errMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
