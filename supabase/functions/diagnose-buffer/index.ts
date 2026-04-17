import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { author_id, buffer_api_key } = await req.json().catch(() => ({}));

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let apiKey = (buffer_api_key || "").trim();
    if (!apiKey && author_id) {
      const { data } = await sb
        .from("social_connections")
        .select("buffer_api_key")
        .eq("author_id", author_id)
        .not("buffer_api_key", "is", null)
        .limit(1)
        .maybeSingle();
      if (data?.buffer_api_key) apiKey = data.buffer_api_key;
    }
    if (!apiKey) apiKey = Deno.env.get("BUFFER_API_KEY") || "";
    apiKey = apiKey.trim().replace(/[^\x20-\x7E]/g, "");

    if (!apiKey) throw new Error("No Buffer API key found");

    const currentOrgId = Deno.env.get("BUFFER_ORG_ID") || null;

    const query = `query {
      account {
        currentOrganization { id name }
        organizations { id name }
      }
    }`;

    const resp = await fetch("https://api.bufferapp.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    const json = await resp.json();

    const orgs = json.data?.account?.organizations || [];

    // For each org, count channels
    const orgDetails = [];
    for (const org of orgs) {
      const channelsQuery = `query GetChannels($organizationId: String!) {
        channels(input: { organizationId: $organizationId }) {
          id name service
        }
      }`;
      const cResp = await fetch("https://api.bufferapp.com/graphql", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: channelsQuery, variables: { organizationId: org.id } }),
      });
      const cJson = await cResp.json();
      const channels = cJson.data?.channels || [];
      orgDetails.push({
        id: org.id,
        name: org.name,
        is_current_configured: org.id === currentOrgId,
        channel_count: channels.length,
        channels: channels.map((c: any) => ({ name: c.name, service: c.service })),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        configured_buffer_org_id: currentOrgId,
        current_org: json.data?.account?.currentOrganization || null,
        organizations: orgDetails,
        graphql_errors: json.errors || null,
      }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
