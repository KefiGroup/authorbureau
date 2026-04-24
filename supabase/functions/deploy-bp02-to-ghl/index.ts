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

  console.log("[deploy-bp02] ✅ CP-0: Function invoked");

  try {
    // ── CP-1: Parse body ──
    const { author_id, content_payload } = await req.json();
    if (!author_id) return jsonRes({ success: false, status: "error", message: "author_id is required" });
    console.log("[deploy-bp02] ✅ CP-1: Body parsed, author_id =", author_id);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── CP-2: Fetch author profile ──
    const { data: author, error: authorErr } = await supabase
      .from("author_profiles")
      .select("ghl_sub_account_id, pen_name, author_slug")
      .eq("id", author_id)
      .single();

    if (authorErr) {
      console.error("[deploy-bp02] ❌ CP-2: Author fetch failed:", authorErr.message);
      return jsonRes({ success: false, status: "error", message: "Author profile not found" });
    }
    console.log("[deploy-bp02] ✅ CP-2: Author fetched:", author?.pen_name);

    const penSlug =
      author?.author_slug ||
      (author?.pen_name || "").toLowerCase().replace(/\s+/g, "-");

    let subAccountId = author?.ghl_sub_account_id;

    // ── CP-2.5: Upsert BP-02 node with content from client (service role bypasses RLS) ──
    if (content_payload) {
      console.log("[deploy-bp02] ✅ CP-2.5: Upserting BP-02 node with client content");
      const { error: upsertErr } = await supabase
        .from("author_nodes")
        .upsert(
          {
            author_id,
            node_id: "BP-02",
            node_name: "Lead Magnet",
            status: "draft",
            revenue_to_date: 0,
            current_step: 1,
            content_json: content_payload,
          },
          { onConflict: "author_id,node_id" }
        );
      if (upsertErr) {
        console.error("[deploy-bp02] ❌ CP-2.5: Upsert failed:", upsertErr.message);
        return jsonRes({ success: false, status: "error", message: "Failed to save lead magnet data" });
      }
    }

    // ── CP-3: Fetch BP-02 content ──
    const { data: node, error: nodeErr } = await supabase
      .from("author_nodes")
      .select("content_json")
      .eq("author_id", author_id)
      .eq("node_id", "BP-02")
      .single();

    if (nodeErr) {
      console.error("[deploy-bp02] ❌ CP-3: Node fetch failed:", nodeErr.message);
      return jsonRes({ success: false, status: "error", message: "No BP-02 node found" });
    }

    const contentJson = node?.content_json as any;
    if (!contentJson) {
      console.error("[deploy-bp02] ❌ CP-3: No content_json in BP-02 node");
      return jsonRes({ success: false, status: "error", message: "No content found for BP-02" });
    }
    console.log("[deploy-bp02] ✅ CP-3: BP-02 content loaded");

    // ── CP-4: Check GHL key — early fallback ──
    const GHL_AGENCY_KEY = Deno.env.get("GHL_AGENCY_KEY");

    if (!GHL_AGENCY_KEY || !subAccountId) {
      console.log("[deploy-bp02] ✅ CP-4: GHL not available — saving as pending");

      // If no sub-account, try provisioning (non-blocking)
      if (!subAccountId && GHL_AGENCY_KEY) {
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
          console.log("[deploy-bp02] Provisioning result:", subAccountId ? "got sub-account" : "no sub-account");
        } catch (e) {
          console.error("[deploy-bp02] GHL provisioning failed (non-blocking):", (e as Error).message);
        }
      }

      // If still no GHL, save as pending
      if (!GHL_AGENCY_KEY || !subAccountId) {
        const micrositeUrl = `https://authorsbureau.com/${penSlug}/free-gift`;

        const { error: updateErr } = await supabase
          .from("author_nodes")
          .update({
            status: "published_pending_ghl",
            activated_at: new Date().toISOString(),
            microsite_url: micrositeUrl,
            content_json: contentJson,
          })
          .eq("author_id", author_id)
          .eq("node_id", "BP-02");

        if (updateErr) console.error("[deploy-bp02] Failed to update node:", updateErr);

        console.log("[deploy-bp02] ✅ CP-4: Saved as published_pending_ghl");
        return jsonRes({
          success: true,
          status: "published_pending_ghl",
          ghl_funnel_id: null,
          live_url: micrositeUrl,
          microsite_url: micrositeUrl,
          message: "Lead magnet saved successfully. Connect GoHighLevel in Settings to activate your live opt-in page.",
        });
      }
    }

    console.log("[deploy-bp02] ✅ CP-4: GHL available, proceeding with deployment");

    // ── CP-5+: GHL deployment ──
    let ghlFunnelId: string | null = null;

    const ghlHeaders = {
      Authorization: `Bearer ${GHL_AGENCY_KEY}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    };

    try {
      // Custom fields
      console.log("[deploy-bp02] ✅ CP-5: Creating custom fields");
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
          console.error(`Custom field '${field.name}' failed:`, (e as Error).message);
        }
      }

      // Create funnel
      console.log("[deploy-bp02] ✅ CP-6: Creating funnel");
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
          await new Promise((r) => setTimeout(r, 300));
          try {
            await fetch("https://services.leadconnectorhq.com/funnels/page", {
              method: "POST",
              headers: ghlHeaders,
              body: JSON.stringify({ funnelId: ghlFunnelId, name: "Opt-In Page" }),
            });
          } catch (e) {
            console.error("Opt-in page failed:", (e as Error).message);
          }

          await new Promise((r) => setTimeout(r, 300));
          try {
            await fetch("https://services.leadconnectorhq.com/funnels/page", {
              method: "POST",
              headers: ghlHeaders,
              body: JSON.stringify({ funnelId: ghlFunnelId, name: "Thank You Page" }),
            });
          } catch (e) {
            console.error("Thank-you page failed:", (e as Error).message);
          }
        }
      } else {
        const errText = await funnelResp.text();
        console.error("Funnel creation failed:", funnelResp.status, errText);
      }

      // Workflow
      console.log("[deploy-bp02] ✅ CP-7: Creating workflow");
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
        console.error("Workflow failed:", (e as Error).message);
      }

      // Contact tag
      console.log("[deploy-bp02] ✅ CP-8: Creating tag");
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
        console.error("Tag failed:", (e as Error).message);
      }

      // BP-01 connection check
      console.log("[deploy-bp02] ✅ CP-9: Checking BP-01 connection");
      try {
        const { data: bp01Node } = await supabase
          .from("author_nodes")
          .select("status, ghl_resource_id")
          .eq("author_id", author_id)
          .eq("node_id", "BP-01")
          .maybeSingle();

        if (bp01Node?.status === "live" && bp01Node?.ghl_resource_id) {
          contentJson.bp01_connected = true;
        } else {
          contentJson.pending_connections = [
            ...(contentJson.pending_connections || []),
            { node_id: "BP-01", type: "nurture_sequence" },
          ];
        }
      } catch (e) {
        console.error("BP-01 check failed:", (e as Error).message);
      }
    } catch (e) {
      console.error("[deploy-bp02] GHL deployment error (non-blocking):", (e as Error).message);
    }

    // ── CP-10: Update node to live ──
    const micrositeUrl = `https://authorsbureau.com/${penSlug}/free-gift`;

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

    if (updateErr) console.error("[deploy-bp02] Failed to update node:", updateErr);

    console.log("[deploy-bp02] ✅ CP-10: Node updated to live");

    return jsonRes({
      success: true,
      status: "live",
      ghl_funnel_id: ghlFunnelId,
      live_url: micrositeUrl,
      microsite_url: micrositeUrl,
    });
  } catch (err) {
    console.error("[deploy-bp02] ❌ FATAL:", (err as Error).message);
    return jsonRes({
      success: false,
      status: "error",
      message: (err as Error).message || "An unexpected error occurred during publishing.",
    });
  }
});
