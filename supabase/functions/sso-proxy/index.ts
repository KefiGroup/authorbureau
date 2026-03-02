import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the incoming request body
    const body = await req.json();
    const { target_path, session_data } = body;

    if (!target_path || !session_data?.access_token || !session_data?.refresh_token) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: target_path, session_data.access_token, session_data.refresh_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Server-to-server call to the shared backend's sso-handoff function
    // This bypasses CORS entirely since it's not a browser request
    const serviceRoleKey = Deno.env.get("SHARED_BACKEND_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) {
      console.error("SHARED_BACKEND_SERVICE_ROLE_KEY not configured");
      return new Response(
        JSON.stringify({ error: "SSO proxy not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const handoffRes = await fetch(`${SHARED_BACKEND_URL}/functions/v1/sso-handoff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s",
      },
      body: JSON.stringify({
        action: "generate",
        source_platform: "authorsbureau",
        session_data: {
          access_token: session_data.access_token,
          refresh_token: session_data.refresh_token,
        },
      }),
    });

    const handoffData = await handoffRes.json();

    if (!handoffRes.ok || !handoffData.token) {
      console.error("SSO handoff failed:", handoffData);
      return new Response(
        JSON.stringify({ error: handoffData.error || `SSO handoff failed (${handoffRes.status})` }),
        { status: handoffRes.status || 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ token: handoffData.token }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("SSO proxy error:", err);
    return new Response(
      JSON.stringify({ error: "Internal proxy error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
