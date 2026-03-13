import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Mail, ArrowRight, Star, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { toast } from "@/hooks/use-toast";
import NotFound from "./NotFound";

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
}

interface BookData {
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
}

interface ProductData {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  type: "home_study" | "course" | "coaching";
  slug: string;
  cover_image_url?: string | null;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

export default function AuthorSite() {
  const { authorSlug } = useParams<{ authorSlug: string }>();
  const [author, setAuthor] = useState<AuthorData | null>(null);
  const [books, setBooks] = useState<BookData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);

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
    // Fetch author profile
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
    setAuthor(profile as AuthorData);

    // Fetch books and products in parallel
    const [booksRes, homeStudyRes, coursesRes, coachingRes] = await Promise.all([
      supabase.from("books").select("*").eq("author_id", profile.user_id).not("published_at", "is", null).order("created_at", { ascending: false }),
      supabase.from("home_study_courses").select("id, title, description, price, currency, cover_image_url").eq("author_id", profile.user_id).eq("status", "published"),
      supabase.from("courses").select("id, title, description, price, currency, cover_image_url").eq("author_id", profile.user_id).eq("status", "published"),
      supabase.from("coaching_packages").select("id, title, description, price, currency").eq("author_id", profile.user_id).eq("status", "active"),
    ]);

    setBooks((booksRes.data || []) as BookData[]);

    const allProducts: ProductData[] = [
      ...(homeStudyRes.data || []).map((p: any) => ({ ...p, type: "home_study" as const, slug: "homestudy" })),
      ...(coursesRes.data || []).map((p: any) => ({ ...p, type: "course" as const, slug: "onlinecourse" })),
      ...(coachingRes.data || []).map((p: any) => ({ ...p, type: "coaching" as const, slug: "coaching" })),
    ];
    setProducts(allProducts);
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
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (notFound || !author) return <NotFound />;

  const displayName = author.pen_name || "Author";
  const productTypeLabels: Record<string, string> = {
    home_study: "Home Study Course",
    course: "Online Course",
    coaching: "Coaching",
  };
  const productTypeRoutes: Record<string, string> = {
    home_study: "homestudy",
    course: "onlinecourse",
    coaching: "coaching",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-primary text-primary-foreground overflow-hidden">
        {author.cover_photo_url && (
          <div className="absolute inset-0">
            <img src={author.cover_photo_url} alt="" className="w-full h-full object-cover opacity-20" />
          </div>
        )}
        <div className="relative container max-w-5xl py-16 md:py-24">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {author.photo_url && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
                <img
                  src={author.photo_url}
                  alt={displayName}
                  className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-secondary/30 shadow-xl"
                />
              </motion.div>
            )}
            <div className="text-center md:text-left flex-1">
              <motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="font-heading text-3xl md:text-5xl font-bold mb-3"
              >
                {displayName}
              </motion.h1>
              {author.tagline && (
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="text-lg md:text-xl text-primary-foreground/70 max-w-xl"
                >
                  {author.tagline}
                </motion.p>
              )}
              {author.genres && author.genres.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start"
                >
                  {author.genres.map(g => (
                    <span key={g} className="px-3 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-medium">{g}</span>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      {(author.bio_short || author.bio_long) && (
        <section className="py-12 border-b border-border">
          <div className="container max-w-3xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="font-heading text-2xl font-bold mb-4">About {displayName}</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {author.bio_long || author.bio_short}
              </p>
            </motion.div>
          </div>
        </section>
      )}

      {/* Books Showcase */}
      {books.length > 0 && (
        <section className="py-12 bg-muted/30 border-b border-border">
          <div className="container max-w-5xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="font-heading text-2xl font-bold mb-6">
                <BookOpen className="inline h-6 w-6 mr-2 text-secondary" />
                Books
              </h2>
            </motion.div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {books.map((book, i) => (
                <motion.div key={book.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                    {book.cover_image_url && (
                      <div className="aspect-[2/3] bg-muted flex items-center justify-center overflow-hidden">
                        <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-heading font-bold text-sm mb-1">{book.title}</h3>
                      {book.subtitle && <p className="text-xs text-muted-foreground mb-2">{book.subtitle}</p>}
                      {book.badges && book.badges.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {book.badges.map(b => (
                            <span key={b} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-medium">
                              <Star className="h-2.5 w-2.5" />{b}
                            </span>
                          ))}
                        </div>
                      )}
                      {book.description && (
                        <p className="text-xs text-muted-foreground line-clamp-3 mb-3 flex-1">{book.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-auto pt-2">
                        {book.price && <span className="text-sm font-bold text-secondary">${book.price}</span>}
                        {book.amazon_url && (
                          <Button asChild size="sm" variant="outline" className="text-xs">
                            <a href={book.amazon_url} target="_blank" rel="noopener noreferrer">
                              Buy Now <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products Grid */}
      {products.length > 0 && (
        <section className="py-12 border-b border-border">
          <div className="container max-w-5xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="font-heading text-2xl font-bold mb-6">Programs & Courses</h2>
            </motion.div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, i) => (
                <motion.div key={product.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}>
                  <Link to={`/${authorSlug}/${productTypeRoutes[product.type]}`}>
                    <Card className="overflow-hidden hover:shadow-lg hover:border-secondary/30 transition-all h-full flex flex-col cursor-pointer group">
                      {product.cover_image_url && (
                        <div className="aspect-video bg-muted overflow-hidden">
                          <img src={product.cover_image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                      )}
                      <div className="p-4 flex flex-col flex-1">
                        <span className="text-[10px] uppercase tracking-wider text-secondary font-semibold mb-1">
                          {productTypeLabels[product.type]}
                        </span>
                        <h3 className="font-heading font-bold text-sm mb-2">{product.title}</h3>
                        {product.description && (
                          <p className="text-xs text-muted-foreground line-clamp-3 mb-3 flex-1">{product.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-auto pt-2">
                          {product.price != null && product.price > 0 && (
                            <span className="text-sm font-bold text-secondary">
                              {product.currency === "USD" ? "$" : product.currency}{product.price}
                            </span>
                          )}
                          <span className="text-xs text-secondary font-medium group-hover:underline flex items-center gap-1">
                            Learn More <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Email Signup */}
      <section className="py-12 bg-primary text-primary-foreground">
        <div className="container max-w-xl text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <Mail className="h-8 w-8 mx-auto mb-3 text-secondary" />
            <h2 className="font-heading text-2xl font-bold mb-2">Stay Connected</h2>
            <p className="text-primary-foreground/70 text-sm mb-6">
              Get updates on new books, courses, and exclusive content from {displayName}.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40"
              />
              <Button type="submit" disabled={subscribing} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shrink-0">
                {subscribing ? "..." : "Subscribe"}
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t border-border bg-background">
        <div className="container max-w-5xl flex items-center justify-between text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} {displayName}. All rights reserved.</span>
          <span>
            Powered by{" "}
            <Link to="/" className="text-secondary hover:underline">Authors Bureau</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
