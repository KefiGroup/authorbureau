import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, Mail, ArrowRight, Star, Loader2,
  GraduationCap, Users, Headphones, Mic, Globe, ChevronDown,
  Linkedin, Twitter, Instagram, Youtube
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { toast } from "@/hooks/use-toast";
import { getThemeById, type AuthorTheme } from "@/lib/author-themes";
import { getProductCardCTAText } from "@/lib/product-copy";
import AuthorPageLayout from "@/components/public/AuthorPageLayout";
import AuthorBrandedNav from "@/components/public/AuthorBrandedNav";
import AuthorContactModal from "@/components/public/AuthorContactModal";
import NotFound from "./NotFound";

/* ---------- Types ---------- */
interface AuthorData {
  id: string;
  user_id: string;
  pen_name: string | null;
  bio_short: string | null;
  bio_long: string | null;
  tagline: string | null;
  photo_url: string | null;
  cover_photo_url: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  amazon_author_profile_url: string | null;
  author_slug: string | null;
  genres: string[] | null;
  is_speaker: boolean | null;
  credentials: any[] | null;
  site_theme: string | null;
  location_city: string | null;
  location_country: string | null;
}

interface BookWithProducts {
  id: string;
  title: string;
  subtitle: string | null;
  cover_image_url: string | null;
  description: string | null;
  amazon_url: string | null;
  price: string | null;
  kindle_price: string | null;
  paperback_price: string | null;
  genre: string | null;
  slug: string;
  badges: string[] | null;
  rating: number | null;
  products: ProductLink[];
}

interface ProductLink {
  id: string;
  title: string;
  type: "home_study" | "course" | "coaching" | "audiobook" | "podcast";
  price: number | null;
  currency: string | null;
  description?: string | null;
  bookSlug?: string;
}

interface RelatedAuthor {
  author_slug: string;
  pen_name: string;
  photo_url: string | null;
  genres: string[] | null;
}

const PRODUCT_ICONS: Record<string, typeof BookOpen> = {
  home_study: BookOpen,
  course: GraduationCap,
  coaching: Users,
  audiobook: Headphones,
  podcast: Mic,
};

const PRODUCT_LABELS: Record<string, string> = {
  home_study: "Home Study Course",
  course: "Online Course",
  coaching: "Coaching",
  audiobook: "Audiobook",
  podcast: "Podcast",
};

const PRODUCT_ROUTES: Record<string, string> = {
  home_study: "homestudy",
  course: "onlinecourse",
  coaching: "coaching",
  audiobook: "audiobook",
  podcast: "podcast",
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

const SOCIAL_LINKS = [
  { key: "website_url", icon: Globe, label: "Website" },
  { key: "linkedin_url", icon: Linkedin, label: "LinkedIn" },
  { key: "amazon_author_profile_url", icon: BookOpen, label: "Amazon" },
  { key: "twitter_url", icon: Twitter, label: "Twitter/X" },
  { key: "instagram_url", icon: Instagram, label: "Instagram" },
  { key: "youtube_url", icon: Youtube, label: "YouTube" },
] as const;

/* ============================================ */
export default function AuthorSite() {
  const { authorSlug } = useParams<{ authorSlug: string }>();
  const [author, setAuthor] = useState<AuthorData | null>(null);
  const [booksWithProducts, setBooksWithProducts] = useState<BookWithProducts[]>([]);
  const [coachingServices, setCoachingServices] = useState<any[]>([]);
  const [relatedAuthors, setRelatedAuthors] = useState<RelatedAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [subMessage, setSubMessage] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const theme = useMemo(() => getThemeById(author?.site_theme || "classic-elegant"), [author?.site_theme]);

  const displayName = author?.pen_name || "Author";
  const v = theme.vars;

  // Flatten all non-coaching products across books
  const allProducts = useMemo(() => {
    return booksWithProducts.flatMap((b) =>
      b.products.filter((p) => p.type !== "coaching").map((p) => ({ ...p, bookSlug: b.slug, bookTitle: b.title }))
    );
  }, [booksWithProducts]);

  const hasWorkWithSection = coachingServices.length > 0 || allProducts.length > 0;

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
          "@context": "https://schema.org",
          "@type": "Person",
          name: displayName,
          url: canonicalUrl,
          image: author.photo_url || undefined,
          jobTitle: author.tagline || "Author",
          description: author.bio_short || undefined,
          sameAs: [
            author.website_url,
            author.linkedin_url,
            author.twitter_url,
            author.instagram_url,
            author.youtube_url,
            author.amazon_author_profile_url,
          ].filter(Boolean),
        }
      : undefined,
  });

  useEffect(() => {
    if (!authorSlug) return;
    loadAuthorSite();
  }, [authorSlug]);

  async function loadAuthorSite() {
    setLoading(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    let profile: any = null;
    if (currentUser) {
      const { data } = await supabase
        .from("author_profiles")
        .select("*")
        .eq("author_slug", authorSlug)
        .eq("user_id", currentUser.id)
        .maybeSingle();
      profile = data;
    }
    if (!profile) {
      const { data } = await supabase
        .from("author_profiles")
        .select("*")
        .eq("author_slug", authorSlug)
        .in("directory_status", ["listed", "featured"])
        .maybeSingle();
      profile = data;
    }
    if (!profile) { setNotFound(true); setLoading(false); return; }
    setAuthor(profile as unknown as AuthorData);

    const [booksRes, homeStudyRes, coursesRes, coachingRes, audiobooksRes, podcastsRes] = await Promise.all([
      supabase.from("books").select("*").eq("author_id", profile.user_id).not("published_at", "is", null).order("created_at", { ascending: false }),
      supabase.from("home_study_courses").select("id, title, price, currency, book_id, description").eq("author_id", profile.user_id).eq("status", "published"),
      supabase.from("courses").select("id, title, price, currency, book_id, description").eq("author_id", profile.user_id).eq("status", "published"),
      supabase.from("coaching_packages").select("id, title, price, currency, description, duration_minutes, sessions_count").eq("author_id", profile.user_id).eq("status", "active"),
      supabase.from("audiobooks").select("id, title, price, currency, book_id, description").eq("author_id", profile.user_id).eq("status", "published"),
      supabase.from("podcasts").select("id, title, book_id, description").eq("author_id", profile.user_id).eq("status", "published"),
    ]);

    const books = (booksRes.data || []) as any[];
    const homeStudy = (homeStudyRes.data || []) as any[];
    const courses = (coursesRes.data || []) as any[];
    const coaching = (coachingRes.data || []) as any[];
    const audiobooks = (audiobooksRes.data || []) as any[];
    const podcasts = (podcastsRes.data || []) as any[];

    const enriched: BookWithProducts[] = books.map((book) => {
      const products: ProductLink[] = [];
      homeStudy.filter((p) => p.book_id === book.id).forEach((p) => products.push({ id: p.id, title: p.title, type: "home_study", price: p.price, currency: p.currency, description: p.description }));
      courses.filter((p) => p.book_id === book.id).forEach((p) => products.push({ id: p.id, title: p.title, type: "course", price: p.price, currency: p.currency, description: p.description }));
      audiobooks.filter((p) => p.book_id === book.id).forEach((p) => products.push({ id: p.id, title: p.title, type: "audiobook", price: p.price, currency: p.currency, description: p.description }));
      podcasts.filter((p) => p.book_id === book.id).forEach((p) => products.push({ id: p.id, title: p.title, type: "podcast", price: null, currency: null, description: p.description }));
      return { ...book, products };
    });

    if (coaching.length > 0 && enriched.length > 0) {
      coaching.forEach((p) => enriched[0].products.push({ id: p.id, title: p.title, type: "coaching", price: p.price, currency: p.currency, description: p.description }));
    }

    setCoachingServices(coaching);
    setBooksWithProducts(enriched);

    // Fetch Related Authors
    const authorGenres = profile.genres || [];
    if (authorGenres.length > 0) {
      const { data: related } = await supabase
        .from("author_profiles")
        .select("author_slug, pen_name, photo_url, genres")
        .in("directory_status", ["listed", "featured"])
        .neq("user_id", profile.user_id)
        .limit(20);

      if (related) {
        const matches = related
          .filter((r: any) => {
            const rGenres = r.genres || [];
            return rGenres.some((g: string) => authorGenres.includes(g));
          })
          .slice(0, 6) as RelatedAuthor[];
        setRelatedAuthors(matches);
      }
    }

    setLoading(false);
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !name.trim() || !author) return;
    setSubscribing(true);

    // Capture lead in CRM
    await supabase.functions.invoke("crm-auto-capture", {
      body: {
        email: email.trim(),
        name: name.trim(),
        source: "subscribe_form",
        source_detail: `author_homepage: ${authorSlug}${subMessage.trim() ? ` | Message: ${subMessage.trim().slice(0, 200)}` : ""}`,
        author_id: author.user_id,
      },
    });

    const { error } = await supabase.from("author_subscribers").upsert({
      author_id: author.user_id,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      source: "author_homepage",
      source_detail: authorSlug,
      status: "active",
    }, { onConflict: "author_id,email" });
    setSubscribing(false);
    if (error) {
      toast({ title: "Error", description: "Could not subscribe. Try again.", variant: "destructive" });
    } else {
      setSubscribed(true);
      toast({ title: "Subscribed!", description: `You'll hear from ${displayName} soon.` });
      setEmail("");
      setName("");
      setSubMessage("");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !author) return <NotFound />;

  const bioText = author.bio_long || author.bio_short || "";
  const bioParagraphs = bioText.split(/\n\n+/).filter(Boolean);
  const shouldTruncateBio = bioParagraphs.length > 2;
  const displayBioParagraphs = shouldTruncateBio && !bioExpanded ? bioParagraphs.slice(0, 2) : bioParagraphs;

  const totalProducts = allProducts.length;
  const totalBooks = booksWithProducts.length;
  const genres = author.genres || [];

  const socialLinks = SOCIAL_LINKS.filter(
    (s) => (author as any)[s.key]
  );

  function getLowestPrice(book: BookWithProducts): string | null {
    const prices = [book.kindle_price, book.paperback_price, book.price].filter(Boolean) as string[];
    if (prices.length === 0) return null;
    const nums = prices.map(p => parseFloat(p.replace(/[^0-9.]/g, ""))).filter(n => !isNaN(n));
    if (nums.length === 0) return prices[0];
    const min = Math.min(...nums);
    return `$${min.toFixed(2)}`;
  }

  // Dynamic heading for Work With section
  const workWithHeading = coachingServices.length > 0 && allProducts.length > 0
    ? `Work with ${displayName}`
    : coachingServices.length > 0
      ? `Work with ${displayName}`
      : `Resources by ${displayName}`;
  const workWithSubheading = coachingServices.length > 0 && allProducts.length > 0
    ? `Beyond the books - coaching, courses, and resources to accelerate your growth.`
    : coachingServices.length > 0
      ? `Personalized guidance from the author - speaking, coaching, and consulting.`
      : `Hands-on tools and programs built from ${displayName}'s books.`;

  return (
    <AuthorPageLayout theme={theme} breadcrumbs={[
      { label: "Home", to: "/" },
      { label: displayName },
    ]}>

      {/* Author-branded nav */}
      <AuthorBrandedNav
        authorSlug={authorSlug!}
        authorName={displayName}
        authorPhotoUrl={author.photo_url}
        books={booksWithProducts.map(b => ({ slug: b.slug, title: b.title, cover_image_url: b.cover_image_url, genre: b.genre }))}
        hasServices={coachingServices.length > 0}
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

      {/* ===== SECTION 1: HERO BANNER ===== */}
      <section
        className="relative overflow-hidden"
        style={{
          background: v.primary,
          backgroundImage: `radial-gradient(ellipse at 30% 50%, ${v.accent}0D 0%, transparent 70%)`,
        }}
      >
        <div className="relative container max-w-5xl py-16 md:py-24">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Author Photo */}
            {author.photo_url ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
                <img
                  src={author.photo_url}
                  alt={displayName}
                  className="w-40 h-48 md:w-52 md:h-64 object-cover"
                  style={{
                    border: `3px solid ${v.accent}`,
                    borderRadius: "16px",
                    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.3)",
                  }}
                />
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
                <div
                  className="w-40 h-48 md:w-52 md:h-64 flex items-center justify-center"
                  style={{
                    background: v.accent,
                    borderRadius: "16px",
                    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <span className="text-[3rem] font-bold" style={{ color: v.accentText }}>
                    {displayName.charAt(0)}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Text Content */}
            <div className="text-center md:text-left flex-1">
              <motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="text-3xl md:text-5xl font-bold mb-3"
                style={{ color: v.primaryText, fontFamily: theme.headingFont }}
              >
                {displayName}
              </motion.h1>

              {/* Dynamic one-liner */}
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="text-lg md:text-xl mb-5"
                style={{ color: `${v.primaryText}D9` }}
              >
                {(() => {
                  const hasBestseller = booksWithProducts.some(b => b.badges && b.badges.length > 0);
                  const uGenres = [...new Set(booksWithProducts.map(b => b.genre).filter(Boolean))] as string[];
                  const gStr = uGenres.length > 0 ? ` in ${uGenres.join(", ")}` : "";
                  const prefix = hasBestseller ? "a bestselling author" : "an author";
                  return totalBooks > 0
                    ? `${displayName} is ${prefix} of ${totalBooks} book${totalBooks !== 1 ? "s" : ""}${gStr}.`
                    : (author.tagline || "");
                })()}
              </motion.p>

              {/* Tagline */}
              {author.tagline && totalBooks > 0 && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                  className="text-base mb-4" style={{ color: `${v.primaryText}D9` }}
                >
                  {author.tagline}
                </motion.p>
              )}

              {/* Social Links */}
              {socialLinks.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                  className="flex gap-3 mb-6 justify-center md:justify-start"
                >
                  {socialLinks.map((s) => {
                    const Icon = s.icon;
                    const url = (author as any)[s.key];
                    return (
                      <a
                        key={s.key}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={s.label}
                        className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          color: v.accent,
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    );
                  })}
                </motion.div>
              )}

              {/* CTAs */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="flex gap-3 justify-center md:justify-start"
              >
                {booksWithProducts.length > 0 && (
                  <button
                    onClick={() => document.getElementById("books-section")?.scrollIntoView({ behavior: "smooth" })}
                    className="inline-flex items-center gap-2 font-bold rounded-lg transition-all hover:scale-105"
                    style={{
                      background: v.accent,
                      color: v.accentText,
                      padding: "14px 32px",
                      borderRadius: "8px",
                      boxShadow: `0 4px 12px ${v.accent}4D`,
                    }}
                  >
                    <BookOpen className="h-4 w-4" /> Explore My Books
                  </button>
                )}
                <button
                  onClick={() => document.getElementById("subscribe-section")?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center gap-2 font-bold rounded-lg transition-all"
                  style={{
                    background: "transparent",
                    border: `2px solid ${v.accent}`,
                    color: v.accent,
                    padding: "12px 32px",
                    borderRadius: "8px",
                  }}
                >
                  <Mail className="h-4 w-4" /> Subscribe for Updates
                </button>
              </motion.div>
            </div>
          </div>

          {/* Stats Strip */}
          {(totalBooks > 0 || totalProducts > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="mt-12 flex flex-wrap justify-center md:justify-start gap-6 md:gap-10 pt-8"
              style={{ borderTop: `1px solid rgba(255,255,255,0.1)` }}
            >
              {totalBooks > 0 && (
                <div className="text-center md:text-left">
                  <span className="text-2xl md:text-3xl font-bold" style={{ color: v.accent, fontFamily: theme.headingFont }}>{totalBooks}</span>
                  <span className="block text-xs mt-1" style={{ color: `${v.primaryText}D9` }}>Books Published</span>
                </div>
              )}
              {totalProducts > 0 && (
                <div className="text-center md:text-left">
                  <span className="text-2xl md:text-3xl font-bold" style={{ color: v.accent, fontFamily: theme.headingFont }}>{totalProducts}</span>
                  <span className="block text-xs mt-1" style={{ color: `${v.primaryText}D9` }}>Products Available</span>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </section>

      {/* ===== SECTION 2: ABOUT ===== */}
      {bioText && (
        <section id="about" className="py-14 md:py-20" style={{ background: v.cardBg }}>
          <div className="container max-w-4xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="text-2xl md:text-[2rem] font-bold mb-6" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
                About {displayName}
              </h2>

              <div className="text-base space-y-4" style={{ color: v.bodyText, lineHeight: 1.7 }}>
                {!bioExpanded && author.bio_short ? (
                  <p>{author.bio_short}</p>
                ) : (
                  displayBioParagraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))
                )}
              </div>
              {author.bio_long && author.bio_short && (
                <button
                  onClick={() => setBioExpanded(!bioExpanded)}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold transition-colors"
                  style={{ color: v.accent }}
                >
                  {bioExpanded ? "Show Less" : "Read More"}
                  <ChevronDown className={`h-4 w-4 transition-transform ${bioExpanded ? "rotate-180" : ""}`} />
                </button>
              )}

              {/* Genre tags */}
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {genres.map((g, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 text-xs font-medium rounded-full"
                      style={{
                        background: v.secondaryBg,
                        color: v.bodyText,
                        border: `1px solid ${v.accent}`,
                      }}
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== SECTION 3: BOOKS ===== */}
      {booksWithProducts.length > 0 && (
        <section id="books-section" className="py-14 md:py-20" style={{ background: v.secondaryBg }}>
          <div className="container max-w-5xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="text-2xl md:text-[2rem] font-bold mb-10" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
                {totalBooks >= 3 ? "Published Works by" : "Books by"} {displayName}
              </h2>
            </motion.div>

            <div className="space-y-6">
              {booksWithProducts.map((book, idx) => {
                const lowestPrice = getLowestPrice(book);
                const desc = book.description || "";
                const shortDesc = desc.split(/\.\s+/).slice(0, 2).join(". ") + (desc.includes(".") ? "." : "");
                return (
                  <motion.div
                    key={book.id}
                    initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={idx + 1}
                  >
                    <div
                      className="flex flex-col md:flex-row overflow-hidden transition-all group"
                      style={{
                        borderRadius: "12px",
                        border: `1px solid ${v.cardBorder}`,
                        background: v.cardBg,
                        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.1)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.06)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {/* Book Cover */}
                      <Link to={`/${authorSlug}/${book.slug}`} className="shrink-0 md:w-44">
                        {book.cover_image_url ? (
                          <img
                            src={book.cover_image_url}
                            alt={book.title}
                            loading="lazy"
                            className="w-full h-48 md:h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div
                            className="w-full h-48 md:h-full flex flex-col items-center justify-center p-4"
                            style={{ background: `linear-gradient(135deg, ${v.primary}, ${v.accent})` }}
                          >
                            <span className="text-xs uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>Book</span>
                            <span className="text-center font-semibold text-sm leading-snug" style={{ color: v.primaryText, fontFamily: theme.headingFont }}>
                              {book.title}
                            </span>
                          </div>
                        )}
                      </Link>

                      {/* Info */}
                      <div className="flex-1 p-6 flex flex-col justify-center min-w-0">
                        <Link to={`/${authorSlug}/${book.slug}`}>
                          <h3 className="font-bold text-xl mb-1 group-hover:underline" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
                            {book.title}
                          </h3>
                        </Link>
                        {book.subtitle && (
                          <p className="text-sm italic mb-2" style={{ color: v.bodyText }}>{book.subtitle}</p>
                        )}
                        {shortDesc && (
                          <p className="text-sm leading-relaxed line-clamp-3 mb-3" style={{ color: v.bodyText }}>
                            {shortDesc}
                          </p>
                        )}
                        {book.badges && book.badges.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {book.badges.map((badge) => (
                              <span
                                key={badge}
                                className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full"
                                style={{ background: v.accent, color: v.accentText }}
                              >
                                ⭐ {badge}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Price + CTA */}
                      <div className="shrink-0 p-6 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 md:border-l" style={{ borderColor: v.cardBorder }}>
                        {lowestPrice && (
                          <span className="text-lg font-bold" style={{ color: v.accent, fontFamily: theme.headingFont }}>
                            {lowestPrice}
                          </span>
                        )}
                        <Link to={`/${authorSlug}/${book.slug}`}>
                          <button
                            className="inline-flex items-center gap-1.5 font-bold text-sm rounded-lg transition-all px-5 py-2.5"
                            style={{
                              background: v.primary,
                              color: v.primaryText,
                            }}
                          >
                            View Book <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== SECTION 4: WORK WITH [AUTHOR] ===== */}
      {hasWorkWithSection && (
        <section id="services" className="py-16 md:py-20" style={{ background: v.cardBg }}>
          <div className="container max-w-5xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="text-2xl md:text-[2rem] font-bold mb-2" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
                {workWithHeading}
              </h2>
              <p className="text-base mb-10" style={{ color: v.mutedText }}>
                {workWithSubheading}
              </p>
            </motion.div>

            {/* Services sub-section (coaching) */}
            {coachingServices.length > 0 && (
              <div className="mb-12">
                <h3 className="text-lg font-bold mb-6" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
                  Services & Expertise
                </h3>
                <div className="space-y-4">
                  {coachingServices.map((svc, idx) => (
                    <motion.div key={svc.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={idx + 1}>
                      <div
                        className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-xl transition-all hover:shadow-md"
                        style={{
                          background: v.cardBg,
                          border: `1px solid ${v.cardBorder}`,
                          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                        }}
                      >
                        <div
                          className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${v.accent}26` }}
                        >
                          <Users className="h-5 w-5" style={{ color: v.accent }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base mb-1" style={{ color: v.headingText, fontFamily: theme.headingFont }}>{svc.title}</h3>
                          {svc.description && (
                            <p className="text-sm leading-relaxed line-clamp-2" style={{ color: v.bodyText }}>{svc.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: v.mutedText }}>
                            {svc.duration_minutes && <span>{svc.duration_minutes} min</span>}
                            {svc.sessions_count && svc.sessions_count > 1 && <span>· {svc.sessions_count} sessions</span>}
                            {svc.price != null && svc.price > 0 && (
                              <span className="font-bold" style={{ color: v.accent }}>
                                ${svc.price}
                              </span>
                            )}
                          </div>
                        </div>
                        <Link
                          to={`/${authorSlug}#subscribe-section`}
                          className="shrink-0 inline-flex items-center gap-1 px-5 py-2 rounded-lg text-sm font-bold transition-all hover:brightness-110"
                          style={{ background: v.accent, color: v.accentText }}
                        >
                          Inquire <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Products sub-section */}
            {allProducts.length > 0 && (
              <div id="products">
                {coachingServices.length > 0 && (
                  <h3 className="text-lg font-bold mb-6" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
                    Courses, Workbooks & More
                  </h3>
                )}
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {allProducts.slice(0, 6).map((product, idx) => {
                    const PIcon = PRODUCT_ICONS[product.type] || BookOpen;
                    const label = PRODUCT_LABELS[product.type] || product.type;
                    const ctaText = getProductCardCTAText(PRODUCT_ROUTES[product.type] || product.type);
                    return (
                      <motion.div key={product.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={idx + 1}>
                        <Link
                          to={`/${authorSlug}/${product.bookSlug}/${PRODUCT_ROUTES[product.type]}`}
                          className="group flex flex-col h-full p-5 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg"
                          style={{
                            background: v.cardBg,
                            border: `1px solid ${v.cardBorder}`,
                            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                          }}
                        >
                          <span
                            className="inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide mb-3"
                            style={{ background: v.accent, color: v.accentText }}
                          >
                            <PIcon className="h-3 w-3" />
                            {label}
                          </span>
                          <h4 className="font-bold text-base mb-1.5 group-hover:underline" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
                            {product.title}
                          </h4>
                          {product.description && (
                            <p className="text-xs leading-relaxed line-clamp-2 mb-4 flex-1" style={{ color: v.bodyText }}>
                              {product.description}
                            </p>
                          )}
                          {!product.description && <div className="flex-1" />}
                          <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: `1px solid ${v.cardBorder}` }}>
                            {product.price != null && product.price > 0 ? (
                              <span className="font-bold text-sm" style={{ color: v.accent }}>${product.price}</span>
                            ) : (
                              <span className="font-bold text-sm" style={{ color: v.accent }}>Free</span>
                            )}
                            <span
                              className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md transition-all group-hover:brightness-110"
                              style={{ background: v.primary, color: v.primaryText }}
                            >
                              {ctaText}
                            </span>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>

                {allProducts.length > 6 && (
                  <div className="text-center mt-8">
                    <span className="text-sm font-semibold cursor-pointer hover:underline" style={{ color: v.accent }}>
                      View All Resources ({allProducts.length}) →
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===== SECTION 5: LEAD CAPTURE ===== */}
      <section id="subscribe-section" className="relative py-14 md:py-20" style={{ background: v.secondaryBg }}>
        <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: v.accent }} />

        <div className="container max-w-xl text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            {subscribed ? (
              <div className="py-6">
                <Mail className="h-12 w-12 mx-auto mb-4" style={{ color: v.accent }} />
                <h3 className="text-xl font-bold mb-2" style={{ color: v.headingText, fontFamily: theme.headingFont }}>You're subscribed!</h3>
                <p className="text-sm" style={{ color: v.bodyText }}>You'll hear from {displayName} soon.</p>
              </div>
            ) : (
              <>
                <Mail className="h-12 w-12 mx-auto mb-4" style={{ color: v.accent }} />
                <h2 className="text-[1.75rem] md:text-3xl font-bold mb-3" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
                  Stay Connected with {displayName}
                </h2>
                <p className="text-base mb-8" style={{ color: v.bodyText }}>
                  Get exclusive updates, early access to new products, and insights from {displayName}.
                </p>
                <form onSubmit={handleSubscribe} className="flex flex-col gap-3 max-w-md mx-auto">
                  <input
                    type="text"
                    placeholder="Your name *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-12 text-base w-full outline-none"
                    style={{
                      borderRadius: "8px",
                      border: `2px solid ${v.cardBorder}`,
                      padding: "14px 16px",
                      background: v.cardBg,
                      color: v.headingText,
                    }}
                  />
                  <input
                    type="email"
                    placeholder="your@email.com *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 text-base w-full outline-none"
                    style={{
                      borderRadius: "8px",
                      border: `2px solid ${v.cardBorder}`,
                      padding: "14px 16px",
                      background: v.cardBg,
                      color: v.headingText,
                    }}
                  />
                  <textarea
                    placeholder="Message (optional)"
                    value={subMessage}
                    onChange={(e) => setSubMessage(e.target.value)}
                    maxLength={2000}
                    rows={3}
                    className="text-base w-full outline-none resize-none"
                    style={{
                      borderRadius: "8px",
                      border: `2px solid ${v.cardBorder}`,
                      padding: "14px 16px",
                      background: v.cardBg,
                      color: v.headingText,
                    }}
                  />
                  <button
                    type="submit"
                    disabled={subscribing}
                    className="w-full h-12 font-bold text-base transition-all hover:brightness-110"
                    style={{
                      background: v.accent,
                      color: v.accentText,
                      borderRadius: "8px",
                      padding: "14px",
                    }}
                  >
                    {subscribing ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Subscribe"}
                  </button>
                </form>
                <p className="text-xs mt-4" style={{ color: v.mutedText, fontSize: "0.8rem" }}>
                  We respect your privacy. Unsubscribe anytime.
                </p>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* ===== SECTION 6: RELATED AUTHORS ===== */}
      {relatedAuthors.length >= 2 && (
        <section className="py-14 md:py-20" style={{ background: v.primary }}>
          <div className="container max-w-5xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="text-2xl md:text-3xl font-bold mb-8" style={{ color: v.primaryText, fontFamily: theme.headingFont }}>
                Related Authors
              </h2>
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 overflow-x-auto pb-2">
              {relatedAuthors.map((ra, idx) => (
                <motion.div key={ra.author_slug} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={idx + 1}>
                  <Link
                    to={`/${ra.author_slug}`}
                    className="flex flex-col items-center text-center p-6 rounded-xl group transition-all"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: `1px solid ${v.accent}33`,
                      borderRadius: "12px",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = v.accent; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${v.accent}33`; }}
                  >
                    {ra.photo_url ? (
                      <img
                        src={ra.photo_url}
                        alt={ra.pen_name}
                        loading="lazy"
                        className="w-16 h-16 rounded-full object-cover mb-3"
                        style={{ border: `2px solid ${v.accent}` }}
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-full mb-3 flex items-center justify-center"
                        style={{ background: v.primary, border: `2px solid ${v.accent}` }}
                      >
                        <span className="text-xl font-bold" style={{ color: v.accent }}>
                          {ra.pen_name?.charAt(0) || "?"}
                        </span>
                      </div>
                    )}
                    <p className="text-sm font-semibold truncate w-full group-hover:underline" style={{ color: v.primaryText }}>{ra.pen_name}</p>
                    {ra.genres && ra.genres[0] && (
                      <span className="text-xs mt-1" style={{ color: v.accent }}>{ra.genres[0]}</span>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}
    </AuthorPageLayout>
  );
}
