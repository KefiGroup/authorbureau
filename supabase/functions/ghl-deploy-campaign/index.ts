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
    const { author_id, node_id, generated_content } = await req.json();
    if (!author_id || !node_id) throw new Error("author_id and node_id are required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Mark deployment as in-progress
    await supabase.from("ghl_deployments").upsert(
      {
        author_id,
        node_id,
        deployment_status: "deploying",
        error_message: null,
      },
      { onConflict: "author_id,node_id" }
    );

    // Fetch author's GHL sub-account ID
    const { data: author, error } = await supabase
      .from("author_profiles")
      .select("ghl_sub_account_id, ghl_provision_status, pen_name")
      .eq("id", author_id)
      .single();

    if (error || !author) throw new Error("Author not found");

    // Auto-provision if not yet done
    if (author.ghl_provision_status !== "provisioned" || !author.ghl_sub_account_id) {
      const provisionRes = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/ghl-provision-author`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ author_id }),
        }
      );
      const provisionText = await provisionRes.text();
      let provisionData: any = null;
      try {
        provisionData = provisionText ? JSON.parse(provisionText) : null;
      } catch (_err) {
        provisionData = null;
      }

      if (!provisionRes.ok || !provisionData?.success) {
        const upstreamError =
          provisionData?.error ||
          provisionData?.message ||
          provisionText ||
          `Provisioning request failed with status ${provisionRes.status}`;
        throw new Error(`Could not provision marketing account for author: ${upstreamError}`);
      }

      // Re-fetch after provisioning
      const { data: refreshed } = await supabase
        .from("author_profiles")
        .select("ghl_sub_account_id")
        .eq("id", author_id)
        .single();
      author.ghl_sub_account_id = refreshed?.ghl_sub_account_id;
    }

    const locationId = author.ghl_sub_account_id;
    if (!locationId) throw new Error("No marketing account location found");

    const ghlHeaders = {
      Authorization: `Bearer ${GHL_AGENCY_KEY}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    };

    const result = {
      campaign_ids: [] as string[],
      workflow_ids: [] as string[],
      form_ids: [] as string[],
      pipeline_ids: [] as string[],
    };

    const authorName = author.pen_name || "Author";
    const content = generated_content || {};

    // Route to node-specific deployment handler
    switch (node_id) {
      case "email-marketing":
        await deployEmailMarketing(ghlHeaders, content, result, locationId, authorName);
        break;
      case "lead-magnets":
        await deployLeadMagnets(ghlHeaders, content, result, locationId, authorName);
        break;
      case "webinars":
        await deployWebinars(ghlHeaders, content, result, locationId, authorName);
        break;
      case "social-media":
        await deploySocialMedia(ghlHeaders, content, result, locationId, authorName);
        break;
      case "website":
        await deployWebsite(ghlHeaders, content, result, locationId, authorName);
        break;
      case "workbooks":
        await deployWorkbooks(ghlHeaders, content, result, locationId, authorName);
        break;
      case "home-study":
        await deployHomeStudy(ghlHeaders, content, result, locationId, authorName);
        break;
      case "special-editions":
        await deploySpecialEditions(ghlHeaders, content, result, locationId, authorName);
        break;
      case "book-sales":
        await deployBookSales(ghlHeaders, content, result, locationId, authorName);
        break;
      default:
        throw new Error(`Unknown node_id: ${node_id}`);
    }

    // Save deployment record
    await supabase.from("ghl_deployments").upsert(
      {
        author_id,
        node_id,
        deployed_at: new Date().toISOString(),
        ghl_campaign_ids: result.campaign_ids,
        ghl_workflow_ids: result.workflow_ids,
        ghl_form_ids: result.form_ids,
        ghl_pipeline_ids: result.pipeline_ids,
        deployment_status: "deployed",
        content_snapshot: content,
        error_message: null,
      },
      { onConflict: "author_id,node_id" }
    );

    return new Response(
      JSON.stringify({ success: true, deployed: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("ghl-deploy-campaign error:", errMessage);

    // Try to mark deployment as failed
    try {
      const { author_id, node_id } = await req.clone().json().catch(() => ({}));
      if (author_id && node_id) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabase.from("ghl_deployments").upsert(
          {
            author_id,
            node_id,
            deployment_status: "failed",
            error_message: errMessage,
          },
          { onConflict: "author_id,node_id" }
        );
      }
    } catch (_) {
      // Ignore cleanup errors
    }

    return new Response(
      JSON.stringify({ success: false, error: errMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── NODE DEPLOYMENT HANDLERS ────────────────────────────────────────────────

async function deployEmailMarketing(
  headers: Record<string, string>,
  content: any,
  result: any,
  locationId: string,
  authorName: string
) {
  const slug = toSlug(authorName);

  // Welcome Sequence (7 emails)
  const welcome = await ghlPost(`${GHL_BASE_URL}/campaigns`, headers, {
    name: `${authorName} — Welcome Sequence`,
    locationId,
    emails: (content.welcome_sequence || []).map((e: any, i: number) => ({
      subject: e.subject,
      body: e.body,
      delayDays: e.send_day ?? i,
      order: i + 1,
    })),
  });
  if (welcome?.id) result.campaign_ids.push(welcome.id);

  // Nurture Flow (14 emails)
  const nurture = await ghlPost(`${GHL_BASE_URL}/campaigns`, headers, {
    name: `${authorName} — Nurture Flow`,
    locationId,
    emails: (content.nurture_flow || []).map((e: any, i: number) => ({
      subject: e.subject,
      body: e.body,
      delayDays: e.send_day ?? i * 3,
      order: i + 1,
    })),
  });
  if (nurture?.id) result.campaign_ids.push(nurture.id);

  // Launch Sequence (5 emails)
  const launch = await ghlPost(`${GHL_BASE_URL}/campaigns`, headers, {
    name: `${authorName} — Launch Sequence`,
    locationId,
    emails: (content.launch_sequence || []).map((e: any, i: number) => ({
      subject: e.subject,
      body: e.body,
      delayDays: e.send_day ?? i,
      order: i + 1,
    })),
  });
  if (launch?.id) result.campaign_ids.push(launch.id);

  // Automation: New subscriber → Welcome Sequence
  const workflow = await ghlPost(`${GHL_BASE_URL}/workflows`, headers, {
    name: `${authorName} — New Subscriber Automation`,
    locationId,
    trigger: { type: "ContactTagAdded", tag: `${slug}-subscriber` },
    actions: [{ type: "AddToCampaign", campaignId: welcome?.id }],
  });
  if (workflow?.id) result.workflow_ids.push(workflow.id);
}

async function deployLeadMagnets(
  headers: Record<string, string>,
  content: any,
  result: any,
  locationId: string,
  authorName: string
) {
  const slug = toSlug(authorName);

  // Opt-in form
  const form = await ghlPost(`${GHL_BASE_URL}/forms`, headers, {
    name: `${authorName} — ${content.lead_magnet_title || "Free Resource"} Opt-In`,
    locationId,
    fields: [
      { name: "firstName", label: "First Name", required: true },
      { name: "email", label: "Email Address", required: true },
    ],
  });
  if (form?.id) result.form_ids.push(form.id);

  // Delivery sequence (3 emails)
  const delivery = await ghlPost(`${GHL_BASE_URL}/campaigns`, headers, {
    name: `${authorName} — ${content.lead_magnet_title || "Free Resource"} Delivery`,
    locationId,
    emails: (content.delivery_sequence || []).map((e: any, i: number) => ({
      subject: e.subject,
      body: e.body,
      delayDays: e.send_day ?? i,
      order: i + 1,
    })),
  });
  if (delivery?.id) result.campaign_ids.push(delivery.id);

  // Automation: Form submitted → Tag as lead → Deliver resource
  const workflow = await ghlPost(`${GHL_BASE_URL}/workflows`, headers, {
    name: `${authorName} — Lead Magnet Automation`,
    locationId,
    trigger: { type: "FormSubmitted", formId: form?.id },
    actions: [
      { type: "AddTag", tag: `${slug}-lead` },
      { type: "AddToCampaign", campaignId: delivery?.id },
    ],
  });
  if (workflow?.id) result.workflow_ids.push(workflow.id);
}

async function deployWebinars(
  headers: Record<string, string>,
  content: any,
  result: any,
  locationId: string,
  authorName: string
) {
  const title = content.webinar_title || "Webinar";

  // Registration form
  const form = await ghlPost(`${GHL_BASE_URL}/forms`, headers, {
    name: `${authorName} — ${title} Registration`,
    locationId,
    fields: [
      { name: "firstName", label: "First Name", required: true },
      { name: "email", label: "Email Address", required: true },
      { name: "phone", label: "Phone", required: false },
    ],
  });
  if (form?.id) result.form_ids.push(form.id);

  // Webinar funnel pipeline
  const pipeline = await ghlPost(`${GHL_BASE_URL}/opportunities/pipelines`, headers, {
    name: `${authorName} — ${title} Funnel`,
    locationId,
    stages: [
      { name: "Registered", order: 1 },
      { name: "Attended", order: 2 },
      { name: "Offer Presented", order: 3 },
      { name: "Purchased", order: 4 },
      { name: "No-Show Follow-Up", order: 5 },
    ],
  });
  if (pipeline?.id) result.pipeline_ids.push(pipeline.id);

  // Reminder campaign
  const reminders = await ghlPost(`${GHL_BASE_URL}/campaigns`, headers, {
    name: `${authorName} — ${title} Reminders`,
    locationId,
    emails: (content.reminder_sequence || []).map((e: any, i: number) => ({
      subject: e.subject,
      body: e.body,
      delayDays: e.send_day ?? i,
      order: i + 1,
    })),
  });
  if (reminders?.id) result.campaign_ids.push(reminders.id);

  // Follow-up campaign
  const followup = await ghlPost(`${GHL_BASE_URL}/campaigns`, headers, {
    name: `${authorName} — ${title} Follow-Up`,
    locationId,
    emails: (content.followup_sequence || []).map((e: any, i: number) => ({
      subject: e.subject,
      body: e.body,
      delayDays: e.send_day ?? i,
      order: i + 1,
    })),
  });
  if (followup?.id) result.campaign_ids.push(followup.id);
}

async function deploySocialMedia(
  headers: Record<string, string>,
  content: any,
  result: any,
  locationId: string,
  authorName: string
) {
  // 90-Day Social Media Calendar as daily reminder emails
  const social = await ghlPost(`${GHL_BASE_URL}/campaigns`, headers, {
    name: `${authorName} — 90-Day Social Media Calendar`,
    locationId,
    emails: (content.social_posts || []).slice(0, 30).map((post: any, i: number) => ({
      subject: `📱 Your social post for Day ${i + 1}`,
      body: `Here is your social media post for today:\n\n${post.content}\n\nPlatforms: ${(post.platforms || []).join(", ")}\n\nHashtags: ${post.hashtags || ""}`,
      delayDays: i,
      order: i + 1,
    })),
  });
  if (social?.id) result.campaign_ids.push(social.id);
}

async function deployWebsite(
  headers: Record<string, string>,
  content: any,
  result: any,
  locationId: string,
  authorName: string
) {
  const form = await ghlPost(`${GHL_BASE_URL}/forms`, headers, {
    name: `${authorName} — Website Lead Capture`,
    locationId,
    fields: [
      { name: "firstName", label: "First Name", required: true },
      { name: "email", label: "Email Address", required: true },
    ],
  });
  if (form?.id) result.form_ids.push(form.id);
}

async function deployWorkbooks(
  headers: Record<string, string>,
  content: any,
  result: any,
  locationId: string,
  authorName: string
) {
  const campaign = await ghlPost(`${GHL_BASE_URL}/campaigns`, headers, {
    name: `${authorName} — ${content.workbook_title || "Workbook"} Campaign`,
    locationId,
    emails: (content.email_sequence || []).map((e: any, i: number) => ({
      subject: e.subject,
      body: e.body,
      delayDays: e.send_day ?? i,
      order: i + 1,
    })),
  });
  if (campaign?.id) result.campaign_ids.push(campaign.id);
}

async function deployHomeStudy(
  headers: Record<string, string>,
  content: any,
  result: any,
  locationId: string,
  authorName: string
) {
  const campaign = await ghlPost(`${GHL_BASE_URL}/campaigns`, headers, {
    name: `${authorName} — ${content.program_title || "Home Study"} Daily Drip`,
    locationId,
    emails: (content.daily_emails || []).map((e: any, i: number) => ({
      subject: e.subject,
      body: e.body,
      delayDays: e.send_day ?? i,
      order: i + 1,
    })),
  });
  if (campaign?.id) result.campaign_ids.push(campaign.id);
}

async function deploySpecialEditions(
  headers: Record<string, string>,
  content: any,
  result: any,
  locationId: string,
  authorName: string
) {
  const campaign = await ghlPost(`${GHL_BASE_URL}/campaigns`, headers, {
    name: `${authorName} — ${content.edition_title || "Special Edition"} Launch`,
    locationId,
    emails: (content.launch_emails || []).map((e: any, i: number) => ({
      subject: e.subject,
      body: e.body,
      delayDays: e.send_day ?? i,
      order: i + 1,
    })),
  });
  if (campaign?.id) result.campaign_ids.push(campaign.id);
}

async function deployBookSales(
  headers: Record<string, string>,
  content: any,
  result: any,
  locationId: string,
  authorName: string
) {
  // Bulk order inquiry form
  const form = await ghlPost(`${GHL_BASE_URL}/forms`, headers, {
    name: `${authorName} — Bulk Book Order Inquiry`,
    locationId,
    fields: [
      { name: "firstName", label: "First Name", required: true },
      { name: "email", label: "Email Address", required: true },
      { name: "company", label: "Organisation / Event", required: false },
      { name: "quantity", label: "Quantity Needed", required: true },
    ],
  });
  if (form?.id) result.form_ids.push(form.id);

  // Follow-up campaign
  const campaign = await ghlPost(`${GHL_BASE_URL}/campaigns`, headers, {
    name: `${authorName} — Book Sales Follow-Up`,
    locationId,
    emails: (content.followup_emails || []).map((e: any, i: number) => ({
      subject: e.subject,
      body: e.body,
      delayDays: e.send_day ?? i,
      order: i + 1,
    })),
  });
  if (campaign?.id) result.campaign_ids.push(campaign.id);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function ghlPost(url: string, headers: Record<string, string>, body: any) {
  try {
    // Rate limiting — 300ms delay between GHL API calls
    await new Promise((resolve) => setTimeout(resolve, 300));

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`GHL API error ${res.status} at ${url}: ${errText}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`GHL API call failed at ${url}:`, err);
    return null;
  }
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
