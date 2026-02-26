import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, BookOpen, Mic, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { authors as staticAuthors } from "@/data/authors";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BadgeDisplay from "@/components/BadgeDisplay";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import paulinePhoto from "@/assets/pauline-teo-headshot.jpg";
import bobPhoto from "@/assets/bob-battista-headshot.jpg";
import feliciaPhoto from "@/assets/felicia-tan-headshot.png";

const staticPhotoMap: Record<string, string> = {
  "pauline-teo": paulinePhoto,
  "robert-battista": bobPhoto,
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
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [dynamicAuthors, setDynamicAuthors] = useState<DirectoryAuthor[]>([]);
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

  const allGenres = [...new Set(allAuthors.flatMap((a) => a.genres))];

  const filtered = allAuthors.filter((a) => {
    const matchesSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.title.toLowerCase().includes(search.toLowerCase());
    const matchesGenre = !selectedGenre || a.genres.includes(selectedGenre);
    return matchesSearch && matchesGenre;
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
          {/* Search and filters */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search authors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-secondary/50"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedGenre(null)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  !selectedGenre
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                All
              </button>
              {allGenres.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(g === selectedGenre ? null : g)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedGenre === g
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-secondary mr-2" />
              <span className="text-muted-foreground text-sm">Loading authors...</span>
            </div>
          )}

          {/* Results */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((author, i) => (
              <motion.div
                key={author.slug}
                initial="hidden"
                animate="visible"
                custom={i}
                variants={fadeUp}
              >
                <Link to={`/authors/${author.slug}`} className="h-full block">
                  <Card className="group overflow-hidden border-0 bg-card rounded-2xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 cursor-pointer h-full flex flex-col">
                    <CardContent className="p-0 flex flex-col flex-1">
                      {/* Photo area */}
                      <div className="relative h-56 bg-muted/50 overflow-hidden">
                        {author.photo ? (
                          <img
                            src={author.photo}
                            alt={author.name}
                            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted/30">
                            <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3">
                          <BadgeDisplay level={author.badge} size="sm" />
                        </div>
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <h3 className="text-lg font-heading font-semibold group-hover:text-secondary transition-colors">
                          {author.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{author.title}</p>

                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <BookOpen className="h-3.5 w-3.5 text-secondary/60" />
                            <span>{author.books.length} Books</span>
                          </div>
                          {author.services.includes("Speaking") && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mic className="h-3.5 w-3.5 text-secondary/60" />
                              <span>Speaker</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
                          {author.genres.slice(0, 3).map((genre) => (
                            <span
                              key={genre}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>

                        <Button variant="outline" size="sm" className="w-full mt-auto rounded-full border-secondary/20 text-secondary hover:bg-secondary hover:text-secondary-foreground text-xs flex items-center justify-center">
                          View Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          {!isLoading && filtered.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">
              No authors found matching your search.
            </p>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
