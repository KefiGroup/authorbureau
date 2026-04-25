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

    // Upsert content if provided (bypasses RLS)
    if (content_payload) {
      const { error: upsertErr } = await supabase
        .from("author_nodes")
        .upsert({
          author_id,
          node_id: "BP-04",
          node_name: "Author Website",
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
      .eq("node_id", "BP-04")
      .single();
    if (nodeErr || !node?.content_json) throw new Error("BP-04 content not found");

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
    let websiteId = "website-" + author_id;
    const hasGhl = !!(locationId && GHL_AGENCY_KEY);

    if (hasGhl) {
      const ghlHeaders = {
        Authorization: `Bearer ${GHL_AGENCY_KEY}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      };

      try {
        const res = await fetch(`${GHL_BASE_URL}/websites/`, {
          method: "POST",
          headers: ghlHeaders,
          body: JSON.stringify({
            locationId,
            name: content.site_name || `${author.pen_name || "Author"} Website`,
            description: content.tagline || "",
            favicon: "",
            isLive: true,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          websiteId = data?.website?.id || data?.id || websiteId;
        } else {
          console.error("GHL website creation failed:", await res.text());
        }
      } catch (e) {
        console.error("GHL website creation error:", e);
      }

      const pages = [
        { name: "Home", path: "/", title: content.seo?.meta_title || content.site_name },
        { name: "About", path: "/about", title: content.about_page?.headline || "About the Author" },
        { name: "Book", path: "/book", title: content.book_page?.headline || "The Book" },
        { name: "Contact", path: "/contact", title: content.contact_page?.headline || "Contact" },
      ];

      for (const page of pages) {
        try {
          await delay(300);
          await fetch(`${GHL_BASE_URL}/websites/${websiteId}/pages`, {
            method: "POST",
            headers: ghlHeaders,
            body: JSON.stringify({ locationId, ...page }),
          });
        } catch (e) {
          console.error(`GHL page creation error (${page.name}):`, e);
        }
      }
    }

    const finalStatus = hasGhl ? "live" : "published_pending_ghl";
    const liveUrl = `https://authorsbureau.com/${penSlug}`;

    const { error: updateErr } = await supabase
      .from("author_nodes")
      .update({
        status: finalStatus,
        ghl_resource_id: websiteId,
        activated_at: new Date().toISOString(),
        microsite_url: liveUrl,
      })
      .eq("author_id", author_id)
      .eq("node_id", "BP-04");

    if (updateErr) console.error("Failed to update author_nodes:", updateErr);

    return new Response(
      JSON.stringify({ success: true, status: finalStatus, liveUrl, ghl_website_id: websiteId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("deploy-bp04 error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, status: "error", error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
