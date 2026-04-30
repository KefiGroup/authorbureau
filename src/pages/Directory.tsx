import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, BookOpen, Mic, ArrowUpDown } from "lucide-react";
import { useState, useEffect } from "react";
import { authors as staticAuthors } from "@/data/authors";

import { Card, CardContent } from "@/components/ui/card";
import BadgeDisplay from "@/components/BadgeDisplay";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DirectoryGridSkeleton from "@/components/DirectoryGridSkeleton";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

import paulinePhoto from "@/assets/pauline-teo-headshot.webp";
import feliciaPhoto from "@/assets/felicia-tan-headshot.png";

const staticPhotoMap: Record<string, string> = {
  "pauline-teo": paulinePhoto,
  "felicia-tan": feliciaPhoto,
};

interface DirectoryAuthor {
  slug: string;
  name: string;
  photo: string;
  title: string;
  shortBio: string;
  genres: string[];
  badge: "listed" | "verified" | "featured" | "ab-verified";
  services: string[];
  books: { slug: string; title: string; coverImage: string; badges: string[]; rating?: number }[];
  websiteUrl?: string;
  linkedinUrl?: string;
  amazonAuthorUrl?: string;
  isStatic?: boolean;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5 } as const,
  }),
};

export default function Directory() {
  useDocumentMeta({
    title: "Author Directory — Authors Bureau | Discover Published Authors",
    description: "Browse the Authors Bureau directory of published authors. Discover their books, courses, podcasts, and ways to connect — all in one place.",
    ogTitle: "Author Directory — Authors Bureau",
    ogDescription: "Browse the Authors Bureau directory of published authors. Discover their books, courses, podcasts, and ways to connect.",
    ogImage: "https://authorsbureau.com/og-image.jpg",
    ogUrl: "https://authorsbureau.com/directory",
    canonical: "https://authorsbureau.com/directory",
    twitterCard: "summary_large_image",
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(searchParams.get("genre") || null);
  const [sortBy, setSortBy] = useState<string>(searchParams.get("sort") || "featured");
  const [dynamicAuthors, setDynamicAuthors] = useState<DirectoryAuthor[]>([]);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch dynamic authors from DB
  useEffect(() => {
    const fetchDynamic = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-directory-authors`,
          { method: "POST", headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, body: "{}" }
        );
        if (res.ok) {
          const data = await res.json();
          setDynamicAuthors(data.authors || []);
        }
      } catch (err) {
        console.error("Failed to fetch directory authors:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDynamic();
  }, []);

  // Merge: static authors + dynamic (excluding duplicates)
  const staticSlugs = new Set(staticAuthors.map((a) => a.slug));
  const staticMapped: DirectoryAuthor[] = staticAuthors.map((a) => ({
    slug: a.slug,
    name: a.name,
    photo: staticPhotoMap[a.slug] || a.photo,
    title: a.title,
    shortBio: a.shortBio,
    genres: a.genres,
    badge: a.badge,
    services: a.services,
    books: a.books.map((b) => ({
      slug: b.slug,
      title: b.title,
      coverImage: b.coverImage,
      badges: b.badges,
      rating: b.rating,
    })),
    websiteUrl: a.websiteUrl,
    linkedinUrl: a.linkedinUrl,
    amazonAuthorUrl: a.amazonAuthorUrl,
    isStatic: true,
  }));

  // Dynamic authors that don't overlap with static
  const dynamicNew = dynamicAuthors.filter((d) => !staticSlugs.has(d.slug));

  const allAuthors = [...staticMapped, ...dynamicNew];

  // Normalize genres: title-case + count frequency for Top 8 ordering
  const normalizeGenre = (g: string) =>
    g.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const genreCounts = new Map<string, { label: string; count: number }>();
  allAuthors.forEach((a) => {
    a.genres.forEach((g) => {
      const norm = normalizeGenre(g);
      const key = norm.toLowerCase();
      const existing = genreCounts.get(key);
      if (existing) existing.count += 1;
      else genreCounts.set(key, { label: norm, count: 1 });
    });
  });
  const allGenres = Array.from(genreCounts.values())
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((g) => g.label);

  const handleGenreFilter = (genre: string | null) => {
    setSelectedGenre(genre);
    const params = new URLSearchParams(searchParams);
    if (genre) params.set("genre", genre); else params.delete("genre");
    setSearchParams(params, { replace: true });
  };

  const filtered = allAuthors.filter((a) => {
    const matchesSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.shortBio.toLowerCase().includes(search.toLowerCase());
    const matchesGenre =
      !selectedGenre ||
      a.genres.some((g) => normalizeGenre(g).toLowerCase() === selectedGenre.toLowerCase());
    return matchesSearch && matchesGenre;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "featured") {
      const order = { "ab-verified": 0, featured: 1, verified: 2, listed: 3 };
      return (order[a.badge] ?? 3) - (order[b.badge] ?? 3);
    }
    return 0;
  });

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-border bg-primary py-16 text-primary-foreground">
        <div className="container text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-secondary">Discover</p>
          <h1 className="mb-4 font-heading text-4xl font-bold">
            Author <span className="italic text-secondary">Directory</span>
          </h1>
          <p className="mx-auto max-w-lg text-primary-foreground/70">
            Discover published authors, explore their books, and connect for
            speaking, coaching, and collaboration.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="container">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, title, or bio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-secondary/50"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-full border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-secondary/50 appearance-none cursor-pointer"
            >
              <option value="featured">Featured First</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          <div className="mb-8 flex flex-wrap gap-2">
            <button
              onClick={() => handleGenreFilter(null)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                !selectedGenre
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All
            </button>
            {(showAllGenres ? allGenres : allGenres.slice(0, 8)).map((g) => (
              <button
                key={g}
                onClick={() => handleGenreFilter(g === selectedGenre ? null : g)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedGenre === g
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {g}
              </button>
            ))}
            {allGenres.length > 8 && (
              <button
                onClick={() => setShowAllGenres((v) => !v)}
                className="rounded-full px-3 py-1.5 text-xs font-medium bg-card border border-border text-secondary hover:bg-secondary/10 transition-colors"
              >
                {showAllGenres ? "Show less" : `+ ${allGenres.length - 8} more`}
              </button>
            )}
          </div>

          {isLoading && <DirectoryGridSkeleton count={8} />}

          {!isLoading && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {sorted.map((author, i) => (
              <motion.div
                key={author.slug}
                initial="hidden"
                animate="visible"
                custom={i}
                variants={fadeUp}
              >
                <Link to={`/${author.slug}`} className="block h-full">
                  <Card className="group overflow-hidden border border-border/60 bg-card rounded-xl hover:shadow-md hover:border-secondary/30 transition-all duration-300 cursor-pointer h-full">
                    <CardContent className="p-4 flex flex-col h-full">
                      <div className="flex items-start gap-3">
                        {/* Compact avatar */}
                        <div className="relative shrink-0">
                          {author.photo ? (
                            <img
                              src={author.photo}
                              alt={author.name}
                              className="w-14 h-14 rounded-full object-cover object-top ring-2 ring-border/50 group-hover:ring-secondary/40 transition-all"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center ring-2 ring-border/50">
                              <BookOpen className="h-5 w-5 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-heading font-semibold truncate group-hover:text-secondary transition-colors">
                              {author.name}
                            </h3>
                            <BadgeDisplay level={author.badge} size="sm" showLabel={false} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3">{author.title}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/40">
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <BookOpen className="h-3 w-3 text-secondary/50" />
                          <span>{author.books.length} {author.books.length === 1 ? "Book" : "Books"}</span>
                        </div>
                        {author.services.includes("Speaking") && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Mic className="h-3 w-3 text-secondary/50" />
                            <span>Speaker</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {author.genres.slice(0, 3).map((genre) => (
                          <button
                            key={genre}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleGenreFilter(genre);
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground hover:bg-secondary/20 hover:text-secondary transition-colors"
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">
              No authors found matching your search.
            </p>
          )}
        </div>
      </section>

      {/* Get Featured CTA */}
      <section className="py-16 md:py-20 bg-[hsl(228,34%,16%)] text-white">
        <div className="container text-center max-w-2xl mx-auto">
          <h2 className="font-heading text-2xl md:text-3xl font-bold">
            Want to Be Featured?
          </h2>
          <p className="mt-4 text-white/70 text-sm md:text-base">
            Published authors can apply to join our directory. Get listed in 2-3 business days and unlock 28 revenue streams from your book.
          </p>
          <div className="mt-6">
            <Link
              to="/auth?redirect=%2Fdashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-[hsl(45,50%,54%)] px-8 py-3 font-bold text-[hsl(228,34%,16%)] hover:bg-[hsl(45,50%,46%)] transition-colors"
            >
              Apply Now
            </Link>
          </div>
          <p className="mt-3 text-xs text-white/50">Free to apply. No credit card required.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
