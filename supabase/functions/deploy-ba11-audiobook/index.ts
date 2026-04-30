import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


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

    const { data: author } = await supabase.from("author_profiles").select("pen_name, author_slug").eq("id", author_id).single();
    if (!author) throw new Error("Author not found");
    const authorSlug = author.author_slug || (author.pen_name || "").toLowerCase().replace(/\s+/g, "-");

    const { data: node } = await supabase.from("author_nodes").select("content_json").eq("author_id", author_id).eq("node_id", "BA-11").single();
    if (!node?.content_json) throw new Error("BA-11 content not found");

    const content = node.content_json as any;

    const micrositeUrl = `https://authorsbureau.com/${authorSlug}/audiobook`;
    await supabase.from("author_nodes").update({ status: "live", content_json: content, activated_at: new Date().toISOString(), microsite_url: micrositeUrl }).eq("author_id", author_id).eq("node_id", "BA-11");

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("deploy-ba11-audiobook error:", errMessage);
    return new Response(JSON.stringify({ success: false, error: errMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
