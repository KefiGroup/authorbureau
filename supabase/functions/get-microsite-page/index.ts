import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitiseForPublic, ensurePrimaryCta } from "../_shared/microsite-content-rules.ts";

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
    const bookSlugParam = url.searchParams.get("book"); // Sprint 56: book-scoped lookup

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

    // Slug → node resolution (Sprint 51).
    // Primary lookup: public.node_registry (single source of truth, seeded by
    // the canonical-node migration). Aliases below cover external-marketing
    // URLs and historical plurals/synonyms — keep them in sync with
    // src/lib/node-slug-map.ts SLUG_ALIASES.
    if (!nodeId && micrositeSlug) {
      const SLUG_ALIASES: Record<string, string> = {
        "course": "BP-07",
        "special-editions": "BP-08",
        "order": "BP-09",
        "media-kit": "BA-15",
        "upsells": "BA-17",
        "partnerships": "BA-18",
      };

      const aliasHit = SLUG_ALIASES[micrositeSlug];
      if (aliasHit) {
        nodeId = aliasHit;
      } else {
        const { data: regRow } = await supabase
          .from("node_registry")
          .select("node_id")
          .eq("microsite_slug", micrositeSlug)
          .maybeSingle();
        if (regRow?.node_id) {
          nodeId = regRow.node_id as string;
        } else {
          return new Response(
            JSON.stringify({ error: "Node not found for slug" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Sprint 56 — Book-scoped lookup.
    // If a `book` slug is supplied, resolve it to a book id and use that to
    // pick the exact (author, node, book) row. Without a book param we keep
    // the legacy "best row first" behaviour but log a warning so we can find
    // any external links still pointing at the ambiguous shape.
    let bookIdForLookup: string | null = null;
    let bookRow: Record<string, unknown> | null = null;
    if (bookSlugParam) {
      // Lookup book by (author_id, slug). books.slug is globally unique so the
      // author filter is a defence-in-depth check, not strictly required.
      const { data: b } = await supabase
        .from("books")
        .select("id, title, subtitle, cover_image_url, description, genre, slug, amazon_url, price, currency, author_id, published_at")
        .eq("author_id", profile.id)
        .eq("slug", bookSlugParam)
        .maybeSingle();
      if (b) {
        bookIdForLookup = b.id as string;
        bookRow = b;
      } else {
        console.warn("get-microsite-page: book param did not resolve", { authorSlug, bookSlugParam });
      }
    } else {
      console.warn("get-microsite-page: legacy 2-segment call (no book param)", { authorSlug, nodeId });
    }

    // Get node data — when book context is known, filter by it; otherwise fall
    // back to "best row first" for backward compatibility.
    let nodeQuery = supabase
      .from("author_nodes")
      .select("*")
      .eq("author_id", profile.id)
      .eq("node_id", nodeId!);
    if (bookIdForLookup) {
      nodeQuery = nodeQuery.eq("book_id", bookIdForLookup);
    }
    const { data: nodeRows } = await nodeQuery
      .order("microsite_url", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .limit(1);
    const node = (nodeRows && nodeRows[0]) || null;

    // Treat as live if explicitly live OR if the row is content_ready but the
    // content_json carries `activated: true` (forward-compat self-heal for cases
    // where the React state flipped to "activated" but the DB write to status
    // didn't land).
    const cj = (node?.content_json ?? {}) as Record<string, unknown>;
    const isLive =
      !!node &&
      (
        node.status === "live" ||
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

    // Sprint 56 — Per-book book context.
    // Prefer the book resolved from the URL's book slug. If none was given,
    // try the node row's own book_id. Only as a last resort fall back to the
    // first published book — the legacy behaviour that mixed contexts for
    // multi-book authors.
    let book = bookRow;
    if (!book && (node as { book_id?: string }).book_id) {
      const { data: nb } = await supabase
        .from("books")
        .select("id, title, subtitle, cover_image_url, description, genre, slug, amazon_url, price, currency")
        .eq("id", (node as { book_id?: string }).book_id!)
        .maybeSingle();
      if (nb) book = nb;
    }
    if (!book) {
      const { data: fb } = await supabase
        .from("books")
        .select("id, title, subtitle, cover_image_url, description, genre, slug, amazon_url, price, currency")
        .eq("author_id", profile.user_id)
        .not("published_at", "is", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (fb) book = fb;
    }

    // Inject node-appropriate primary_cta if the generator omitted one.
    // Mutates content_json in place; safe because we just read it.
    const contentWithCta = ensurePrimaryCta(
      (node.content_json ?? {}) as Record<string, unknown>,
      node.node_id,
    );

    const responsePayload = sanitiseForPublic(
      {
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
          content_json: contentWithCta,
          microsite_url: node.microsite_url,
          payment_link: node.payment_link,
          third_party_url: node.third_party_url,
          price_usd: node.price_usd,
          currency: node.currency,
          cover_image_url: node.cover_image_url,
        },
        context: context || null,
        book: book || null,
      },
      { nodeId: node.node_id, archetype: (node as { archetype?: string }).archetype ?? null },
    );

    return new Response(
      JSON.stringify(responsePayload),
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
