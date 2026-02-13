import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, ExternalLink, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

interface Book {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
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
  author_name: string;
  author_bio?: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 } as const,
  }),
};

export default function DynamicBookMicrosite() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBook = async () => {
      if (!slug) return;

      try {
        const { data, error: fetchError } = await supabase
          .from("books")
          .select("*")
          .eq("slug", slug)
          .single();

        if (fetchError) throw fetchError;
        if (!data) {
          setError("Book not found");
          return;
        }

        setBook(data as Book);
      } catch (err) {
        console.error("Failed to fetch book:", err);
        setError("Failed to load book");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBook();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-20 text-center">
          <h1 className="font-heading text-2xl font-bold mb-4">Book Not Found</h1>
          <p className="text-muted-foreground mb-8">{error || "This book microsite does not exist."}</p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back Home
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const badgeList = Array.isArray(book.badges) ? book.badges : [];

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-border bg-primary py-16 text-primary-foreground">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Button
              onClick={() => navigate("/")}
              variant="ghost"
              className="mb-6 text-primary-foreground/70 hover:text-primary-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Authors
            </Button>
          </motion.div>

          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/15 px-4 py-2 text-sm text-secondary mb-4">
            <BookOpen className="h-4 w-4" />
            Book Microsite
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 font-heading text-4xl font-bold"
          >
            {book.title}
          </motion.h1>

          {book.subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-4 text-lg italic text-primary-foreground/80"
            >
              {book.subtitle}
            </motion.p>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-primary-foreground/70"
          >
            by <span className="font-semibold">{book.author_name}</span>
          </motion.p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container max-w-4xl">
          <motion.div
            initial="hidden"
            animate="visible"
            className="grid gap-12 lg:grid-cols-3"
          >
            {/* Sidebar: Cover & Details */}
            <motion.div variants={fadeUp} custom={0} className="lg:col-span-1">
              <div className="sticky top-24">
                {book.cover_image_url ? (
                  <img
                    src={book.cover_image_url}
                    alt={book.title}
                    className="w-full rounded-lg shadow-xl mb-6"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] rounded-lg bg-muted/50 flex items-center justify-center mb-6 shadow-xl">
                    <BookOpen className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}

                {/* Badges */}
                {badgeList.length > 0 && (
                  <div className="mb-6 space-y-2">
                    {badgeList.map((badge) => (
                      <div
                        key={badge}
                        className="inline-block rounded-full bg-secondary/20 px-4 py-2 text-sm font-semibold text-secondary mr-2"
                      >
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
                  {book.review_count && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">Reviews</span>
                      <span className="font-bold">{book.review_count.toLocaleString()}</span>
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
                      <span className="text-sm text-muted-foreground block">Hardcover</span>
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

                {/* CTA */}
                {book.amazon_url && (
                  <Button asChild className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full font-semibold">
                    <a href={book.amazon_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Buy on Amazon
                    </a>
                  </Button>
                )}
              </div>
            </motion.div>

            {/* Main Content */}
            <motion.div variants={fadeUp} custom={1} className="lg:col-span-2 space-y-8">
              {/* Description */}
              <div>
                <h2 className="font-heading text-2xl font-bold mb-4">About This Book</h2>
                <p className="text-base leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {book.description}
                </p>
              </div>

              {/* Author */}
              {book.author_bio && (
                <div className="rounded-lg bg-muted/50 border border-border p-6">
                  <h3 className="font-heading text-lg font-bold mb-3">About the Author</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground mb-3">{book.author_bio}</p>
                  <p className="text-sm font-semibold text-secondary">
                    {book.author_name}
                  </p>
                </div>
              )}

              {/* Call to Action */}
              <div className="rounded-lg bg-gradient-to-r from-secondary/10 to-secondary/5 border border-secondary/20 p-8 text-center">
                <h3 className="font-heading text-xl font-bold mb-3">Ready to Read?</h3>
                <p className="text-muted-foreground mb-6">
                  Discover why readers love this book. Available on Amazon in multiple formats.
                </p>
                {book.amazon_url && (
                  <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full font-semibold">
                    <a href={book.amazon_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Get Your Copy
                    </a>
                  </Button>
                )}
              </div>

              {/* Powered by */}
              <div className="text-center text-xs text-muted-foreground border-t border-border pt-6">
                <p>Powered by <span className="font-semibold text-secondary">Authors Bureau</span></p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
