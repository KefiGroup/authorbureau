import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Star, ShoppingCart, BookOpen, Award, Quote, CheckCircle2, ArrowRight } from "lucide-react";
import { getBookBySlug } from "@/data/authors";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BadgeDisplay from "@/components/BadgeDisplay";
import BookCard from "@/components/BookCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import paulinePhoto from "@/assets/pauline-teo.jpeg";
import bobPhoto from "@/assets/bob-battista.jpg";
import besuckcessfulCover from "@/assets/besuckcessful-cover.jpg";
import hiCover from "@/assets/hemispheric-intelligence-cover.png";
import viCover from "@/assets/value-investing-women-cover.png";
import ilbCover from "@/assets/invest-like-buffett-cover.jpg";

const photoMap: Record<string, string> = {
  "pauline-teo": paulinePhoto,
  "robert-battista": bobPhoto,
};
const coverMap: Record<string, string> = {
  "be-suckcessful": besuckcessfulCover,
  "hemispheric-intelligence": hiCover,
  "value-investing-for-women": viCover,
  "invest-like-buffett": ilbCover,
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
  const result = getBookBySlug(slug || "");

  if (!result) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-secondary" />
          </div>
          <h1 className="font-heading text-3xl font-bold">Book not found</h1>
          <p className="text-muted-foreground mt-2">The book you're looking for doesn't exist.</p>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/directory">Browse Authors</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const { book, author } = result;
  const otherBooks = author.books.filter((b) => b.slug !== book.slug);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* ==================== HERO ==================== */}
      <section className="relative overflow-hidden bg-primary py-20 text-primary-foreground">
        <div className="container relative z-10">
          <Link to={`/authors/${author.slug}`} className="mb-6 inline-flex items-center gap-1 text-sm text-primary-foreground/60 hover:text-secondary transition-colors">
            <ArrowLeft className="h-4 w-4" /> {author.name}
          </Link>

          <div className="flex flex-col items-center gap-12 lg:flex-row">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="flex-shrink-0"
            >
              <img
                src={coverMap[book.slug]}
                alt={book.title}
                className="h-80 rounded-xl object-contain shadow-2xl lg:h-[420px]"
              />
            </motion.div>

            <motion.div initial="hidden" animate="visible" className="text-center lg:text-left flex-1">
              {/* Badges */}
              <motion.div variants={fadeUp} custom={0} className="mb-4 flex flex-wrap justify-center gap-2 lg:justify-start">
                {book.badges.map((b) => (
                  <span key={b} className="inline-flex items-center gap-1.5 rounded-full bg-secondary/20 px-3 py-1 text-sm font-semibold text-secondary">
                    <Star className="h-3 w-3" /> {b}
                  </span>
                ))}
              </motion.div>

              <motion.h1 variants={fadeUp} custom={1} className="font-heading text-4xl font-bold md:text-5xl">
                {book.title}
              </motion.h1>
              <motion.p variants={fadeUp} custom={2} className="mt-2 text-xl italic text-primary-foreground/70">
                {book.subtitle}
              </motion.p>
              <motion.p variants={fadeUp} custom={3} className="mt-2 text-primary-foreground/60">
                by{" "}
                <Link to={`/authors/${author.slug}`} className="text-secondary hover:underline font-medium">
                  {author.name}
                </Link>
              </motion.p>

              {/* CTA Buttons */}
              <motion.div variants={fadeUp} custom={4} className="mt-8 flex flex-wrap justify-center gap-4 lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-semibold shadow-[var(--shadow-gold)] rounded-full px-8"
                >
                  <a href={book.amazonUrl} target="_blank" rel="noopener noreferrer">
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Order on Amazon
                  </a>
                </Button>
              </motion.div>

              {book.price && (
                <motion.p variants={fadeUp} custom={5} className="mt-3 text-sm text-primary-foreground/50">
                  Available from {book.price}
                </motion.p>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ==================== ABOUT THE BOOK ==================== */}
      <section className="py-16">
        <div className="container max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.div variants={fadeUp} custom={0} className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-secondary" />
              </div>
              <h2 className="font-heading text-2xl font-bold">About the Book</h2>
            </motion.div>
            <motion.p variants={fadeUp} custom={1} className="text-lg leading-relaxed text-muted-foreground">
              {book.description}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ==================== BESTSELLER PROOF ==================== */}
      {book.badges.length > 0 && (
        <section className="border-y border-border bg-muted/30 py-16">
          <div className="container max-w-4xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-secondary" />
              </div>
              <h2 className="font-heading text-2xl font-bold">Bestseller Status</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {book.badges.map((badge) => (
                <div key={badge} className="inline-flex items-center gap-2 rounded-xl bg-card border border-border px-5 py-3 shadow-[var(--shadow-card)]">
                  <Star className="h-5 w-5 text-secondary" />
                  <span className="font-semibold">{badge}</span>
                  <span className="text-muted-foreground text-sm">on Amazon</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================== AUTHOR BIO ==================== */}
      <section className="py-16">
        <div className="container max-w-4xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Quote className="h-5 w-5 text-secondary" />
            </div>
            <h2 className="font-heading text-2xl font-bold">About the Author</h2>
          </div>
          <Card className="border-0 shadow-[var(--shadow-card)] rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-48 flex-shrink-0">
                  <img
                    src={photoMap[author.slug]}
                    alt={author.name}
                    className="w-full h-48 sm:h-full object-cover"
                  />
                </div>
                <div className="p-6 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-heading text-xl font-bold">{author.name}</h3>
                    <BadgeDisplay level={author.badge} size="sm" />
                  </div>
                  <p className="text-sm text-secondary font-medium">{author.title}</p>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{author.shortBio}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {author.credentials.slice(0, 3).map((c) => (
                      <span key={c} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-secondary" /> {c}
                      </span>
                    ))}
                  </div>
                  <Link
                    to={`/authors/${author.slug}`}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-secondary hover:underline"
                  >
                    View Full Profile <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ==================== MORE BOOKS ==================== */}
      {otherBooks.length > 0 && (
        <section className="border-t border-border bg-muted/30 py-16">
          <div className="container">
            <h2 className="mb-8 font-heading text-2xl font-bold">
              More by {author.name}
            </h2>
            <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
              {otherBooks.map((b) => (
                <BookCard key={b.slug} book={b} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================== FINAL CTA ==================== */}
      <section className="py-16">
        <div className="container max-w-3xl text-center">
          <h2 className="mb-4 font-heading text-3xl font-bold">
            Get Your <span className="italic text-secondary">Copy</span>
          </h2>
          <p className="mx-auto mb-6 max-w-md text-muted-foreground">
            Available on Amazon in Kindle and paperback formats.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold shadow-[var(--shadow-gold)] rounded-full px-8"
          >
            <a href={book.amazonUrl} target="_blank" rel="noopener noreferrer">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Buy on Amazon
            </a>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
