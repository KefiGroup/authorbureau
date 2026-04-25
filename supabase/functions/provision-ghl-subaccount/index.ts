import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GHL_BASE_URL = "https://services.leadconnectorhq.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NODE_DEFINITIONS = [
  { node_id: "BP-01", node_name: "Email Marketing" },
  { node_id: "BP-02", node_name: "Lead Magnets" },
  { node_id: "BP-03", node_name: "Social Media" },
  { node_id: "BP-04", node_name: "Website" },
  { node_id: "BP-05", node_name: "Webinars" },
  { node_id: "BP-06", node_name: "Workbook" },
  { node_id: "BP-07", node_name: "Home Study Course" },
  { node_id: "BP-08", node_name: "Special Editions" },
  { node_id: "BP-09", node_name: "Book Sales" },
  { node_id: "BA-10", node_name: "Online Course" },
  { node_id: "BA-11", node_name: "Audiobook" },
  { node_id: "BA-12", node_name: "Membership Site" },
  { node_id: "BA-13", node_name: "Group Coaching" },
  { node_id: "BA-14", node_name: "Podcast" },
  { node_id: "BA-15", node_name: "Media and PR" },
  { node_id: "BA-16", node_name: "Affiliate Program" },
  { node_id: "BA-17", node_name: "Upsells and Bundles" },
  { node_id: "BA-18", node_name: "JV Partnerships" },
  { node_id: "YR-19", node_name: "1-on-1 Coaching" },
  { node_id: "YR-20", node_name: "Big Ticket Offers" },
  { node_id: "YR-21", node_name: "Keynote Speaking" },
  { node_id: "YR-22", node_name: "Corporate Training" },
  { node_id: "YR-23", node_name: "Mastermind" },
  { node_id: "YR-24", node_name: "Retreats" },
  { node_id: "YR-25", node_name: "Certification Program" },
  { node_id: "YR-26", node_name: "Conferences" },
  { node_id: "YR-27", node_name: "Fundraising" },
  { node_id: "YR-28", node_name: "Exhibitors and Sponsors" },
];

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
    const { data: author, error: authorErr } = await supabase
      .from("author_profiles")
      .select("id, pen_name, user_id, ghl_sub_account_id, location_country, ghl_provisioning_attempts")
      .eq("id", author_id)
      .single();

    if (authorErr || !author) throw new Error("Author not found");

    // Get author email from auth.users
    const { data: userData } = await supabase.auth.admin.getUserById(author.user_id);
    const authorEmail = userData?.user?.email || "noreply@authorsbureau.com";
    const authorName = author.pen_name || "Author";
    const nameParts = authorName.split(" ");
    const firstName = nameParts[0] || authorName;
    const lastName = nameParts.slice(1).join(" ") || "";

    let ghlSubaccountId = author.ghl_sub_account_id || null;

    // Only provision GHL if not already done
    if (!ghlSubaccountId) {
      const GHL_AGENCY_KEY = Deno.env.get("GHL_AGENCY_KEY");
      console.log("[GHL] Agency key present:", !!GHL_AGENCY_KEY);
      console.log("[GHL] Agency key length:", GHL_AGENCY_KEY?.length ?? 0);
      if (GHL_AGENCY_KEY) {
        try {
          const requestUrl = `${GHL_BASE_URL}/locations/`;
          const requestBody = {
            name: `${authorName} - Authors Bureau`,
            email: authorEmail,
            phone: "",
            address: "",
            city: "",
            state: "",
            country: author.location_country || "SG",
            timezone: "UTC",
            prospectInfo: {
              firstName,
              lastName,
            },
          };
          const requestHeaders = {
            Authorization: `Bearer ${GHL_AGENCY_KEY.substring(0, 8)}...`,
            "Content-Type": "application/json",
            Version: "2021-07-28",
          };

          console.log("[GHL] Request URL:", requestUrl);
          console.log("[GHL] Request headers (redacted):", JSON.stringify(requestHeaders));
          console.log("[GHL] Request body:", JSON.stringify(requestBody));

          const createResponse = await fetch(requestUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${GHL_AGENCY_KEY}`,
              "Content-Type": "application/json",
              Version: "2021-07-28",
            },
            body: JSON.stringify(requestBody),
          });

          const responseText = await createResponse.text();
          console.log("[GHL] Response status:", createResponse.status);
          console.log("[GHL] Response body:", responseText);

          if (createResponse.ok) {
            const locationData = JSON.parse(responseText);
            ghlSubaccountId = locationData?.location?.id || locationData?.id;

            if (ghlSubaccountId) {
              await supabase
                .from("author_profiles")
                .update({
                  ghl_sub_account_id: ghlSubaccountId,
                  ghl_sub_account_name: `${authorName} - Authors Bureau`,
                  ghl_provisioned_at: new Date().toISOString(),
                  ghl_provision_status: "provisioned",
                })
                .eq("id", author_id);
            }
          } else {
            console.error("[GHL] Sub-account creation failed:", createResponse.status, responseText);
            await supabase
              .from("author_profiles")
              .update({
                ghl_provision_status: "failed",
                ghl_provisioning_failed: true,
                ghl_provisioning_attempts: (author as any).ghl_provisioning_attempts ? (author as any).ghl_provisioning_attempts + 1 : 1,
              })
              .eq("id", author_id);

            // Don't return error - continue to seed nodes even if GHL fails
            // The GHL provisioning can be retried later
          }
        } catch (ghlErr) {
          console.error("[GHL] Provisioning exception:", ghlErr?.message || ghlErr);
          await supabase
            .from("author_profiles")
            .update({
              ghl_provision_status: "failed",
              ghl_provisioning_failed: true,
              ghl_provisioning_attempts: (author as any).ghl_provisioning_attempts ? (author as any).ghl_provisioning_attempts + 1 : 1,
            })
            .eq("id", author_id);

          // Don't return error - continue to seed nodes even if GHL fails
        }
      } else {
        console.warn("[GHL] GHL_AGENCY_KEY is not set — skipping sub-account creation");
      }
    }

    // Seed the 28 author_nodes rows (upsert to avoid duplicates)
    const nodeRows = NODE_DEFINITIONS.map((n) => ({
      author_id,
      node_id: n.node_id,
      node_name: n.node_name,
      // BP-01 to BP-09 start as 'not_started', rest stay 'locked'
      status: n.node_id.startsWith("BP-") ? "not_started" : "locked",
    }));

    const { error: nodesErr } = await supabase
      .from("author_nodes")
      .upsert(nodeRows, { onConflict: "author_id,node_id", ignoreDuplicates: true });

    if (nodesErr) {
      console.error("Failed to seed author_nodes:", nodesErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        ghl_subaccount_id: ghlSubaccountId,
        ghl_provisioning_failed: !ghlSubaccountId,
        nodes_created: 28,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("provision-ghl-subaccount error:", errMessage);
    return new Response(
      JSON.stringify({ success: false, error: errMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
