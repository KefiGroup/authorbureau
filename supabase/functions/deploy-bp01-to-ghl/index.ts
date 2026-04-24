import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GHL_BASE_URL = "https://services.leadconnectorhq.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function ghlFetch(path: string, method: string, body: unknown, apiKey: string) {
  const resp = await fetch(`${GHL_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { author_id, content_payload } = await req.json();
    if (!author_id) throw new Error("author_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch author profile
    const { data: author, error: authorErr } = await supabase
      .from("author_profiles")
      .select("id, ghl_sub_account_id, pen_name, user_id, author_slug")
      .eq("id", author_id)
      .single();
    if (authorErr || !author) throw new Error("Author not found");

    // If content_payload provided, upsert it first (bypasses RLS via service role)
    if (content_payload) {
      const { error: upsertErr } = await supabase
        .from("author_nodes")
        .upsert({
          author_id,
          node_id: "BP-01",
          node_name: "Email Marketing",
          content_json: content_payload,
          status: "draft",
        }, { onConflict: "author_id,node_id" });
      if (upsertErr) console.error("Content upsert error:", upsertErr);
    }

    // Fetch BP-01 node content
    const { data: node, error: nodeErr } = await supabase
      .from("author_nodes")
      .select("content_json, status")
      .eq("author_id", author_id)
      .eq("node_id", "BP-01")
      .single();
    if (nodeErr || !node) throw new Error("BP-01 node not found");

    const content = node.content_json as any;
    if (!content) throw new Error("No content generated for BP-01");

    let ghlSubaccountId = author.ghl_sub_account_id;
    const GHL_AGENCY_KEY = Deno.env.get("GHL_AGENCY_KEY") || "";
    const GHL_SUBACCOUNT_KEY = Deno.env.get("GHL_SUBACCOUNT_KEY") || "";
    const apiKey = GHL_SUBACCOUNT_KEY || GHL_AGENCY_KEY;

    // If no sub-account, try provisioning first
    if (!ghlSubaccountId) {
      try {
        const provisionResp = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/provision-ghl-subaccount`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ author_id }),
          }
        );
        const provisionData = await provisionResp.json();
        ghlSubaccountId = provisionData.ghl_subaccount_id || null;
      } catch (e) {
        console.error("Provision sub-account failed:", e);
      }
    }

    const hasGhl = !!(apiKey && ghlSubaccountId);
    const errors: string[] = [];
    let ghlCampaignId: string | null = null;

    if (hasGhl) {
      // Step 1: Create tag
      try {
        const tagResp = await ghlFetch("/tags/", "POST", {
          name: content.list_name || `${author.pen_name} Readers`,
          locationId: ghlSubaccountId,
        }, apiKey);
        if (!tagResp.ok) {
          errors.push(`Tag creation: ${tagResp.status} ${JSON.stringify(tagResp.data)}`);
        }
      } catch (e) {
        errors.push(`Tag creation error: ${(e as Error).message}`);
      }

      // Step 2: Create campaign
      try {
        const campaignResp = await ghlFetch("/campaigns/", "POST", {
          name: content.campaign_name || "Email Marketing Campaign",
          locationId: ghlSubaccountId,
        }, apiKey);
        if (campaignResp.ok) {
          ghlCampaignId = campaignResp.data?.campaign?.id || campaignResp.data?.id || null;
        } else {
          errors.push(`Campaign creation: ${campaignResp.status} ${JSON.stringify(campaignResp.data)}`);
        }
      } catch (e) {
        errors.push(`Campaign creation error: ${(e as Error).message}`);
      }

      // Step 3: Create email templates for welcome sequence
      if (content.welcome_sequence && Array.isArray(content.welcome_sequence)) {
        for (const email of content.welcome_sequence) {
          try {
            await new Promise((r) => setTimeout(r, 300));
            const emailResp = await ghlFetch("/emails/builder", "POST", {
              locationId: ghlSubaccountId,
              name: `Welcome Email ${email.email_number} - ${content.campaign_name}`,
              subject: email.subject,
              preheader: email.preview_text,
              body: email.body,
            }, apiKey);
            if (!emailResp.ok) {
              errors.push(`Email ${email.email_number}: ${emailResp.status}`);
            }
          } catch (e) {
            errors.push(`Email ${email.email_number} error: ${(e as Error).message}`);
          }
        }
      }
    } else {
      errors.push("No GHL API key or sub-account available — skipping GHL deployment");
    }

    if (errors.length > 0) {
      console.error("GHL deployment errors (non-blocking):", errors);
    }

    // Determine final status
    const finalStatus = hasGhl ? "live" : "published_pending_ghl";

    // Update node status
    const { error: updateErr } = await supabase
      .from("author_nodes")
      .update({
        status: finalStatus,
        ghl_resource_id: ghlCampaignId,
        activated_at: new Date().toISOString(),
      })
      .eq("author_id", author_id)
      .eq("node_id", "BP-01");

    if (updateErr) {
      console.error("Failed to update node status:", updateErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: finalStatus,
        ghl_campaign_id: ghlCampaignId,
        errors_logged: errors.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = (err as Error).message;
    console.error("deploy-bp01-to-ghl error:", message);
    return new Response(
      JSON.stringify({ success: false, status: "error", error: message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
