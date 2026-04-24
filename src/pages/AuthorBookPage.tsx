import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, ExternalLink, Loader2, ArrowRight, GraduationCap, Users,
  Headphones, Mic, Star, Mail, CheckCircle2, Sparkles, Package,
  Megaphone, Trophy, Calendar, Briefcase, Award, Globe, Heart, Handshake
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { toast } from "@/hooks/use-toast";
import { getThemeById, type AuthorTheme } from "@/lib/author-themes";
import { getGoDeeperCopy, getProductCardCTAText } from "@/lib/product-copy";
import AuthorPageLayout from "@/components/public/AuthorPageLayout";
import AuthorBrandedNav from "@/components/public/AuthorBrandedNav";
import AuthorContactModal from "@/components/public/AuthorContactModal";
import BookProductNav, { getProductTabMeta } from "@/components/public/BookProductNav";
import NotFound from "./NotFound";
import LeadCaptureForm from "@/components/LeadCaptureForm";

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
  coverImageUrl?: string;
  /** When set, overrides the default `/{authorSlug}/{bookSlug}/{route}` link target. */
  linkTo?: string;
}

/** Extract a human-readable description from potentially JSON-encoded sales copy */
function parseProductDescription(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return trimmed;
  try {
    const parsed = JSON.parse(trimmed);
    // Sales copy JSON structure
    if (parsed.hero?.tagline) return parsed.hero.tagline;
    if (parsed.introduction?.paragraph) return parsed.introduction.paragraph;
    if (parsed.problem?.headline) return parsed.problem.headline;
    return undefined;
  } catch (error) {
    return trimmed;
  }
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

/* ============================================ */
export default function AuthorBookPage() {
  const { authorSlug, bookSlug } = useParams<{ authorSlug: string; bookSlug: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [products, setProducts] = useState<ProductLink[]>([]);
  const [otherBooks, setOtherBooks] = useState<OtherBook[]>([]);
  const [allAuthorBooks, setAllAuthorBooks] = useState<{ slug: string; title: string; cover_image_url?: string; genre?: string }[]>([]);
  const [authorProfile, setAuthorProfile] = useState<any>(null);
  const [coachingServices, setCoachingServices] = useState<any[]>([]);
  const [theme, setTheme] = useState<AuthorTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [subMessage, setSubMessage] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const [contactOpen, setContactOpen] = useState(false);

  const v = theme?.vars;

  const authorName = book?.author_name || authorProfile?.pen_name || "Author";
  const authorFirstName = authorName.split(" ")[0];
  const seoTitle = book ? `${book.title} by ${authorName} | Authors Bureau` : "Book | Authors Bureau";
  const canonicalUrl = `https://authorsbureau.com/${authorSlug}/${bookSlug}`;

  const bookDescFirstSentence = book?.description ? (book.description.split(/[.!?]\s/)[0] + ".") : "";
  const formatParts: string[] = [];
  if (book?.kindle_price) formatParts.push(`Kindle ${book.kindle_price}`);
  if (book?.paperback_price) formatParts.push(`Paperback ${book.paperback_price}`);
  if (book?.price && !book?.kindle_price && !book?.paperback_price) formatParts.push(book.price);
  const formatsStr = formatParts.length > 0 ? ` Available in ${formatParts.join(", ")}.` : "";
  const badgesForMeta = Array.isArray(book?.badges) && book.badges.length > 0 ? ` ${book.badges[0]}.` : "";
  const seoDesc = book
    ? `${book.title} by ${authorName}. ${bookDescFirstSentence}${formatsStr}${badgesForMeta}`
    : "";

  useDocumentMeta({
    title: seoTitle,
    description: seoDesc,
    ogTitle: seoTitle,
    ogDescription: seoDesc,
    ogImage: book?.cover_image_url || undefined,
    ogUrl: canonicalUrl,
    ogType: "book",
    ogSiteName: "Authors Bureau",
    canonical: canonicalUrl,
    twitterCard: "summary_large_image",
    jsonLd: book
      ? {
          "@context": "https://schema.org",
          "@type": "Book",
          name: book.title,
          author: { "@type": "Person", name: authorName, url: `https://authorsbureau.com/${authorSlug}` },
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

  // Intersection observer for sticky mobile CTA
  useEffect(() => {
    const heroEl = document.getElementById("book-hero");
    if (!heroEl) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(heroEl);
    return () => observer.disconnect();
  }, [book]);

  useEffect(() => {
    if (!authorSlug || !bookSlug) { setNotFound(true); setLoading(false); return; }
    loadBookPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorSlug, bookSlug]);

  async function loadBookPage() {
    setLoading(true);

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    let profile: any = null;
    let isOwner = false;

    if (currentUser) {
      const { data } = await supabase
        .from("author_profiles")
        .select("user_id, pen_name, bio_short, bio_long, photo_url, site_theme, author_slug, tagline, credentials, website_url, linkedin_url, twitter_url, instagram_url, youtube_url, genres")
        .eq("author_slug", authorSlug)
        .eq("user_id", currentUser.id)
        .maybeSingle();
      profile = data;
      if (data) isOwner = true;
    }
    if (!profile) {
      const { data } = await supabase
        .from("author_profiles_public" as any)
        .select("user_id, pen_name, bio_short, bio_long, photo_url, site_theme, author_slug, tagline, credentials, website_url, linkedin_url, twitter_url, instagram_url, youtube_url, genres")
        .eq("author_slug", authorSlug)
        .in("directory_status", ["listed", "verified", "featured"])
        .maybeSingle();
      profile = data;
    }

    if (!profile) {
      const { data: bookBySlug } = await supabase
        .from("books")
        .select("author_id, slug")
        .eq("slug", bookSlug)
        .not("published_at", "is", null)
        .maybeSingle();
      if (bookBySlug) {
        const { data: correctProfile } = await supabase
          .from("author_profiles_public" as any)
          .select("author_slug")
          .eq("user_id", bookBySlug.author_id)
          .maybeSingle() as { data: any };
        if (correctProfile?.author_slug && correctProfile.author_slug !== authorSlug) {
          navigate(`/${correctProfile.author_slug}/${bookBySlug.slug}`, { replace: true });
          return;
        }
      }
      setNotFound(true); setLoading(false); return;
    }

    setAuthorProfile(profile);
    setTheme(getThemeById(profile.site_theme || "classic-elegant"));

    let primaryBookQuery = supabase
      .from("books")
      .select("*")
      .eq("author_id", profile.user_id)
      .eq("slug", bookSlug);
    if (!isOwner) {
      primaryBookQuery = primaryBookQuery.not("published_at", "is", null);
    }

    const { data: primaryBook } = await primaryBookQuery.maybeSingle();

    let bookData = primaryBook;
    if (!bookData && profile.pen_name) {
      let fallbackBookQuery = supabase
        .from("books")
        .select("*")
        .eq("author_name", profile.pen_name)
        .eq("slug", bookSlug);
      if (!isOwner) {
        fallbackBookQuery = fallbackBookQuery.not("published_at", "is", null);
      }
      const { data: fallbackBook } = await fallbackBookQuery.maybeSingle();
      bookData = fallbackBook;
    }

    if (!bookData) { setNotFound(true); setLoading(false); return; }
    setBook(bookData as unknown as Book);

    const bookId = bookData.id;
    const authorIds = [...new Set([profile.user_id, bookData.author_id].filter(Boolean))];

    const [hsRes, cRes, abRes, podRes, otherBooksRes, allBooksRes, coachRes, speakRes] = await Promise.all([
      supabase.from("home_study_courses").select("id, title, price, currency, description, cover_image_url").eq("book_id", bookId).eq("status", "published"),
      supabase.from("courses").select("id, title, price, currency, description, cover_image_url").eq("book_id", bookId).eq("status", "published"),
      supabase.from("audiobooks").select("id, title, price, currency, description").eq("book_id", bookId).eq("status", "published"),
      supabase.from("podcasts").select("id, title, description, cover_image_url").eq("book_id", bookId).eq("status", "published"),
      supabase.from("books").select("id, title, slug, cover_image_url").in("author_id", authorIds).not("published_at", "is", null).neq("id", bookId).limit(4),
      supabase.from("books").select("slug, title, cover_image_url, genre").in("author_id", authorIds).not("published_at", "is", null).order("created_at", { ascending: false }),
      supabase.from("coaching_packages").select("id, title, price, currency, description, type").in("author_id", authorIds).eq("status", "active"),
      supabase.from("speaking_topics").select("id, title, fee, fee_currency, description").in("author_id", authorIds).eq("status", "active"),
    ]);

    const COACHING_TYPE_TO_ROUTE: Record<string, string> = {
      one_on_one: "coaching",
      group: "group_coaching",
      consulting: "consulting",
      mastermind: "mastermind",
      big_ticket: "big_ticket",
      coaching_membership: "coaching_membership",
      webinar: "webinar",
      membership: "membership",
      retreat: "retreat",
      bootcamp: "bootcamp",
      certification: "certification",
      convention: "convention",
    };

    const prods: ProductLink[] = [];
    (hsRes.data || []).forEach((p: any) => prods.push({ type: "homestudy", title: p.title, route: "homestudy", price: p.price ? `$${p.price}` : undefined, description: parseProductDescription(p.description), coverImageUrl: p.cover_image_url }));
    (cRes.data || []).forEach((p: any) => prods.push({ type: "onlinecourse", title: p.title, route: "onlinecourse", price: p.price ? `$${p.price}` : undefined, description: parseProductDescription(p.description), coverImageUrl: p.cover_image_url }));
    (abRes.data || []).forEach((p: any) => prods.push({ type: "audiobook", title: p.title, route: "audiobook", price: p.price ? `$${p.price}` : undefined, description: parseProductDescription(p.description) }));
    (podRes.data || []).forEach((p: any) => prods.push({ type: "podcast", title: p.title, route: "podcast", description: parseProductDescription(p.description), coverImageUrl: p.cover_image_url }));
    (coachRes.data || []).forEach((p: any) => {
      const route = COACHING_TYPE_TO_ROUTE[p.type] || "coaching";
      prods.push({ type: route, title: p.title, route, price: p.price ? `$${p.price}` : undefined, description: parseProductDescription(p.description) });
    });
    (speakRes.data || []).forEach((p: any) => prods.push({ type: "speaking", title: p.title, route: "speaking", price: p.fee ? `$${p.fee}` : undefined, description: parseProductDescription(p.description) }));

    setProducts(prods);
    setOtherBooks((otherBooksRes.data || []) as OtherBook[]);
    setAllAuthorBooks((allBooksRes.data || []) as any[]);
    setCoachingServices(coachRes.data || []);
    setLoading(false);
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !name.trim() || !book || !authorProfile) return;
    setSubscribing(true);

    await supabase.functions.invoke("crm-auto-capture", {
      body: {
        email: email.trim(),
        name: name.trim(),
        source: "subscribe_form",
        source_detail: `book_page: ${authorSlug}/${bookSlug}${subMessage.trim() ? ` | Message: ${subMessage.trim().slice(0, 200)}` : ""}`,
        author_id: authorProfile.user_id,
        message: subMessage.trim() || undefined,
      },
    });

    const { error } = await supabase.from("author_subscribers").upsert({
      author_id: authorProfile.user_id,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      source: "book_page",
      source_detail: `${authorSlug}/${bookSlug}`,
      status: "active",
    }, { onConflict: "author_id,email" });
    setSubscribing(false);
    if (error) {
      toast({ title: "Error", description: "Could not subscribe. Try again.", variant: "destructive" });
    } else {
      setSubscribed(true);
      toast({ title: "You're subscribed!", description: "Check your inbox for updates." });
      setEmail("");
      setName("");
      setSubMessage("");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !book || !v || !theme) return <NotFound />;

  const badgeList = Array.isArray(book.badges) ? book.badges : [];
  const isAmazonLink = book.amazon_url?.includes("amazon.com") || book.amazon_url?.includes("a.co");
  const authorBio = (book.author_bio || authorProfile?.bio_short || "").replace(/<[^>]+>/g, "");
  const authorPhoto = book.author_photo_url || authorProfile?.photo_url || "";

  const priceFormats = [
    book.kindle_price ? { label: "Kindle", value: book.kindle_price } : null,
    book.paperback_price ? { label: "Paperback", value: book.paperback_price } : null,
    book.price ? { label: book.kindle_price || book.paperback_price ? "Hardcover" : "Price", value: book.price } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const lowestPrice = priceFormats.length > 0
    ? priceFormats.reduce((min, pf) => {
        const val = parseFloat(pf.value.replace(/[^0-9.]/g, ""));
        const minVal = parseFloat(min.value.replace(/[^0-9.]/g, ""));
        return !isNaN(val) && val < minVal ? pf : min;
      }, priceFormats[0])
    : null;

  // Build product tabs for BookProductNav
  const productTabs = products.map((p) => {
    const meta = getProductTabMeta(p.type);
    return { label: meta.label, icon: meta.icon, route: p.route };
  });

  // Go Deeper section copy
  const goDeeperCopy = getGoDeeperCopy(
    products.map((p) => ({ type: p.type })),
    book.title,
    authorFirstName
  );

  return (
    <AuthorPageLayout theme={theme} breadcrumbs={[
      { label: "Home", to: "/" },
      { label: authorName || "Author", to: `/${authorSlug}` },
      { label: book.title },
    ]}>

      {/* Author-branded nav */}
      <AuthorBrandedNav
        authorSlug={authorSlug!}
        authorName={authorName}
        authorPhotoUrl={authorProfile?.photo_url}
        books={allAuthorBooks}
        hasServices={coachingServices.length > 0}
        vars={v}
        headingFont={theme.headingFont}
        bodyFont={theme.bodyFont}
        onContactClick={() => setContactOpen(true)}
      />

      <AuthorContactModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        authorName={authorName}
        authorId={book.author_id}
        vars={{ ...v, bodyText: v.bodyText || "#4A4A4A" }}
        headingFont={theme.headingFont}
        bodyFont={theme.bodyFont}
      />

      {/* Book-level product nav */}
      {products.length > 0 && (
        <BookProductNav
          authorSlug={authorSlug!}
          bookSlug={bookSlug!}
          products={productTabs}
          vars={v}
          bodyFont={theme.bodyFont}
        />
      )}

      {/* ===== SECTION 1: HERO ===== */}
      <section
        id="book-hero"
        className="relative overflow-hidden"
        style={{
          background: v.primary,
          backgroundImage: `radial-gradient(ellipse at 30% 50%, ${v.accent}0D 0%, transparent 70%)`,
        }}
      >
        <div className="relative container max-w-5xl py-12 md:py-20">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-14">
            {/* LEFT: Book Cover */}
            <motion.div
              initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
              className="w-56 md:w-64 shrink-0"
            >
              <div className="relative" style={{ perspective: "800px" }}>
                {book.cover_image_url ? (
                  <img
                    src={book.cover_image_url}
                    alt={book.title}
                    className="w-full rounded-lg"
                    style={{
                      transform: "rotateY(-5deg)",
                      boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                      border: `1px solid ${v.accent}4D`,
                    }}
                  />
                ) : (
                  <div
                    className="w-full aspect-[2/3] rounded-lg flex flex-col items-center justify-center p-4"
                    style={{
                      background: `linear-gradient(135deg, ${v.primary}, ${v.accent})`,
                      transform: "rotateY(-5deg)",
                      boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                    }}
                  >
                    <BookOpen className="h-16 w-16 mb-3" style={{ color: "rgba(255,255,255,0.4)" }} />
                    <span className="text-center font-semibold text-sm" style={{ color: v.primaryText, fontFamily: theme.headingFont }}>
                      {book.title}
                    </span>
                  </div>
                )}
                {badgeList.length > 0 && (
                  <div
                    className="absolute -top-2 -right-2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg z-10"
                    style={{ background: v.accent, color: v.accentText }}
                  >
                    ⭐ {badgeList[0]}
                  </div>
                )}
              </div>
            </motion.div>

            {/* RIGHT: Book Info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3" style={{ color: v.primaryText, fontFamily: theme.headingFont }}>
                {book.title}
              </h1>

              {book.subtitle && (
                <p className="text-lg mb-3" style={{ color: `${v.primaryText}D9` }}>{book.subtitle}</p>
              )}

              <p className="mb-4" style={{ color: `${v.primaryText}D9` }}>
                by <Link to={`/${authorSlug}`} className="font-semibold hover:underline" style={{ color: v.accent }}>{authorName}</Link>
              </p>

              {/* Badge Row */}
              {(badgeList.length > 0 || book.rating) && (
                <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
                  {badgeList.map((badge) => (
                    <span
                      key={badge}
                      className="px-3 py-1 text-xs font-bold rounded-full"
                      style={{ background: v.accent, color: v.accentText }}
                    >
                      ⭐ {badge}
                    </span>
                  ))}
                  {book.rating && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1"
                      style={{ background: `${v.accent}26`, color: v.accent }}
                    >
                      <Star className="h-3 w-3 fill-current" style={{ color: v.accent }} /> {book.rating} out of 5
                    </span>
                  )}
                </div>
              )}

              {/* Quick Stats */}
              {(book.pages || book.genre) && (
                <div className="flex flex-wrap gap-4 mb-5 justify-center md:justify-start text-sm" style={{ color: `${v.primaryText}D9` }}>
                  {book.pages && <span>Pages: {book.pages}</span>}
                  {book.genre && <span>Genre: {book.genre}</span>}
                </div>
              )}

              {/* Price Display */}
              {priceFormats.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-6 justify-center md:justify-start">
                  {priceFormats.map((pf) => (
                    <div key={pf.label} className="text-center px-4 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <span className="block text-[10px] uppercase tracking-wider" style={{ color: `${v.primaryText}D9` }}>{pf.label}</span>
                      <span className="text-xl font-bold" style={{ color: v.primaryText, fontFamily: theme.headingFont }}>{pf.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                {book.amazon_url && (
                  <a
                    href={book.amazon_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-bold rounded-lg transition-all hover:scale-105"
                    style={{
                      background: v.accent,
                      color: v.accentText,
                      padding: "14px 32px",
                      borderRadius: "8px",
                      boxShadow: `0 4px 12px ${v.accent}4D`,
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {isAmazonLink ? "Buy on Amazon" : "Get Your Copy"}
                  </a>
                )}
                <button
                  onClick={() => document.getElementById("book-subscribe")?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center gap-2 font-bold rounded-lg transition-all"
                  style={{
                    background: "transparent",
                    border: `2px solid ${v.accent}`,
                    color: v.accent,
                    padding: "12px 32px",
                    borderRadius: "8px",
                  }}
                >
                  <Mail className="h-4 w-4" /> Get Updates
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 2: ABOUT THIS BOOK ===== */}
      {book.description && (
        <section className="py-14 md:py-20" style={{ background: v.cardBg }}>
          <div className="container max-w-3xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
                About This Book
              </h2>
              <div className="text-base space-y-4" style={{ color: v.bodyText, lineHeight: 1.7 }}>
                {book.description.split(/\n\n+/).filter(Boolean).map((paragraph, i) => {
                  const lines = paragraph.split(/\n/).filter(Boolean);
                  const isBulletList = lines.every(line => /^\s*[-*•]\s+/.test(line));
                  if (isBulletList) {
                    return (
                      <ul key={i} className="list-disc pl-5 space-y-1.5">
                        {lines.map((line, j) => (
                          <li key={j}>{line.replace(/^\s*[-*•]\s+/, "")}</li>
                        ))}
                      </ul>
                    );
                  }
                  const parts = paragraph.split(/\n/);
                  if (parts.length > 1) {
                    return (
                      <div key={i}>
                        {parts.map((part, j) => {
                          if (/^\s*[-*•]\s+/.test(part)) {
                            return <li key={j} className="list-disc ml-5">{part.replace(/^\s*[-*•]\s+/, "")}</li>;
                          }
                          return <p key={j} className={j > 0 ? "mt-2" : ""}>{part}</p>;
                        })}
                      </div>
                    );
                  }
                  return <p key={i}>{paragraph}</p>;
                })}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== SECTION 3: BESTSELLER PROOF ===== */}
      {book.bestseller_proof_url && (
        <section className="py-14 md:py-20" style={{ background: v.secondaryBg }}>
          <div className="container max-w-3xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="text-xl md:text-2xl font-bold mb-6" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
                <Star className="inline h-5 w-5 mr-2" style={{ color: v.accent }} />
                Amazon Bestseller Proof
              </h2>
              <div
                className="rounded-xl overflow-hidden shadow-lg"
                style={{ background: "#1E293B", borderRadius: "12px" }}
              >
                <div className="flex items-center gap-1.5 px-4 py-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: "#ef4444" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "#eab308" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "#22c55e" }} />
                  <div className="ml-3 flex-1 flex justify-center">
                    <span className="text-xs px-4 py-1 rounded-md" style={{ background: "#F1F1F1", color: "#666666" }}>
                      amazon.com
                    </span>
                  </div>
                </div>
                <img
                  src={book.bestseller_proof_url}
                  alt={`${book.title} bestseller proof`}
                  loading="lazy"
                  className="w-full"
                  style={{ maxHeight: "400px", objectFit: "contain" }}
                />
              </div>
              <p className="text-sm text-center mt-4 italic" style={{ color: v.bodyText }}>
                {book.title} reached #1 on Amazon Best Sellers
              </p>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== SECTION 4: GO DEEPER — Products Showcase ===== */}
      {products.length > 0 && (
        <section className="py-16 md:py-20" style={{ background: v.secondaryBg }}>
          <div className="container max-w-5xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="text-2xl md:text-[2rem] font-bold mb-2" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
                {goDeeperCopy.heading}
              </h2>
              <p className="text-base mb-10" style={{ color: v.mutedText }}>
                {goDeeperCopy.subheading}
              </p>
            </motion.div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p, i) => {
                const PIcon = PRODUCT_ICONS[p.type] || BookOpen;
                const label = PRODUCT_LABELS[p.type] || p.type;
                const ctaText = getProductCardCTAText(p.type);
                return (
                  <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}>
                    <Link
                      to={`/${authorSlug}/${bookSlug}/${p.route}`}
                      className="group flex flex-col h-full overflow-hidden rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg"
                      style={{
                        background: v.cardBg,
                        border: `1px solid ${v.cardBorder}`,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                      }}
                    >
                      {/* Product image — book cover + product icon overlay */}
                      <div
                        className="h-48 relative overflow-hidden"
                      >
                        {/* Background: book cover or product cover or gradient fallback */}
                        {(p.coverImageUrl || book.cover_image_url) ? (
                          <img
                            src={p.coverImageUrl || book.cover_image_url!}
                            alt={p.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div
                            className="w-full h-full"
                            style={{ background: `linear-gradient(135deg, ${v.primary}, ${v.accent}40)` }}
                          />
                        )}
                        {/* Dark overlay for readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        {/* Product type icon circle */}
                        <div
                          className="absolute top-3 left-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                          style={{ background: v.accent, color: v.accentText }}
                        >
                          <PIcon className="h-5 w-5" />
                        </div>
                        {/* Type badge */}
                        <span
                          className="absolute bottom-3 right-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm backdrop-blur-sm"
                          style={{ background: `${v.accent}dd`, color: v.accentText }}
                        >
                          {label}
                        </span>
                      </div>

                      <div className="p-5 flex flex-col flex-1">
                        <h3 className="font-bold text-base mb-1.5 group-hover:underline line-clamp-2" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
                          {p.title}
                        </h3>

                        {p.description && (
                          <p className="text-xs leading-relaxed line-clamp-3 mb-4 flex-1" style={{ color: v.bodyText }}>
                            {p.description}
                          </p>
                        )}
                        {!p.description && <div className="flex-1" />}

                        <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: `1px solid ${v.cardBorder}` }}>
                          {p.price ? (
                            <span className="font-bold text-lg" style={{ color: v.accent }}>{p.price}</span>
                          ) : (
                            <span className="font-bold text-sm" style={{ color: v.accent }}>Free</span>
                          )}
                          <span
                            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md transition-all group-hover:brightness-110"
                            style={{ background: v.accent, color: v.accentText }}
                          >
                            {ctaText}
                          </span>
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

      {/* ===== SECTION 5: ABOUT THE AUTHOR ===== */}
      {(authorBio || authorPhoto) && (
        <section className="py-14 md:py-20" style={{ background: v.cardBg }}>
          <div className="container max-w-3xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="text-xl md:text-2xl font-bold mb-6" style={{ color: v.headingText, fontFamily: theme.headingFont }}>About the Author</h2>
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {authorPhoto ? (
                  <img
                    src={authorPhoto}
                    alt={authorName}
                    loading="lazy"
                    className="w-20 h-20 rounded-full object-cover shrink-0"
                    style={{ border: `3px solid ${v.accent}` }}
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full shrink-0 flex items-center justify-center"
                    style={{ background: v.accent }}
                  >
                    <span className="text-2xl font-bold" style={{ color: v.accentText }}>
                      {authorName.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1" style={{ color: v.headingText, fontFamily: theme.headingFont }}>{authorName}</h3>
                  {authorProfile?.tagline && (
                    <p className="text-sm mb-3" style={{ color: v.mutedText }}>{authorProfile.tagline}</p>
                  )}
                  {authorBio && (
                    <p className="text-sm leading-relaxed mb-4" style={{ color: v.bodyText, lineHeight: 1.7 }}>
                      {authorBio.length > 200 ? authorBio.slice(0, 200) + "..." : authorBio}
                    </p>
                  )}
                  <Link
                    to={`/${authorSlug}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold transition-colors hover:underline"
                    style={{ color: v.accent }}
                  >
                    View Full Profile <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== SECTION 6: MORE BOOKS BY AUTHOR ===== */}
      {otherBooks.length > 0 && (
        <section className="py-14 md:py-20" style={{ background: v.secondaryBg }}>
          <div className="container max-w-3xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="text-xl md:text-2xl font-bold mb-6" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
                {otherBooks.length === 1 ? "Also by" : "More Books by"} {authorName}
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
                        loading="lazy"
                        className="w-24 h-36 rounded-md object-cover shadow-md group-hover:shadow-lg transition-shadow"
                      />
                    ) : (
                      <div
                        className="w-24 h-36 rounded-md flex flex-col items-center justify-center p-2"
                        style={{ background: `linear-gradient(135deg, ${v.primary}, ${v.accent})` }}
                      >
                        <BookOpen className="h-6 w-6 mb-1" style={{ color: "rgba(255,255,255,0.5)" }} />
                        <span className="text-[10px] text-center leading-tight" style={{ color: v.primaryText }}>{ob.title}</span>
                      </div>
                    )}
                    <p className="text-xs mt-1.5 text-center max-w-[96px] truncate" style={{ color: v.bodyText }}>{ob.title}</p>
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== SECTION 7: LEAD CAPTURE ===== */}
      <section id="book-subscribe" className="relative py-14 md:py-20" style={{ background: v.primary }}>
        <div className="container max-w-xl text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            {subscribed ? (
              <div className="py-6">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4" style={{ color: v.accent }} />
                <h3 className="text-xl font-bold mb-2" style={{ color: v.primaryText, fontFamily: theme.headingFont }}>You're subscribed!</h3>
                <p className="text-sm" style={{ color: `${v.primaryText}BF` }}>You'll receive updates about {book.title}.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-8 text-left">
                {/* Left: Lead Capture (shared) */}
                <div>
                  <LeadCaptureForm
                    authorUserId={authorProfile.user_id}
                    displayName={authorFirstName}
                    source="author_book"
                    sourceDetail={`${authorSlug}/${book.slug}`}
                    headline={`Stay Connected with ${authorFirstName}`}
                    description="Get exclusive updates, bonus content, and early access to new resources."
                    accent={v.accent}
                    accentText={v.accentText}
                    primaryText={v.primaryText}
                  />
                </div>

                {/* Right: CTA Repeat */}
                <div className="flex flex-col justify-center items-center md:items-start">
                  <h2 className="text-xl font-bold mb-3" style={{ color: v.primaryText, fontFamily: theme.headingFont }}>
                    Ready to Get Started?
                  </h2>
                  <p className="text-lg font-bold mb-2" style={{ color: v.primaryText }}>{book.title}</p>
                  {lowestPrice && (
                    <p className="text-sm mb-4" style={{ color: `${v.primaryText}BF` }}>From {lowestPrice.value}</p>
                  )}
                  {book.amazon_url && (
                    <a
                      href={book.amazon_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 font-bold rounded-lg transition-all hover:scale-105"
                      style={{
                        background: v.accent,
                        color: v.accentText,
                        padding: "14px 32px",
                        borderRadius: "8px",
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                      {isAmazonLink ? "Buy on Amazon" : "Get Your Copy"}
                    </a>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ===== STICKY MOBILE CTA ===== */}
      {book.amazon_url && !heroVisible && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden py-3 px-4 flex items-center justify-between"
          style={{
            background: v.primary,
            boxShadow: "0 -4px 12px rgba(0,0,0,0.15)",
          }}
        >
          <div>
            {lowestPrice && (
              <div>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: `${v.primaryText}D9` }}>From</span>
                <span className="block text-lg font-bold" style={{ color: v.primaryText }}>{lowestPrice.value}</span>
              </div>
            )}
          </div>
          <a
            href={book.amazon_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-sm rounded-lg px-5 py-2.5"
            style={{ background: v.accent, color: v.accentText }}
          >
            {isAmazonLink ? "Buy on Amazon" : "Get Your Copy"}
          </a>
        </div>
      )}

      {book.amazon_url && !heroVisible && <div className="h-16 md:hidden" />}
    </AuthorPageLayout>
  );
}
