import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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
    const { author_id, node_id, book_id } = await req.json();
    if (!author_id || !node_id) {
      return new Response(JSON.stringify({ error: "author_id and node_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify all required marketing assets are approved
    if (book_id) {
      const { data: assets } = await supabase
        .from("marketing_assets")
        .select("asset_type, status")
        .eq("book_id", book_id)
        .eq("author_id", author_id);

      const requiredTypes = ["landing_page"];
      const approved = assets?.filter(a => a.status === "approved" || a.status === "live") || [];
      const missingRequired = requiredTypes.filter(
        t => !approved.some(a => a.asset_type === t)
      );

      if (missingRequired.length > 0) {
        return new Response(
          JSON.stringify({
            error: "Not all required assets are approved",
            missing: missingRequired,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark approved landing_page as live
      await supabase
        .from("marketing_assets")
        .update({ status: "live" })
        .eq("book_id", book_id)
        .eq("author_id", author_id)
        .eq("asset_type", "landing_page")
        .eq("status", "approved");
    }

    // Get author slug for microsite URL
    const { data: profile } = await supabase
      .from("author_profiles")
      .select("author_slug, pen_name")
      .eq("id", author_id)
      .single();

    const slug = profile?.author_slug || author_id;

    // Get book slug
    let bookSlug = "";
    if (book_id) {
      const { data: book } = await supabase
        .from("books")
        .select("slug")
        .eq("id", book_id)
        .single();
      bookSlug = book?.slug || book_id;
    }

    const micrositeUrl = bookSlug
      ? `/author/${slug}/${bookSlug}`
      : `/author/${slug}`;

    // Update author_nodes
    const { error } = await supabase
      .from("author_nodes")
      .update({
        status: "live",
        microsite_url: micrositeUrl,
        activated_at: new Date().toISOString(),
        marketing_activated_at: new Date().toISOString(),
      })
      .eq("author_id", author_id)
      .eq("node_id", node_id);

    if (error) {
      return new Response(JSON.stringify({ error: "Failed to activate node", details: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, microsite_url: micrositeUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("abby-activate-node error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
