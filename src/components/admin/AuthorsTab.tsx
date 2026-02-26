import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, CheckCircle, XCircle, Star, BookOpen, Globe } from "lucide-react";

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

export default function AuthorsTab() {
  const [authors, setAuthors] = useState<DirectoryAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAuthors = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all author profiles
      const { data: profiles, error } = await supabase
        .from("author_profiles")
        .select("user_id, pen_name, photo_url, bio_short, genres, directory_status, author_slug, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch book counts
      const { data: books } = await supabase
        .from("books")
        .select("author_id")
        .not("published_at", "is", null);

      const bookCounts = new Map<string, number>();
      (books || []).forEach((b: any) => {
        bookCounts.set(b.author_id, (bookCounts.get(b.author_id) || 0) + 1);
      });

      setAuthors(
        (profiles || []).map((p: any) => ({
          ...p,
          book_count: bookCounts.get(p.user_id) || 0,
        }))
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
      toast({ title: `Author ${newStatus === "unlisted" ? "removed from" : "added to"} directory` });
    } catch (err: any) {
      toast({ title: err.message || "Update failed", variant: "destructive" });
    }
    setUpdatingId(null);
  };

  const statusColors: Record<string, string> = {
    unlisted: "bg-muted text-muted-foreground",
    listed: "bg-blue-100 text-blue-800",
    verified: "bg-green-100 text-green-800",
    featured: "bg-amber-100 text-amber-800",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold">Author Directory Management</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Approve authors to appear in the public directory
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAuthors} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-secondary" />
        </div>
      ) : authors.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No author profiles found.</p>
      ) : (
        <div className="space-y-3">
          {authors.map((author) => (
            <Card key={author.user_id} className="border">
              <CardContent className="p-4 flex items-center gap-4">
                {/* Photo */}
                {author.photo_url ? (
                  <img src={author.photo_url} alt={author.pen_name || ""} className="w-12 h-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{author.pen_name || "Unnamed Author"}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[author.directory_status] || statusColors.unlisted}`}>
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

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {author.directory_status === "unlisted" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(author.user_id, "listed")}
                      disabled={updatingId === author.user_id}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {updatingId === author.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                      Approve
                    </Button>
                  )}
                  {author.directory_status === "listed" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(author.user_id, "verified")}
                        disabled={updatingId === author.user_id}
                      >
                        <Star className="h-4 w-4 mr-1" /> Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateStatus(author.user_id, "unlisted")}
                        disabled={updatingId === author.user_id}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    </>
                  )}
                  {author.directory_status === "verified" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateStatus(author.user_id, "featured")}
                        disabled={updatingId === author.user_id}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <Star className="h-4 w-4 mr-1" /> Feature
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateStatus(author.user_id, "unlisted")}
                        disabled={updatingId === author.user_id}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    </>
                  )}
                  {author.directory_status === "featured" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateStatus(author.user_id, "listed")}
                      disabled={updatingId === author.user_id}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Unfeature
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
