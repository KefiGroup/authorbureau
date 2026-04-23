// Sprint 42: YR-27 Fundraising no longer routes payments through Stripe.
// Authors Bureau does not collect or hold donation funds. Authors paste an
// external donation URL (GoFundMe, PayPal Giving Fund, charity site, etc.)
// in the YR-27 builder, and the reader page opens it in a new tab.
//
// This function is kept as a no-op for backwards compatibility with any
// stale clients still calling it. It simply marks the node live using the
// external_donation_url stored in content_json.
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
    const { author_id } = await req.json();
    if (!author_id) throw new Error("author_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: author } = await supabase
      .from("author_profiles").select("author_slug").eq("id", author_id).single();
    const { data: node } = await supabase
      .from("author_nodes").select("content_json").eq("author_id", author_id).eq("node_id", "YR-27").maybeSingle();

    const content = (node?.content_json as Record<string, unknown>) || {};
    const externalUrl = (content.external_donation_url as string) || null;
    const micrositeUrl = author?.author_slug ? `https://authorsbureau.com/${author.author_slug}/fundraising` : null;

    await supabase.from("author_nodes").update({
      status: "live",
      activated_at: new Date().toISOString(),
      microsite_url: micrositeUrl,
      payment_link: externalUrl, // for backwards-compat with code that reads payment_link
    }).eq("author_id", author_id).eq("node_id", "YR-27");

    return new Response(JSON.stringify({ success: true, external_donation_url: externalUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("deploy-yr27-to-stripe (deprecated) error:", message);
    return new Response(JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
