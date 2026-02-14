import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Star, ShoppingCart, BookOpen, Award, Quote, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { getBookBySlug } from "@/data/authors";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BadgeDisplay from "@/components/BadgeDisplay";
import BookCard from "@/components/BookCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

import paulinePhoto from "@/assets/pauline-teo.jpeg";
import bobPhoto from "@/assets/bob-battista.jpg";
import feliciaPhoto from "@/assets/felicia-tan-headshot.png";
import amazonBestsellerFelicia from "@/assets/amazon-bestseller-felicia.jpeg";
import amazonBestsellerPauline from "@/assets/amazon-bestseller-pauline.jpeg";
import amazonBestsellerBob from "@/assets/amazon-bestseller-bob.png";
import besuckcessfulCover from "@/assets/besuckcessful-cover.jpg";
import hiCover from "@/assets/hemispheric-intelligence-cover.png";
import viCover from "@/assets/value-investing-women-cover.png";
import ilbCover from "@/assets/invest-like-buffett-cover.jpg";
import tobabywithlove from "@/assets/to-baby-with-love-cover.png";
import lostandfound from "@/assets/lost-and-found-cover.png";
import giftfromheaven from "@/assets/gift-from-heaven-cover.png";

const photoMap: Record<string, string> = {
  "pauline-teo": paulinePhoto,
  "robert-battista": bobPhoto,
  "felicia-tan": feliciaPhoto,
};
const coverMap: Record<string, string> = {
  "be-suckcessful": besuckcessfulCover,
  "hemispheric-intelligence": hiCover,
  "value-investing-for-women": viCover,
  "invest-like-buffett": ilbCover,
  "to-baby-with-love": tobabywithlove,
  "lost-and-found": lostandfound,
  "a-gift-from-heaven": giftfromheaven,
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 } as const,
  }),
};

export default function BookMicrosite() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [dbBook, setDbBook] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDbBook = async () => {
      try {
        const { data, error } = await supabase
          .from("books")
          .select("*")
          .eq("slug", slug || "")
          .maybeSingle();

        if (!error && data) {
          setDbBook(data);
        }
      } catch (err) {
        console.error("Failed to fetch book:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDbBook();

    // Safety timeout
    const timeout = setTimeout(() => setIsLoading(false), 5000);
    return () => clearTimeout(timeout);
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  const hardcoded = getBookBySlug(slug || "");
  const result = dbBook || hardcoded;

  if (!result) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-20 text-center">
          <h1 className="font-heading text-2xl font-bold mb-4">Book Not Found</h1>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back Home
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  // Handle both hardcoded and DB data formats
  const book = dbBook
    ? {
        title: dbBook.title,
        subtitle: dbBook.subtitle,
        description: dbBook.description,
        rating: dbBook.rating,
        reviewCount: dbBook.review_count,
        pages: dbBook.pages,
        genre: dbBook.genre,
        badges: dbBook.badges || [],
        price: dbBook.price,
        amazonUrl: dbBook.amazon_url,
        cover: dbBook.cover_image_url || "",
        authorName: dbBook.author_name,
        authorBio: dbBook.author_bio || "",
      }
    : {
        title: hardcoded!.book.title,
        subtitle: hardcoded!.book.subtitle,
        description: hardcoded!.book.description,
        rating: hardcoded!.book.rating,
        reviewCount: hardcoded!.book.reviewCount,
        pages: hardcoded!.book.pages,
        genre: hardcoded!.book.genre,
        badges: hardcoded!.book.badges || [],
        price: hardcoded!.book.kindlePrice || hardcoded!.book.paperbackPrice,
        amazonUrl: hardcoded!.book.amazonUrl,
        cover: coverMap[hardcoded!.book.slug] || "",
        authorName: hardcoded!.author.name,
        authorBio: hardcoded!.author.shortBio,
      };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border bg-primary py-12 text-primary-foreground">
        <div className="container relative z-10">
          <motion.button
            onClick={() => navigate("/")}
            className="mb-6 flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </motion.button>

          <motion.div initial="hidden" animate="visible" className="mx-auto max-w-3xl">
            <motion.div variants={fadeUp} custom={0}>
              <h1 className="mb-2 font-heading text-4xl font-bold leading-tight md:text-5xl">
                {book.title}
              </h1>
            </motion.div>

            {book.subtitle && (
              <motion.p variants={fadeUp} custom={1} className="mb-4 text-xl italic text-primary-foreground/80">
                {book.subtitle}
              </motion.p>
            )}

            <motion.p variants={fadeUp} custom={2} className="text-primary-foreground/70">
              by <span className="font-semibold">{book.authorName}</span>
            </motion.p>

            {/* Badges */}
            {book.badges && book.badges.length > 0 && (
              <motion.div variants={fadeUp} custom={3} className="mt-4 flex flex-wrap gap-2">
                {book.badges.map((badge: string) => (
                  <span key={badge} className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-3 py-1 text-xs font-semibold text-secondary">
                    ⭐ {badge}
                  </span>
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container max-w-4xl">
          <motion.div initial="hidden" animate="visible" className="grid gap-12 lg:grid-cols-3">
            {/* Sidebar */}
            <motion.div variants={fadeUp} custom={0} className="lg:col-span-1">
              <div className="sticky top-24">
                {/* Cover */}
                {book.cover && (
                  <img
                    src={book.cover}
                    alt={book.title}
                    className="mb-6 w-full rounded-lg shadow-xl"
                  />
                )}

                {/* Stats */}
                <div className="mb-6 space-y-3">
                  {book.rating && (
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm">
                      <span className="text-muted-foreground">Rating</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold">{book.rating}</span>
                        <Star className="h-4 w-4 fill-secondary text-secondary" />
                      </div>
                    </div>
                  )}
                  {book.reviewCount && (
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm">
                      <span className="text-muted-foreground">Reviews</span>
                      <span className="font-bold">{book.reviewCount.toLocaleString()}</span>
                    </div>
                  )}
                  {book.pages && (
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm">
                      <span className="text-muted-foreground">Pages</span>
                      <span className="font-bold">{book.pages}</span>
                    </div>
                  )}
                  {book.genre && (
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm">
                      <span className="text-muted-foreground">Genre</span>
                      <span className="font-bold">{book.genre}</span>
                    </div>
                  )}
                </div>

                {/* Price */}
                {book.price && (
                  <div className="mb-6 rounded-lg bg-secondary/10 border border-secondary/20 p-4 text-center">
                    <p className="mb-2 text-sm text-muted-foreground">Starting from</p>
                    <p className="font-heading text-2xl font-bold text-secondary">{book.price}</p>
                  </div>
                )}

                {/* CTA Button */}
                {book.amazonUrl && (
                  <Button
                    asChild
                    className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full font-semibold"
                  >
                    <a href={book.amazonUrl} target="_blank" rel="noopener noreferrer">
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
                <h2 className="mb-4 font-heading text-2xl font-bold">About This Book</h2>
                <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                  {book.description}
                </p>
              </div>

              {/* Amazon Bestseller Proof - Felicia Tan */}
              {slug === "to-baby-with-love" && (
                <motion.div variants={fadeUp} custom={2}>
                  <Card className="overflow-hidden border-2 border-secondary/30">
                    <CardContent className="p-0">
                      <div className="bg-secondary/10 px-6 py-3 border-b border-secondary/20">
                        <div className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-secondary" />
                          <h3 className="font-heading text-lg font-bold">#1 Amazon Best Seller</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Ranked #1 in Young Adult Health Books on Sexuality &amp; Pregnancy on Amazon India
                        </p>
                      </div>
                      <img
                        src={amazonBestsellerFelicia}
                        alt="To Baby With Love - #1 Amazon Best Seller in Young Adult Health Books on Sexuality & Pregnancy"
                        className="w-full"
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Amazon Bestseller Proof - Pauline Teo */}
              {slug === "be-suckcessful" && (
                <motion.div variants={fadeUp} custom={2}>
                  <Card className="overflow-hidden border-2 border-secondary/30">
                    <CardContent className="p-0">
                      <div className="bg-secondary/10 px-6 py-3 border-b border-secondary/20">
                        <div className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-secondary" />
                          <h3 className="font-heading text-lg font-bold">#1 Amazon Best Seller</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Ranked #1 in College &amp; University Financial Aid on Amazon USA
                        </p>
                      </div>
                      <img
                        src={amazonBestsellerPauline}
                        alt="Be SUCKcessful - #1 Amazon Best Seller in Parenting Emotions & Feelings"
                        className="w-full"
                      />
                    </CardContent>
                  </Card>
                </motion.div>
               )}

              {/* Amazon Bestseller Proof - Robert Battista */}
              {slug === "hemispheric-intelligence" && (
                <motion.div variants={fadeUp} custom={2}>
                  <Card className="overflow-hidden border-2 border-secondary/30">
                    <CardContent className="p-0">
                      <div className="bg-secondary/10 px-6 py-3 border-b border-secondary/20">
                        <div className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-secondary" />
                          <h3 className="font-heading text-lg font-bold">#1 Amazon Best Seller & Hot New Release</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          #1 Hot New Release and Best Seller in Epistemology on Amazon USA
                        </p>
                      </div>
                      <img
                        src={amazonBestsellerBob}
                        alt="Hemispheric Intelligence - #1 Amazon Best Seller in Epistemology"
                        className="w-full"
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

               {/* Author Bio */}
              {book.authorBio && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="mb-3 font-heading text-lg font-bold">About the Author</h3>
                    <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{book.authorBio}</p>
                    <p className="text-sm font-semibold text-secondary">{book.authorName}</p>
                  </CardContent>
                </Card>
              )}

              {/* Call to Action */}
              <Card className="border-2 border-secondary/30 bg-gradient-to-br from-secondary/5 to-transparent">
                <CardContent className="pt-8 text-center">
                  <Quote className="mx-auto mb-3 h-6 w-6 text-secondary/60" />
                  <h3 className="mb-2 font-heading text-xl font-bold">Ready to Discover This Book?</h3>
                  <p className="mb-6 text-muted-foreground">
                    Join thousands of readers who have enjoyed this powerful book.
                  </p>
                  {book.amazonUrl && (
                    <Button
                      asChild
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full font-semibold"
                    >
                      <a href={book.amazonUrl} target="_blank" rel="noopener noreferrer">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Buy Now
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Footer */}
              <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
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
