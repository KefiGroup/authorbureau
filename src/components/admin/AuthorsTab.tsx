import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, BookOpen, Globe, Filter } from "lucide-react";

interface DirectoryAuthor {
  user_id: string;
  pen_name: string | null;
  photo_url: string | null;
  bio_short: string | null;
  genres: string[] | null;
  directory_status: string;
  author_slug: string | null;
  created_at: string;
  book_count?: number;
}

const ALL_STATUSES = ["unlisted", "listed", "verified", "featured"] as const;

const statusColors: Record<string, string> = {
  unlisted: "bg-muted text-muted-foreground",
  listed: "bg-blue-100 text-blue-800",
  verified: "bg-green-100 text-green-800",
  featured: "bg-amber-100 text-amber-800",
};

export default function AuthorsTab() {
  const [authors, setAuthors] = useState<DirectoryAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

  const fetchAuthors = useCallback(async () => {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from("author_profiles")
        .select("user_id, pen_name, photo_url, bio_short, genres, directory_status, author_slug, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const { data: books } = await supabase
        .from("books")
        .select("author_id, author_name")
        .not("published_at", "is", null);

      // Count books by author_id
      const bookCounts = new Map<string, number>();
      (books || []).forEach((b: any) => {
        bookCounts.set(b.author_id, (bookCounts.get(b.author_id) || 0) + 1);
      });

      // Also count books by author_name for pen_name fallback
      const bookCountsByName = new Map<string, number>();
      (books || []).forEach((b: any) => {
        if (b.author_name) {
          bookCountsByName.set(b.author_name, (bookCountsByName.get(b.author_name) || 0) + 1);
        }
      });

      setAuthors(
        (profiles || []).map((p: any) => {
          const byId = bookCounts.get(p.user_id) || 0;
          const byName = p.pen_name ? (bookCountsByName.get(p.pen_name) || 0) : 0;
          return {
            ...p,
            book_count: Math.max(byId, byName),
          };
        })
      );
    } catch (err: any) {
      toast({ title: "Failed to load authors", variant: "destructive" });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAuthors();
  }, [fetchAuthors]);

  const updateStatus = async (userId: string, newStatus: string) => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from("author_profiles")
        .update({ directory_status: newStatus })
        .eq("user_id", userId);

      if (error) throw error;

      setAuthors((prev) =>
        prev.map((a) => (a.user_id === userId ? { ...a, directory_status: newStatus } : a))
      );
      toast({ title: `Author status changed to "${newStatus}"` });
    } catch (err: any) {
      toast({ title: err.message || "Update failed", variant: "destructive" });
    }
    setUpdatingId(null);
  };

  const filtered = filterStatus === "all" ? authors : authors.filter((a) => a.directory_status === filterStatus);

  const counts = authors.reduce((acc, a) => {
    acc[a.directory_status] = (acc[a.directory_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold">Author Directory Management</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage author visibility and status in the public directory
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAuthors} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[{ key: "all", label: "All", count: authors.length }, ...ALL_STATUSES.map((s) => ({ key: s, label: s.charAt(0).toUpperCase() + s.slice(1), count: counts[s] || 0 }))].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filterStatus === f.key
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-secondary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No authors found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((author) => (
            <Card key={author.user_id} className="border">
              <CardContent className="p-4 flex items-center gap-4">
                {author.photo_url ? (
                  <img src={author.photo_url} alt={author.pen_name || ""} className="w-12 h-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{author.pen_name || "Unnamed Author"}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[author.directory_status] || statusColors.unlisted}`}>
                      {author.directory_status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{author.bio_short || "No bio"}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" /> {author.book_count} books
                    </span>
                    {author.genres && author.genres.length > 0 && (
                      <span>{author.genres.slice(0, 2).join(", ")}</span>
                    )}
                    {author.author_slug && (
                      <a href={`/authors/${author.author_slug}`} target="_blank" className="flex items-center gap-1 text-secondary hover:underline">
                        <Globe className="h-3 w-3" /> View
                      </a>
                    )}
                  </div>
                </div>

                {/* Status dropdown */}
                <div className="shrink-0 w-36">
                  <Select
                    value={author.directory_status}
                    onValueChange={(val) => updateStatus(author.user_id, val)}
                    disabled={updatingId === author.user_id}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      {updatingId === author.user_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs capitalize">
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
