import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

    // ── Fetch author profile ──
    const { data: author } = await supabase
      .from("author_profiles")
      .select("ghl_sub_account_id, pen_name, author_slug")
      .eq("id", author_id)
      .single();

    const penSlug =
      author?.author_slug ||
      (author?.pen_name || "").toLowerCase().replace(/\s+/g, "-");

    let subAccountId = author?.ghl_sub_account_id;

    // If no sub-account, try provisioning
    if (!subAccountId) {
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
        subAccountId = provisionData.ghl_subaccount_id;
      } catch (e) {
        console.error("GHL provisioning failed (non-blocking):", e.message);
      }
    }

    // ── Fetch BP-02 content ──
    const { data: node } = await supabase
      .from("author_nodes")
      .select("content_json")
      .eq("author_id", author_id)
      .eq("node_id", "BP-02")
      .single();

    const contentJson = node?.content_json as any;
    if (!contentJson) throw new Error("No content found for BP-02");

    const GHL_AGENCY_KEY = Deno.env.get("GHL_AGENCY_KEY");
    let ghlFunnelId: string | null = null;
    let liveUrl: string | null = null;

    if (GHL_AGENCY_KEY && subAccountId) {
      const ghlHeaders = {
        Authorization: `Bearer ${GHL_AGENCY_KEY}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      };

      try {
        // ── Step 1: Custom fields ──
        const customFields = [
          { name: "lead_magnet_source", dataType: "TEXT" },
          { name: "quiz_score", dataType: "NUMERICAL" },
          { name: "result_tier", dataType: "TEXT" },
        ];
        for (const field of customFields) {
          try {
            await fetch(
              `https://services.leadconnectorhq.com/locations/${subAccountId}/customFields`,
              {
                method: "POST",
                headers: ghlHeaders,
                body: JSON.stringify({ name: field.name, dataType: field.dataType, position: 0 }),
              }
            );
            await new Promise((r) => setTimeout(r, 200));
          } catch (e) {
            console.error(`Custom field '${field.name}' failed:`, e.message);
          }
        }

        // ── Step 2: Create funnel ──
        const funnelResp = await fetch(
          "https://services.leadconnectorhq.com/funnels/funnel",
          {
            method: "POST",
            headers: ghlHeaders,
            body: JSON.stringify({
              locationId: subAccountId,
              name: contentJson.funnel_name || "Lead Magnet Funnel",
              type: "optin",
            }),
          }
        );

        if (funnelResp.ok) {
          const funnelData = await funnelResp.json();
          ghlFunnelId = funnelData.funnel?.id || funnelData.id || null;

          if (ghlFunnelId) {
            // Create opt-in page
            await new Promise((r) => setTimeout(r, 300));
            try {
              await fetch("https://services.leadconnectorhq.com/funnels/page", {
                method: "POST",
                headers: ghlHeaders,
                body: JSON.stringify({ funnelId: ghlFunnelId, name: "Opt-In Page" }),
              });
            } catch (e) {
              console.error("Opt-in page failed:", e.message);
            }

            // Create thank-you page
            await new Promise((r) => setTimeout(r, 300));
            try {
              await fetch("https://services.leadconnectorhq.com/funnels/page", {
                method: "POST",
                headers: ghlHeaders,
                body: JSON.stringify({ funnelId: ghlFunnelId, name: "Thank You Page" }),
              });
            } catch (e) {
              console.error("Thank-you page failed:", e.message);
            }
          }
        } else {
          const errText = await funnelResp.text();
          console.error("Funnel creation failed:", funnelResp.status, errText);
        }

        // ── Step 3: Workflow ──
        await new Promise((r) => setTimeout(r, 300));
        try {
          const leadMagnetTitle =
            contentJson.lead_magnets?.[0]?.title || contentJson.funnel_name || "Lead Magnet";
          await fetch("https://services.leadconnectorhq.com/workflows/", {
            method: "POST",
            headers: ghlHeaders,
            body: JSON.stringify({
              locationId: subAccountId,
              name: `${leadMagnetTitle} - Lead Capture Workflow`,
            }),
          });
        } catch (e) {
          console.error("Workflow failed:", e.message);
        }

        // ── Step 4: Contact tag ──
        await new Promise((r) => setTimeout(r, 200));
        try {
          const tagName = contentJson.funnel_name
            ? `Lead: ${contentJson.funnel_name}`
            : "Lead: Lead Magnet";
          await fetch(
            `https://services.leadconnectorhq.com/locations/${subAccountId}/tags`,
            {
              method: "POST",
              headers: ghlHeaders,
              body: JSON.stringify({ name: tagName }),
            }
          );
        } catch (e) {
          console.error("Tag failed:", e.message);
        }

        // ── Step 5: Check BP-01 connection ──
        try {
          const { data: bp01Node } = await supabase
            .from("author_nodes")
            .select("status, ghl_resource_id")
            .eq("author_id", author_id)
            .eq("node_id", "BP-01")
            .maybeSingle();

          if (bp01Node?.status === "live" && bp01Node?.ghl_resource_id) {
            console.log("BP-01 is live — nurture sequence can be linked");
            // Store connection intent in content_json
            contentJson.bp01_connected = true;
          } else {
            contentJson.pending_connections = [
              ...(contentJson.pending_connections || []),
              { node_id: "BP-01", type: "nurture_sequence" },
            ];
          }
        } catch (e) {
          console.error("BP-01 check failed:", e.message);
        }
      } catch (e) {
        console.error("GHL deployment error (non-blocking):", e.message);
      }
    } else {
      console.warn("GHL skipped — no agency key or sub-account");
    }

    // ── Build live URL ──
    const micrositeUrl = `https://authorsbureau.com/${penSlug}/free-gift`;
    liveUrl = micrositeUrl;

    // ── Update node to live ──
    const { error: updateErr } = await supabase
      .from("author_nodes")
      .update({
        status: "live",
        ghl_resource_id: ghlFunnelId,
        activated_at: new Date().toISOString(),
        microsite_url: micrositeUrl,
        content_json: contentJson,
      })
      .eq("author_id", author_id)
      .eq("node_id", "BP-02");

    if (updateErr) console.error("Failed to update node:", updateErr);

    return jsonRes({
      success: true,
      ghl_funnel_id: ghlFunnelId,
      live_url: liveUrl,
      microsite_url: micrositeUrl,
    });
  } catch (err) {
    console.error("deploy-bp02 error:", err.message);
    return jsonRes({ success: false, error: err.message }, 500);
  }
});
