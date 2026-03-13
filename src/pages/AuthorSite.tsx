import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, Mail, ArrowRight, Star, ExternalLink, Loader2,
  GraduationCap, Users, Headphones, Mic, Globe, ChevronDown,
  Linkedin, Twitter, Instagram, Youtube
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { toast } from "@/hooks/use-toast";
import { getThemeById, getThemeFontsUrl, type AuthorTheme } from "@/lib/author-themes";
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

/* ---------- Theme CSS injection ---------- */
function ThemeStyle({ theme }: { theme: AuthorTheme }) {
  const c = theme.colors;
  return (
    <>
      <link rel="stylesheet" href={getThemeFontsUrl(theme)} />
      <style>{`
        .author-site {
          --as-hero-bg: ${c.heroBackground};
          --as-hero-fg: ${c.heroForeground};
          --as-accent: ${c.accent};
          --as-accent-fg: ${c.accentForeground};
          --as-card-border: ${c.cardBorder};
          --as-section-alt: ${c.sectionAlt};
          --as-footer-bg: ${c.footerBackground};
          --as-footer-fg: ${c.footerForeground};
          --as-heading-font: ${theme.headingFont};
          --as-body-font: ${theme.bodyFont};
          --as-radius: ${theme.borderRadius};
        }
        .author-site { font-family: var(--as-body-font); }
        .author-site .as-heading { font-family: var(--as-heading-font); }
      `}</style>
    </>
  );
}

/* ============================================ */
export default function AuthorSite() {
  const { authorSlug } = useParams<{ authorSlug: string }>();
  const [author, setAuthor] = useState<AuthorData | null>(null);
  const [booksWithProducts, setBooksWithProducts] = useState<BookWithProducts[]>([]);
  const [relatedAuthors, setRelatedAuthors] = useState<RelatedAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);

  const theme = useMemo(() => getThemeById(author?.site_theme || "classic-elegant"), [author?.site_theme]);

  const displayName = author?.pen_name || "Author";
  const c = theme.colors;

  // Flatten all products across books
  const allProducts = useMemo(() => {
    return booksWithProducts.flatMap((b) =>
      b.products.map((p) => ({ ...p, bookSlug: b.slug, bookTitle: b.title }))
    );
  }, [booksWithProducts]);

  // SEO
  const seoDescription = author?.tagline
    ? `${displayName} - ${author.tagline}. Explore their books, products, and services on Authors Bureau.`
    : `Author page for ${displayName} on Authors Bureau.`;
  const canonicalUrl = `https://authorsbureau.com/${authorSlug}`;

  useDocumentMeta({
    title: author ? `${displayName} - ${author.tagline || "Author"} | Authors Bureau` : "Author | Authors Bureau",
    description: seoDescription,
    ogTitle: author ? `${displayName} | Authors Bureau` : undefined,
    ogDescription: seoDescription,
    ogImage: author?.photo_url || undefined,
    ogUrl: canonicalUrl,
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
      supabase.from("home_study_courses").select("id, title, price, currency, book_id").eq("author_id", profile.user_id).eq("status", "published"),
      supabase.from("courses").select("id, title, price, currency, book_id").eq("author_id", profile.user_id).eq("status", "published"),
      supabase.from("coaching_packages").select("id, title, price, currency").eq("author_id", profile.user_id).eq("status", "active"),
      supabase.from("audiobooks").select("id, title, price, currency, book_id").eq("author_id", profile.user_id).eq("status", "published"),
      supabase.from("podcasts").select("id, title, book_id").eq("author_id", profile.user_id).eq("status", "published"),
    ]);

    const books = (booksRes.data || []) as any[];
    const homeStudy = (homeStudyRes.data || []) as any[];
    const courses = (coursesRes.data || []) as any[];
    const coaching = (coachingRes.data || []) as any[];
    const audiobooks = (audiobooksRes.data || []) as any[];
    const podcasts = (podcastsRes.data || []) as any[];

    const enriched: BookWithProducts[] = books.map((book) => {
      const products: ProductLink[] = [];
      homeStudy.filter((p) => p.book_id === book.id).forEach((p) => products.push({ id: p.id, title: p.title, type: "home_study", price: p.price, currency: p.currency }));
      courses.filter((p) => p.book_id === book.id).forEach((p) => products.push({ id: p.id, title: p.title, type: "course", price: p.price, currency: p.currency }));
      audiobooks.filter((p) => p.book_id === book.id).forEach((p) => products.push({ id: p.id, title: p.title, type: "audiobook", price: p.price, currency: p.currency }));
      podcasts.filter((p) => p.book_id === book.id).forEach((p) => products.push({ id: p.id, title: p.title, type: "podcast", price: null, currency: null }));
      return { ...book, products };
    });

    if (coaching.length > 0 && enriched.length > 0) {
      coaching.forEach((p) => enriched[0].products.push({ id: p.id, title: p.title, type: "coaching", price: p.price, currency: p.currency }));
    }

    setBooksWithProducts(enriched);

    // Fetch Related Authors (share at least one genre)
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
    if (!email.trim() || !author) return;
    setSubscribing(true);
    const { error } = await supabase.from("author_subscribers").insert({
      author_id: author.user_id,
      email: email.trim(),
      name: name.trim() || null,
      source: "author_homepage",
      source_detail: authorSlug,
    });
    setSubscribing(false);
    if (error?.code === "23505") {
      toast({ title: "You're already subscribed!", description: "You're already on the list." });
      setSubscribed(true);
    } else if (error) {
      toast({ title: "Error", description: "Could not subscribe. Try again.", variant: "destructive" });
    } else {
      setSubscribed(true);
      toast({ title: "Subscribed!", description: `You'll hear from ${displayName} soon.` });
      setEmail("");
      setName("");
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

  // Helper: get lowest price for a book
  function getLowestPrice(book: BookWithProducts): string | null {
    const prices = [book.kindle_price, book.paperback_price, book.price].filter(Boolean) as string[];
    if (prices.length === 0) return null;
    const nums = prices.map(p => parseFloat(p.replace(/[^0-9.]/g, ""))).filter(n => !isNaN(n));
    if (nums.length === 0) return prices[0];
    const min = Math.min(...nums);
    return `$${min.toFixed(2)}`;
  }

  return (
    <div className="author-site min-h-screen" style={{ background: `hsl(${c.sectionAlt})` }}>
      <ThemeStyle theme={theme} />

      {/* ===== BREADCRUMB ===== */}
      <nav className="py-3" style={{ background: `hsl(${c.heroBackground})`, borderBottom: `1px solid hsl(${c.heroForeground} / 0.1)` }}>
        <div className="container max-w-5xl">
          <ol className="flex items-center gap-2 text-xs" style={{ color: `hsl(${c.heroForeground} / 0.5)` }}>
            <li><Link to="/" className="hover:underline" style={{ color: `hsl(${c.heroForeground} / 0.5)` }}>Home</Link></li>
            <li>/</li>
            <li><Link to="/directory" className="hover:underline" style={{ color: `hsl(${c.heroForeground} / 0.5)` }}>Authors Directory</Link></li>
            <li>/</li>
            <li style={{ color: `hsl(${c.heroForeground} / 0.8)` }} className="font-medium">{displayName}</li>
          </ol>
        </div>
      </nav>

      {/* ===== SECTION 1: HERO BANNER ===== */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, hsl(${c.heroBackground}), hsl(${c.heroBackground} / 0.92))`, color: `hsl(${c.heroForeground})` }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

        <div className="relative container max-w-5xl py-16 md:py-24">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Author Photo — rounded rectangle */}
            {author.photo_url && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
                <img
                  src={author.photo_url}
                  alt={displayName}
                  className="w-40 h-48 md:w-52 md:h-64 object-cover shadow-2xl"
                  style={{
                    borderColor: `hsl(${c.accent} / 0.4)`,
                    borderWidth: "4px",
                    borderRadius: "1rem",
                    borderStyle: "solid",
                  }}
                />
              </motion.div>
            )}

            {/* Text Content */}
            <div className="text-center md:text-left flex-1">
              <motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="as-heading text-3xl md:text-5xl font-bold mb-3"
              >
                {displayName}
              </motion.h1>

              {author.tagline && (
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="text-lg md:text-xl mb-5" style={{ opacity: 0.8 }}
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
                          background: `hsl(${c.heroForeground} / 0.1)`,
                          color: `hsl(${c.heroForeground} / 0.7)`,
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
                  <Button
                    onClick={() => document.getElementById("books-section")?.scrollIntoView({ behavior: "smooth" })}
                    className="rounded-full font-semibold px-6"
                    style={{ background: `hsl(${c.accent})`, color: `hsl(${c.accentForeground})` }}
                  >
                    <BookOpen className="mr-2 h-4 w-4" /> Explore My Books
                  </Button>
                )}
                <Button
                  onClick={() => document.getElementById("subscribe-section")?.scrollIntoView({ behavior: "smooth" })}
                  variant="outline"
                  className="rounded-full font-semibold px-6"
                  style={{
                    borderColor: `hsl(${c.heroForeground} / 0.3)`,
                    color: `hsl(${c.heroForeground})`,
                    background: "transparent",
                  }}
                >
                  <Mail className="mr-2 h-4 w-4" /> Subscribe for Updates
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Stats Strip — only non-zero values */}
          {(totalBooks > 0 || totalProducts > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="mt-12 flex flex-wrap justify-center md:justify-start gap-6 md:gap-10 pt-8"
              style={{ borderTop: `1px solid hsl(${c.heroForeground} / 0.1)` }}
            >
              {totalBooks > 0 && (
                <div className="text-center md:text-left">
                  <span className="as-heading text-2xl md:text-3xl font-bold" style={{ color: `hsl(${c.accent})` }}>{totalBooks}</span>
                  <span className="block text-xs mt-1" style={{ opacity: 0.6 }}>Books Published</span>
                </div>
              )}
              {totalProducts > 0 && (
                <div className="text-center md:text-left">
                  <span className="as-heading text-2xl md:text-3xl font-bold" style={{ color: `hsl(${c.accent})` }}>{totalProducts}</span>
                  <span className="block text-xs mt-1" style={{ opacity: 0.6 }}>Products Available</span>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </section>

      {/* ===== SECTION 2: ABOUT ===== */}
      {bioText && (
        <section className="py-14" style={{ borderBottom: `1px solid hsl(${c.cardBorder})` }}>
          <div className="container max-w-4xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="as-heading text-2xl md:text-3xl font-bold mb-6" style={{ color: `hsl(${c.heroBackground})` }}>
                About {displayName}
              </h2>

              <div className="leading-relaxed text-base space-y-4" style={{ color: `hsl(${c.heroBackground} / 0.7)` }}>
                {displayBioParagraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {shouldTruncateBio && (
                <button
                  onClick={() => setBioExpanded(!bioExpanded)}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold transition-colors"
                  style={{ color: `hsl(${c.accent})` }}
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
                        background: `hsl(${c.accent} / 0.1)`,
                        color: `hsl(${c.accent})`,
                        border: `1px solid hsl(${c.accent} / 0.2)`,
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

      {/* ===== SECTION 3: BOOKS (Horizontal Cards) ===== */}
      {booksWithProducts.length > 0 && (
        <section id="books-section" className="py-14 md:py-20">
          <div className="container max-w-5xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="as-heading text-2xl md:text-3xl font-bold mb-10" style={{ color: `hsl(${c.heroBackground})` }}>
                Books by {displayName}
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
                      className="flex flex-col md:flex-row overflow-hidden transition-all hover:shadow-xl group"
                      style={{
                        borderRadius: theme.borderRadius,
                        border: `1px solid hsl(${c.cardBorder})`,
                        background: "white",
                      }}
                    >
                      {/* Book Cover (Left) */}
                      <Link to={`/${authorSlug}/${book.slug}`} className="shrink-0 md:w-44">
                        {book.cover_image_url ? (
                          <img
                            src={book.cover_image_url}
                            alt={book.title}
                            className="w-full h-48 md:h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-48 md:h-full flex items-center justify-center" style={{ background: `hsl(${c.heroBackground} / 0.05)` }}>
                            <BookOpen className="h-12 w-12" style={{ color: `hsl(${c.cardBorder})` }} />
                          </div>
                        )}
                      </Link>

                      {/* Info (Center) */}
                      <div className="flex-1 p-5 flex flex-col justify-center min-w-0">
                        <Link to={`/${authorSlug}/${book.slug}`}>
                          <h3 className="as-heading font-bold text-lg mb-1 group-hover:underline" style={{ color: `hsl(${c.heroBackground})` }}>
                            {book.title}
                          </h3>
                        </Link>
                        {book.subtitle && (
                          <p className="text-sm italic mb-2" style={{ color: `hsl(${c.heroBackground} / 0.5)` }}>{book.subtitle}</p>
                        )}
                        {shortDesc && (
                          <p className="text-sm leading-relaxed line-clamp-2 mb-3" style={{ color: `hsl(${c.heroBackground} / 0.6)` }}>
                            {shortDesc}
                          </p>
                        )}
                        {/* Badges */}
                        {book.badges && book.badges.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {book.badges.map((badge) => (
                              <span
                                key={badge}
                                className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full"
                                style={{ background: `hsl(${c.accent} / 0.12)`, color: `hsl(${c.accent})` }}
                              >
                                ⭐ {badge}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Price + CTA (Right) */}
                      <div className="shrink-0 p-5 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 md:border-l" style={{ borderColor: `hsl(${c.cardBorder})` }}>
                        {lowestPrice && (
                          <span className="as-heading text-lg font-bold" style={{ color: `hsl(${c.accent})` }}>
                            {lowestPrice}
                          </span>
                        )}
                        <Link to={`/${authorSlug}/${book.slug}`}>
                          <Button
                            size="sm"
                            className="rounded-full font-semibold px-5"
                            style={{ background: `hsl(${c.accent})`, color: `hsl(${c.accentForeground})` }}
                          >
                            View Book <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
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

      {/* ===== SECTION 4: PRODUCTS & SERVICES ===== */}
      {allProducts.length > 0 && (
        <section className="py-14" style={{ background: `hsl(${c.heroBackground})`, color: `hsl(${c.heroForeground})` }}>
          <div className="container max-w-5xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="as-heading text-2xl md:text-3xl font-bold mb-8">
                Products &amp; Services
              </h2>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allProducts.map((product, idx) => {
                const Icon = PRODUCT_ICONS[product.type] || BookOpen;
                return (
                  <motion.div
                    key={product.id}
                    initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={idx + 1}
                  >
                    <Link
                      to={`/${authorSlug}/${product.bookSlug}/${PRODUCT_ROUTES[product.type]}`}
                      className="group block p-5 transition-all hover:shadow-lg"
                      style={{
                        borderRadius: theme.borderRadius,
                        border: `1px solid hsl(${c.heroForeground} / 0.1)`,
                        background: `hsl(${c.heroForeground} / 0.05)`,
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                        style={{ background: `hsl(${c.accent} / 0.15)` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: `hsl(${c.accent})` }} />
                      </div>
                      <h4 className="font-semibold text-sm mb-1 group-hover:underline">
                        {product.title}
                      </h4>
                      <p className="text-xs mb-3" style={{ opacity: 0.5 }}>
                        {PRODUCT_LABELS[product.type]} · {product.bookTitle}
                      </p>
                      <div className="flex items-center justify-between">
                        {product.price != null && product.price > 0 ? (
                          <span className="font-bold text-sm" style={{ color: `hsl(${c.accent})` }}>
                            From ${product.price}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ opacity: 0.4 }}>Free</span>
                        )}
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: `hsl(${c.accent})` }} />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== SECTION 5: LEAD CAPTURE ===== */}
      <section id="subscribe-section" className="py-14 md:py-20" style={{ background: `linear-gradient(135deg, hsl(43 74% 54% / 0.12), hsl(43 74% 54% / 0.06))` }}>
        <div className="container max-w-xl text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            {subscribed ? (
              <div className="py-6">
                <Mail className="h-10 w-10 mx-auto mb-4" style={{ color: `hsl(${c.accent})` }} />
                <h3 className="as-heading text-xl font-bold mb-2" style={{ color: `hsl(${c.heroBackground})` }}>You're subscribed!</h3>
                <p className="text-sm" style={{ color: `hsl(${c.heroBackground} / 0.6)` }}>You'll hear from {displayName} soon.</p>
              </div>
            ) : (
              <>
                <Mail className="h-10 w-10 mx-auto mb-4" style={{ color: `hsl(${c.accent})` }} />
                <h2 className="as-heading text-2xl md:text-3xl font-bold mb-3" style={{ color: `hsl(${c.heroBackground})` }}>
                  Stay Connected with {displayName}
                </h2>
                <p className="text-sm mb-8" style={{ color: `hsl(${c.heroBackground} / 0.6)` }}>
                  Get exclusive updates, free chapters, and early access to new releases.
                </p>
                <form onSubmit={handleSubscribe} className="flex flex-col gap-3 max-w-md mx-auto">
                  <Input
                    type="text"
                    placeholder="First name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 text-base"
                    style={{ borderRadius: theme.borderRadius, borderColor: `hsl(${c.cardBorder})` }}
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 text-base flex-1"
                      style={{ borderRadius: theme.borderRadius, borderColor: `hsl(${c.cardBorder})` }}
                    />
                    <Button
                    type="submit"
                    disabled={subscribing}
                    className="shrink-0 h-12 px-8 font-semibold"
                    style={{
                      background: `hsl(${c.accent})`,
                      color: `hsl(${c.accentForeground})`,
                      borderRadius: theme.borderRadius,
                    }}
                  >
                    {subscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe"}
                  </Button>
                </form>
                <p className="text-xs mt-4" style={{ color: `hsl(${c.heroBackground} / 0.3)` }}>
                  We respect your privacy. Unsubscribe anytime.
                </p>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* ===== SECTION 6: RELATED AUTHORS ===== */}
      {relatedAuthors.length >= 2 && (
        <section className="py-14" style={{ background: `hsl(${c.heroBackground})`, color: `hsl(${c.heroForeground})` }}>
          <div className="container max-w-5xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="as-heading text-2xl md:text-3xl font-bold mb-8">
                Related Authors
              </h2>
            </motion.div>
            <div className="flex gap-5 overflow-x-auto pb-2">
              {relatedAuthors.map((ra, idx) => (
                <motion.div key={ra.author_slug} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={idx + 1}>
                  <Link
                    to={`/${ra.author_slug}`}
                    className="shrink-0 flex flex-col items-center text-center w-28 group"
                  >
                    {ra.photo_url ? (
                      <img
                        src={ra.photo_url}
                        alt={ra.pen_name}
                        className="w-16 h-16 rounded-full object-cover mb-2 group-hover:ring-2 transition-all"
                        style={{ borderColor: `hsl(${c.accent} / 0.3)`, borderWidth: "2px", borderStyle: "solid" }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full mb-2 flex items-center justify-center" style={{ background: `hsl(${c.heroForeground} / 0.1)` }}>
                        <Users className="h-6 w-6" style={{ opacity: 0.3 }} />
                      </div>
                    )}
                    <p className="text-xs font-semibold truncate w-full group-hover:underline">{ra.pen_name}</p>
                    {ra.genres && ra.genres[0] && (
                      <span className="text-[10px] mt-1" style={{ opacity: 0.5 }}>{ra.genres[0]}</span>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="py-8" style={{ background: `hsl(${c.footerBackground})`, color: `hsl(${c.footerForeground})` }}>
        <div className="container max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <span>&copy; {new Date().getFullYear()} {displayName}. All rights reserved.</span>
          <span>
            Powered by{" "}
            <Link to="/" className="hover:underline font-medium" style={{ color: `hsl(${c.accent})` }}>Authors Bureau</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
