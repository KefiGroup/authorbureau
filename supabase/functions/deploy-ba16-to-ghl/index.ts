import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { author_id, price_override } = await req.json();
    if (!author_id) throw new Error("author_id is required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: author } = await supabase.from("author_profiles").select("ghl_sub_account_id, pen_name, author_slug").eq("id", author_id).single();
    if (!author) throw new Error("Author not found");
    const authorSlug = author.author_slug || (author.pen_name || "").toLowerCase().replace(/\s+/g, "-");

    const { data: node } = await supabase.from("author_nodes").select("content_json").eq("author_id", author_id).eq("node_id", "BA-16").single();
    if (!node?.content_json) throw new Error("BA-16 content not found");

    const content = node.content_json as any;

    let locationId = author.ghl_sub_account_id;
    if (!locationId) {
      try {
        const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/provision-ghl-subaccount`, { method: "POST", headers: { "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" }, body: JSON.stringify({ author_id }) });
        const d = await r.json();
        locationId = d?.ghl_subaccount_id || null;
      } catch (e) { console.error("GHL provision error:", e); }
    }
    const GHL_AGENCY_KEY = Deno.env.get("GHL_AGENCY_KEY");
    if (locationId && GHL_AGENCY_KEY) {
      try {
        await fetch(`${GHL_BASE_URL}/opportunities/`, { method: "POST", headers: { Authorization: `Bearer ${GHL_AGENCY_KEY}`, "Content-Type": "application/json", Version: "2021-07-28" }, body: JSON.stringify({ locationId, name: "BA-16 - " + author.pen_name, pipelineId: "affiliate-programme", status: "open" }) });
      } catch (e) { console.error("GHL opportunity error:", e); }
    }

    const micrositeUrl = `https://authorsbureau.com/${authorSlug}/affiliates`;
    await supabase.from("author_nodes").update({ status: "live", ghl_resource_id: "affiliate-programme-" + author_id.slice(0, 8), content_json: content, activated_at: new Date().toISOString(), microsite_url: micrositeUrl }).eq("author_id", author_id).eq("node_id", "BA-16");

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("deploy-ba16-to-ghl error:", errMessage);
    return new Response(JSON.stringify({ success: false, error: errMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
