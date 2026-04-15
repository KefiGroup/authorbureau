import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Unified microsite action endpoint for all 28 nodes.
 * Handles: optin, purchase, enquiry, application
 *
 * Body: {
 *   author_id: string,   // author_profiles.id
 *   node_id: string,     // e.g. "BP-02"
 *   action_type: "optin" | "purchase" | "enquiry" | "application",
 *   email: string,
 *   first_name?: string,
 *   last_name?: string,
 *   ...extra fields per node
 * }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { author_id, node_id, action_type, email, first_name, last_name, ...extra } = body;

    if (!author_id || !node_id || !action_type || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: author_id, node_id, action_type, email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the author's GHL sub-account
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("author_profiles")
      .select("ghl_sub_account_id, pen_name, user_id")
      .eq("id", author_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Author not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ghlSubAccountId = profile.ghl_sub_account_id;
    const GHL_API_KEY = Deno.env.get("GHL_API_KEY") || Deno.env.get("GHL_SUBACCOUNT_KEY") || "";

    // Determine GHL tags based on action and node
    const tagMap: Record<string, string> = {
      "BP-02:optin": "lead-magnet-optin",
      "BP-05:optin": "webinar-registrant",
      "BP-06:purchase": "workbook-buyer",
      "BP-07:purchase": "home-study-buyer",
      "BP-08:purchase": "special-edition-buyer",
      "BP-09:purchase": "book-buyer",
      "BA-10:purchase": "online-course-student",
      "BA-12:purchase": "membership-member",
      "BA-13:application": "group-coaching-applicant",
      "BA-16:optin": "affiliate-signup",
      "YR-19:purchase": "coaching-client",
      "YR-20:application": "big-ticket-applicant",
      "YR-21:enquiry": "speaking-enquiry",
      "YR-22:enquiry": "corporate-training-enquiry",
      "YR-23:application": "mastermind-applicant",
      "YR-24:purchase": "retreat-attendee",
      "YR-25:purchase": "certification-student",
      "YR-26:purchase": "conference-attendee",
      "YR-27:purchase": "fundraising-donor",
      "YR-28:enquiry": "sponsorship-enquiry",
    };

    const tag = tagMap[`${node_id}:${action_type}`] || `${node_id.toLowerCase()}-${action_type}`;

    // Create/update GHL contact
    let ghlContactId: string | null = null;
    if (ghlSubAccountId && GHL_API_KEY) {
      try {
        const ghlRes = await fetch("https://services.leadconnectorhq.com/contacts/", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GHL_API_KEY}`,
            "Content-Type": "application/json",
            Version: "2021-07-28",
          },
          body: JSON.stringify({
            locationId: ghlSubAccountId,
            email,
            firstName: first_name || "",
            lastName: last_name || "",
            tags: [tag],
            source: `Authors Bureau - ${node_id}`,
            ...(extra.company ? { companyName: extra.company } : {}),
          }),
        });
        const ghlData = await ghlRes.json();
        ghlContactId = ghlData?.contact?.id || null;
      } catch (ghlErr) {
        console.error("GHL contact creation failed:", ghlErr);
        // Non-fatal — continue without GHL
      }
    }

    // Also save to author_subscribers for platform tracking
    try {
      await supabaseAdmin.from("author_subscribers").upsert(
        {
          author_id: profile.user_id || author_id,
          email,
          name: [first_name, last_name].filter(Boolean).join(" ") || null,
          source: "microsite",
          source_detail: `${node_id}:${action_type}`,
          status: "active",
          subscribed_at: new Date().toISOString(),
        },
        { onConflict: "author_id,email", ignoreDuplicates: false }
      );
    } catch (subErr) {
      console.error("Subscriber upsert failed:", subErr);
    }

    // For enquiry/application types, also save to crm_contacts
    if (action_type === "enquiry" || action_type === "application") {
      try {
        await supabaseAdmin.from("crm_contacts").insert({
          author_id: profile.user_id || author_id,
          full_name: [first_name, last_name].filter(Boolean).join(" ") || email,
          email,
          company: extra.company || null,
          source: `microsite-${node_id}`,
          notes: extra.message || extra.budget ? JSON.stringify(extra) : null,
        });
      } catch (crmErr) {
        console.error("CRM contact insert failed:", crmErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ghl_contact_id: ghlContactId,
        tag,
        message: action_type === "optin"
          ? "You're in! Check your email for next steps."
          : action_type === "enquiry"
            ? "Your enquiry has been received. We'll be in touch!"
            : action_type === "application"
              ? "Application submitted! We'll review and get back to you soon."
              : "Thank you for your purchase!",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("microsite-action error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
