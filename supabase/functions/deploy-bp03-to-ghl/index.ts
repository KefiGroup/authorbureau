import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { author_id, content_payload } = await req.json();
    if (!author_id) throw new Error("author_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Upsert content if provided (bypasses RLS)
    if (content_payload) {
      const { error: upsertErr } = await sb
        .from("author_nodes")
        .upsert({
          author_id,
          node_id: "BP-03",
          node_name: "Social Media",
          content_json: content_payload,
          status: "draft",
        }, { onConflict: "author_id,node_id" });
      if (upsertErr) console.error("Content upsert error:", upsertErr);
    }

    const { data: profile } = await sb.from("author_profiles").select("ghl_sub_account_id").eq("id", author_id).single();
    let subAccountId = profile?.ghl_sub_account_id;

    // Provision if needed
    if (!subAccountId) {
      try {
        const provResp = await fetch(`${supabaseUrl}/functions/v1/provision-ghl-subaccount`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ author_id }),
        });
        const provData = await provResp.json();
        subAccountId = provData?.ghl_sub_account_id || null;
      } catch (e) {
        console.error("GHL provisioning failed:", e);
      }
    }

    const GHL_AGENCY_KEY = Deno.env.get("GHL_AGENCY_KEY");
    const { data: node } = await sb.from("author_nodes").select("id, content_json").eq("author_id", author_id).eq("node_id", "BP-03").single();
    const content = node?.content_json as any;
    const hasGhl = !!(subAccountId && GHL_AGENCY_KEY);

    // Schedule posts via GHL Social Planner if connected
    if (hasGhl && content?.posts?.length > 0) {
      const postsToSchedule = content.posts.slice(0, 7);
      const now = new Date();
      const recommendedTime = content.posting_schedule?.recommended_time || "09:00";

      for (let i = 0; i < postsToSchedule.length; i++) {
        const post = postsToSchedule[i];
        const scheduleDate = new Date(now);
        scheduleDate.setDate(scheduleDate.getDate() + post.day);

        try {
          await fetch("https://services.leadconnectorhq.com/social-media-posting/posts", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${GHL_AGENCY_KEY}`,
              "Content-Type": "application/json",
              "Version": "2021-07-28",
            },
            body: JSON.stringify({
              locationId: subAccountId,
              type: "post",
              summary: post.linkedin?.caption || post.theme,
              scheduleDate: scheduleDate.toISOString().split("T")[0],
              scheduleTime: recommendedTime,
              platforms: ["linkedin", "instagram", "facebook", "twitter"],
            }),
          });
        } catch (e) {
          console.error(`Failed to schedule post day ${post.day}:`, e);
        }

        if (i < postsToSchedule.length - 1) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    }

    const finalStatus = hasGhl ? "live" : "published_pending_ghl";

    // Update node status
    await sb.from("author_nodes").update({
      status: finalStatus,
      ghl_resource_id: hasGhl ? `social-planner-${author_id}` : null,
      activated_at: new Date().toISOString(),
    }).eq("author_id", author_id).eq("node_id", "BP-03");

    return new Response(JSON.stringify({
      success: true,
      status: finalStatus,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("deploy-bp03-to-ghl error:", err);
    return new Response(JSON.stringify({
      success: false,
      status: "error",
      error: errorMessage,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
