import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GHL_BASE_URL = "https://services.leadconnectorhq.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { author_id, content_payload } = await req.json();
    if (!author_id) throw new Error("author_id is required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Upsert content if provided (bypasses RLS)
    if (content_payload) {
      const { error: upsertErr } = await supabase
        .from("author_nodes")
        .upsert({
          author_id,
          node_id: "BP-05",
          node_name: "Webinars",
          content_json: content_payload,
          status: "draft",
        }, { onConflict: "author_id,node_id" });
      if (upsertErr) console.error("Content upsert error:", upsertErr);
    }

    const { data: author, error: authorErr } = await supabase
      .from("author_profiles")
      .select("ghl_sub_account_id, pen_name, author_slug")
      .eq("id", author_id)
      .single();
    if (authorErr || !author) throw new Error("Author not found");
    const penSlug = author.author_slug || (author.pen_name || "").toLowerCase().replace(/\s+/g, "-");

    const { data: node, error: nodeErr } = await supabase
      .from("author_nodes")
      .select("content_json")
      .eq("author_id", author_id)
      .eq("node_id", "BP-05")
      .single();
    if (nodeErr || !node?.content_json) throw new Error("BP-05 content not found");

    let locationId = author.ghl_sub_account_id;

    if (!locationId) {
      try {
        const provisionRes = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/provision-ghl-subaccount`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ author_id }),
          }
        );
        const provisionData = await provisionRes.json();
        locationId = provisionData?.ghl_subaccount_id || null;
      } catch (e) {
        console.error("Sub-account provisioning failed:", e);
      }
    }

    const GHL_AGENCY_KEY = Deno.env.get("GHL_AGENCY_KEY");
    const content = node.content_json as any;
    let calendarId = "calendar-" + author_id;
    const hasGhl = !!(locationId && GHL_AGENCY_KEY);

    if (hasGhl) {
      const ghlHeaders = {
        Authorization: `Bearer ${GHL_AGENCY_KEY}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      };

      const recIdx = (content.recommended_webinar || 1) - 1;
      const recTopic = content.webinar_topics?.[recIdx] || content.webinar_topics?.[0];

      try {
        const res = await fetch(`${GHL_BASE_URL}/calendars/`, {
          method: "POST",
          headers: ghlHeaders,
          body: JSON.stringify({
            locationId,
            name: recTopic?.title || "Author Webinar",
            description: recTopic?.description || "",
            slug: "webinar-" + author_id.slice(0, 8),
            eventType: "RoundRobin_OptimizeForAvailability",
            slotDuration: recTopic?.duration_minutes || 60,
            slotInterval: 60,
            isActive: true,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          calendarId = data?.calendar?.id || data?.id || calendarId;
        } else {
          console.error("GHL calendar creation failed:", await res.text());
        }
      } catch (e) {
        console.error("GHL calendar creation error:", e);
      }

      await delay(300);

      try {
        await fetch(`${GHL_BASE_URL}/contacts/tags`, {
          method: "POST",
          headers: ghlHeaders,
          body: JSON.stringify({
            locationId,
            name: "webinar-registrant-" + author_id.slice(0, 8),
          }),
        });
      } catch (e) {
        console.error("GHL tag creation error:", e);
      }
    }

    const finalStatus = hasGhl ? "live" : "published_pending_ghl";
    const liveUrl = `https://authorsbureau.com/${penSlug}/webinar`;

    const { error: updateErr } = await supabase
      .from("author_nodes")
      .update({
        status: finalStatus,
        ghl_resource_id: calendarId,
        activated_at: new Date().toISOString(),
        microsite_url: liveUrl,
      })
      .eq("author_id", author_id)
      .eq("node_id", "BP-05");

    if (updateErr) console.error("Failed to update author_nodes:", updateErr);

    return new Response(
      JSON.stringify({ success: true, status: finalStatus, liveUrl, ghl_calendar_id: calendarId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("deploy-bp05 error:", err.message);
    return new Response(
      JSON.stringify({ success: false, status: "error", error: err.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
