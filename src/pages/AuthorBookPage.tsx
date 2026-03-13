import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, ExternalLink, Loader2, ArrowRight, GraduationCap, Users,
  Headphones, Mic, Star, Mail, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { toast } from "@/hooks/use-toast";
import { getThemeById, type AuthorTheme } from "@/lib/author-themes";
import AuthorPageLayout from "@/components/public/AuthorPageLayout";
import NotFound from "./NotFound";

/* ---------- Types ---------- */
interface Book {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  slug: string;
  pages?: number;
  rating?: number;
  review_count?: number;
  genre?: string;
  badges?: string[];
  price?: string;
  currency?: string;
  kindle_price?: string;
  paperback_price?: string;
  amazon_url?: string;
  cover_image_url?: string;
  author_id: string;
  author_name: string;
  author_bio?: string;
  author_photo_url?: string;
  bestseller_proof_url?: string;
}

interface ProductLink {
  type: string;
  title: string;
  route: string;
  price?: string;
  description?: string;
}

interface OtherBook {
  id: string;
  title: string;
  slug: string;
  cover_image_url?: string;
}

const PRODUCT_ICONS: Record<string, typeof BookOpen> = {
  homestudy: BookOpen,
  onlinecourse: GraduationCap,
  coaching: Users,
  audiobook: Headphones,
  podcast: Mic,
};

const PRODUCT_LABELS: Record<string, string> = {
  homestudy: "Home Study Course",
  onlinecourse: "Online Course",
  coaching: "Coaching",
  audiobook: "Audiobook",
  podcast: "Podcast",
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

/* ---------- Theme CSS injection ---------- */
function ThemeStyle({ theme }: { theme: AuthorTheme }) {
  const c = theme.colors;
  return (
    <>
      <link rel="stylesheet" href={getThemeFontsUrl(theme)} />
      <style>{`
        .book-page {
          --bp-hero-bg: ${c.heroBackground};
          --bp-hero-fg: ${c.heroForeground};
          --bp-accent: ${c.accent};
          --bp-accent-fg: ${c.accentForeground};
          --bp-card-border: ${c.cardBorder};
          --bp-section-alt: ${c.sectionAlt};
          --bp-footer-bg: ${c.footerBackground};
          --bp-footer-fg: ${c.footerForeground};
          --bp-heading-font: ${theme.headingFont};
          --bp-body-font: ${theme.bodyFont};
          --bp-radius: ${theme.borderRadius};
        }
        .book-page { font-family: var(--bp-body-font); }
        .book-page .bp-heading { font-family: var(--bp-heading-font); }
      `}</style>
    </>
  );
}

/* ============================================ */
export default function AuthorBookPage() {
  const { authorSlug, bookSlug } = useParams<{ authorSlug: string; bookSlug: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [products, setProducts] = useState<ProductLink[]>([]);
  const [otherBooks, setOtherBooks] = useState<OtherBook[]>([]);
  const [authorProfile, setAuthorProfile] = useState<any>(null);
  const [theme, setTheme] = useState<AuthorTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const c = theme?.colors;

  // SEO
  const authorName = book?.author_name || authorProfile?.pen_name || "Author";
  const seoTitle = book ? `${book.title} by ${authorName} | Authors Bureau` : "Book | Authors Bureau";
  const seoDesc = book?.description?.slice(0, 150) ? `${book.title}: ${book.description.slice(0, 150)}...` : "";
  const canonicalUrl = `https://authorsbureau.com/${authorSlug}/${bookSlug}`;

  useDocumentMeta({
    title: seoTitle,
    description: seoDesc,
    ogTitle: seoTitle,
    ogDescription: seoDesc,
    ogImage: book?.cover_image_url || undefined,
    ogUrl: canonicalUrl,
    twitterCard: "summary_large_image",
    jsonLd: book
      ? {
          "@context": "https://schema.org",
          "@type": "Book",
          name: book.title,
          author: {
            "@type": "Person",
            name: authorName,
            url: `https://authorsbureau.com/${authorSlug}`,
          },
          numberOfPages: book.pages || undefined,
          genre: book.genre || undefined,
          image: book.cover_image_url || undefined,
          url: canonicalUrl,
          offers: [
            book.price ? { "@type": "Offer", price: book.price.replace(/[^0-9.]/g, ""), priceCurrency: book.currency || "USD", availability: "https://schema.org/InStock", name: "Hardcover" } : null,
            book.kindle_price ? { "@type": "Offer", price: book.kindle_price.replace(/[^0-9.]/g, ""), priceCurrency: "USD", name: "Kindle" } : null,
            book.paperback_price ? { "@type": "Offer", price: book.paperback_price.replace(/[^0-9.]/g, ""), priceCurrency: "USD", name: "Paperback" } : null,
          ].filter(Boolean),
          aggregateRating: book.rating
            ? { "@type": "AggregateRating", ratingValue: book.rating, bestRating: 5, reviewCount: book.review_count || 1 }
            : undefined,
        }
      : undefined,
  });

  useEffect(() => {
    if (!authorSlug || !bookSlug) { setNotFound(true); setLoading(false); return; }
    loadBookPage();
  }, [authorSlug, bookSlug]);

  async function loadBookPage() {
    setLoading(true);

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    let profile: any = null;

    if (currentUser) {
      const { data } = await supabase
        .from("author_profiles")
        .select("user_id, pen_name, bio_short, bio_long, photo_url, site_theme, author_slug, tagline, credentials, website_url, linkedin_url, twitter_url, instagram_url, youtube_url")
        .eq("author_slug", authorSlug)
        .eq("user_id", currentUser.id)
        .maybeSingle();
      profile = data;
    }
    if (!profile) {
      const { data } = await supabase
        .from("author_profiles")
        .select("user_id, pen_name, bio_short, bio_long, photo_url, site_theme, author_slug, tagline, credentials, website_url, linkedin_url, twitter_url, instagram_url, youtube_url")
        .eq("author_slug", authorSlug)
        .in("directory_status", ["listed", "featured"])
        .maybeSingle();
      profile = data;
    }

    // Fallback redirect
    if (!profile) {
      const { data: bookBySlug } = await supabase
        .from("books")
        .select("author_id, slug")
        .eq("slug", bookSlug)
        .not("published_at", "is", null)
        .maybeSingle();
      if (bookBySlug) {
        const { data: correctProfile } = await supabase
          .from("author_profiles")
          .select("author_slug")
          .eq("user_id", bookBySlug.author_id)
          .maybeSingle();
        if (correctProfile?.author_slug && correctProfile.author_slug !== authorSlug) {
          navigate(`/${correctProfile.author_slug}/${bookBySlug.slug}`, { replace: true });
          return;
        }
      }
      setNotFound(true); setLoading(false); return;
    }

    setAuthorProfile(profile);
    setTheme(getThemeById(profile.site_theme || "classic-elegant"));

    // Fetch book
    const { data: bookData } = await supabase
      .from("books")
      .select("*")
      .eq("author_id", profile.user_id)
      .eq("slug", bookSlug)
      .maybeSingle();

    if (!bookData) { setNotFound(true); setLoading(false); return; }
    setBook(bookData as unknown as Book);

    // Fetch products + other books in parallel
    const bookId = bookData.id;
    const [hsRes, cRes, abRes, podRes, otherBooksRes] = await Promise.all([
      supabase.from("home_study_courses").select("id, title, price, currency, description").eq("book_id", bookId).eq("status", "published"),
      supabase.from("courses").select("id, title, price, currency, description").eq("book_id", bookId).eq("status", "published"),
      supabase.from("audiobooks").select("id, title, price, currency, description").eq("book_id", bookId).eq("status", "published"),
      supabase.from("podcasts").select("id, title, description").eq("book_id", bookId).eq("status", "published"),
      supabase.from("books").select("id, title, slug, cover_image_url").eq("author_id", profile.user_id).not("published_at", "is", null).neq("id", bookId).limit(4),
    ]);

    const prods: ProductLink[] = [];
    (hsRes.data || []).forEach((p: any) => prods.push({ type: "homestudy", title: p.title, route: "homestudy", price: p.price ? `$${p.price}` : undefined, description: p.description }));
    (cRes.data || []).forEach((p: any) => prods.push({ type: "onlinecourse", title: p.title, route: "onlinecourse", price: p.price ? `$${p.price}` : undefined, description: p.description }));
    (abRes.data || []).forEach((p: any) => prods.push({ type: "audiobook", title: p.title, route: "audiobook", price: p.price ? `$${p.price}` : undefined, description: p.description }));
    (podRes.data || []).forEach((p: any) => prods.push({ type: "podcast", title: p.title, route: "podcast", description: p.description }));

    setProducts(prods);
    setOtherBooks((otherBooksRes.data || []) as OtherBook[]);
    setLoading(false);
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !book || !authorProfile) return;
    setSubscribing(true);
    const { error } = await supabase.from("author_subscribers").insert({
      author_id: authorProfile.user_id,
      email: email.trim(),
      name: name.trim() || null,
      source: "book_page",
      source_detail: `${authorSlug}/${bookSlug}`,
    });
    setSubscribing(false);
    if (error?.code === "23505") {
      toast({ title: "You're already subscribed!", description: "You're already on the list." });
      setSubscribed(true);
    } else if (error) {
      toast({ title: "Error", description: "Could not subscribe. Try again.", variant: "destructive" });
    } else {
      setSubscribed(true);
      toast({ title: "You're subscribed!", description: "Check your inbox for updates." });
      setEmail("");
      setName("");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !book || !c || !theme) return <NotFound />;

  const badgeList = Array.isArray(book.badges) ? book.badges : [];
  const isAmazonLink = book.amazon_url?.includes("amazon.com") || book.amazon_url?.includes("a.co");
  const authorBio = book.author_bio || authorProfile?.bio_short || "";
  const authorPhoto = book.author_photo_url || authorProfile?.photo_url || "";

  // Price formats — only show fields with values
  const priceFormats = [
    book.kindle_price ? { label: "Kindle", value: book.kindle_price } : null,
    book.paperback_price ? { label: "Paperback", value: book.paperback_price } : null,
    book.price ? { label: book.kindle_price || book.paperback_price ? "Hardcover" : "Price", value: book.price } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  // Lowest price for sticky CTA
  const lowestPrice = priceFormats.length > 0
    ? priceFormats.reduce((min, pf) => {
        const val = parseFloat(pf.value.replace(/[^0-9.]/g, ""));
        const minVal = parseFloat(min.value.replace(/[^0-9.]/g, ""));
        return !isNaN(val) && val < minVal ? pf : min;
      }, priceFormats[0])
    : null;

  return (
    <div className="book-page min-h-screen" style={{ background: `hsl(${c.sectionAlt})` }}>
      <ThemeStyle theme={theme} />

      {/* ===== BREADCRUMB ===== */}
      <nav className="py-3" style={{ background: `hsl(${c.heroBackground})`, borderBottom: `1px solid hsl(${c.heroForeground} / 0.1)` }}>
        <div className="container max-w-5xl">
          <ol className="flex items-center gap-2 text-xs" style={{ color: `hsl(${c.heroForeground} / 0.5)` }}>
            <li><Link to="/" className="hover:underline" style={{ color: `hsl(${c.heroForeground} / 0.5)` }}>Home</Link></li>
            <li>/</li>
            <li><Link to={`/${authorSlug}`} className="hover:underline" style={{ color: `hsl(${c.heroForeground} / 0.5)` }}>{authorName}</Link></li>
            <li>/</li>
            <li style={{ color: `hsl(${c.heroForeground} / 0.8)` }} className="font-medium truncate max-w-[200px]">{book.title}</li>
          </ol>
        </div>
      </nav>

      {/* ===== SECTION 1: HERO ===== */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, hsl(${c.heroBackground}), hsl(${c.heroBackground} / 0.92))`, color: `hsl(${c.heroForeground})` }}>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E\")" }} />

        <div className="relative container max-w-5xl py-12 md:py-20">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-14">
            {/* LEFT: Book Cover with 3D tilt */}
            <motion.div
              initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
              className="w-56 md:w-64 shrink-0"
            >
              <div className="relative" style={{ perspective: "800px" }}>
                {book.cover_image_url ? (
                  <img
                    src={book.cover_image_url}
                    alt={book.title}
                    className="w-full rounded-lg shadow-2xl"
                    style={{
                      transform: "rotateY(-5deg)",
                      boxShadow: `12px 12px 30px rgba(0,0,0,0.4), -2px -2px 8px rgba(255,255,255,0.05)`,
                    }}
                  />
                ) : (
                  <div
                    className="w-full aspect-[2/3] rounded-lg flex items-center justify-center"
                    style={{ background: `hsl(${c.heroForeground} / 0.1)`, transform: "rotateY(-5deg)" }}
                  >
                    <BookOpen className="h-16 w-16" style={{ color: `hsl(${c.heroForeground} / 0.3)` }} />
                  </div>
                )}
                {/* Bestseller ribbon */}
                {badgeList.length > 0 && (
                  <div
                    className="absolute -top-2 -right-2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg z-10"
                    style={{ background: `hsl(${c.accent})`, color: `hsl(${c.accentForeground})` }}
                  >
                    ⭐ {badgeList[0]}
                  </div>
                )}
              </div>
            </motion.div>

            {/* RIGHT: Book Info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex-1 text-center md:text-left">
              <h1 className="bp-heading text-3xl md:text-4xl lg:text-5xl font-bold mb-3" style={{ color: `hsl(${c.accent})` }}>
                {book.title}
              </h1>

              {book.subtitle && (
                <p className="text-lg mb-3" style={{ opacity: 0.7 }}>{book.subtitle}</p>
              )}

              <p className="mb-4" style={{ opacity: 0.6 }}>
                by <Link to={`/${authorSlug}`} className="font-semibold hover:underline" style={{ color: `hsl(${c.accent})` }}>{authorName}</Link>
              </p>

              {/* Badge Row */}
              {(badgeList.length > 0 || book.rating) && (
                <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
                  {badgeList.map((badge) => (
                    <span
                      key={badge}
                      className="px-3 py-1 text-xs font-semibold rounded-full"
                      style={{ background: `hsl(${c.accent} / 0.15)`, color: `hsl(${c.accent})` }}
                    >
                      ⭐ {badge}
                    </span>
                  ))}
                  {book.rating && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1"
                      style={{ background: `hsl(${c.accent} / 0.15)`, color: `hsl(${c.accent})` }}
                    >
                      <Star className="h-3 w-3 fill-current" /> {book.rating} out of 5
                    </span>
                  )}
                </div>
              )}

              {/* Quick Stats — only fields with values, NO published date */}
              <div className="flex flex-wrap gap-4 mb-5 justify-center md:justify-start text-sm" style={{ opacity: 0.6 }}>
                {book.pages && <span>Pages: {book.pages}</span>}
                {book.genre && <span>Genre: {book.genre}</span>}
              </div>

              {/* Price Display */}
              {priceFormats.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-6 justify-center md:justify-start">
                  {priceFormats.map((pf) => (
                    <div key={pf.label} className="text-center px-4 py-2 rounded-lg" style={{ background: `hsl(${c.heroForeground} / 0.08)` }}>
                      <span className="block text-[10px] uppercase tracking-wider" style={{ opacity: 0.5 }}>{pf.label}</span>
                      <span className="bp-heading text-lg font-bold" style={{ color: `hsl(${c.accent})` }}>{pf.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                {book.amazon_url && (
                  <Button asChild className="rounded-full font-semibold px-6 h-11"
                    style={{ background: `hsl(${c.accent})`, color: `hsl(${c.accentForeground})` }}
                  >
                    <a href={book.amazon_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {isAmazonLink ? "Buy on Amazon" : "Get Your Copy"}
                    </a>
                  </Button>
                )}
                <Button
                  onClick={() => document.getElementById("book-subscribe")?.scrollIntoView({ behavior: "smooth" })}
                  variant="outline"
                  className="rounded-full font-semibold px-6 h-11"
                  style={{ borderColor: `hsl(${c.heroForeground} / 0.3)`, color: `hsl(${c.heroForeground})`, background: "transparent" }}
                >
                  <Mail className="mr-2 h-4 w-4" /> Get Updates
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 2: ABOUT THIS BOOK ===== */}
      {book.description && (
        <section className="py-14" style={{ borderBottom: `1px solid hsl(${c.cardBorder})` }}>
          <div className="container max-w-3xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="bp-heading text-2xl md:text-3xl font-bold mb-6" style={{ color: `hsl(${c.heroBackground})` }}>
                About This Book
              </h2>
              <div className="text-base leading-relaxed space-y-4" style={{ color: `hsl(${c.heroBackground} / 0.7)` }}>
                {book.description.split(/\n\n+/).filter(Boolean).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== SECTION 3: BESTSELLER PROOF ===== */}
      {book.bestseller_proof_url && (
        <section className="py-14" style={{ background: `hsl(${c.heroBackground})`, color: `hsl(${c.heroForeground})` }}>
          <div className="container max-w-3xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="bp-heading text-xl md:text-2xl font-bold mb-6">
                <Star className="inline h-5 w-5 mr-2" style={{ color: `hsl(${c.accent})` }} />
                Amazon Bestseller Proof
              </h2>
              <div
                className="rounded-lg overflow-hidden shadow-lg p-1"
                style={{ background: "white", borderRadius: theme.borderRadius }}
              >
                {/* Browser mockup frame */}
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-t-md" style={{ background: "#f5f5f5" }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#eab308" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }} />
                  <span className="ml-2 text-[10px] flex-1 text-center truncate text-gray-400">
                    amazon.com
                  </span>
                </div>
                <img src={book.bestseller_proof_url} alt={`${book.title} bestseller proof`} className="w-full" />
              </div>
              <p className="text-sm text-center mt-4" style={{ opacity: 0.5 }}>
                {book.title} reached #1 on Amazon Best Sellers
              </p>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== SECTION 4: ABOUT THE AUTHOR ===== */}
      {(authorBio || authorPhoto) && (
        <section className="py-14" style={{ borderBottom: `1px solid hsl(${c.cardBorder})` }}>
          <div className="container max-w-3xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="bp-heading text-xl md:text-2xl font-bold mb-6" style={{ color: `hsl(${c.heroBackground})` }}>About the Author</h2>
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {authorPhoto && (
                  <img
                    src={authorPhoto}
                    alt={authorName}
                    className="w-20 h-20 rounded-full object-cover shrink-0"
                    style={{ borderColor: `hsl(${c.accent} / 0.3)`, borderWidth: "3px", borderStyle: "solid" }}
                  />
                )}
                <div className="flex-1">
                  <h3 className="bp-heading font-bold text-lg mb-1" style={{ color: `hsl(${c.heroBackground})` }}>{authorName}</h3>
                  {authorProfile?.tagline && (
                    <p className="text-sm mb-3" style={{ color: `hsl(${c.heroBackground} / 0.5)` }}>{authorProfile.tagline}</p>
                  )}
                  {authorBio && (
                    <p className="text-sm leading-relaxed mb-4" style={{ color: `hsl(${c.heroBackground} / 0.6)` }}>
                      {authorBio.length > 200 ? authorBio.slice(0, 200) + "..." : authorBio}
                    </p>
                  )}
                  <Link
                    to={`/${authorSlug}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold transition-colors hover:underline"
                    style={{ color: `hsl(${c.accent})` }}
                  >
                    View Full Profile <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== SECTION 5: MORE BOOKS BY AUTHOR ===== */}
      {otherBooks.length > 0 && (
        <section className="py-14" style={{ borderBottom: `1px solid hsl(${c.cardBorder})` }}>
          <div className="container max-w-3xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="bp-heading text-xl md:text-2xl font-bold mb-6" style={{ color: `hsl(${c.heroBackground})` }}>
                More Books by {authorName}
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {otherBooks.map((ob) => (
                  <Link
                    key={ob.id}
                    to={`/${authorSlug}/${ob.slug}`}
                    className="shrink-0 group"
                  >
                    {ob.cover_image_url ? (
                      <img
                        src={ob.cover_image_url}
                        alt={ob.title}
                        className="w-24 h-36 rounded-md object-cover shadow-md group-hover:shadow-lg transition-shadow"
                      />
                    ) : (
                      <div
                        className="w-24 h-36 rounded-md flex items-center justify-center"
                        style={{ background: `hsl(${c.heroBackground} / 0.05)` }}
                      >
                        <BookOpen className="h-6 w-6" style={{ color: `hsl(${c.cardBorder})` }} />
                      </div>
                    )}
                    <p className="text-xs mt-1.5 text-center max-w-[96px] truncate" style={{ color: `hsl(${c.heroBackground} / 0.6)` }}>{ob.title}</p>
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== SECTION 6: CONTINUE YOUR JOURNEY (Products) ===== */}
      {products.length > 0 && (
        <section className="py-14" style={{ borderBottom: `1px solid hsl(${c.cardBorder})` }}>
          <div className="container max-w-4xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="bp-heading text-2xl md:text-3xl font-bold mb-3" style={{ color: `hsl(${c.heroBackground})` }}>
                Continue Your Journey
              </h2>
              <p className="text-sm mb-8" style={{ color: `hsl(${c.heroBackground} / 0.5)` }}>
                Products and services built from this book
              </p>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-2">
              {products.map((p, i) => {
                const Icon = PRODUCT_ICONS[p.type] || BookOpen;
                return (
                  <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}>
                    <Link
                      to={`/${authorSlug}/${bookSlug}/${p.route}`}
                      className="group block p-5 transition-all hover:shadow-lg"
                      style={{
                        borderRadius: theme.borderRadius,
                        border: `1px solid hsl(${c.cardBorder})`,
                        background: "white",
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `hsl(${c.accent} / 0.1)` }}
                        >
                          <Icon className="h-5 w-5" style={{ color: `hsl(${c.accent})` }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm mb-0.5 group-hover:underline" style={{ color: `hsl(${c.heroBackground})` }}>
                            {p.title}
                          </p>
                          <p className="text-xs mb-2" style={{ color: `hsl(${c.heroBackground} / 0.4)` }}>
                            {PRODUCT_LABELS[p.type] || p.type}
                          </p>
                          {p.description && (
                            <p className="text-xs line-clamp-2" style={{ color: `hsl(${c.heroBackground} / 0.5)` }}>{p.description}</p>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {p.price && (
                            <span className="font-bold text-sm" style={{ color: `hsl(${c.accent})` }}>{p.price}</span>
                          )}
                          <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: `hsl(${c.accent})` }} />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== SECTION 7: LEAD CAPTURE ===== */}
      <section id="book-subscribe" className="py-14" style={{ background: `linear-gradient(135deg, hsl(43 74% 54% / 0.12), hsl(43 74% 54% / 0.06))` }}>
        <div className="container max-w-xl text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            {subscribed ? (
              <div className="py-6">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4" style={{ color: `hsl(${c.accent})` }} />
                <h3 className="bp-heading text-xl font-bold mb-2" style={{ color: `hsl(${c.heroBackground})` }}>You're subscribed!</h3>
                <p className="text-sm" style={{ color: `hsl(${c.heroBackground} / 0.6)` }}>You'll receive updates about {book.title}.</p>
              </div>
            ) : (
              <>
                <Mail className="h-10 w-10 mx-auto mb-4" style={{ color: `hsl(${c.accent})` }} />
                <h2 className="bp-heading text-2xl font-bold mb-3" style={{ color: `hsl(${c.heroBackground})` }}>
                  Stay Updated on {book.title}
                </h2>
                <p className="text-sm mb-8" style={{ color: `hsl(${c.heroBackground} / 0.6)` }}>
                  Enter your email to receive updates from {authorName}.
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
                    className="shrink-0 h-12 px-6 font-semibold"
                    style={{ background: `hsl(${c.accent})`, color: `hsl(${c.accentForeground})`, borderRadius: theme.borderRadius }}
                  >
                    {subscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe"}
                    </Button>
                  </div>
                </form>
                <p className="text-xs mt-4" style={{ color: `hsl(${c.heroBackground} / 0.3)` }}>
                  We respect your privacy. Unsubscribe anytime.
                </p>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* ===== STICKY MOBILE CTA ===== */}
      {book.amazon_url && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden py-3 px-4 flex items-center justify-between shadow-2xl"
          style={{ background: `hsl(${c.heroBackground})`, borderTop: `1px solid hsl(${c.heroForeground} / 0.1)` }}
        >
          <div>
            {lowestPrice && (
              <div>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: `hsl(${c.heroForeground} / 0.5)` }}>
                  Lowest Price
                </span>
                <span className="bp-heading block text-lg font-bold" style={{ color: `hsl(${c.accent})` }}>
                  {lowestPrice.value}
                </span>
              </div>
            )}
          </div>
          <Button asChild size="sm" className="rounded-full font-semibold px-5"
            style={{ background: `hsl(${c.accent})`, color: `hsl(${c.accentForeground})` }}
          >
            <a href={book.amazon_url} target="_blank" rel="noopener noreferrer">
              {isAmazonLink ? "Buy on Amazon" : "Get Your Copy"}
            </a>
          </Button>
        </div>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="py-8" style={{ background: `hsl(${c.footerBackground})`, color: `hsl(${c.footerForeground})` }}>
        <div className="container max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <span>&copy; {new Date().getFullYear()} {authorName}. All rights reserved.</span>
          <span>
            Powered by{" "}
            <Link to="/" className="hover:underline font-medium" style={{ color: `hsl(${c.accent})` }}>Authors Bureau</Link>
          </span>
        </div>
      </footer>

      {/* Bottom padding for sticky CTA on mobile */}
      {book.amazon_url && <div className="h-16 md:hidden" />}
    </div>
  );
}
