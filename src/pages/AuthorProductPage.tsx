import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Clock, Calendar, BookOpen, GraduationCap, Users,
  Headphones, Mic, Loader2, Star, Play, Mail, CheckCircle2, Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { toast } from "@/hooks/use-toast";
import { getThemeById, type AuthorTheme } from "@/lib/author-themes";
import AuthorPageLayout from "@/components/public/AuthorPageLayout";
import NotFound from "./NotFound";

type ProductType = "homestudy" | "onlinecourse" | "workbook" | "coaching" | "audiobook" | "podcast" | "book";

const PRODUCT_CONFIG: Record<ProductType, { table: string; label: string; icon: any; statusField: string; statusValue: string }> = {
  homestudy: { table: "home_study_courses", label: "Home Study Course", icon: BookOpen, statusField: "status", statusValue: "published" },
  onlinecourse: { table: "courses", label: "Online Course", icon: GraduationCap, statusField: "status", statusValue: "published" },
  workbook: { table: "home_study_courses", label: "Workbook", icon: BookOpen, statusField: "status", statusValue: "published" },
  coaching: { table: "coaching_packages", label: "Coaching", icon: Users, statusField: "status", statusValue: "active" },
  audiobook: { table: "audiobooks", label: "Audiobook", icon: Headphones, statusField: "status", statusValue: "published" },
  podcast: { table: "podcasts", label: "Podcast", icon: Mic, statusField: "status", statusValue: "published" },
  book: { table: "books", label: "Book", icon: BookOpen, statusField: "published_at", statusValue: "not_null" },
};

const PRODUCT_ROUTE_MAP: Record<string, string> = {
  home_study_courses: "homestudy",
  courses: "onlinecourse",
  coaching_packages: "coaching",
  audiobooks: "audiobook",
  podcasts: "podcast",
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
  const [theme, setTheme] = useState<AuthorTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const pType = productType as ProductType;
  const config = PRODUCT_CONFIG[pType];

  const displayName = author?.pen_name || "Author";
  const bookTitle = book?.title || "Book";

  useDocumentMeta({
    title: product?.title ? `${product.title} by ${displayName} | Authors Bureau` : "Product | Authors Bureau",
    description: product?.description || "",
    ogTitle: product?.title ? `${product.title} - ${displayName}` : undefined,
    ogDescription: product?.description?.slice(0, 150) || undefined,
    ogImage: product?.cover_image_url || book?.cover_image_url || author?.photo_url || undefined,
    ogUrl: `https://authorsbureau.com/${authorSlug}/${bookSlug}/${productType}`,
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

    const { data: bookData } = await supabase
      .from("books")
      .select("id, title, slug, cover_image_url, author_name")
      .eq("author_id", profile.user_id)
      .eq("slug", bookSlug)
      .maybeSingle();

    if (!bookData) { setNotFound(true); setLoading(false); return; }
    setBook(bookData);

    let query = supabase.from(config.table as any).select("*").eq("author_id", profile.user_id);
    if (pType !== "coaching") {
      query = query.eq("book_id", bookData.id);
    }
    if (config.statusField === "published_at") {
      query = query.not("published_at", "is", null);
    } else {
      query = query.eq(config.statusField, config.statusValue);
    }
    const { data: productData } = await query.limit(1).maybeSingle();

    if (!productData) { setNotFound(true); setLoading(false); return; }
    setProduct(productData);

    const relProds: any[] = [];
    const tables = [
      { table: "home_study_courses", status: "published", fields: "id, title, price, currency, description, cover_image_url" },
      { table: "courses", status: "published", fields: "id, title, price, currency, description, cover_image_url" },
      { table: "audiobooks", status: "published", fields: "id, title, price, currency, description" },
      { table: "podcasts", status: "published", fields: "id, title, description" },
    ];
    const results = await Promise.all(
      tables.map(t => supabase.from(t.table as any).select(t.fields).eq("book_id", bookData.id).eq("status", t.status))
    );
    results.forEach((res, i) => {
      (res.data || []).forEach((p: any) => {
        const route = PRODUCT_ROUTE_MAP[tables[i].table] || "";
        if (route !== pType) {
          relProds.push({ ...p, route, type: route });
        }
      });
    });
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

  const Icon = config.icon;
  const authorBio = author.bio_short || "";
  const productImage = product.cover_image_url || book?.cover_image_url || null;
  const checklistItems = parseChecklistItems(product.description);

  return (
    <AuthorPageLayout theme={theme} breadcrumbs={[
      { label: "Authors", to: "/directory" },
      { label: displayName || "Author", to: `/${authorSlug}` },
      { label: bookTitle || "Book", to: `/${authorSlug}/${bookSlug}` },
      { label: product.title },
    ]}>

      {/* ===== SECTION 1: HERO ===== */}
      <section
        className="relative overflow-hidden"
        style={{ background: "var(--theme-primary)", color: "var(--theme-primary-text)" }}
      >
        <div className="relative container max-w-5xl py-12 md:py-20">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-14">
            {/* LEFT 40%: Product Image */}
            <motion.div
              initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
              className="w-full md:w-[40%] shrink-0 flex justify-center"
            >
              {productImage ? (
                <img
                  src={productImage}
                  alt={product.title}
                  className="w-56 md:w-full max-w-xs rounded-lg"
                  style={{ boxShadow: "8px 8px 32px rgba(0,0,0,0.35)" }}
                />
              ) : (
                <div
                  className="w-56 md:w-full max-w-xs aspect-[3/4] rounded-lg flex flex-col items-center justify-center gap-4"
                  style={{ background: "linear-gradient(135deg, var(--theme-primary), var(--theme-accent))" }}
                >
                  <Icon className="h-16 w-16" style={{ color: "var(--theme-primary-text)", opacity: 0.4 }} />
                  <span className="theme-heading text-lg font-bold text-center px-4" style={{ color: "var(--theme-primary-text)", opacity: 0.6 }}>
                    {product.title}
                  </span>
                </div>
              )}
            </motion.div>

            {/* RIGHT 60%: Product Details */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex-1 text-center md:text-left">
              {/* Product type badge */}
              <span
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide mb-4"
                style={{ background: "var(--theme-accent)", color: "var(--theme-accent-text)" }}
              >
                <Icon className="h-3.5 w-3.5" />
                {config.label}
              </span>

              <h1 className="theme-heading text-3xl md:text-[2.5rem] leading-tight font-bold mb-4" style={{ color: "var(--theme-primary-text)" }}>
                {product.title}
              </h1>

              {product.description && (
                <p className="text-lg mb-6 max-w-xl" style={{ color: "var(--theme-primary-text)", opacity: 0.85 }}>
                  {product.description.slice(0, 180)}{product.description.length > 180 ? "..." : ""}
                </p>
              )}

              {/* Price */}
              <div className="mb-6">
                {product.price != null && product.price > 0 ? (
                  <span className="theme-heading text-[2rem] font-bold" style={{ color: "var(--theme-primary-text)" }}>
                    {(product.currency || "USD") === "USD" ? "$" : product.currency}{product.price}
                  </span>
                ) : (
                  <span className="theme-heading text-2xl font-bold" style={{ color: "var(--theme-primary-text)" }}>Free</span>
                )}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start">
                <button
                  className="font-semibold text-base px-8 py-3.5 rounded-lg transition-all hover:scale-105 hover:brightness-110"
                  style={{ background: "var(--theme-accent)", color: "var(--theme-accent-text)" }}
                >
                  {product.price != null && product.price > 0 ? "Buy Now" : "Get Started"}
                </button>
                <button
                  onClick={() => document.getElementById("product-details")?.scrollIntoView({ behavior: "smooth" })}
                  className="font-semibold text-base px-6 py-3 rounded-lg transition-all hover:opacity-80"
                  style={{
                    background: "transparent",
                    border: "1.5px solid var(--theme-primary-text)",
                    color: "var(--theme-primary-text)",
                  }}
                >
                  Learn More
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 2: WHAT'S INCLUDED ===== */}
      {checklistItems.length > 0 && (
        <section id="product-details" className="py-16" style={{ background: "var(--theme-card-bg)" }}>
          <div className="container max-w-3xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="theme-heading text-2xl md:text-3xl font-bold mb-8" style={{ color: "var(--theme-heading-text)" }}>
                What's Included
              </h2>
              <div className="space-y-4">
                {checklistItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "var(--theme-accent)", opacity: 0.9 }}
                    >
                      <Check className="h-3.5 w-3.5" style={{ color: "var(--theme-accent-text)" }} />
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--theme-body-text)" }}>{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== SECTION 3: TYPE-SPECIFIC CONTENT ===== */}
      {(product.description || product.study_schedule_json || product.content_markdown || pType === "onlinecourse" || pType === "audiobook" || pType === "podcast") && (
        <section className="py-14" style={{ background: "var(--theme-secondary-bg)" }}>
          <div className="container max-w-4xl space-y-6">
            {/* About This Product */}
            {product.description && (
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                <div className="p-6 rounded-lg" style={{ background: "var(--theme-card-bg)", border: "1px solid var(--theme-card-border)", borderRadius: theme.borderRadius }}>
                  <h2 className="theme-heading text-xl font-bold mb-4" style={{ color: "var(--theme-heading-text)" }}>
                    About This {config.label}
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--theme-body-text)" }}>
                    {product.description}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Home Study schedule */}
            {pType === "homestudy" && product.study_schedule_json && Array.isArray(product.study_schedule_json) && (
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
                <div className="p-6 rounded-lg" style={{ background: "var(--theme-card-bg)", border: "1px solid var(--theme-card-border)", borderRadius: theme.borderRadius }}>
                  <h3 className="theme-heading font-bold text-lg mb-4" style={{ color: "var(--theme-heading-text)" }}>Study Schedule</h3>
                  <div className="space-y-3">
                    {(product.study_schedule_json as any[]).slice(0, 10).map((day: any, i: number) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <div className="flex-shrink-0 w-16 text-xs font-semibold" style={{ color: "var(--theme-accent)" }}>{day.day || `Day ${i + 1}`}</div>
                        <div>
                          <p className="font-medium" style={{ color: "var(--theme-heading-text)" }}>{day.title || day.topic}</p>
                          {day.description && <p className="text-xs mt-0.5" style={{ color: "var(--theme-muted-text)" }}>{day.description}</p>}
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
                <div className="p-6 rounded-lg" style={{ background: "var(--theme-card-bg)", border: "1px solid var(--theme-card-border)", borderRadius: theme.borderRadius }}>
                  <h3 className="theme-heading font-bold text-lg mb-4" style={{ color: "var(--theme-heading-text)" }}>Audiobook Details</h3>
                  <div className="space-y-2 text-sm">
                    {product.narrator_credit && (
                      <div className="flex items-center gap-2">
                        <Mic className="h-4 w-4" style={{ color: "var(--theme-accent)" }} />
                        <span style={{ color: "var(--theme-body-text)" }}>Narrated by: <strong>{product.narrator_credit}</strong></span>
                      </div>
                    )}
                    {product.duration_minutes && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" style={{ color: "var(--theme-accent)" }} />
                        <span style={{ color: "var(--theme-body-text)" }}>{Math.floor(product.duration_minutes / 60)}h {product.duration_minutes % 60}m</span>
                      </div>
                    )}
                    {product.audio_url && (
                      <div className="pt-3">
                        <p className="text-xs font-semibold mb-2" style={{ color: "var(--theme-muted-text)" }}>Preview</p>
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
                <div className="p-6 rounded-lg" style={{ background: "var(--theme-card-bg)", border: "1px solid var(--theme-card-border)", borderRadius: theme.borderRadius }}>
                  <h3 className="theme-heading font-bold text-lg mb-3" style={{ color: "var(--theme-heading-text)" }}>What You'll Learn</h3>
                  <div className="prose prose-sm max-w-none" style={{ color: "var(--theme-body-text)" }}>
                    {product.content_markdown.slice(0, 1000)}
                    {product.content_markdown.length > 1000 && "..."}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* ===== SECTION 4: BASED ON THE BOOK ===== */}
      {book && (
        <section className="py-12" style={{ background: "var(--theme-card-bg)" }}>
          <div className="container max-w-3xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="theme-heading text-xl font-bold mb-6" style={{ color: "var(--theme-heading-text)" }}>
                Based on the Book
              </h2>
              <Link
                to={`/${authorSlug}/${bookSlug}`}
                className="flex items-center gap-5 p-4 rounded-lg transition-all hover:shadow-md group"
                style={{ background: "var(--theme-card-bg)", border: "1px solid var(--theme-card-border)", borderRadius: theme.borderRadius }}
              >
                {book.cover_image_url ? (
                  <img src={book.cover_image_url} alt={book.title} className="w-20 h-auto rounded shadow-sm shrink-0" />
                ) : (
                  <div className="w-20 h-28 rounded flex items-center justify-center shrink-0" style={{ background: "var(--theme-secondary-bg)" }}>
                    <BookOpen className="h-8 w-8" style={{ color: "var(--theme-muted-text)" }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="theme-heading font-bold text-base group-hover:underline" style={{ color: "var(--theme-heading-text)" }}>{book.title}</h3>
                  <p className="text-sm mt-1" style={{ color: "var(--theme-muted-text)" }}>by {displayName}</p>
                </div>
                <span className="text-sm font-semibold shrink-0 hidden sm:flex items-center gap-1" style={{ color: "var(--theme-accent)" }}>
                  View Book <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== SECTION 5: ABOUT THE AUTHOR ===== */}
      {(authorBio || author.photo_url) && (
        <section className="py-14" style={{ background: "var(--theme-secondary-bg)" }}>
          <div className="container max-w-3xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="theme-heading text-xl font-bold mb-6" style={{ color: "var(--theme-heading-text)" }}>About the Author</h2>
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {author.photo_url && (
                  <img
                    src={author.photo_url}
                    alt={displayName}
                    className="w-16 h-16 rounded-full object-cover shrink-0"
                    style={{ border: "2px solid var(--theme-accent)" }}
                  />
                )}
                <div className="flex-1">
                  <h3 className="theme-heading font-bold text-lg mb-1" style={{ color: "var(--theme-heading-text)" }}>{displayName}</h3>
                  {author.tagline && (
                    <p className="text-sm mb-3" style={{ color: "var(--theme-muted-text)" }}>{author.tagline}</p>
                  )}
                  {authorBio && (
                    <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--theme-body-text)" }}>
                      {authorBio.length > 200 ? authorBio.slice(0, 200) + "..." : authorBio}
                    </p>
                  )}
                  <Link
                    to={`/${authorSlug}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                    style={{ color: "var(--theme-accent)" }}
                  >
                    View Full Profile <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== SECTION 6: MORE PRODUCTS FROM THIS BOOK ===== */}
      {relatedProducts.length > 0 && (
        <section className="py-14" style={{ background: "var(--theme-card-bg)" }}>
          <div className="container max-w-4xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="theme-heading text-xl md:text-2xl font-bold mb-6" style={{ color: "var(--theme-heading-text)" }}>
                More Products from This Book
              </h2>
            </motion.div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProducts.map((rp, i) => {
                const RpIcon = PRODUCT_CONFIG[rp.route as ProductType]?.icon || BookOpen;
                const rpLabel = PRODUCT_CONFIG[rp.route as ProductType]?.label || rp.route;
                return (
                  <motion.div key={rp.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}>
                    <Link
                      to={`/${authorSlug}/${bookSlug}/${rp.route}`}
                      className="group block p-5 transition-all hover:shadow-lg"
                      style={{ borderRadius: theme.borderRadius, border: "1px solid var(--theme-card-border)", background: "var(--theme-card-bg)" }}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: "var(--theme-accent)", opacity: 0.12 }}>
                        <RpIcon className="h-5 w-5" style={{ color: "var(--theme-accent)" }} />
                      </div>
                      <h4 className="font-semibold text-sm mb-1 group-hover:underline" style={{ color: "var(--theme-heading-text)" }}>{rp.title}</h4>
                      <p className="text-xs mb-2" style={{ color: "var(--theme-muted-text)" }}>{rpLabel}</p>
                      {rp.price != null && rp.price > 0 && (
                        <span className="font-bold text-sm" style={{ color: "var(--theme-accent)" }}>${rp.price}</span>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== SECTION 7: LEAD CAPTURE ===== */}
      <section className="py-14" style={{ background: "var(--theme-secondary-bg)" }}>
        <div className="container max-w-xl text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            {subscribed ? (
              <div className="py-6">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4" style={{ color: "var(--theme-accent)" }} />
                <h3 className="theme-heading text-xl font-bold mb-2" style={{ color: "var(--theme-heading-text)" }}>You're subscribed!</h3>
                <p className="text-sm" style={{ color: "var(--theme-muted-text)" }}>You'll receive updates soon.</p>
              </div>
            ) : (
              <>
                <Mail className="h-10 w-10 mx-auto mb-4" style={{ color: "var(--theme-accent)" }} />
                <h2 className="theme-heading text-2xl font-bold mb-3" style={{ color: "var(--theme-heading-text)" }}>
                  Stay Updated
                </h2>
                <p className="text-sm mb-8" style={{ color: "var(--theme-muted-text)" }}>
                  Get the latest updates and insights from {displayName}.
                </p>
                <form onSubmit={handleSubscribe} className="flex flex-col gap-3 max-w-md mx-auto">
                  <Input
                    type="text"
                    placeholder="First name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 text-base"
                    style={{ borderRadius: theme.borderRadius, borderColor: "var(--theme-card-border)", background: "var(--theme-card-bg)" }}
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 text-base flex-1"
                      style={{ borderRadius: theme.borderRadius, borderColor: "var(--theme-card-border)", background: "var(--theme-card-bg)" }}
                    />
                    <button
                      type="submit"
                      disabled={subscribing}
                      className="shrink-0 h-12 px-6 font-semibold rounded-lg transition-all hover:brightness-110 disabled:opacity-50"
                      style={{ background: "var(--theme-accent)", color: "var(--theme-accent-text)", borderRadius: theme.borderRadius }}
                    >
                      {subscribing ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Subscribe"}
                    </button>
                  </div>
                </form>
                <p className="text-xs mt-4" style={{ color: "var(--theme-muted-text)" }}>
                  We respect your privacy. Unsubscribe anytime.
                </p>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* ===== STICKY MOBILE CTA ===== */}
      {product.price != null && product.price > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden py-3 px-4 flex items-center justify-between shadow-2xl"
          style={{ background: "var(--theme-primary)", borderTop: "1px solid var(--theme-card-border)" }}
        >
          <div>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--theme-primary-text)", opacity: 0.5 }}>Price</span>
            <span className="theme-heading block text-lg font-bold" style={{ color: "var(--theme-accent)" }}>
              {(product.currency || "USD") === "USD" ? "$" : product.currency}{product.price}
            </span>
          </div>
          <button
            className="rounded-full font-semibold px-5 py-2 text-sm"
            style={{ background: "var(--theme-accent)", color: "var(--theme-accent-text)" }}
          >
            Buy Now
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

  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
      <div className="p-6 rounded-lg" style={{ background: "var(--theme-card-bg)", border: "1px solid var(--theme-card-border)", borderRadius: theme.borderRadius }}>
        <h3 className="theme-heading font-bold text-lg mb-4" style={{ color: "var(--theme-heading-text)" }}>Course Curriculum</h3>
        <div className="space-y-4">
          {modules.map((mod, i) => (
            <div key={mod.id}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center"
                  style={{ background: "var(--theme-accent)", color: "var(--theme-accent-text)", opacity: 0.85 }}
                >
                  {i + 1}
                </span>
                <h4 className="font-semibold text-sm" style={{ color: "var(--theme-heading-text)" }}>{mod.title}</h4>
              </div>
              {mod.description && <p className="text-xs ml-9 mb-1" style={{ color: "var(--theme-muted-text)" }}>{mod.description}</p>}
              {mod.course_lessons && mod.course_lessons.length > 0 && (
                <ul className="ml-9 space-y-1">
                  {mod.course_lessons.sort((a: any, b: any) => a.position - b.position).map((lesson: any) => (
                    <li key={lesson.id} className="text-xs flex items-center gap-1.5" style={{ color: "var(--theme-muted-text)" }}>
                      <Star className="h-2.5 w-2.5" style={{ color: "var(--theme-accent)" }} />
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

  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
      <div className="p-6 rounded-lg" style={{ background: "var(--theme-card-bg)", border: "1px solid var(--theme-card-border)", borderRadius: theme.borderRadius }}>
        <h3 className="theme-heading font-bold text-lg mb-4" style={{ color: "var(--theme-heading-text)" }}>Episodes</h3>
        <div className="space-y-3">
          {episodes.map((ep) => (
            <div key={ep.id} className="flex gap-3 p-3 rounded-lg" style={{ border: "1px solid var(--theme-card-border)" }}>
              <span
                className="flex-shrink-0 w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center"
                style={{ background: "var(--theme-accent)", color: "var(--theme-accent-text)", opacity: 0.85 }}
              >
                {ep.episode_number}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "var(--theme-heading-text)" }}>{ep.title}</p>
                {ep.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--theme-muted-text)" }}>{ep.description}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-[11px]" style={{ color: "var(--theme-muted-text)" }}>
                  {ep.duration_minutes && (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{ep.duration_minutes} min</span>
                  )}
                  {ep.audio_url && (
                    <a href={ep.audio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline" style={{ color: "var(--theme-accent)" }}>
                      <Play className="h-3 w-3" /> Listen
                    </a>
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
