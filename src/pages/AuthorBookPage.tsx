import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, ExternalLink, Loader2, ArrowLeft, GraduationCap, Users, Headphones, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NewsletterSignup from "@/components/NewsletterSignup";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { getThemeById, getThemeFontsUrl, type AuthorTheme } from "@/lib/author-themes";
import NotFound from "./NotFound";

interface Book {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  slug: string;
  pages?: number;
  rating?: number;
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
}

const PRODUCT_ICONS: Record<string, typeof BookOpen> = {
  homestudy: BookOpen,
  onlinecourse: GraduationCap,
  coaching: Users,
  audiobook: Headphones,
  podcast: Mic,
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function AuthorBookPage() {
  const { authorSlug, bookSlug } = useParams<{ authorSlug: string; bookSlug: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [products, setProducts] = useState<ProductLink[]>([]);
  const [authorProfile, setAuthorProfile] = useState<any>(null);
  const [theme, setTheme] = useState<AuthorTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useDocumentMeta({
    title: book ? `${book.title} by ${book.author_name || "Author"} | Authors Bureau` : "Book | Authors Bureau",
    description: book?.description?.slice(0, 155) || "Book page on Authors Bureau",
  });

  useEffect(() => {
    if (!authorSlug || !bookSlug) { setNotFound(true); setLoading(false); return; }
    loadBookPage();
  }, [authorSlug, bookSlug]);

  async function loadBookPage() {
    setLoading(true);

    // 1. Find author profile by slug
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    let profile: any = null;

    if (currentUser) {
      const { data } = await supabase
        .from("author_profiles")
        .select("user_id, pen_name, bio_short, photo_url, site_theme, author_slug")
        .eq("author_slug", authorSlug)
        .eq("user_id", currentUser.id)
        .maybeSingle();
      profile = data;
    }
    if (!profile) {
      const { data } = await supabase
        .from("author_profiles")
        .select("user_id, pen_name, bio_short, photo_url, site_theme, author_slug")
        .eq("author_slug", authorSlug)
        .in("directory_status", ["listed", "featured"])
        .maybeSingle();
      profile = data;
    }

    if (!profile) { setNotFound(true); setLoading(false); return; }
    setAuthorProfile(profile);
    setTheme(getThemeById(profile.site_theme || "classic-elegant"));

    // 2. Find book by slug + author
    const { data: bookData } = await supabase
      .from("books")
      .select("*")
      .eq("author_id", profile.user_id)
      .eq("slug", bookSlug)
      .maybeSingle();

    if (!bookData) { setNotFound(true); setLoading(false); return; }
    setBook(bookData as unknown as Book);

    // 3. Fetch published products for this book
    const bookId = bookData.id;
    const prods: ProductLink[] = [];

    const [hsRes, cRes, abRes, podRes] = await Promise.all([
      supabase.from("home_study_courses").select("id, title, price, currency").eq("book_id", bookId).eq("status", "published"),
      supabase.from("courses").select("id, title, price, currency").eq("book_id", bookId).eq("status", "published"),
      supabase.from("audiobooks").select("id, title, price, currency").eq("book_id", bookId).eq("status", "published"),
      supabase.from("podcasts").select("id, title").eq("book_id", bookId).eq("status", "published"),
    ]);

    (hsRes.data || []).forEach((p: any) => prods.push({ type: "homestudy", title: p.title, route: "homestudy", price: p.price ? `$${p.price}` : undefined }));
    (cRes.data || []).forEach((p: any) => prods.push({ type: "onlinecourse", title: p.title, route: "onlinecourse", price: p.price ? `$${p.price}` : undefined }));
    (abRes.data || []).forEach((p: any) => prods.push({ type: "audiobook", title: p.title, route: "audiobook", price: p.price ? `$${p.price}` : undefined }));
    (podRes.data || []).forEach((p: any) => prods.push({ type: "podcast", title: p.title, route: "podcast" }));

    setProducts(prods);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (notFound || !book) return <NotFound />;

  const badgeList = Array.isArray(book.badges) ? book.badges : [];
  const isAmazonLink = book.amazon_url?.includes("amazon.com") || book.amazon_url?.includes("a.co");
  const heroColors = theme ? { background: `hsl(${theme.colors.heroBackground})`, color: `hsl(${theme.colors.heroText})` } : {};

  return (
    <div className="min-h-screen">
      {theme && <link rel="stylesheet" href={getThemeFontsUrl(theme)} />}
      <Navbar />

      {/* Hero */}
      <section className="border-b border-border py-16" style={heroColors}>
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Button
              onClick={() => navigate(`/${authorSlug}`)}
              variant="ghost"
              className="mb-6 opacity-70 hover:opacity-100"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {authorProfile?.pen_name || "Author"}
            </Button>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="mb-4 font-heading text-4xl font-bold"
            style={theme ? { fontFamily: theme.fonts.heading } : {}}
          >
            {book.title}
          </motion.h1>

          {book.subtitle && (
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-4 text-lg italic opacity-80">
              {book.subtitle}
            </motion.p>
          )}

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="opacity-70">
            by <span className="font-semibold">{book.author_name || authorProfile?.pen_name || "Author"}</span>
          </motion.p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container max-w-4xl">
          <motion.div initial="hidden" animate="visible" className="grid gap-12 lg:grid-cols-3">
            {/* Sidebar */}
            <motion.div variants={fadeUp} custom={0} className="lg:col-span-1">
              <div className="sticky top-24">
                {book.cover_image_url ? (
                  <img src={book.cover_image_url} alt={book.title} className="w-full rounded-lg shadow-xl mb-6" />
                ) : (
                  <div className="w-full aspect-[2/3] rounded-lg bg-muted/50 flex items-center justify-center mb-6 shadow-xl">
                    <BookOpen className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}

                {badgeList.length > 0 && (
                  <div className="mb-6 space-y-2">
                    {badgeList.map((badge) => (
                      <div key={badge} className="inline-block rounded-full bg-secondary/20 px-4 py-2 text-sm font-semibold text-secondary mr-2">
                        ⭐ {badge}
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Stats */}
                <div className="space-y-3 text-sm mb-6">
                  {book.rating && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">Rating</span>
                      <span className="font-bold text-lg">{book.rating} ★</span>
                    </div>
                  )}
                  {book.pages && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">Pages</span>
                      <span className="font-bold">{book.pages}</span>
                    </div>
                  )}
                  {book.genre && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">Genre</span>
                      <span className="font-bold">{book.genre}</span>
                    </div>
                  )}
                </div>

                {/* Pricing */}
                <div className="space-y-2 mb-6">
                  {book.price && (
                    <div className="text-center p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                      <span className="text-sm text-muted-foreground block">{book.kindle_price || book.paperback_price ? "Hardcover" : "Price"}</span>
                      <span className="font-heading text-2xl font-bold text-secondary">{book.price}</span>
                    </div>
                  )}
                  {book.kindle_price && (
                    <div className="text-center p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                      <span className="text-sm text-muted-foreground block">Kindle</span>
                      <span className="font-heading text-xl font-bold text-secondary">{book.kindle_price}</span>
                    </div>
                  )}
                  {book.paperback_price && (
                    <div className="text-center p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                      <span className="text-sm text-muted-foreground block">Paperback</span>
                      <span className="font-heading text-xl font-bold text-secondary">{book.paperback_price}</span>
                    </div>
                  )}
                </div>

                {book.amazon_url && (
                  <Button asChild className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full font-semibold">
                    <a href={book.amazon_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {isAmazonLink ? "Buy on Amazon" : "Get Your Copy"}
                    </a>
                  </Button>
                )}
              </div>
            </motion.div>

            {/* Main Content */}
            <motion.div variants={fadeUp} custom={1} className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="font-heading text-2xl font-bold mb-4">About This Book</h2>
                <p className="text-base leading-relaxed text-muted-foreground whitespace-pre-wrap">{book.description}</p>
              </div>

              {/* Products Section */}
              {products.length > 0 && (
                <div>
                  <h2 className="font-heading text-xl font-bold mb-4">Available Products</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {products.map((p, i) => {
                      const Icon = PRODUCT_ICONS[p.type] || BookOpen;
                      return (
                        <Link
                          key={i}
                          to={`/${authorSlug}/${bookSlug}/${p.route}`}
                          className="flex items-center gap-3 rounded-lg border border-border p-4 hover:border-secondary/40 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                            <Icon className="h-5 w-5 text-secondary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{p.title}</p>
                            {p.price && <p className="text-xs text-muted-foreground">{p.price}</p>}
                          </div>
                          <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180 shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Author Bio */}
              {(book.author_bio || authorProfile?.bio_short) && (
                <div className="rounded-lg bg-muted/50 border border-border p-6">
                  <h3 className="font-heading text-lg font-bold mb-3">About the Author</h3>
                  <div className="flex gap-4 items-start">
                    {(book.author_photo_url || authorProfile?.photo_url) && (
                      <img
                        src={book.author_photo_url || authorProfile?.photo_url}
                        alt={book.author_name || authorProfile?.pen_name}
                        className="w-16 h-16 rounded-full object-cover shrink-0"
                      />
                    )}
                    <div>
                      <p className="text-sm leading-relaxed text-muted-foreground mb-3">
                        {book.author_bio || authorProfile?.bio_short}
                      </p>
                      <Link to={`/${authorSlug}`} className="text-sm font-semibold text-secondary hover:underline">
                        {book.author_name || authorProfile?.pen_name} →
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Bestseller Proof */}
              {book.bestseller_proof_url && (
                <div className="rounded-lg border border-border p-6">
                  <h3 className="font-heading text-lg font-bold mb-4">Amazon Bestseller Proof</h3>
                  <img src={book.bestseller_proof_url} alt={`${book.title} bestseller`} className="w-full rounded-lg shadow-md" />
                </div>
              )}

              <NewsletterSignup bookId={book.id} authorName={book.author_name || authorProfile?.pen_name || "this author"} />

              {/* CTA */}
              <div className="rounded-lg bg-gradient-to-r from-secondary/10 to-secondary/5 border border-secondary/20 p-8 text-center">
                <h3 className="font-heading text-xl font-bold mb-3">Ready to Read?</h3>
                <p className="text-muted-foreground mb-6">
                  {isAmazonLink ? "Available on Amazon in multiple formats." : "Get your copy today."}
                </p>
                {book.amazon_url && (
                  <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full font-semibold">
                    <a href={book.amazon_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" /> Get Your Copy
                    </a>
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
