import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, BookOpen, Mic, MapPin } from "lucide-react";
import { useState } from "react";
import { authors } from "@/data/authors";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BadgeDisplay from "@/components/BadgeDisplay";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import paulinePhoto from "@/assets/pauline-teo-headshot.jpg";
import bobPhoto from "@/assets/bob-battista-headshot.jpg";
import feliciaPhoto from "@/assets/felicia-tan.png";

const photoMap: Record<string, string> = {
  "pauline-teo": paulinePhoto,
  "robert-battista": bobPhoto,
  "felicia-tan": feliciaPhoto,
};

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

  const allGenres = [...new Set(authors.flatMap((a) => a.genres))];

  const filtered = authors.filter((a) => {
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

          {/* Results - rich cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((author, i) => (
              <motion.div
                key={author.slug}
                initial="hidden"
                animate="visible"
                custom={i}
                variants={fadeUp}
              >
                <Link to={`/authors/${author.slug}`}>
                  <Card className="group overflow-hidden border-0 bg-card rounded-2xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 cursor-pointer">
                    <CardContent className="p-0">
                      {/* Photo area */}
                      <div className="relative h-56 bg-muted/50 overflow-hidden">
                        <img
                          src={photoMap[author.slug]}
                          alt={author.name}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 right-3">
                          <BadgeDisplay level={author.badge} size="sm" />
                        </div>
                      </div>
                      <div className="p-5">
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

                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {author.genres.slice(0, 3).map((genre) => (
                            <span
                              key={genre}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>

                        <Button variant="outline" size="sm" className="w-full mt-4 rounded-full border-secondary/20 text-secondary hover:bg-secondary hover:text-secondary-foreground text-xs">
                          View Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
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
