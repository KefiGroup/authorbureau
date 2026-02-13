import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useState } from "react";
import { authors } from "@/data/authors";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import paulinePhoto from "@/assets/pauline-teo.jpeg";
import bobPhoto from "@/assets/bob-battista.jpg";

const photoMap: Record<string, string> = {
  "pauline-teo": paulinePhoto,
  "robert-battista": bobPhoto,
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 } as const,
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

      <section className="border-b border-border bg-primary py-16 text-primary-foreground">
        <div className="container text-center">
          <h1 className="mb-4 font-heading text-4xl font-bold">Author Directory</h1>
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
                className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-secondary/50"
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

          {/* Results */}
          <div className="grid gap-6 md:grid-cols-2">
            {filtered.map((author, i) => (
              <motion.div
                key={author.slug}
                initial="hidden"
                animate="visible"
                custom={i}
                variants={fadeUp}
              >
                <Link
                  to={`/authors/${author.slug}`}
                  className="group flex overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-card-hover)]"
                >
                  <div className="flex-shrink-0 p-5">
                    <img
                      src={photoMap[author.slug]}
                      alt={author.name}
                      className="h-28 w-28 rounded-xl object-cover"
                    />
                  </div>
                  <div className="flex-1 p-5 pl-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-semibold text-secondary">
                        ✦ PublishNow Verified
                      </span>
                    </div>
                    <h3 className="font-heading text-lg font-bold group-hover:text-secondary transition-colors">
                      {author.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{author.title}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {author.books.length} book{author.books.length > 1 ? "s" : ""} · {author.genres.join(", ")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {author.services.map((s) => (
                        <span key={s} className="rounded bg-accent/10 px-2 py-0.5 text-xs text-accent">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
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
