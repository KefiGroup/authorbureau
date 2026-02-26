import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";

interface BookWithAuthor {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  cover_image_url?: string;
  rating?: number;
  pages?: number;
  badges?: string[];
  amazon_url?: string;
}

interface AuthorWithBooks {
  id: string;
  slug: string;
  name: string;
  bio_short?: string;
  photo_url?: string;
  genres?: string[];
  books: BookWithAuthor[];
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

export default function DynamicMeetOurAuthors() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [authors, setAuthors] = useState<AuthorWithBooks[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  useEffect(() => {
    const fetchAuthorsWithBooks = async () => {
      try {
        // Fetch author profiles from Cloud DB (already synced)
        const { data: authorsData, error: authError } = await cloudSupabase
          .from("author_profiles")
          .select("user_id, pen_name, bio_short, genres, photo_url, author_slug, directory_status")
          .in("directory_status", ["listed", "verified", "featured"]);

        if (authError) throw authError;

        // Fetch all published books (from Cloud project)
        const { data: booksData, error: booksError } = await cloudSupabase
          .from("books")
          .select("id, title, subtitle, slug, cover_image_url, rating, pages, badges, amazon_url, author_id")
          .not("published_at", "is", null);

        if (booksError) throw booksError;

        // Map books to authors
        const booksMap = new Map<string, typeof booksData>();
        (booksData || []).forEach((book) => {
          if (!booksMap.has(book.author_id)) {
            booksMap.set(book.author_id, []);
          }
          booksMap.get(book.author_id)!.push(book);
        });

        // Transform and filter authors with books
        const transformedAuthors = (authorsData || [])
          .map((author: any) => ({
            id: author.user_id,
            slug: author.author_slug || author.user_id,
            name: author.pen_name || "Author",
            bio_short: author.bio_short,
            photo_url: author.photo_url,
            genres: author.genres || [],
            books: booksMap.get(author.user_id) || [],
          }))
          .filter((author) => author.books.length > 0);

        setAuthors(transformedAuthors);
      } catch (err) {
        console.error("Failed to fetch authors:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuthorsWithBooks();
  }, []);

  if (isLoading) {
    return (
      <section id="featured-authors" className="py-24" style={{ background: "var(--gradient-hero)" }}>
        <div className="container">
          <div className="text-center mb-16">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
              Featured Authors
            </p>
            <h2 className="font-heading text-3xl font-bold md:text-4xl text-primary-foreground">
              Meet Our Authors
            </h2>
          </div>
          <div className="text-center text-muted-foreground">Loading authors...</div>
        </div>
      </section>
    );
  }

  if (authors.length === 0) {
    return null;
  }

  return (
    <section id="featured-authors" className="py-24" style={{ background: "var(--gradient-hero)" }}>
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mb-16 text-center"
        >
          <motion.p
            variants={fadeUp}
            custom={0}
            className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary"
          >
            Featured Authors
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="font-heading text-3xl font-bold md:text-4xl text-primary-foreground"
          >
            Meet Our Authors
          </motion.h2>
        </motion.div>

        <div className="relative px-6">
          {/* Carousel */}
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-8">
              {authors.map((author, i) => (
                <motion.div
                  key={author.id}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                  variants={fadeUp}
                  className="min-w-0 flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
                >
                  <Link
                    to={`/authors/${author.slug}`}
                    className="group block overflow-hidden rounded-2xl bg-card shadow-lg hover:shadow-xl transition-all duration-300 h-full flex flex-col border-b-4 border-secondary/60"
                  >
                    {/* Photo */}
                    <div className="relative h-80 bg-muted/30 overflow-hidden">
                      {author.photo_url ? (
                        <img
                          src={author.photo_url}
                          alt={author.name}
                          className="w-full h-full object-cover object-[center_30%] group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted/50">
                          <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-card/40 to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 flex flex-col">
                      <h3 className="font-heading text-lg font-bold group-hover:text-secondary transition-colors mb-1">
                        {author.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 flex-1 leading-relaxed line-clamp-2">
                        {author.bio_short || "Published author"}
                      </p>

                      {/* Books */}
                      <div className="mt-4 flex items-center gap-3 pb-4 border-b border-border/50">
                        {author.books.slice(0, 3).map((book) => (
                          <Link
                            key={book.id}
                            to={`/books/${book.slug}`}
                            className="group/book relative"
                          >
                            {book.cover_image_url ? (
                              <img
                                src={book.cover_image_url}
                                alt={book.title}
                                className="h-16 rounded shadow-md object-contain hover:scale-110 transition-transform"
                              />
                            ) : (
                              <div className="flex h-16 w-12 items-center justify-center rounded bg-muted/80 shadow-md border border-border/50">
                                <BookOpen className="h-4 w-4 text-muted-foreground/50" />
                              </div>
                            )}
                            {book.rating && (
                              <div className="absolute -top-2 -right-2 bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs font-bold shadow-md">
                                {book.rating}★
                              </div>
                            )}
                          </Link>
                        ))}
                      </div>

                      {/* Genres */}
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {author.genres.slice(0, 3).map((g) => (
                          <span
                            key={g}
                            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Navigation arrows */}
          <button
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canScrollPrev}
            className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-[var(--shadow-gold)] disabled:opacity-30 hover:bg-secondary/90 transition-colors"
            aria-label="Previous author"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canScrollNext}
            className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-[var(--shadow-gold)] disabled:opacity-30 hover:bg-secondary/90 transition-colors"
            aria-label="Next author"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
