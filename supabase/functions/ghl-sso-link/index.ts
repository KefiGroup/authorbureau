import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { author_id, section } = await req.json();
    if (!author_id) {
      return new Response(
        JSON.stringify({ error: "author_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the GHL sub-account ID from author profile
    const { data: profile, error: profileError } = await supabase
      .from("author_profiles")
      .select("ghl_sub_account_id")
      .eq("id", author_id)
      .single();

    if (profileError || !profile?.ghl_sub_account_id) {
      return new Response(
        JSON.stringify({
          error: "Marketing account not connected",
          detail: "Please connect your Marketing Hub in Settings first.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const locationId = profile.ghl_sub_account_id;
    const agencyKey = Deno.env.get("GHL_AGENCY_KEY");

    if (!agencyKey) {
      return new Response(
        JSON.stringify({ error: "GHL Agency key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate SSO token via GHL Agency API
    const ssoResp = await fetch(
      `https://services.leadconnectorhq.com/oauth/locationToken`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${agencyKey}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify({
          companyId: Deno.env.get("GHL_COMPANY_ID") || "",
          locationId,
        }),
      }
    );

    if (!ssoResp.ok) {
      const errText = await ssoResp.text();
      console.error("GHL SSO API error:", ssoResp.status, errText);
      return new Response(
        JSON.stringify({
          error: "Failed to generate SSO link",
          detail: `GHL API returned ${ssoResp.status}`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ssoData = await ssoResp.json();

    // GHL returns either { token, url } or { access_token }
    // Build the SSO URL based on what we get back
    let ssoUrl = ssoData.url || "";

    if (!ssoUrl && ssoData.token) {
      // Construct URL manually — use white-label domain if configured
      const baseDomain =
        Deno.env.get("GHL_WHITELABEL_DOMAIN") ||
        "app.leadconnectorhq.com";
      ssoUrl = `https://${baseDomain}/location/${locationId}?token=${ssoData.token}`;
    }

    if (!ssoUrl && ssoData.access_token) {
      const baseDomain =
        Deno.env.get("GHL_WHITELABEL_DOMAIN") ||
        "app.leadconnectorhq.com";
      ssoUrl = `https://${baseDomain}/location/${locationId}?token=${ssoData.access_token}`;
    }

    // Append section path if requested
    const sectionPaths: Record<string, string> = {
      dashboard: "",
      contacts: "/contacts/smart_list/All",
      automations: "/automation/list",
      funnels: "/funnels-websites",
      email: "/marketing/emails",
      calendar: "/calendars",
      opportunities: "/opportunities/list",
    };

    if (section && sectionPaths[section] !== undefined) {
      // Insert the section path before the query string
      const [base, query] = ssoUrl.split("?");
      ssoUrl = `${base}${sectionPaths[section]}${query ? `?${query}` : ""}`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        sso_url: ssoUrl,
        expires_in: 3600, // SSO tokens typically last 1 hour
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ghl-sso-link error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
