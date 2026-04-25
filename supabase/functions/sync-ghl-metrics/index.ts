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

    // Get author profile
    const { data: author } = await supabase
      .from("author_profiles")
      .select("id, ghl_api_key, ghl_sub_account_id")
      .eq("id", author_id)
      .single();

    if (!author) throw new Error("Author not found");

    // Count live nodes
    const { count: nodesLive } = await supabase
      .from("author_nodes")
      .select("id", { count: "exact", head: true })
      .eq("author_id", author_id)
      .eq("status", "live");

    const liveCount = nodesLive || 0;

    // If no GHL API key, return projected metrics
    if (!author.ghl_api_key) {
      const projected = {
        total_contacts: liveCount * 50,
        email_subscribers: liveCount * 25,
        pipeline_value_usd: liveCount * 500,
      };

      // Upsert snapshot
      const today = new Date().toISOString().split("T")[0];
      await supabase.from("author_revenue_snapshots").upsert(
        {
          author_id,
          snapshot_date: today,
          total_contacts: projected.total_contacts,
          email_subscribers: projected.email_subscribers,
          pipeline_value_usd: projected.pipeline_value_usd,
          nodes_live: liveCount,
        },
        { onConflict: "author_id,snapshot_date" }
      );

      return new Response(
        JSON.stringify({ success: true, projected: true, data: projected, nodes_live: liveCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call GHL API for real data
    const ghlBase = "https://services.leadconnectorhq.com";
    const ghlHeaders = {
      Authorization: `Bearer ${author.ghl_api_key}`,
      Version: "2021-07-28",
    };

    let totalContacts = 0;
    let emailSubscribers = 0;
    let pipelineValue = 0;

    try {
      // Get total contacts
      const contactsRes = await fetch(`${ghlBase}/contacts/?locationId=${author.ghl_sub_account_id}&limit=1`, {
        headers: ghlHeaders,
      });
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        totalContacts = contactsData.meta?.total || 0;
      }

      // Get email subscribers (tagged)
      const subsRes = await fetch(`${ghlBase}/contacts/?locationId=${author.ghl_sub_account_id}&query=email-subscriber&limit=1`, {
        headers: ghlHeaders,
      });
      if (subsRes.ok) {
        const subsData = await subsRes.json();
        emailSubscribers = subsData.meta?.total || 0;
      }

      // Get pipeline opportunities
      const oppsRes = await fetch(`${ghlBase}/opportunities/search?location_id=${author.ghl_sub_account_id}&status=open`, {
        method: "POST",
        headers: { ...ghlHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: author.ghl_sub_account_id }),
      });
      if (oppsRes.ok) {
        const oppsData = await oppsRes.json();
        pipelineValue = (oppsData.opportunities || []).reduce(
          (sum: number, o: any) => sum + (o.monetaryValue || 0),
          0
        );
      }
    } catch (ghlErr) {
      console.error("GHL API error:", ghlErr);
      // Fall back to projected
      totalContacts = liveCount * 50;
      emailSubscribers = liveCount * 25;
      pipelineValue = liveCount * 500;
    }

    const today = new Date().toISOString().split("T")[0];
    await supabase.from("author_revenue_snapshots").upsert(
      {
        author_id,
        snapshot_date: today,
        total_contacts: totalContacts,
        email_subscribers: emailSubscribers,
        pipeline_value_usd: pipelineValue,
        nodes_live: liveCount,
      },
      { onConflict: "author_id,snapshot_date" }
    );

    return new Response(
      JSON.stringify({
        success: true,
        projected: false,
        data: { total_contacts: totalContacts, email_subscribers: emailSubscribers, pipeline_value_usd: pipelineValue },
        nodes_live: liveCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("sync-ghl-metrics error:", errMessage);
    return new Response(
      JSON.stringify({ success: false, error: errMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
