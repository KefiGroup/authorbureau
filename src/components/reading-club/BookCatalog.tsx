import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Filter, Star, Play } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { CatalogBook } from "@/pages/ReadingClub";
import { Link } from "react-router-dom";

interface Props {
  books: CatalogBook[];
  user: User | null;
  activeEntryBookIds: Set<string>;
  onStartChallenge: (bookId: string) => Promise<string | null>;
}

export default function BookCatalog({ books, user, activeEntryBookIds, onStartChallenge }: Props) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");
  const [starting, setStarting] = useState<string | null>(null);

  const genres = Array.from(new Set(books.map(b => b.genre).filter(Boolean))).sort() as string[];

  let filtered = books;
  if (genreFilter !== "all") filtered = filtered.filter(b => b.genre === genreFilter);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(b =>
      b.title.toLowerCase().includes(q) || (b.author_name?.toLowerCase().includes(q) ?? false)
    );
  }

  const handleStart = async (bookId: string) => {
    setStarting(bookId);
    const err = await onStartChallenge(bookId);
    if (err) toast({ title: "Error", description: err, variant: "destructive" });
    else toast({ title: "Challenge started! 🎉", description: "Log your first 2-minute read today." });
    setStarting(null);
  };

  return (
    <section className="py-12 border-t border-border">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="font-heading text-2xl font-bold">📖 Choose Your Book</h2>
          {books.length > 5 && (
            <div className="relative w-full sm:w-64">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search books..." className="pl-9" />
            </div>
          )}
        </div>

        {genres.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setGenreFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                genreFilter === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-muted"
              }`}
            >All Genres</button>
            {genres.map(g => (
              <button
                key={g}
                onClick={() => setGenreFilter(g === genreFilter ? "all" : g)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  genreFilter === g
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                }`}
              >{g}</button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No books match your criteria.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map(book => {
              const isActive = activeEntryBookIds.has(book.id);
              return (
                <div key={book.id} className={`rounded-xl border bg-card overflow-hidden transition-all hover:shadow-md ${isActive ? "border-primary ring-1 ring-primary" : "border-border"}`}>
                  {book.cover_image_url && (
                    <img src={book.cover_image_url} alt={book.title} className="w-full h-36 object-cover" loading="lazy" />
                  )}
                  <div className="p-4">
                    <h4 className="font-heading font-semibold text-sm line-clamp-2">{book.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{book.author_name}</p>
                    {book.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 fill-secondary text-secondary" />
                        <span className="text-xs">{book.rating}</span>
                      </div>
                    )}
                    {book.genre && <Badge variant="outline" className="mt-2 text-xs">{book.genre}</Badge>}

                    <div className="mt-3">
                      {isActive ? (
                        <Badge className="text-xs">✅ Challenge Active</Badge>
                      ) : user ? (
                        <Button
                          size="sm"
                          variant="default"
                          className="w-full"
                          disabled={starting === book.id}
                          onClick={() => handleStart(book.id)}
                        >
                          <Play className="mr-1.5 h-3 w-3" /> Start 100-Day Challenge
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="w-full" asChild>
                          <Link to="/readers-bureau/auth">Sign in to start</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
