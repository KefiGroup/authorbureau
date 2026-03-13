import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Clock, BookOpen, GraduationCap, Users,
  Headphones, Mic, Loader2, Star, Mail, CheckCircle2, Check,
  Briefcase, Brain, Target, Mountain, Award, Presentation,
  KeyRound, Video, Sparkles, Ticket
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { toast } from "@/hooks/use-toast";
import { getThemeById, type AuthorTheme } from "@/lib/author-themes";
import { getProductCTAText, getProductTagline, getWhatsIncludedHeading, getAutoPersonas, getProductCardCTAText } from "@/lib/product-copy";
import AuthorPageLayout from "@/components/public/AuthorPageLayout";
import AuthorBrandedNav from "@/components/public/AuthorBrandedNav";
import AuthorContactModal from "@/components/public/AuthorContactModal";
import BookProductNav, { getProductTabMeta } from "@/components/public/BookProductNav";
import NotFound from "./NotFound";

type ProductType =
  | "homestudy" | "onlinecourse" | "workbook" | "coaching" | "audiobook" | "podcast" | "book"
  | "group_coaching" | "consulting" | "mastermind" | "speaking" | "keynote" | "training"
  | "webinar" | "membership" | "retreat" | "bootcamp" | "certification" | "convention"
  | "special_edition" | "big_ticket" | "coaching_membership";

const PRODUCT_CONFIG: Record<ProductType, { table: string; label: string; icon: any; statusField: string; statusValue: string; typeFilter?: string }> = {
  homestudy: { table: "home_study_courses", label: "Home Study Course", icon: BookOpen, statusField: "status", statusValue: "published" },
  onlinecourse: { table: "courses", label: "Online Course", icon: GraduationCap, statusField: "status", statusValue: "published" },
  workbook: { table: "home_study_courses", label: "Workbook", icon: BookOpen, statusField: "status", statusValue: "published" },
  coaching: { table: "coaching_packages", label: "1-on-1 Coaching", icon: Target, statusField: "status", statusValue: "active", typeFilter: "one_on_one" },
  group_coaching: { table: "coaching_packages", label: "Group Coaching", icon: Users, statusField: "status", statusValue: "active", typeFilter: "group" },
  consulting: { table: "coaching_packages", label: "Consulting", icon: Briefcase, statusField: "status", statusValue: "active", typeFilter: "consulting" },
  mastermind: { table: "coaching_packages", label: "Mastermind", icon: Brain, statusField: "status", statusValue: "active", typeFilter: "mastermind" },
  big_ticket: { table: "coaching_packages", label: "Big Ticket", icon: Sparkles, statusField: "status", statusValue: "active", typeFilter: "big_ticket" },
  coaching_membership: { table: "coaching_packages", label: "Coaching Membership", icon: KeyRound, statusField: "status", statusValue: "active", typeFilter: "coaching_membership" },
  speaking: { table: "speaking_topics", label: "Speaking", icon: Presentation, statusField: "status", statusValue: "active" },
  keynote: { table: "speaking_topics", label: "Keynote", icon: Presentation, statusField: "status", statusValue: "active" },
  training: { table: "speaking_topics", label: "Corporate Training", icon: Presentation, statusField: "status", statusValue: "active" },
  audiobook: { table: "audiobooks", label: "Audiobook", icon: Headphones, statusField: "status", statusValue: "published" },
  podcast: { table: "podcasts", label: "Podcast", icon: Mic, statusField: "status", statusValue: "published" },
  webinar: { table: "coaching_packages", label: "Webinar", icon: Video, statusField: "status", statusValue: "active", typeFilter: "webinar" },
  membership: { table: "coaching_packages", label: "Membership", icon: KeyRound, statusField: "status", statusValue: "active", typeFilter: "membership" },
  retreat: { table: "coaching_packages", label: "Retreat", icon: Mountain, statusField: "status", statusValue: "active", typeFilter: "retreat" },
  bootcamp: { table: "coaching_packages", label: "Bootcamp", icon: Mountain, statusField: "status", statusValue: "active", typeFilter: "bootcamp" },
  certification: { table: "coaching_packages", label: "Certification", icon: Award, statusField: "status", statusValue: "active", typeFilter: "certification" },
  convention: { table: "coaching_packages", label: "Convention", icon: Ticket, statusField: "status", statusValue: "active", typeFilter: "convention" },
  special_edition: { table: "books", label: "Special Edition", icon: Sparkles, statusField: "published_at", statusValue: "not_null" },
  book: { table: "books", label: "Book", icon: BookOpen, statusField: "published_at", statusValue: "not_null" },
};

const PRODUCT_ROUTE_MAP: Record<string, string> = {
  home_study_courses: "homestudy",
  courses: "onlinecourse",
  audiobooks: "audiobook",
  podcasts: "podcast",
};

// Map coaching_packages.type to product route
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

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

function parseChecklistItems(description: string | null | undefined): string[] {
  if (!description) return [];
  const items = description
    .split(/[.\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 15 && s.length < 200);
  return items.slice(0, 8);
}

export default function AuthorProductPage() {
  const { authorSlug, bookSlug, productType } = useParams<{ authorSlug: string; bookSlug: string; productType: string }>();
  const [author, setAuthor] = useState<any>(null);
  const [book, setBook] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [allAuthorBooks, setAllAuthorBooks] = useState<any[]>([]);
  const [allBookProducts, setAllBookProducts] = useState<{ label: string; icon: string; route: string }[]>([]);
  const [coachingServices, setCoachingServices] = useState<any[]>([]);
  const [theme, setTheme] = useState<AuthorTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [subMessage, setSubMessage] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const pType = productType as ProductType;
  const config = PRODUCT_CONFIG[pType];

  const displayName = author?.pen_name || "Author";
  const authorFirstName = displayName.split(" ")[0];
  const bookTitle = book?.title || "Book";

  const productDescFirstSentence = product?.description ? (product.description.split(/[.!?]\s/)[0] + ".") : "";
  const seoDesc = product
    ? `${product.title} by ${displayName}. ${productDescFirstSentence} ${config?.label || "Product"} based on the book ${bookTitle}.`
    : "";

  useDocumentMeta({
    title: product?.title ? `${product.title} - ${config?.label || "Product"} by ${displayName} | Authors Bureau` : "Product | Authors Bureau",
    description: seoDesc,
    ogTitle: product?.title ? `${product.title} - ${config?.label || "Product"} by ${displayName} | Authors Bureau` : undefined,
    ogDescription: seoDesc,
    ogImage: product?.cover_image_url || book?.cover_image_url || author?.photo_url || undefined,
    ogUrl: `https://authorsbureau.com/${authorSlug}/${bookSlug}/${productType}`,
    ogType: "product",
    ogSiteName: "Authors Bureau",
    canonical: `https://authorsbureau.com/${authorSlug}/${bookSlug}/${productType}`,
    twitterCard: "summary_large_image",
    jsonLd: product
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.title,
          description: product.description || "",
          offers: product.price != null && product.price > 0
            ? { "@type": "Offer", price: String(product.price), priceCurrency: product.currency || "USD" }
            : undefined,
          image: product.cover_image_url || book?.cover_image_url || undefined,
          brand: { "@type": "Brand", name: displayName },
        }
      : undefined,
  });

  useEffect(() => {
    if (!authorSlug || !bookSlug || !config) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    loadProduct();
  }, [authorSlug, bookSlug, productType]);

  async function loadProduct() {
    setLoading(true);

    let profile: any = null;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
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
    setAuthor(profile);
    setTheme(getThemeById(profile.site_theme || "classic-elegant"));

    const [bookRes, allBooksRes, coachRes] = await Promise.all([
      supabase.from("books").select("id, title, slug, cover_image_url, author_name, description, genre").eq("author_id", profile.user_id).eq("slug", bookSlug).maybeSingle(),
      supabase.from("books").select("slug, title, cover_image_url, genre").eq("author_id", profile.user_id).not("published_at", "is", null).order("created_at", { ascending: false }),
      supabase.from("coaching_packages").select("id, title").eq("author_id", profile.user_id).eq("status", "active"),
    ]);

    if (!bookRes.data) { setNotFound(true); setLoading(false); return; }
    setBook(bookRes.data);
    setAllAuthorBooks(allBooksRes.data || []);
    setCoachingServices(coachRes.data || []);

    const bookId = bookRes.data.id;

    let query = supabase.from(config.table as any).select("*").eq("author_id", profile.user_id);
    // Only filter by book_id for book-linked tables (not coaching or speaking)
    const noBookIdTables = ["coaching_packages", "speaking_topics"];
    if (!noBookIdTables.includes(config.table)) {
      query = query.eq("book_id", bookId);
    }
    if (config.statusField === "published_at") {
      query = query.not("published_at", "is", null);
    } else {
      query = query.eq(config.statusField, config.statusValue);
    }
    // Apply type filter for coaching subtypes
    if ((config as any).typeFilter && config.table === "coaching_packages") {
      query = query.eq("type", (config as any).typeFilter);
    }
    const { data: productData } = await query.limit(1).maybeSingle();

    if (!productData) { setNotFound(true); setLoading(false); return; }
    setProduct(productData);

    // Load all sibling products for BookProductNav + related products
    const tables = [
      { table: "home_study_courses", status: "published", fields: "id, title, price, currency, description, cover_image_url", byBook: true },
      { table: "courses", status: "published", fields: "id, title, price, currency, description, cover_image_url", byBook: true },
      { table: "audiobooks", status: "published", fields: "id, title, price, currency, description", byBook: true },
      { table: "podcasts", status: "published", fields: "id, title, description", byBook: true },
      { table: "coaching_packages", status: "active", fields: "id, title, price, currency, description, type", byBook: false },
      { table: "speaking_topics", status: "active", fields: "id, title, fee, fee_currency, description", byBook: false },
    ];
    const results = await Promise.all(
      tables.map(t => {
        let q = supabase.from(t.table as any).select(t.fields).eq("author_id", profile.user_id).eq("status", t.status);
        if (t.byBook) q = q.eq("book_id", bookId);
        return q;
      })
    );

    const relProds: any[] = [];
    const navTabs: { label: string; icon: string; route: string }[] = [];
    results.forEach((res, i) => {
      (res.data || []).forEach((p: any) => {
        let route = "";
        if (tables[i].table === "coaching_packages") {
          route = COACHING_TYPE_TO_ROUTE[p.type] || "coaching";
        } else if (tables[i].table === "speaking_topics") {
          route = "speaking";
        } else {
          route = PRODUCT_ROUTE_MAP[tables[i].table] || "";
        }
        const meta = getProductTabMeta(route);
        navTabs.push({ label: meta.label, icon: meta.icon, route });
        if (route !== pType) {
          relProds.push({ ...p, route, type: route, price: p.price || p.fee });
        }
      });
    });

    setAllBookProducts(navTabs);
    setRelatedProducts(relProds.slice(0, 3));
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
      source: "product_page",
      source_detail: `${authorSlug}/${bookSlug}/${productType}`,
    });
    setSubscribing(false);
    if (error?.code === "23505") {
      toast({ title: "You're already subscribed!", description: "You're already on the list." });
      setSubscribed(true);
    } else if (error) {
      toast({ title: "Error", description: "Could not subscribe. Try again.", variant: "destructive" });
    } else {
      setSubscribed(true);
      toast({ title: "Subscribed!", description: "You'll receive updates soon." });
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

  if (notFound || !product || !author || !config || !theme) return <NotFound />;

  const v = theme.vars;
  const Icon = config.icon;
  const authorBio = author.bio_short || "";
  const productImage = product.cover_image_url || book?.cover_image_url || null;
  const checklistItems = parseChecklistItems(product.description);
  const tagline = getProductTagline(pType, bookTitle, authorFirstName);
  const whatsIncludedHeading = getWhatsIncludedHeading(pType);
  const personas = getAutoPersonas(book?.genre || null, pType, bookTitle);
  const ctaText = getProductCTAText(pType, authorFirstName);
  const bookDescShort = book?.description ? book.description.split(/[.!?]\s/).slice(0, 2).join(". ") + "." : "";

  return (
    <AuthorPageLayout theme={theme} breadcrumbs={[
      { label: "Home", to: "/" },
      { label: displayName || "Author", to: `/${authorSlug}` },
      { label: bookTitle || "Book", to: `/${authorSlug}/${bookSlug}` },
      { label: product.title },
    ]}>

      {/* Author-branded nav */}
      <AuthorBrandedNav
        authorSlug={authorSlug!}
        authorName={displayName}
        authorPhotoUrl={author.photo_url}
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
        authorName={displayName}
        authorId={author.user_id}
        vars={{ ...v, bodyText: v.bodyText || "#4A4A4A" }}
        headingFont={theme.headingFont}
        bodyFont={theme.bodyFont}
      />

      {/* Book-level product nav */}
      {allBookProducts.length > 0 && (
        <BookProductNav
          authorSlug={authorSlug!}
          bookSlug={bookSlug!}
          products={allBookProducts}
          vars={v}
          bodyFont={theme.bodyFont}
        />
      )}

      {/* ===== SECTION 1: HERO ===== */}
      <section
        className="relative overflow-hidden"
        style={{ background: v.primary }}
      >
        <div className="relative container max-w-5xl py-12 md:py-20">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-14">
            {/* LEFT: Product Image */}
            <motion.div
              initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
              className="w-full md:w-[40%] shrink-0 flex justify-center"
            >
              {productImage ? (
                <img
                  src={productImage}
                  alt={product.title}
                  className="w-56 md:w-full max-w-xs rounded-lg"
                  style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
                />
              ) : (
                <div
                  className="w-56 md:w-full max-w-xs aspect-[3/4] rounded-lg flex flex-col items-center justify-center gap-4"
                  style={{ background: `linear-gradient(135deg, ${v.primary}, ${v.accent})` }}
                >
                  <Icon className="h-16 w-16" style={{ color: `${v.primaryText}66` }} />
                  <span className="text-lg font-bold text-center px-4" style={{ color: `${v.primaryText}99`, fontFamily: theme.headingFont }}>
                    {product.title}
                  </span>
                </div>
              )}
            </motion.div>

            {/* RIGHT: Product Details */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex-1 text-center md:text-left">
              {/* Product type badge */}
              <span
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide mb-4"
                style={{ background: v.accent, color: v.accentText }}
              >
                <Icon className="h-3.5 w-3.5" />
                {config.label}
              </span>

              <h1 className="text-3xl md:text-[2.5rem] leading-tight font-bold mb-4" style={{ color: v.primaryText, fontFamily: theme.headingFont }}>
                {product.title}
              </h1>

              {/* Dynamic tagline */}
              <p className="text-lg mb-6 max-w-xl" style={{ color: `${v.primaryText}D9` }}>
                {tagline}
              </p>

              {/* Price */}
              <div className="mb-6">
                {product.price != null && product.price > 0 ? (
                  <span className="text-[2rem] font-bold" style={{ color: v.primaryText, fontFamily: theme.headingFont }}>
                    {(product.currency || "USD") === "USD" ? "$" : product.currency}{product.price}
                  </span>
                ) : (
                  <span className="text-2xl font-bold" style={{ color: v.primaryText, fontFamily: theme.headingFont }}>Free</span>
                )}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start">
                <button
                  className="font-bold text-base px-8 py-3.5 rounded-lg transition-all hover:scale-105 hover:brightness-110"
                  style={{ background: v.accent, color: v.accentText, boxShadow: `0 4px 12px ${v.accent}4D` }}
                >
                  {ctaText}
                </button>
                <button
                  onClick={() => document.getElementById("product-details")?.scrollIntoView({ behavior: "smooth" })}
                  className="font-medium text-base px-6 py-3 rounded-lg transition-all"
                  style={{
                    background: "transparent",
                    border: `2px solid ${v.accent}`,
                    color: v.accent,
                  }}
                >
                  Learn More
                </button>
              </div>

              {/* Trust line */}
              <p className="mt-4 text-xs" style={{ color: `${v.primaryText}99` }}>
                {["coaching", "consulting", "mastermind"].includes(pType) ? "Limited spots available" : "Secure checkout · 30-day money-back guarantee"}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 2: WHAT'S INCLUDED ===== */}
      {checklistItems.length > 0 && (
        <section id="product-details" className="py-16" style={{ background: v.cardBg }}>
          <div className="container max-w-3xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="text-2xl md:text-3xl font-bold mb-8" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
                {whatsIncludedHeading}
              </h2>
              <div className="space-y-4">
                {checklistItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: v.accent }}
                    >
                      <Check className="h-3.5 w-3.5" style={{ color: v.accentText }} />
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: v.bodyText }}>{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== SECTION 3: WHO IS THIS FOR ===== */}
      <section className="py-14" style={{ background: v.secondaryBg }}>
        <div className="container max-w-3xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="text-2xl font-bold mb-2" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
              Is This For You?
            </h2>
            <p className="text-sm mb-8" style={{ color: v.mutedText }}>
              This {config.label.toLowerCase()} is perfect for you if...
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {personas.map((persona, i) => (
                <div
                  key={i}
                  className="p-5 rounded-xl"
                  style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}` }}
                >
                  <Check className="h-5 w-5 mb-3" style={{ color: v.accent }} />
                  <p className="text-sm" style={{ color: v.bodyText }}>{persona}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== SECTION 4: TYPE-SPECIFIC CONTENT ===== */}
      {(product.description || product.study_schedule_json || product.content_markdown || pType === "onlinecourse" || pType === "audiobook" || pType === "podcast") && (
        <section className="py-14" style={{ background: v.cardBg }}>
          <div className="container max-w-4xl space-y-6">
            {product.description && (
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                <div className="p-6 rounded-lg" style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}`, borderRadius: theme.borderRadius }}>
                  <h2 className="text-xl font-bold mb-4" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
                    About This {config.label}
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: v.bodyText }}>{product.description}</p>
                </div>
              </motion.div>
            )}

            {pType === "homestudy" && product.study_schedule_json && Array.isArray(product.study_schedule_json) && (
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
                <div className="p-6 rounded-lg" style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}`, borderRadius: theme.borderRadius }}>
                  <h3 className="font-bold text-lg mb-4" style={{ color: v.headingText, fontFamily: theme.headingFont }}>Study Schedule</h3>
                  <div className="space-y-3">
                    {(product.study_schedule_json as any[]).slice(0, 10).map((day: any, i: number) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <div className="flex-shrink-0 w-16 text-xs font-semibold" style={{ color: v.accent }}>{day.day || `Day ${i + 1}`}</div>
                        <div>
                          <p className="font-medium" style={{ color: v.headingText }}>{day.title || day.topic}</p>
                          {day.description && <p className="text-xs mt-0.5" style={{ color: v.mutedText }}>{day.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {pType === "onlinecourse" && product.id && <CourseModules courseId={product.id} theme={theme} />}

            {pType === "audiobook" && (
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
                <div className="p-6 rounded-lg" style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}`, borderRadius: theme.borderRadius }}>
                  <h3 className="font-bold text-lg mb-4" style={{ color: v.headingText, fontFamily: theme.headingFont }}>Audiobook Details</h3>
                  <div className="space-y-2 text-sm">
                    {product.narrator_credit && (
                      <div className="flex items-center gap-2">
                        <Mic className="h-4 w-4" style={{ color: v.accent }} />
                        <span style={{ color: v.bodyText }}>Narrated by: <strong>{product.narrator_credit}</strong></span>
                      </div>
                    )}
                    {product.duration_minutes && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" style={{ color: v.accent }} />
                        <span style={{ color: v.bodyText }}>{Math.floor(product.duration_minutes / 60)}h {product.duration_minutes % 60}m</span>
                      </div>
                    )}
                    {product.audio_url && (
                      <div className="pt-3">
                        <p className="text-xs font-semibold mb-2" style={{ color: v.mutedText }}>Preview</p>
                        <audio controls className="w-full">
                          <source src={product.audio_url} />
                        </audio>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {pType === "podcast" && product.id && <PodcastEpisodes podcastId={product.id} theme={theme} />}

            {product.content_markdown && (
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}>
                <div className="p-6 rounded-lg" style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}`, borderRadius: theme.borderRadius }}>
                  <h3 className="font-bold text-lg mb-3" style={{ color: v.headingText, fontFamily: theme.headingFont }}>What You'll Learn</h3>
                  <div className="prose prose-sm max-w-none" style={{ color: v.bodyText }}>
                    {product.content_markdown.slice(0, 1000)}
                    {product.content_markdown.length > 1000 && "..."}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* ===== SECTION 5: BASED ON THE BOOK ===== */}
      {book && (
        <section className="py-14" style={{ background: v.secondaryBg }}>
          <div className="container max-w-3xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="text-xl font-bold mb-6" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
                Based on the Book
              </h2>
              <div
                className="flex flex-col sm:flex-row items-start gap-5 p-5 rounded-xl"
                style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}` }}
              >
                {book.cover_image_url ? (
                  <img src={book.cover_image_url} alt={book.title} className="w-[120px] h-auto rounded shadow-md shrink-0" />
                ) : (
                  <div className="w-[120px] h-40 rounded flex items-center justify-center shrink-0" style={{ background: v.secondaryBg }}>
                    <BookOpen className="h-8 w-8" style={{ color: v.mutedText }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg mb-1" style={{ color: v.headingText, fontFamily: theme.headingFont }}>{book.title}</h3>
                  <p className="text-sm mb-3" style={{ color: v.mutedText }}>by {displayName}</p>
                  {bookDescShort && (
                    <p className="text-sm leading-relaxed mb-4" style={{ color: v.bodyText }}>
                      This {config.label.toLowerCase()} is based on {book.title}. {bookDescShort}
                    </p>
                  )}
                  <Link
                    to={`/${authorSlug}/${bookSlug}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                    style={{ color: v.accent }}
                  >
                    Read more about the book <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== SECTION 6: ABOUT THE AUTHOR ===== */}
      {(authorBio || author.photo_url) && (
        <section className="py-14" style={{ background: v.cardBg }}>
          <div className="container max-w-3xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="text-xl font-bold mb-6" style={{ color: v.headingText, fontFamily: theme.headingFont }}>About the Author</h2>
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {author.photo_url ? (
                  <img
                    src={author.photo_url}
                    alt={displayName}
                    className="w-20 h-20 rounded-full object-cover shrink-0"
                    style={{ border: `3px solid ${v.accent}` }}
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full shrink-0 flex items-center justify-center"
                    style={{ background: v.accent }}
                  >
                    <span className="text-2xl font-bold" style={{ color: v.accentText }}>{displayName.charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1" style={{ color: v.headingText, fontFamily: theme.headingFont }}>{displayName}</h3>
                  {author.tagline && (
                    <p className="text-sm mb-3" style={{ color: v.mutedText }}>{author.tagline}</p>
                  )}
                  {authorBio && (
                    <p className="text-sm leading-relaxed mb-4" style={{ color: v.bodyText }}>
                      {authorBio.length > 200 ? authorBio.slice(0, 200) + "..." : authorBio}
                    </p>
                  )}
                  <Link
                    to={`/${authorSlug}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
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

      {/* ===== SECTION 7: MORE FROM THIS BOOK ===== */}
      {relatedProducts.length > 0 && (
        <section className="py-14" style={{ background: v.secondaryBg }}>
          <div className="container max-w-4xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="text-xl md:text-2xl font-bold mb-2" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
                More from {bookTitle}
              </h2>
              <p className="text-sm mb-6" style={{ color: v.mutedText }}>
                Explore other resources {authorFirstName} has created from this book.
              </p>
            </motion.div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProducts.map((rp, i) => {
                const RpIcon = PRODUCT_CONFIG[rp.route as ProductType]?.icon || BookOpen;
                const rpLabel = PRODUCT_CONFIG[rp.route as ProductType]?.label || rp.route;
                const rpCTA = getProductCardCTAText(rp.route);
                return (
                  <motion.div key={rp.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}>
                    <Link
                      to={`/${authorSlug}/${bookSlug}/${rp.route}`}
                      className="group block p-5 transition-all hover:shadow-lg rounded-xl"
                      style={{ border: `1px solid ${v.cardBorder}`, background: v.cardBg }}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: `${v.accent}1A` }}>
                        <RpIcon className="h-5 w-5" style={{ color: v.accent }} />
                      </div>
                      <h4 className="font-semibold text-sm mb-1 group-hover:underline" style={{ color: v.headingText }}>{rp.title}</h4>
                      <p className="text-xs mb-2" style={{ color: v.mutedText }}>{rpLabel}</p>
                      {rp.price != null && rp.price > 0 && (
                        <span className="font-bold text-sm" style={{ color: v.accent }}>${rp.price}</span>
                      )}
                      <div className="mt-3">
                        <span className="text-xs font-bold" style={{ color: v.accent }}>{rpCTA}</span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== SECTION 8: LEAD CAPTURE + CTA REPEAT ===== */}
      <section className="py-14" style={{ background: v.primary }}>
        <div className="container max-w-xl text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            {subscribed ? (
              <div className="py-6">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4" style={{ color: v.accent }} />
                <h3 className="text-xl font-bold mb-2" style={{ color: v.primaryText, fontFamily: theme.headingFont }}>You're subscribed!</h3>
                <p className="text-sm" style={{ color: `${v.primaryText}BF` }}>You'll receive updates soon.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* CTA Repeat */}
                <div>
                  <h2 className="text-xl font-bold mb-3" style={{ color: v.primaryText, fontFamily: theme.headingFont }}>
                    Ready to Get Started?
                  </h2>
                  <p className="text-lg font-bold mb-2" style={{ color: v.primaryText }}>{product.title}</p>
                  {product.price != null && product.price > 0 && (
                    <p className="text-2xl font-bold mb-4" style={{ color: v.accent }}>
                      {(product.currency || "USD") === "USD" ? "$" : product.currency}{product.price}
                    </p>
                  )}
                  <button
                    className="font-bold text-base px-8 py-3.5 rounded-lg transition-all hover:scale-105"
                    style={{ background: v.accent, color: v.accentText }}
                  >
                    {ctaText}
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px" style={{ background: `${v.accent}33` }} />
                  <span className="text-xs" style={{ color: `${v.primaryText}66` }}>or</span>
                  <div className="flex-1 h-px" style={{ background: `${v.accent}33` }} />
                </div>

                {/* Lead Capture */}
                <div>
                  <Mail className="h-8 w-8 mx-auto mb-3" style={{ color: v.accent }} />
                  <h3 className="text-lg font-bold mb-2" style={{ color: v.primaryText, fontFamily: theme.headingFont }}>
                    Stay Connected with {authorFirstName}
                  </h3>
                  <p className="text-sm mb-5" style={{ color: `${v.primaryText}BF` }}>
                    Get exclusive updates, bonus content, and early access to new resources.
                  </p>
                  <form onSubmit={handleSubscribe} className="flex flex-col gap-3 max-w-sm mx-auto">
                    <input
                      type="text"
                      placeholder="First name (optional)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11 text-sm w-full outline-none"
                      style={{
                        borderRadius: "8px",
                        border: `1px solid ${v.accent}4D`,
                        padding: "10px 14px",
                        background: "rgba(255,255,255,0.08)",
                        color: v.primaryText,
                      }}
                    />
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 text-sm w-full outline-none"
                      style={{
                        borderRadius: "8px",
                        border: `1px solid ${v.accent}4D`,
                        padding: "10px 14px",
                        background: "rgba(255,255,255,0.08)",
                        color: v.primaryText,
                      }}
                    />
                    <button
                      type="submit"
                      disabled={subscribing}
                      className="w-full h-11 font-bold text-sm transition-all hover:brightness-110"
                      style={{
                        background: v.accent,
                        color: v.accentText,
                        borderRadius: "8px",
                      }}
                    >
                      {subscribing ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Subscribe"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ===== STICKY MOBILE CTA ===== */}
      {product.price != null && product.price > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden py-3 px-4 flex items-center justify-between shadow-2xl"
          style={{ background: v.primary, borderTop: `1px solid ${v.cardBorder}` }}
        >
          <div>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: `${v.primaryText}80` }}>Price</span>
            <span className="block text-lg font-bold" style={{ color: v.accent }}>
              {(product.currency || "USD") === "USD" ? "$" : product.currency}{product.price}
            </span>
          </div>
          <button
            className="rounded-full font-bold px-5 py-2 text-sm"
            style={{ background: v.accent, color: v.accentText }}
          >
            {ctaText}
          </button>
        </div>
      )}

      {product.price != null && product.price > 0 && <div className="h-16 md:hidden" />}
    </AuthorPageLayout>
  );
}

/* ===== Sub-components ===== */

function CourseModules({ courseId, theme }: { courseId: string; theme: AuthorTheme }) {
  const [modules, setModules] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("course_modules")
      .select("*, course_lessons(*)")
      .eq("course_id", courseId)
      .order("position")
      .then(({ data }) => setModules(data || []));
  }, [courseId]);

  if (modules.length === 0) return null;

  const v = theme.vars;

  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
      <div className="p-6 rounded-lg" style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}`, borderRadius: theme.borderRadius }}>
        <h3 className="font-bold text-lg mb-4" style={{ color: v.headingText, fontFamily: theme.headingFont }}>Course Curriculum</h3>
        <div className="space-y-4">
          {modules.map((mod, i) => (
            <div key={mod.id}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center"
                  style={{ background: v.accent, color: v.accentText }}
                >
                  {i + 1}
                </span>
                <h4 className="font-semibold text-sm" style={{ color: v.headingText }}>{mod.title}</h4>
              </div>
              {mod.description && <p className="text-xs ml-9 mb-1" style={{ color: v.mutedText }}>{mod.description}</p>}
              {mod.course_lessons && mod.course_lessons.length > 0 && (
                <ul className="ml-9 space-y-1">
                  {mod.course_lessons.sort((a: any, b: any) => a.position - b.position).map((lesson: any) => (
                    <li key={lesson.id} className="text-xs flex items-center gap-1.5" style={{ color: v.mutedText }}>
                      <Star className="h-2.5 w-2.5" style={{ color: v.accent }} />
                      {lesson.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function PodcastEpisodes({ podcastId, theme }: { podcastId: string; theme: AuthorTheme }) {
  const [episodes, setEpisodes] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("podcast_episodes")
      .select("id, title, description, episode_number, duration_minutes, audio_url, status")
      .eq("podcast_id", podcastId)
      .eq("status", "published")
      .order("episode_number")
      .then(({ data }) => setEpisodes(data || []));
  }, [podcastId]);

  if (episodes.length === 0) return null;

  const v = theme.vars;

  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
      <div className="p-6 rounded-lg" style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}`, borderRadius: theme.borderRadius }}>
        <h3 className="font-bold text-lg mb-4" style={{ color: v.headingText, fontFamily: theme.headingFont }}>Episodes</h3>
        <div className="space-y-3">
          {episodes.map((ep) => (
            <div key={ep.id} className="flex gap-3 p-3 rounded-lg" style={{ border: `1px solid ${v.cardBorder}` }}>
              <span
                className="flex-shrink-0 w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center"
                style={{ background: v.accent, color: v.accentText }}
              >
                {ep.episode_number}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: v.headingText }}>{ep.title}</p>
                {ep.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: v.mutedText }}>{ep.description}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-[11px]" style={{ color: v.mutedText }}>
                  {ep.duration_minutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {ep.duration_minutes} min
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
