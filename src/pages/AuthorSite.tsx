import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Mail, ArrowRight, Star, ExternalLink, Loader2, GraduationCap, Users, Headphones, Mic } from "lucide-react";
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
  author_slug: string | null;
  genres: string[] | null;
  is_speaker: boolean | null;
  credentials: any[] | null;
  site_theme: string | null;
}

interface BookWithProducts {
  id: string;
  title: string;
  subtitle: string | null;
  cover_image_url: string | null;
  description: string | null;
  amazon_url: string | null;
  price: string | null;
  genre: string | null;
  slug: string;
  badges: string[] | null;
  products: ProductLink[];
}

interface ProductLink {
  id: string;
  title: string;
  type: "home_study" | "course" | "coaching" | "audiobook" | "podcast";
  price: number | null;
  currency: string | null;
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
  hidden: { opacity: 0, y: 20 },
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
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  const theme = useMemo(() => getThemeById(author?.site_theme || "classic-elegant"), [author?.site_theme]);

  useDocumentMeta({
    title: author?.pen_name ? `${author.pen_name} - Author` : "Author",
    description: author?.tagline || author?.bio_short || "Author page",
  });

  useEffect(() => {
    if (!authorSlug) return;
    loadAuthorSite();
  }, [authorSlug]);

  async function loadAuthorSite() {
    setLoading(true);
    const { data: profile } = await supabase
      .from("author_profiles")
      .select("*")
      .eq("author_slug", authorSlug)
      .in("directory_status", ["listed", "featured"])
      .maybeSingle();

    if (!profile) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setAuthor(profile as unknown as AuthorData);

    // Fetch books and all product types in parallel
    const [booksRes, homeStudyRes, coursesRes, coachingRes] = await Promise.all([
      supabase.from("books").select("*").eq("author_id", profile.user_id).not("published_at", "is", null).order("created_at", { ascending: false }),
      supabase.from("home_study_courses").select("id, title, price, currency, book_id").eq("author_id", profile.user_id).eq("status", "published"),
      supabase.from("courses").select("id, title, price, currency, book_id").eq("author_id", profile.user_id).eq("status", "published"),
      supabase.from("coaching_packages").select("id, title, price, currency").eq("author_id", profile.user_id).eq("status", "active"),
    ]);

    const books = (booksRes.data || []) as any[];
    const homeStudy = (homeStudyRes.data || []) as any[];
    const courses = (coursesRes.data || []) as any[];
    const coaching = (coachingRes.data || []) as any[];

    // Group products under books
    const enriched: BookWithProducts[] = books.map((book) => {
      const products: ProductLink[] = [];

      homeStudy.filter((p) => p.book_id === book.id).forEach((p) => {
        products.push({ id: p.id, title: p.title, type: "home_study", price: p.price, currency: p.currency });
      });
      courses.filter((p) => p.book_id === book.id).forEach((p) => {
        products.push({ id: p.id, title: p.title, type: "course", price: p.price, currency: p.currency });
      });

      return { ...book, products };
    });

    // Attach coaching to first book if any (coaching has no book_id)
    if (coaching.length > 0 && enriched.length > 0) {
      coaching.forEach((p) => {
        enriched[0].products.push({ id: p.id, title: p.title, type: "coaching", price: p.price, currency: p.currency });
      });
    }

    setBooksWithProducts(enriched);
    setLoading(false);
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !author) return;
    setSubscribing(true);
    const { error } = await supabase.from("author_subscribers").insert({
      author_id: author.user_id,
      email: email.trim(),
      source: "author_site",
      source_detail: authorSlug,
    });
    setSubscribing(false);
    if (error?.code === "23505") {
      toast({ title: "Already subscribed!", description: "You're already on the list." });
    } else if (error) {
      toast({ title: "Error", description: "Could not subscribe. Try again.", variant: "destructive" });
    } else {
      toast({ title: "Subscribed!", description: `You'll hear from ${author.pen_name || "this author"} soon.` });
      setEmail("");
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

  const displayName = author.pen_name || "Author";
  const c = theme.colors;

  return (
    <div className="author-site min-h-screen" style={{ background: `hsl(${c.sectionAlt})` }}>
      <ThemeStyle theme={theme} />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden" style={{ background: `hsl(${c.heroBackground})`, color: `hsl(${c.heroForeground})` }}>
        {author.cover_photo_url && (
          <div className="absolute inset-0">
            <img src={author.cover_photo_url} alt="" className="w-full h-full object-cover opacity-15" />
          </div>
        )}
        <div className="relative container max-w-5xl py-16 md:py-24">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {author.photo_url && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
                <img
                  src={author.photo_url}
                  alt={displayName}
                  className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover shadow-xl"
                  style={{ borderColor: `hsl(${c.accent} / 0.3)`, borderWidth: "4px" }}
                />
              </motion.div>
            )}
            <div className="text-center md:text-left flex-1">
              <motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="as-heading text-3xl md:text-5xl font-bold mb-3"
              >
                {displayName}
              </motion.h1>
              {author.tagline && (
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="text-lg md:text-xl max-w-xl" style={{ opacity: 0.75 }}
                >
                  {author.tagline}
                </motion.p>
              )}
              {author.genres && author.genres.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start"
                >
                  {author.genres.map((g) => (
                    <span key={g} className="px-3 py-1 text-xs font-medium" style={{
                      borderRadius: theme.borderRadius,
                      background: `hsl(${c.accent} / 0.15)`,
                      color: `hsl(${c.accent})`,
                    }}>{g}</span>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      {(author.bio_short || author.bio_long) && (
        <section className="py-12" style={{ borderBottom: `1px solid hsl(${c.cardBorder})` }}>
          <div className="container max-w-3xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="as-heading text-2xl font-bold mb-4" style={{ color: `hsl(${c.heroBackground})` }}>
                About {displayName}
              </h2>
              <p className="leading-relaxed whitespace-pre-line" style={{ color: `hsl(${c.heroBackground} / 0.7)` }}>
                {author.bio_long || author.bio_short}
              </p>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== BOOKS WITH PRODUCTS ===== */}
      {booksWithProducts.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container max-w-5xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="as-heading text-2xl font-bold mb-8" style={{ color: `hsl(${c.heroBackground})` }}>
                <BookOpen className="inline h-6 w-6 mr-2" style={{ color: `hsl(${c.accent})` }} />
                Books & Programs
              </h2>
            </motion.div>

            <div className="space-y-8">
              {booksWithProducts.map((book, idx) => (
                <motion.div
                  key={book.id}
                  initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={idx + 1}
                >
                  <div
                    className="overflow-hidden transition-shadow hover:shadow-lg"
                    style={{
                      borderRadius: theme.borderRadius,
                      border: `1px solid hsl(${c.cardBorder})`,
                      background: "white",
                    }}
                  >
                    <div className="flex flex-col md:flex-row">
                      {/* Book Cover */}
                      {book.cover_image_url && (
                        <div className="md:w-48 lg:w-56 shrink-0">
                          <div className="aspect-[2/3] md:aspect-auto md:h-full overflow-hidden">
                            <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
                          </div>
                        </div>
                      )}

                      {/* Book Info + Products */}
                      <div className="flex-1 p-5 md:p-6 flex flex-col">
                        <div className="flex-1">
                          <h3 className="as-heading font-bold text-lg md:text-xl mb-1" style={{ color: `hsl(${c.heroBackground})` }}>
                            {book.title}
                          </h3>
                          {book.subtitle && (
                            <p className="text-sm mb-2" style={{ color: `hsl(${c.heroBackground} / 0.6)` }}>
                              {book.subtitle}
                            </p>
                          )}
                          {book.badges && book.badges.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {book.badges.map((b) => (
                                <span key={b} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium" style={{
                                  borderRadius: theme.borderRadius,
                                  background: `hsl(${c.accent} / 0.1)`,
                                  color: `hsl(${c.accent})`,
                                }}>
                                  <Star className="h-2.5 w-2.5" />{b}
                                </span>
                              ))}
                            </div>
                          )}
                          {book.description && (
                            <p className="text-sm leading-relaxed line-clamp-3 mb-4" style={{ color: `hsl(${c.heroBackground} / 0.6)` }}>
                              {book.description}
                            </p>
                          )}
                        </div>

                        {/* Product Links */}
                        {(book.products.length > 0 || book.amazon_url) && (
                          <div className="pt-3" style={{ borderTop: `1px solid hsl(${c.cardBorder})` }}>
                            <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: `hsl(${c.accent})` }}>
                              Available Programs
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {book.products.map((product) => {
                                const Icon = PRODUCT_ICONS[product.type] || BookOpen;
                                return (
                                  <Link
                                    key={product.id}
                                    to={`/${authorSlug}/${book.slug}/${PRODUCT_ROUTES[product.type]}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all hover:shadow-md group"
                                    style={{
                                      borderRadius: theme.borderRadius,
                                      border: `1px solid hsl(${c.accent} / 0.25)`,
                                      color: `hsl(${c.accent})`,
                                      background: `hsl(${c.accent} / 0.05)`,
                                    }}
                                  >
                                    <Icon className="h-3.5 w-3.5" />
                                    {PRODUCT_LABELS[product.type]}
                                    {product.price != null && product.price > 0 && (
                                      <span className="font-bold ml-1">
                                        ${product.price}
                                      </span>
                                    )}
                                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </Link>
                                );
                              })}
                              {book.amazon_url && (
                                <a
                                  href={book.amazon_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all hover:shadow-md"
                                  style={{
                                    borderRadius: theme.borderRadius,
                                    border: `1px solid hsl(${c.cardBorder})`,
                                    color: `hsl(${c.heroBackground} / 0.7)`,
                                  }}
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Buy on Amazon
                                  {book.price && <span className="font-bold ml-1">${book.price}</span>}
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== EMAIL SIGNUP ===== */}
      <section className="py-12" style={{ background: `hsl(${c.heroBackground})`, color: `hsl(${c.heroForeground})` }}>
        <div className="container max-w-xl text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <Mail className="h-8 w-8 mx-auto mb-3" style={{ color: `hsl(${c.accent})` }} />
            <h2 className="as-heading text-2xl font-bold mb-2">Stay Connected</h2>
            <p className="text-sm mb-6" style={{ opacity: 0.7 }}>
              Get updates on new books, courses, and exclusive content from {displayName}.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-0"
                style={{
                  background: `hsl(${c.heroForeground} / 0.1)`,
                  color: `hsl(${c.heroForeground})`,
                }}
              />
              <Button
                type="submit"
                disabled={subscribing}
                className="shrink-0"
                style={{
                  background: `hsl(${c.accent})`,
                  color: `hsl(${c.accentForeground})`,
                  borderRadius: theme.borderRadius,
                }}
              >
                {subscribing ? "..." : "Subscribe"}
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-6" style={{ background: `hsl(${c.footerBackground})`, color: `hsl(${c.footerForeground})` }}>
        <div className="container max-w-5xl flex items-center justify-between text-xs">
          <span>&copy; {new Date().getFullYear()} {displayName}. All rights reserved.</span>
          <span>
            Powered by{" "}
            <Link to="/" className="hover:underline" style={{ color: `hsl(${c.accent})` }}>Authors Bureau</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
