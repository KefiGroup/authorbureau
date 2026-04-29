import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, ExternalLink, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NewsletterSignup from "@/components/NewsletterSignup";
import BuyNowButton from "@/components/commerce/BuyNowButton";
import MicrositeHeroSkeleton from "@/components/public/MicrositeHeroSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

interface Book {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
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


const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 } as const,
  }),
};

interface LiveProduct {
  id: string;
  node_id: string;
  node_name: string | null;
  personalised_name: string | null;
  price_usd: number | null;
  currency: string | null;
  delivery_url: string | null;
}

export default function DynamicBookMicrosite() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBook = async () => {
      if (!slug) return;

      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-book`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug }),
          }
        );
        const result = await res.json();
        if (!res.ok || !result.book) {
          setError(result.error || "Book not found");
          return;
        }
        const loadedBook = result.book as Book;
        setBook(loadedBook);

        // Load published Authors Bureau products tied to this book.
        // book.author_id is the user_id; author_nodes.author_id is the author_profiles.id row.
        try {
          const { data: prof } = await supabase
            .from("author_profiles")
            .select("id")
            .eq("user_id", loadedBook.author_id)
            .maybeSingle();
          if (prof?.id) {
            const { data: nodes } = await supabase
              .from("author_nodes")
              .select("id, node_id, node_name, personalised_name, price_usd, currency, delivery_url")
              .eq("author_id", prof.id)
              .eq("book_id", loadedBook.id)
              .eq("status", "live");
            setProducts((nodes ?? []) as LiveProduct[]);
          }
        } catch (e) {
          console.warn("Failed to load author products", e);
        }
      } catch (err) {
        console.error("Failed to fetch book:", err);
        setError("Failed to load book");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBook();
  }, [slug]);

  const metaDescription = book?.description?.slice(0, 155) || (book ? `${book.title} by ${book.author_name}` : "Book Microsite | Authors Bureau");
  const pageUrl = `${window.location.origin}/books/${slug}`;

  useDocumentMeta({
    title: book ? `${book.title} by ${book.author_name || "Unknown Author"} | Authors Bureau` : "Book | Authors Bureau",
    description: metaDescription,
    ogTitle: book?.title,
    ogDescription: metaDescription,
    ogImage: book?.cover_image_url || undefined,
    ogUrl: pageUrl,
    twitterCard: "summary_large_image",
    jsonLd: book ? {
      "@context": "https://schema.org",
      "@type": "Book",
      name: book.title,
      ...(book.subtitle && { alternativeHeadline: book.subtitle }),
      description: book.description,
      image: book.cover_image_url,
      url: pageUrl,
      author: { "@type": "Person", name: book.author_name || "Unknown Author" },
      ...(book.pages && { numberOfPages: book.pages }),
      ...(book.genre && { genre: book.genre }),
      ...(book.rating && { aggregateRating: { "@type": "AggregateRating", ratingValue: book.rating, bestRating: 5 } }),
      ...(book.amazon_url && { offers: { "@type": "Offer", url: book.amazon_url, ...(book.price && { price: book.price.replace(/[^0-9.]/g, ""), priceCurrency: book.currency || "USD" }) } }),
    } : undefined,
  });

  if (isLoading) {
    return <MicrositeHeroSkeleton />;
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
  const isAmazonLink = book.amazon_url?.includes("amazon.com") || book.amazon_url?.includes("a.co");

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
            by <span className="font-semibold">{book.author_name || "Unknown Author"}</span>
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
                      <span className="text-sm text-muted-foreground block">
                        {book.kindle_price || book.paperback_price ? "Hardcover" : "Price"}
                      </span>
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
                      {isAmazonLink ? "Buy on Amazon" : "Get Your Copy"}
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
                  <div className="flex gap-4 items-start">
                    {book.author_photo_url && (
                      <img
                        src={book.author_photo_url}
                        alt={book.author_name}
                        className="w-16 h-16 rounded-full object-cover shrink-0"
                      />
                    )}
                    <div>
                      <p className="text-sm leading-relaxed text-muted-foreground mb-3">
                        {book.author_bio}
                      </p>
                      <p className="text-sm font-semibold text-secondary">
                        {book.author_name}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Amazon Bestseller Proof */}
              {book.bestseller_proof_url && (
                <div className="rounded-lg border border-border p-6">
                  <h3 className="font-heading text-lg font-bold mb-4">Amazon Bestseller Proof</h3>
                  <img
                    src={book.bestseller_proof_url}
                    alt={`${book.title} Amazon Bestseller ranking`}
                    className="w-full rounded-lg shadow-md"
                  />
                </div>
              )}

              {/* Get the Full Experience — live Authors Bureau products tied to this book */}
              {products.length > 0 && (
                <div className="rounded-lg border border-secondary/30 bg-secondary/5 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5 text-secondary" />
                    <h3 className="font-heading text-xl font-bold">Get the Full Experience</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5">
                    Workbooks, courses, coaching, and more from {book.author_name || "this author"} — built around the ideas in this book.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {products.map((p) => {
                      const title = p.personalised_name || p.node_name || "Product";
                      const price = p.price_usd != null
                        ? `${(p.currency || "USD").toUpperCase() === "USD" ? "$" : ""}${Number(p.price_usd).toFixed(2)}`
                        : null;
                      return (
                        <div key={p.id} className="rounded-lg bg-background border border-border p-4 flex flex-col">
                          <p className="font-semibold text-sm mb-1 line-clamp-2">{title}</p>
                          {price && (
                            <p className="text-secondary font-bold text-sm mb-3">{price}</p>
                          )}
                          <div className="mt-auto">
                            <BuyNowButton
                              authorNodeId={p.id}
                              authorId={book.author_id}
                              fallbackUrl={p.delivery_url}
                              label="Buy Now"
                              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full text-xs h-9 font-semibold"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Newsletter Signup */}
              <NewsletterSignup bookId={book.id} authorName={book.author_name || "this author"} />

              {/* Call to Action */}
              <div className="rounded-lg bg-gradient-to-r from-secondary/10 to-secondary/5 border border-secondary/20 p-8 text-center">
                <h3 className="font-heading text-xl font-bold mb-3">Ready to Read?</h3>
                <p className="text-muted-foreground mb-6">
                  {isAmazonLink ? "Discover why readers love this book. Available on Amazon in multiple formats." : "Discover why readers love this book. Get your copy today."}
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
