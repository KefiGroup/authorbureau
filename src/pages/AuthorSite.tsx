import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { getThemeById } from "@/lib/author-themes";
import AuthorPageLayout from "@/components/public/AuthorPageLayout";
import AuthorBrandedNav from "@/components/public/AuthorBrandedNav";
import AuthorContactModal from "@/components/public/AuthorContactModal";
import NotFound from "./NotFound";

import type { AuthorData, BookWithProducts, ProductLink, RelatedAuthor, CoachingService, ThemeVars } from "./author-site/types";
import AuthorHeroSection from "./author-site/AuthorHeroSection";
import AuthorAboutSection from "./author-site/AuthorAboutSection";
import AuthorBooksSection from "./author-site/AuthorBooksSection";
import AuthorLeadMagnetsSection from "./author-site/AuthorLeadMagnetsSection";
import AuthorLearnSection from "./author-site/AuthorLearnSection";
import AuthorServicesSection from "./author-site/AuthorServicesSection";
import AuthorEventsSection from "./author-site/AuthorEventsSection";
import AuthorSubscribeSection from "./author-site/AuthorSubscribeSection";
import AuthorRelatedSection from "./author-site/AuthorRelatedSection";
import AuthorTestimonialsSection, { type Testimonial } from "./author-site/AuthorTestimonialsSection";
import AuthorWhatsInsideSection from "./author-site/AuthorWhatsInsideSection";
import AuthorWorkWithMe from "@/components/public/AuthorWorkWithMe";
import AuthorMicrositeFooter from "@/components/public/AuthorMicrositeFooter";
import type { StorefrontNode } from "@/components/public/AuthorProductCard";
import type { LiveNode } from "./author-site/AuthorLeadMagnetsSection";

export default function AuthorSite() {
  const { authorSlug } = useParams<{ authorSlug: string }>();
  const [author, setAuthor] = useState<AuthorData | null>(null);
  const [booksWithProducts, setBooksWithProducts] = useState<BookWithProducts[]>([]);
  const [coachingServices, setCoachingServices] = useState<CoachingService[]>([]);
  const [relatedAuthors, setRelatedAuthors] = useState<RelatedAuthor[]>([]);
  const [liveNodes, setLiveNodes] = useState<LiveNode[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [whatsInsideHighlights, setWhatsInsideHighlights] = useState<string[]>([]);
  const [whatsInsideSourceBookId, setWhatsInsideSourceBookId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const theme = useMemo(() => getThemeById(author?.site_theme || "classic-elegant"), [author?.site_theme]);
  const displayName = author?.pen_name || "Author";
  const v = theme.vars as ThemeVars;

  const allProducts = useMemo(() => {
    return booksWithProducts.flatMap((b) =>
      b.products.filter((p) => p.type !== "coaching").map((p) => ({ ...p, bookSlug: b.slug, bookTitle: b.title }))
    );
  }, [booksWithProducts]);

  const leadMagnets = useMemo(() => liveNodes.filter(n => n.node_id.startsWith("BP-02")), [liveNodes]);
  const learnNodes = useMemo(() => liveNodes.filter(n =>
    ["BP-05", "BP-07", "BA-10", "BA-12", "YR-25"].some(p => n.node_id.startsWith(p))
  ), [liveNodes]);
  const serviceNodes = useMemo(() => liveNodes.filter(n =>
    ["YR-19", "BA-13", "YR-23", "YR-20", "YR-22", "YR-21"].some(p => n.node_id.startsWith(p))
  ), [liveNodes]);
  const eventNodes = useMemo(() => liveNodes.filter(n =>
    ["YR-24", "YR-26", "YR-27", "YR-28"].some(p => n.node_id.startsWith(p))
  ), [liveNodes]);
  const podcastNodes = useMemo(() => liveNodes.filter(n => n.node_id.startsWith("BA-14")), [liveNodes]);
  const affiliateNodes = useMemo(() => liveNodes.filter(n => n.node_id.startsWith("BA-16")), [liveNodes]);
  const formatNodes = useMemo(() => liveNodes.filter(n =>
    ["BP-08", "BA-11", "BP-06", "BA-17"].some(p => n.node_id.startsWith(p))
  ), [liveNodes]);

  // SEO
  const bioFirstSentence = (author?.bio_short || "").split(/[.!?]\s/)[0];
  const uniqueGenres = [...new Set(booksWithProducts.map(b => b.genre).filter(Boolean))] as string[];
  const genreStr = uniqueGenres.length > 0 ? ` in ${uniqueGenres.join(", ")}` : "";
  const seoDescription = author
    ? `Discover books, resources, and services by ${displayName}. ${bioFirstSentence ? bioFirstSentence + "." : ""} Browse ${booksWithProducts.length} published book${booksWithProducts.length !== 1 ? "s" : ""}${genreStr}.`
    : `Author page for ${displayName} on Authors Bureau.`;
  const canonicalUrl = `https://authorsbureau.com/${authorSlug}`;

  useDocumentMeta({
    title: author ? `${displayName} - ${author.tagline || "Author"} | Authors Bureau` : "Author | Authors Bureau",
    description: seoDescription,
    ogTitle: author ? `${displayName} - ${author.tagline || "Author"} | Authors Bureau` : undefined,
    ogDescription: seoDescription,
    ogImage: author?.photo_url || undefined,
    ogUrl: canonicalUrl,
    ogType: "profile",
    ogSiteName: "Authors Bureau",
    canonical: canonicalUrl,
    twitterCard: "summary_large_image",
    jsonLd: author
      ? {
          "@context": "https://schema.org", "@type": "Person",
          name: displayName, url: canonicalUrl, image: author.photo_url || undefined,
          jobTitle: author.tagline || "Author", description: author.bio_short || undefined,
          sameAs: [author.website_url, author.linkedin_url, author.twitter_url, author.instagram_url, author.youtube_url, author.amazon_author_profile_url].filter(Boolean),
        }
      : undefined,
  });

  useEffect(() => {
    if (!authorSlug) return;
    loadAuthorSite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorSlug]);

  async function loadAuthorSite() {
    setLoading(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    let profile: AuthorData | null = null;
    let isOwnerLocal = false;
    if (currentUser) {
      const { data } = await supabase.from("author_profiles").select("*").eq("author_slug", authorSlug).eq("user_id", currentUser.id).maybeSingle();
      profile = data as unknown as AuthorData;
      if (data) isOwnerLocal = true;
    }
    setIsOwner(isOwnerLocal);
    if (!profile) {
      const { data } = await supabase.from("author_profiles_public" as any).select("*").eq("author_slug", authorSlug).in("directory_status", ["listed", "verified", "featured"]).maybeSingle();
      profile = data as unknown as AuthorData;
    }
    if (!profile) { setNotFound(true); setLoading(false); return; }
    setAuthor(profile);

    let booksQuery = supabase.from("books").select("*").eq("author_id", profile.user_id).order("created_at", { ascending: false });
    if (!isOwner) booksQuery = booksQuery.not("published_at", "is", null);

    let booksByNameQuery: typeof booksQuery | null = null;
    if (profile.pen_name) {
      booksByNameQuery = supabase.from("books").select("*").eq("author_name", profile.pen_name).order("created_at", { ascending: false });
      if (!isOwner) booksByNameQuery = booksByNameQuery.not("published_at", "is", null);
    }

    const [booksRes, booksByNameRes, homeStudyRes, coursesRes, coachingRes, audiobooksRes, podcastsRes, nodesRes, testimonialsRes, contextRes, curatedBookIdRes] = await Promise.all([
      booksQuery,
      booksByNameQuery ? booksByNameQuery : Promise.resolve({ data: [] as unknown[] }),
      supabase.from("home_study_courses").select("id, title, price, currency, book_id, description").eq("author_id", profile.user_id).eq("status", "published"),
      supabase.from("courses").select("id, title, price, currency, book_id, description").eq("author_id", profile.user_id).eq("status", "published"),
      supabase.from("coaching_packages").select("id, title, price, currency, description, duration_minutes, sessions_count").eq("author_id", profile.user_id).eq("status", "active"),
      supabase.from("audiobooks").select("id, title, price, currency, book_id, description").eq("author_id", profile.user_id).eq("status", "published"),
      supabase.from("podcasts").select("id, title, book_id, description").eq("author_id", profile.user_id).eq("status", "published"),
      supabase.from("author_nodes").select("id, node_id, node_name, personalised_name, content_json, microsite_url, payment_link, third_party_url, delivery_url, price_usd, currency, book_id").eq("author_id", profile.id).eq("status", "live"),
      supabase.from("author_testimonials").select("id, name, role, quote, avatar_url").eq("author_id", profile.user_id).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
      // Owner-only direct read (returns null for public visitors due to RLS).
      // Used for curated frameworks/insights when present.
      supabase.from("author_context").select("key_frameworks, unique_insights, book_id").eq("author_id", profile.id).maybeSingle(),
      // Public-safe pointer to the author's curated lead book. Works for
      // anonymous visitors via SECURITY DEFINER RPC, so the "What's inside"
      // section anchors to the correct book even when the visitor cannot
      // read author_context directly.
      supabase.rpc("get_author_curated_book_id" as any, { _author_id: profile.id } as any),
    ]);

    const booksPrimary = (booksRes.data || []) as Record<string, unknown>[];
    const booksFallback = (booksByNameRes?.data || []) as Record<string, unknown>[];
    const books = booksPrimary.length > 0 ? booksPrimary : booksFallback;
    const homeStudy = (homeStudyRes.data || []) as Record<string, unknown>[];
    const courses = (coursesRes.data || []) as Record<string, unknown>[];
    const coaching = (coachingRes.data || []) as CoachingService[];
    const audiobooks = (audiobooksRes.data || []) as Record<string, unknown>[];
    const podcasts = (podcastsRes.data || []) as Record<string, unknown>[];

    const enriched: BookWithProducts[] = books.map((book: Record<string, unknown>) => {
      const products: ProductLink[] = [];
      homeStudy.filter((p) => p.book_id === book.id).forEach((p) => products.push({ id: p.id as string, title: p.title as string, type: "home_study", price: p.price as number | null, currency: p.currency as string | null, description: p.description as string | null }));
      courses.filter((p) => p.book_id === book.id).forEach((p) => products.push({ id: p.id as string, title: p.title as string, type: "course", price: p.price as number | null, currency: p.currency as string | null, description: p.description as string | null }));
      audiobooks.filter((p) => p.book_id === book.id).forEach((p) => products.push({ id: p.id as string, title: p.title as string, type: "audiobook", price: p.price as number | null, currency: p.currency as string | null, description: p.description as string | null }));
      podcasts.filter((p) => p.book_id === book.id).forEach((p) => products.push({ id: p.id as string, title: p.title as string, type: "podcast", price: null, currency: null, description: p.description as string | null }));
      return { ...book, products } as unknown as BookWithProducts;
    });

    if (coaching.length > 0 && enriched.length > 0) {
      coaching.forEach((p) => enriched[0].products.push({ id: p.id, title: p.title, type: "coaching", price: p.price, currency: p.currency, description: p.description }));
    }

    setCoachingServices(coaching);
    setBooksWithProducts(enriched);
    setLiveNodes((nodesRes.data || []) as unknown as LiveNode[]);
    setTestimonials((testimonialsRes.data || []) as unknown as Testimonial[]);

    // Build "What's inside" highlights anchored to the author's curated lead
    // book (author_context.book_id) — never to whichever book happens to sort
    // first by created_at. Falls back to the first enriched book only when
    // there's no author_context row.
    const ctx = (contextRes as any)?.data;
    // Public-safe RPC result is the source of truth; fall back to the
    // owner-only author_context row when the RPC is unavailable.
    const rpcCuratedBookId = (curatedBookIdRes as any)?.data as string | null | undefined;
    const preferredBookId =
      (typeof rpcCuratedBookId === "string" && rpcCuratedBookId) ||
      (ctx?.book_id as string | undefined) ||
      null;
    const sourceBook =
      (preferredBookId && enriched.find(b => b.id === preferredBookId)) ||
      enriched[0] ||
      null;

    let highlights: string[] = [];
    if (ctx) {
      const frameworks = Array.isArray(ctx.key_frameworks) ? ctx.key_frameworks : [];
      const insights = Array.isArray(ctx.unique_insights) ? ctx.unique_insights : [];
      const fromFrameworks = frameworks.map((f: any) => typeof f === "string" ? f : (f?.name || f?.title || f?.framework || "")).filter(Boolean);
      const fromInsights = insights.map((i: any) => typeof i === "string" ? i : (i?.insight || i?.text || i?.title || "")).filter(Boolean);
      highlights = [...fromFrameworks, ...fromInsights];
    }
    let sourceBookId: string | null = sourceBook?.id ?? null;
    if (highlights.length === 0 && sourceBook?.description) {
      highlights = sourceBook.description
        .split(/\n+|•|·|✓|\*|—|-{2,}/)
        .map(s => s.trim())
        .filter(s => s.length > 18 && s.length < 220)
        .slice(0, 6);
    }
    // If we have no highlights at all, suppress the source line too
    if (highlights.length === 0) sourceBookId = null;
    setWhatsInsideHighlights(highlights.slice(0, 8));
    setWhatsInsideSourceBookId(sourceBookId);

    // Related Authors
    const authorGenres = profile.genres || [];
    if (authorGenres.length > 0) {
      const { data: related } = await supabase.from("author_profiles_public" as any)
        .select("author_slug, pen_name, photo_url, genres")
        .in("directory_status", ["listed", "verified", "featured"])
        .neq("user_id", profile.user_id).limit(20) as { data: any[] | null };

      if (related) {
        const matches = (related as any[])
          .filter((r: Record<string, unknown>) => {
            const rGenres = (r.genres || []) as string[];
            return rGenres.some((g: string) => authorGenres.includes(g));
          })
          .slice(0, 6) as RelatedAuthor[];
        setRelatedAuthors(matches);
      }
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !author) return <NotFound />;

  return (
    <AuthorPageLayout
      theme={theme}
      breadcrumbs={[{ label: "Home", to: "/" }, { label: displayName }]}
      footerSlot={<AuthorMicrositeFooter author={author} displayName={displayName} />}
    >
      <AuthorBrandedNav
        authorSlug={authorSlug!}
        authorName={displayName}
        authorPhotoUrl={author.photo_url}
        books={booksWithProducts.map(b => ({ slug: b.slug, title: b.title, cover_image_url: b.cover_image_url, genre: b.genre }))}
        hasServices={coachingServices.length > 0}
        hasLearnSection={learnNodes.length > 0}
        hasQuizSection={leadMagnets.length > 0}
        hasEvents={eventNodes.length > 0}
        hasWorkWithMe={serviceNodes.length > 0 || coachingServices.length > 0}
        vars={v}
        headingFont={theme.headingFont}
        bodyFont={theme.bodyFont}
        onContactClick={() => setContactOpen(true)}
      />

      <AuthorContactModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        authorName={displayName}
        authorId={author.user_id}
        vars={{ ...v, bodyText: v.bodyText || "#4A4A4A" }}
        headingFont={theme.headingFont}
        bodyFont={theme.bodyFont}
      />

      <AuthorHeroSection author={author} displayName={displayName} booksWithProducts={booksWithProducts} allProducts={allProducts} testimonialsCount={testimonials.length} liveProductsCount={liveNodes.filter(n => !["BP-01","BP-02"].some(p => n.node_id.startsWith(p))).length} theme={theme} v={v} />
      <AuthorAboutSection author={author} displayName={displayName} podcastNodes={podcastNodes} theme={theme} v={v} />
      <AuthorLeadMagnetsSection authorSlug={authorSlug!} leadMagnets={leadMagnets} theme={theme} v={v} />
      <AuthorBooksSection authorSlug={authorSlug!} displayName={displayName} booksWithProducts={booksWithProducts} liveNodes={formatNodes} theme={theme} v={v} />
      <AuthorWhatsInsideSection highlights={whatsInsideHighlights} primaryBook={booksWithProducts.find(b => b.id === whatsInsideSourceBookId)} theme={theme} v={v} />
      <AuthorWorkWithMe
        authorId={author.id}
        authorSlug={authorSlug!}
        authorName={displayName}
        authorContactEmail={null}
        isOwnerViewing={isOwner}
        stripeReady={true /* Authors Bureau is Merchant of Record — platform Stripe always ready */}
        liveNodes={liveNodes.filter(n => !["BP-01","BP-02","BP-08","BA-11","BP-06","BA-17"].some(p => n.node_id.startsWith(p))) as unknown as StorefrontNode[]}
        theme={theme}
        v={v}
      />
      <AuthorTestimonialsSection testimonials={testimonials} theme={theme} v={v} isOwner={isOwner} />
      <AuthorLearnSection authorSlug={authorSlug!} displayName={displayName} learnNodes={learnNodes} theme={theme} v={v} />
      <AuthorServicesSection authorSlug={authorSlug!} displayName={displayName} coachingServices={coachingServices} allProducts={allProducts} serviceNodes={serviceNodes} theme={theme} v={v} />
      <AuthorEventsSection authorSlug={authorSlug!} displayName={displayName} eventNodes={eventNodes} theme={theme} v={v} />
      <AuthorSubscribeSection author={author} authorSlug={authorSlug!} displayName={displayName} affiliateNodes={affiliateNodes} theme={theme} v={v} />
      <AuthorRelatedSection relatedAuthors={relatedAuthors} theme={theme} v={v} />
    </AuthorPageLayout>
  );
}
