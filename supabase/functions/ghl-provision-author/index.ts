import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_AGENCY_KEY = Deno.env.get("GHL_AGENCY_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { author_id } = await req.json();
    if (!author_id) throw new Error("author_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch author profile
    const { data: author, error } = await supabase
      .from("author_profiles")
      .select("id, pen_name, user_id, ghl_provision_status, ghl_sub_account_id")
      .eq("id", author_id)
      .single();

    if (error || !author) throw new Error("Author not found");

    // Already provisioned — return early
    if (author.ghl_provision_status === "provisioned" && author.ghl_sub_account_id) {
      return new Response(
        JSON.stringify({ success: true, message: "Already provisioned", ghl_location_id: author.ghl_sub_account_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get author email from auth.users via service role
    const { data: userData } = await supabase.auth.admin.getUserById(author.user_id);
    const authorEmail = userData?.user?.email || "noreply@authorsbureau.com";
    const authorName = author.pen_name || "Author";

    const subAccountName = `${authorName} — Authors Bureau`;

    // Create GHL sub-account using Agency key
    const createResponse = await fetch(`${GHL_BASE_URL}/locations/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GHL_AGENCY_KEY}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
      body: JSON.stringify({
        name: subAccountName,
        email: authorEmail,
        country: "SG",
        timezone: "Asia/Singapore",
        settings: {
          allowDuplicateContact: false,
          allowDuplicateOpportunity: false,
        },
      }),
    });

    if (!createResponse.ok) {
      const errText = await createResponse.text();
      console.error("GHL sub-account creation failed:", errText);

      // Fallback path: if agency provisioning is forbidden, use shared sub-account
      const sharedSubAccountId = Deno.env.get("GHL_SUBACCOUNT_KEY");
      if (createResponse.status === 403 && sharedSubAccountId) {
        console.warn("GHL provisioning returned 403. Falling back to shared sub-account.");

        await supabase
          .from("author_profiles")
          .update({
            ghl_sub_account_id: sharedSubAccountId,
            ghl_sub_account_name: "Authors Bureau Shared Account",
            ghl_provisioned_at: new Date().toISOString(),
            ghl_provision_status: "provisioned",
          })
          .eq("id", author_id);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Provisioned using shared account fallback",
            fallback_used: true,
            ghl_location_id: sharedSubAccountId,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark as failed
      await supabase
        .from("author_profiles")
        .update({ ghl_provision_status: "failed" })
        .eq("id", author_id);

      throw new Error(`GHL sub-account creation failed: ${errText}`);
    }

    const locationData = await createResponse.json();
    const locationId = locationData?.location?.id || locationData?.id;

    if (!locationId) throw new Error("GHL did not return a location ID");

    // Save sub-account ID to author profile
    await supabase
      .from("author_profiles")
      .update({
        ghl_sub_account_id: locationId,
        ghl_sub_account_name: subAccountName,
        ghl_provisioned_at: new Date().toISOString(),
        ghl_provision_status: "provisioned",
      })
      .eq("id", author_id);

    return new Response(
      JSON.stringify({ success: true, ghl_location_id: locationId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("ghl-provision-author error:", errMessage);
    return new Response(
      JSON.stringify({ success: false, error: errMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
