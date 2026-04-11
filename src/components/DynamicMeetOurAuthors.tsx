import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, BookOpen, Settings2, ChevronUp, ChevronDown, Check, X, ZoomIn, ZoomOut } from "lucide-react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  photo_crop_y?: string;
  photo_zoom?: number;
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
  const { isAdmin } = useAuth();
  const [editingCrop, setEditingCrop] = useState<string | null>(null);
  const [cropDraft, setCropDraft] = useState<number>(0);
  const [zoomDraft, setZoomDraft] = useState<number>(1);
  const [savingCrop, setSavingCrop] = useState(false);

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
          .from("author_profiles_public" as any)
          .select("user_id, pen_name, bio_short, genres, photo_url, author_slug, directory_status, photo_crop_y, photo_zoom")
          .in("directory_status", ["listed", "verified", "featured"]);

        if (authError) throw authError;

        // Fetch all published books (from Cloud project)
        const { data: booksData, error: booksError } = await cloudSupabase
          .from("books")
          .select("id, title, subtitle, slug, cover_image_url, rating, pages, badges, amazon_url, author_id, author_name")
          .not("published_at", "is", null);

        if (booksError) throw booksError;

        // Map books to authors by author_id
        const booksById = new Map<string, typeof booksData>();
        const booksByName = new Map<string, typeof booksData>();
        (booksData || []).forEach((book) => {
          if (!booksById.has(book.author_id)) booksById.set(book.author_id, []);
          booksById.get(book.author_id)!.push(book);
          if (book.author_name) {
            if (!booksByName.has(book.author_name)) booksByName.set(book.author_name, []);
            booksByName.get(book.author_name)!.push(book);
          }
        });

        // Transform and filter authors with books (merge by id + pen_name)
        const transformedAuthors = (authorsData || [])
          .map((author: any) => {
            const byId = booksById.get(author.user_id) || [];
            const byName = author.pen_name ? (booksByName.get(author.pen_name) || []) : [];
            const seen = new Set(byId.map((b: any) => b.id));
            const merged = [...byId];
            for (const b of byName) {
              if (!seen.has(b.id)) { seen.add(b.id); merged.push(b); }
            }
            return {
              id: author.user_id,
              slug: author.author_slug || author.user_id,
              name: author.pen_name || "Author",
              bio_short: author.bio_short,
              photo_url: author.photo_url,
              photo_crop_y: author.photo_crop_y,
              photo_zoom: author.photo_zoom,
              genres: author.genres || [],
              books: merged,
            };
          })
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

  const startCropEdit = (authorId: string, currentCropY: string | undefined, currentZoom: number | undefined) => {
    setEditingCrop(authorId);
    setCropDraft(parseInt(currentCropY || "0", 10));
    setZoomDraft(currentZoom || 1);
  };

  const saveCropEdit = async () => {
    if (!editingCrop) return;
    setSavingCrop(true);
    try {
      await cloudSupabase
        .from("author_profiles")
        .update({ photo_crop_y: `${cropDraft}%`, photo_zoom: zoomDraft } as any)
        .eq("user_id", editingCrop);
      setAuthors((prev) =>
        prev.map((a) => (a.id === editingCrop ? { ...a, photo_crop_y: `${cropDraft}%`, photo_zoom: zoomDraft } : a))
      );
    } catch (err) {
      console.error("Failed to save crop:", err);
    }
    setSavingCrop(false);
    setEditingCrop(null);
  };

  if (isLoading) {
    return (
      <section id="featured-authors" className="py-24" style={{ background: "var(--gradient-hero)" }}>
        <div className="container">
          <div className="text-center mb-16">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
              Featured Authors
            </p>
            <h2 className="font-heading text-3xl font-bold md:text-4xl text-primary-foreground">
              Meet Our Amazon Best Selling Authors
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
            Meet Our Amazon Best Selling Authors
          </motion.h2>
        </motion.div>

        <div className="relative px-6">
          {/* Carousel */}
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex -ml-5">
              {authors.map((author, i) => (
                <motion.div
                  key={author.id}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                  variants={fadeUp}
                  className="min-w-0 flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] pl-5"
                >
                  <Link
                    to={`/authors/${author.slug}`}
                    className="group block overflow-hidden rounded-2xl bg-card shadow-lg hover:shadow-xl transition-all duration-300 h-full flex flex-col border-b-4 border-secondary/60"
                  >
                    {/* Photo */}
                    <div className="relative h-80 bg-muted/30 overflow-hidden">
                      {author.photo_url ? (
                        <div
                          role="img"
                          aria-label={author.name}
                          className="w-full h-full group-hover:scale-105 transition-transform duration-500 bg-muted/50"
                          style={{
                            backgroundImage: `url(${author.photo_url})`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: `50% ${editingCrop === author.id ? `${cropDraft}%` : (author.photo_crop_y || '30%')}`,
                            backgroundSize: `${(editingCrop === author.id ? zoomDraft : (author.photo_zoom || 1)) * 100}%`,
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted/50">
                          <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-card/40 to-transparent" />

                      {/* Admin crop controls */}
                      {isAdmin && author.photo_url && editingCrop !== author.id && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); startCropEdit(author.id, author.photo_crop_y, author.photo_zoom); }}
                          className="absolute top-2 right-2 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
                          title="Adjust photo position"
                        >
                          <Settings2 className="h-4 w-4" />
                        </button>
                      )}
                      {isAdmin && editingCrop === author.id && (
                        <div
                          className="absolute top-2 right-2 z-10 bg-black/80 rounded-lg p-2 flex flex-col items-center gap-1"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        >
                          <span className="text-secondary text-[10px] font-bold uppercase tracking-wider">Pan</span>
                          <button onClick={() => setCropDraft((v) => Math.max(0, v - 2))} className="text-white hover:text-secondary">
                            <ChevronUp className="h-5 w-5" />
                          </button>
                          <span className="text-white text-xs font-mono">{cropDraft}%</span>
                          <button onClick={() => setCropDraft((v) => Math.min(50, v + 2))} className="text-white hover:text-secondary">
                            <ChevronDown className="h-5 w-5" />
                          </button>
                          <div className="w-full h-px bg-white/20 my-1" />
                          <span className="text-secondary text-[10px] font-bold uppercase tracking-wider">Zoom</span>
                          <button onClick={() => setZoomDraft((v) => Math.min(3, +(v + 0.1).toFixed(2)))} className="text-white hover:text-secondary">
                            <ZoomIn className="h-5 w-5" />
                          </button>
                          <span className="text-white text-xs font-mono">{Math.round(zoomDraft * 100)}%</span>
                          <button onClick={() => setZoomDraft((v) => Math.max(0.5, +(v - 0.1).toFixed(2)))} className="text-white hover:text-secondary">
                            <ZoomOut className="h-5 w-5" />
                          </button>
                          <div className="flex gap-1 mt-1">
                            <button onClick={() => setEditingCrop(null)} className="text-red-400 hover:text-red-300">
                              <X className="h-4 w-4" />
                            </button>
                            <button onClick={saveCropEdit} disabled={savingCrop} className="text-green-400 hover:text-green-300">
                              <Check className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
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
                          <div
                            key={book.id}
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
                          </div>
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
