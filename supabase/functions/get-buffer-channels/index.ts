import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_MAP: Record<string, string> = {
  linkedin: "linkedin",
  instagram: "instagram",
  facebook: "facebook",
  twitter: "x",
  x: "x",
  pinterest: "pinterest",
  tiktok: "tiktok",
  youtube: "youtube",
  threads: "threads",
};

function normalizePlatform(service: string): string {
  const s = (service || "").toLowerCase();
  return PLATFORM_MAP[s] || s;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { author_id } = await req.json();
    if (!author_id) throw new Error("author_id required");

    const BUFFER_API_KEY = Deno.env.get("BUFFER_API_KEY");
    const BUFFER_ORG_ID = Deno.env.get("BUFFER_ORG_ID");
    if (!BUFFER_API_KEY) throw new Error("Social Accounts service is not configured.");
    if (!BUFFER_ORG_ID) throw new Error("Social Accounts org is not configured.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const query = `query GetChannels($organizationId: String!) {
      channels(input: { organizationId: $organizationId }) {
        id
        name
        service
      }
    }`;

    const resp = await fetch("https://api.bufferapp.com/graphql", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BUFFER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: { organizationId: BUFFER_ORG_ID } }),
    });

    const json = await resp.json();
    if (json.errors?.length) {
      console.error("Buffer GraphQL errors:", json.errors);
      throw new Error(json.errors[0]?.message || "Failed to fetch social channels");
    }

    const channels = (json.data?.channels || []) as Array<{ id: string; name: string; service: string }>;

    // Upsert into social_connections
    const rows = channels.map((c) => ({
      author_id,
      channel_id: c.id,
      platform: normalizePlatform(c.service),
      channel_name: c.name,
      status: "active",
    }));

    if (rows.length > 0) {
      const { error: upsertErr } = await sb
        .from("social_connections")
        .upsert(rows, { onConflict: "author_id,channel_id" });
      if (upsertErr) {
        console.error("Upsert error:", upsertErr);
        throw upsertErr;
      }
    }

    return new Response(
      JSON.stringify({ success: true, channels: rows, count: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("get-buffer-channels error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
