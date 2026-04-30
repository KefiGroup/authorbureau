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

    const { data: node } = await supabase.from("author_nodes").select("content_json").eq("author_id", author_id).eq("node_id", "BA-14").single();
    if (!node?.content_json) throw new Error("BA-14 content not found");

    const content = node.content_json as any;

    // Server-side readiness gate: require RSS feed config + at least one episode before going live
    const rssReady = !!(content?.rss_url || content?.rss_feed_url || content?.transistor?.show_id);
    const episodes = Array.isArray(content?.episodes) ? content.episodes : [];
    if (!rssReady || episodes.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        status: "not_ready",
        message: "Podcast is not ready to go live. Please configure your RSS feed and add at least one episode before publishing.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const showUrl = "https://share.transistor.fm/" + author_id.slice(0, 8);
    const micrositeUrl = `https://authorsbureau.com/${authorSlug}/podcast`;
    await supabase.from("author_nodes").update({ status: "live", content_json: content, activated_at: new Date().toISOString(), microsite_url: micrositeUrl, third_party_url: showUrl }).eq("author_id", author_id).eq("node_id", "BA-14");

    return new Response(JSON.stringify({ success: true, show_url: showUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("deploy-ba14-to-transistor error:", errMessage);
    return new Response(JSON.stringify({ success: false, error: errMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
