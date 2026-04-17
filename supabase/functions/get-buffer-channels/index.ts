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
    const { author_id, buffer_api_key } = await req.json();
    if (!author_id) throw new Error("author_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Resolve API key: per-author override > stored key > global env fallback
    let apiKey = (buffer_api_key || "").trim();

    if (!apiKey) {
      const { data: existing } = await sb
        .from("social_connections")
        .select("buffer_api_key")
        .eq("author_id", author_id)
        .not("buffer_api_key", "is", null)
        .limit(1)
        .maybeSingle();
      if (existing?.buffer_api_key) apiKey = existing.buffer_api_key;
    }

    if (!apiKey) {
      apiKey = Deno.env.get("BUFFER_API_KEY") || "";
    }

    // Sanitize: trim + strip any non-ASCII / control characters that would
    // break the Authorization header (must be valid ByteString).
    apiKey = apiKey.trim().replace(/[^\x20-\x7E]/g, "");

    const BUFFER_ORG_ID = Deno.env.get("BUFFER_ORG_ID");
    if (!apiKey) throw new Error("Buffer API key is required. Please paste your key and try again.");
    if (!BUFFER_ORG_ID) throw new Error("Social Accounts org is not configured.");

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
        "Authorization": `Bearer ${apiKey}`,
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

    // Upsert into social_connections, persisting the key per author
    const rows = channels.map((c) => ({
      author_id,
      channel_id: c.id,
      platform: normalizePlatform(c.service),
      channel_name: c.name,
      status: "active",
      buffer_api_key: apiKey,
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

    const platforms = Array.from(new Set(rows.map((r) => r.platform)));

    return new Response(
      JSON.stringify({ success: true, channels: rows, count: rows.length, platforms }),
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
