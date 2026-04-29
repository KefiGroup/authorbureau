import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Public edge function to fetch microsite page data.
 * GET /get-microsite-page?author=pen-name-slug&node=BP-02
 * OR
 * GET /get-microsite-page?author=pen-name-slug&slug=suckcess-stage-quiz-funnel
 *
 * Returns: author profile, node content, book context — enough to render any microsite page.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const authorSlug = url.searchParams.get("author");
    let nodeId = url.searchParams.get("node");
    const micrositeSlug = url.searchParams.get("slug");

    if (!authorSlug || (!nodeId && !micrositeSlug)) {
      return new Response(
        JSON.stringify({ error: "Missing required params: author + (node or slug)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get author profile
    const { data: profile, error: profileErr } = await supabase
      .from("author_profiles")
      .select("id, pen_name, author_slug, bio_short, bio_long, photo_url, cover_photo_url, site_theme, tagline, user_id, website_url, linkedin_url, twitter_url, instagram_url, youtube_url, credentials")
      .eq("author_slug", authorSlug)
      .maybeSingle();

    if (profileErr || !profile) {
      return new Response(
        JSON.stringify({ error: "Author not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If we have a slug instead of a node ID, resolve it deterministically
    // through the canonical slug→node map. The previous LIKE-search against
    // `author_nodes.microsite_url` was unreliable (some rows store the URL
    // in `delivery_url` instead, and partial matches collide across nodes),
    // which produced spurious 404s for BA-14 (podcast) and BA-15 (press).
    if (!nodeId && micrositeSlug) {
      const SLUG_TO_NODE: Record<string, string> = {
        "free-gift": "BP-02",
        "author-website": "BP-04",
        "webinar": "BP-05",
        "workbook": "BP-06",
        "home-study": "BP-07",
        "course": "BP-07",
        "special-edition": "BP-08",
        "special-editions": "BP-08",
        "book": "BP-09",
        "order": "BP-09",
        "online-course": "BA-10",
        "audiobook": "BA-11",
        "membership": "BA-12",
        "group-coaching": "BA-13",
        "podcast": "BA-14",
        "press": "BA-15",
        "affiliates": "BA-16",
        "bundles": "BA-17",
        "partners": "BA-18",
        "coaching": "YR-19",
        "vip": "YR-20",
        "speaking": "YR-21",
        "corporate-training": "YR-22",
        "mastermind": "YR-23",
        "retreat": "YR-24",
        "certification": "YR-25",
        "conference": "YR-26",
        "fundraising": "YR-27",
        "sponsors": "YR-28",
      };

      const mapped = SLUG_TO_NODE[micrositeSlug];
      if (mapped) {
        nodeId = mapped;
      } else {
        return new Response(
          JSON.stringify({ error: "Node not found for slug" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get node data
    const { data: node } = await supabase
      .from("author_nodes")
      .select("*")
      .eq("author_id", profile.id)
      .eq("node_id", nodeId!)
      .maybeSingle();

    // Treat as live if explicitly live OR if the row is content_ready but the
    // content_json carries `activated: true` (forward-compat self-heal for cases
    // where the React state flipped to "activated" but the DB write to status
    // didn't land).
    const cj = (node?.content_json ?? {}) as Record<string, unknown>;
    const isLive =
      !!node &&
      (
        node.status === "live" ||
        node.status === "published_pending_ghl" ||
        (node.status === "content_ready" && cj.activated === true)
      );

    if (!node || !isLive) {
      return new Response(
        JSON.stringify({ error: "Node not live" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get author context (book data)
    const { data: context } = await supabase
      .from("author_context")
      .select("book_title, book_subtitle, core_thesis, key_frameworks, target_audience_persona")
      .eq("author_id", profile.id)
      .limit(1)
      .maybeSingle();

    // Get first published book for cover image & metadata
    const { data: book } = await supabase
      .from("books")
      .select("id, title, subtitle, cover_image_url, description, genre, slug, amazon_url, price, currency")
      .eq("author_id", profile.user_id)
      .not("published_at", "is", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        author: {
          id: profile.id,
          pen_name: profile.pen_name,
          slug: profile.author_slug,
          bio: profile.bio_short,
          bio_long: profile.bio_long,
          photo_url: profile.photo_url,
          cover_photo_url: profile.cover_photo_url,
          theme: profile.site_theme,
          tagline: profile.tagline,
          credentials: profile.credentials,
          social: {
            website: profile.website_url,
            linkedin: profile.linkedin_url,
            twitter: profile.twitter_url,
            instagram: profile.instagram_url,
            youtube: profile.youtube_url,
          },
        },
        node: {
          id: node.id,
          node_id: node.node_id,
          node_name: node.node_name,
          personalised_name: node.personalised_name,
          status: node.status,
          content_json: node.content_json,
          microsite_url: node.microsite_url,
          payment_link: node.payment_link,
          third_party_url: node.third_party_url,
          ghl_resource_id: node.ghl_resource_id,
          price_usd: node.price_usd,
          currency: node.currency,
        },
        context: context || null,
        book: book || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-microsite-page error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
