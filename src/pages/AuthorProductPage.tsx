import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Clock, Calendar, BookOpen, GraduationCap, Users,
  Headphones, Mic, Loader2, Star, Play, Mail, CheckCircle2, ExternalLink, Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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

/* ThemeStyle removed — now handled by AuthorPageLayout */

/** Parse description sentences into checklist items */
function parseChecklistItems(description: string | null | undefined): string[] {
  if (!description) return [];
  // Split by sentences or line breaks, filter meaningful items
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
  const c = theme?.colors;

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
      .select("id, title, slug, cover_image_url")
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
      { table: "home_study_courses", status: "published", fields: "id, title, price, currency, description" },
      { table: "courses", status: "published", fields: "id, title, price, currency, description" },
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

  if (notFound || !product || !author || !config || !c || !theme) return <NotFound />;

  const Icon = config.icon;
  const authorBio = author.bio_short || "";
  const productImage = product.cover_image_url || book?.cover_image_url || null;
  const checklistItems = parseChecklistItems(product.description);

  return (
    <AuthorPageLayout theme={theme} authorName={displayName} authorSlug={authorSlug} bookTitle={bookTitle} bookSlug={bookSlug} productTitle={product.title}>

      {/* ===== HERO (Split Layout: Image LEFT, Text RIGHT) ===== */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, hsl(${c.heroBackground}), hsl(${c.heroBackground} / 0.92))`, color: `hsl(${c.heroForeground})` }}>
        <div className="relative container max-w-5xl py-12 md:py-20">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-14">
            {/* LEFT: Product Image / Mockup */}
            <motion.div
              initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
              className="w-48 md:w-56 shrink-0"
            >
              {productImage ? (
                <img
                  src={productImage}
                  alt={product.title}
                  className="w-full rounded-lg shadow-2xl"
                  style={{ boxShadow: `8px 8px 24px rgba(0,0,0,0.3)` }}
                />
              ) : (
                <div
                  className="w-full aspect-square rounded-lg flex items-center justify-center"
                  style={{ background: `hsl(${c.heroForeground} / 0.08)` }}
                >
                  <Icon className="h-16 w-16" style={{ color: `hsl(${c.heroForeground} / 0.3)` }} />
                </div>
              )}
            </motion.div>

            {/* RIGHT: Product Info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex-1 text-center md:text-left">
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium mb-4"
                style={{ background: `hsl(${c.accent} / 0.15)`, color: `hsl(${c.accent})` }}
              >
                <Icon className="h-4 w-4" />
                {config.label}
              </div>
              <h1 className="pp-heading text-3xl md:text-4xl lg:text-5xl font-bold mb-4">{product.title}</h1>
              {product.description && (
                <p className="text-lg mb-6" style={{ opacity: 0.7, maxWidth: "600px" }}>{product.description.slice(0, 180)}{product.description.length > 180 ? "..." : ""}</p>
              )}

              {/* Price + CTA */}
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                {product.price != null && product.price > 0 ? (
                  <span className="pp-heading text-3xl font-bold" style={{ color: `hsl(${c.accent})` }}>
                    {(product.currency || "USD") === "USD" ? "$" : product.currency}{product.price}
                  </span>
                ) : (
                  <span className="pp-heading text-2xl font-bold" style={{ color: `hsl(${c.accent})` }}>Free</span>
                )}
                <Button
                  className="rounded-full font-semibold px-8 h-12"
                  style={{ background: `hsl(${c.accent})`, color: `hsl(${c.accentForeground})` }}
                >
                  Buy Now
                </Button>
                <Button
                  onClick={() => document.getElementById("product-details")?.scrollIntoView({ behavior: "smooth" })}
                  variant="outline"
                  className="rounded-full font-semibold px-6 h-12"
                  style={{ borderColor: `hsl(${c.heroForeground} / 0.3)`, color: `hsl(${c.heroForeground})`, background: "transparent" }}
                >
                  Learn More
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== WHAT'S INCLUDED (universal checklist) ===== */}
      {checklistItems.length > 0 && (
        <section id="product-details" className="py-14" style={{ borderBottom: `1px solid hsl(${c.cardBorder})` }}>
          <div className="container max-w-3xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="pp-heading text-2xl md:text-3xl font-bold mb-6" style={{ color: `hsl(${c.heroBackground})` }}>
                What's Included
              </h2>
              <div className="space-y-3">
                {checklistItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: `hsl(${c.accent} / 0.12)` }}
                    >
                      <Check className="h-3.5 w-3.5" style={{ color: `hsl(${c.accent})` }} />
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: `hsl(${c.heroBackground} / 0.7)` }}>{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== DETAILS / TYPE-SPECIFIC CONTENT ===== */}
      <section className="py-14">
        <div className="container max-w-4xl">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-6">
              {/* About This Product */}
              {product.description && (
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                  <div className="p-6 rounded-lg" style={{ background: "white", border: `1px solid hsl(${c.cardBorder})`, borderRadius: theme.borderRadius }}>
                    <h2 className="pp-heading text-xl font-bold mb-4" style={{ color: `hsl(${c.heroBackground})` }}>
                      About This {config.label}
                    </h2>
                    <p className="text-sm leading-relaxed" style={{ color: `hsl(${c.heroBackground} / 0.7)` }}>
                      {product.description}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Home Study schedule */}
              {pType === "homestudy" && product.study_schedule_json && Array.isArray(product.study_schedule_json) && (
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
                  <div className="p-6 rounded-lg" style={{ background: "white", border: `1px solid hsl(${c.cardBorder})`, borderRadius: theme.borderRadius }}>
                    <h3 className="pp-heading font-bold text-lg mb-4" style={{ color: `hsl(${c.heroBackground})` }}>Study Schedule</h3>
                    <div className="space-y-3">
                      {(product.study_schedule_json as any[]).slice(0, 10).map((day: any, i: number) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <div className="flex-shrink-0 w-16 text-xs font-semibold" style={{ color: `hsl(${c.accent})` }}>{day.day || `Day ${i + 1}`}</div>
                          <div>
                            <p className="font-medium" style={{ color: `hsl(${c.heroBackground})` }}>{day.title || day.topic}</p>
                            {day.description && <p className="text-xs mt-0.5" style={{ color: `hsl(${c.heroBackground} / 0.5)` }}>{day.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Online Course modules */}
              {pType === "onlinecourse" && product.id && <CourseModules courseId={product.id} theme={theme} />}

              {/* Audiobook details */}
              {pType === "audiobook" && (
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
                  <div className="p-6 rounded-lg" style={{ background: "white", border: `1px solid hsl(${c.cardBorder})`, borderRadius: theme.borderRadius }}>
                    <h3 className="pp-heading font-bold text-lg mb-4" style={{ color: `hsl(${c.heroBackground})` }}>Audiobook Details</h3>
                    <div className="space-y-2 text-sm">
                      {product.narrator_credit && (
                        <div className="flex items-center gap-2">
                          <Mic className="h-4 w-4" style={{ color: `hsl(${c.accent})` }} />
                          <span style={{ color: `hsl(${c.heroBackground} / 0.7)` }}>Narrated by: <strong>{product.narrator_credit}</strong></span>
                        </div>
                      )}
                      {product.duration_minutes && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" style={{ color: `hsl(${c.accent})` }} />
                          <span style={{ color: `hsl(${c.heroBackground} / 0.7)` }}>{Math.floor(product.duration_minutes / 60)}h {product.duration_minutes % 60}m</span>
                        </div>
                      )}
                      {product.audio_url && (
                        <div className="pt-3">
                          <p className="text-xs font-semibold mb-2" style={{ color: `hsl(${c.heroBackground} / 0.5)` }}>Preview</p>
                          <audio controls className="w-full">
                            <source src={product.audio_url} />
                          </audio>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Podcast episodes */}
              {pType === "podcast" && product.id && <PodcastEpisodes podcastId={product.id} theme={theme} />}

              {/* Content markdown preview */}
              {product.content_markdown && (
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}>
                  <div className="p-6 rounded-lg" style={{ background: "white", border: `1px solid hsl(${c.cardBorder})`, borderRadius: theme.borderRadius }}>
                    <h3 className="pp-heading font-bold text-lg mb-3" style={{ color: `hsl(${c.heroBackground})` }}>What You'll Learn</h3>
                    <div className="prose prose-sm max-w-none" style={{ color: `hsl(${c.heroBackground} / 0.6)` }}>
                      {product.content_markdown.slice(0, 1000)}
                      {product.content_markdown.length > 1000 && "..."}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Sidebar - Pricing Card (Sticky) */}
            <div>
              <div className="sticky top-20 p-6 rounded-lg" style={{ background: "white", border: `1px solid hsl(${c.cardBorder})`, borderRadius: theme.borderRadius }}>
                {product.price != null && product.price > 0 ? (
                  <>
                    <p className="pp-heading text-3xl font-bold mb-1" style={{ color: `hsl(${c.accent})` }}>
                      {(product.currency || "USD") === "USD" ? "$" : product.currency}{product.price}
                    </p>
                    <p className="text-xs mb-4" style={{ color: `hsl(${c.heroBackground} / 0.4)` }}>One-time payment</p>
                  </>
                ) : (
                  <p className="pp-heading text-lg font-bold mb-4" style={{ color: `hsl(${c.accent})` }}>Free</p>
                )}

                {product.duration_days && (
                  <div className="flex items-center gap-2 text-sm mb-2" style={{ color: `hsl(${c.heroBackground} / 0.6)` }}>
                    <Calendar className="h-4 w-4" style={{ color: `hsl(${c.accent})` }} />
                    <span>{product.duration_days} days</span>
                  </div>
                )}

                {product.duration_minutes && (
                  <div className="flex items-center gap-2 text-sm mb-2" style={{ color: `hsl(${c.heroBackground} / 0.6)` }}>
                    <Clock className="h-4 w-4" style={{ color: `hsl(${c.accent})` }} />
                    <span>{product.duration_minutes} min per session</span>
                  </div>
                )}

                <Button
                  className="w-full mt-4 font-semibold h-11"
                  style={{ background: `hsl(${c.accent})`, color: `hsl(${c.accentForeground})`, borderRadius: theme.borderRadius }}
                >
                  Buy Now
                </Button>

                <p className="text-[10px] text-center mt-3" style={{ color: `hsl(${c.heroBackground} / 0.3)` }}>
                  Secure checkout powered by Stripe
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ABOUT THE AUTHOR ===== */}
      {(authorBio || author.photo_url) && (
        <section className="py-14" style={{ background: `hsl(${c.heroBackground})`, color: `hsl(${c.heroForeground})` }}>
          <div className="container max-w-3xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {author.photo_url && (
                  <img
                    src={author.photo_url}
                    alt={displayName}
                    className="w-20 h-20 rounded-full object-cover shrink-0"
                    style={{ borderColor: `hsl(${c.accent} / 0.3)`, borderWidth: "3px", borderStyle: "solid" }}
                  />
                )}
                <div className="flex-1">
                  <h3 className="pp-heading font-bold text-lg mb-1">{displayName}</h3>
                  {author.tagline && (
                    <p className="text-sm mb-3" style={{ opacity: 0.6 }}>{author.tagline}</p>
                  )}
                  {authorBio && (
                    <p className="text-sm leading-relaxed mb-4" style={{ opacity: 0.7 }}>
                      {authorBio.length > 200 ? authorBio.slice(0, 200) + "..." : authorBio}
                    </p>
                  )}
                  <Link
                    to={`/${authorSlug}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
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

      {/* ===== YOU MIGHT ALSO LIKE ===== */}
      {relatedProducts.length > 0 && (
        <section className="py-14" style={{ borderBottom: `1px solid hsl(${c.cardBorder})` }}>
          <div className="container max-w-4xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="pp-heading text-xl md:text-2xl font-bold mb-6" style={{ color: `hsl(${c.heroBackground})` }}>
                You Might Also Like
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
                      style={{ borderRadius: theme.borderRadius, border: `1px solid hsl(${c.cardBorder})`, background: "white" }}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: `hsl(${c.accent} / 0.1)` }}>
                        <RpIcon className="h-5 w-5" style={{ color: `hsl(${c.accent})` }} />
                      </div>
                      <h4 className="font-semibold text-sm mb-1 group-hover:underline" style={{ color: `hsl(${c.heroBackground})` }}>{rp.title}</h4>
                      <p className="text-xs mb-2" style={{ color: `hsl(${c.heroBackground} / 0.4)` }}>{rpLabel}</p>
                      {rp.price != null && rp.price > 0 && (
                        <span className="font-bold text-sm" style={{ color: `hsl(${c.accent})` }}>${rp.price}</span>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== LEAD CAPTURE ===== */}
      <section id="product-subscribe" className="py-14" style={{ background: `linear-gradient(135deg, hsl(43 74% 54% / 0.12), hsl(43 74% 54% / 0.06))` }}>
        <div className="container max-w-xl text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            {subscribed ? (
              <div className="py-6">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4" style={{ color: `hsl(${c.accent})` }} />
                <h3 className="pp-heading text-xl font-bold mb-2" style={{ color: `hsl(${c.heroBackground})` }}>You're subscribed!</h3>
                <p className="text-sm" style={{ color: `hsl(${c.heroBackground} / 0.6)` }}>You'll receive updates soon.</p>
              </div>
            ) : (
              <>
                <Mail className="h-10 w-10 mx-auto mb-4" style={{ color: `hsl(${c.accent})` }} />
                <h2 className="pp-heading text-2xl font-bold mb-3" style={{ color: `hsl(${c.heroBackground})` }}>
                  Stay Updated
                </h2>
                <p className="text-sm mb-8" style={{ color: `hsl(${c.heroBackground} / 0.6)` }}>
                  Get updates from {displayName}.
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
      {product.price != null && product.price > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden py-3 px-4 flex items-center justify-between shadow-2xl"
          style={{ background: `hsl(${c.heroBackground})`, borderTop: `1px solid hsl(${c.heroForeground} / 0.1)` }}
        >
          <div>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: `hsl(${c.heroForeground} / 0.5)` }}>Price</span>
            <span className="pp-heading block text-lg font-bold" style={{ color: `hsl(${c.accent})` }}>
              {(product.currency || "USD") === "USD" ? "$" : product.currency}{product.price}
            </span>
          </div>
          <Button size="sm" className="rounded-full font-semibold px-5"
            style={{ background: `hsl(${c.accent})`, color: `hsl(${c.accentForeground})` }}
          >
            Buy Now
          </Button>
        </div>
      )}

      {/* Bottom padding for sticky CTA on mobile */}
      {product.price != null && product.price > 0 && <div className="h-16 md:hidden" />}
    </AuthorPageLayout>
  );
}

// Sub-component for course modules
function CourseModules({ courseId, theme }: { courseId: string; theme: AuthorTheme }) {
  const [modules, setModules] = useState<any[]>([]);
  const c = theme.colors;

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
      <div className="p-6 rounded-lg" style={{ background: "white", border: `1px solid hsl(${c.cardBorder})`, borderRadius: theme.borderRadius }}>
        <h3 className="pp-heading font-bold text-lg mb-4" style={{ color: `hsl(${c.heroBackground})` }}>Course Curriculum</h3>
        <div className="space-y-4">
          {modules.map((mod, i) => (
            <div key={mod.id}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center"
                  style={{ background: `hsl(${c.accent} / 0.1)`, color: `hsl(${c.accent})` }}
                >
                  {i + 1}
                </span>
                <h4 className="font-semibold text-sm" style={{ color: `hsl(${c.heroBackground})` }}>{mod.title}</h4>
              </div>
              {mod.description && <p className="text-xs ml-9 mb-1" style={{ color: `hsl(${c.heroBackground} / 0.5)` }}>{mod.description}</p>}
              {mod.course_lessons && mod.course_lessons.length > 0 && (
                <ul className="ml-9 space-y-1">
                  {mod.course_lessons.sort((a: any, b: any) => a.position - b.position).map((lesson: any) => (
                    <li key={lesson.id} className="text-xs flex items-center gap-1.5" style={{ color: `hsl(${c.heroBackground} / 0.5)` }}>
                      <Star className="h-2.5 w-2.5" style={{ color: `hsl(${c.accent} / 0.5)` }} />
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

// Sub-component for podcast episodes
function PodcastEpisodes({ podcastId, theme }: { podcastId: string; theme: AuthorTheme }) {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const c = theme.colors;

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
      <div className="p-6 rounded-lg" style={{ background: "white", border: `1px solid hsl(${c.cardBorder})`, borderRadius: theme.borderRadius }}>
        <h3 className="pp-heading font-bold text-lg mb-4" style={{ color: `hsl(${c.heroBackground})` }}>Episodes</h3>
        <div className="space-y-3">
          {episodes.map((ep) => (
            <div key={ep.id} className="flex gap-3 p-3 rounded-lg" style={{ border: `1px solid hsl(${c.cardBorder})` }}>
              <span
                className="flex-shrink-0 w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center"
                style={{ background: `hsl(${c.accent} / 0.1)`, color: `hsl(${c.accent})` }}
              >
                {ep.episode_number}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: `hsl(${c.heroBackground})` }}>{ep.title}</p>
                {ep.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: `hsl(${c.heroBackground} / 0.5)` }}>{ep.description}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-[11px]" style={{ color: `hsl(${c.heroBackground} / 0.4)` }}>
                  {ep.duration_minutes && (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{ep.duration_minutes} min</span>
                  )}
                  {ep.audio_url && (
                    <a href={ep.audio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline" style={{ color: `hsl(${c.accent})` }}>
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
