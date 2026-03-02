import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BookOpen, Users, MessageCircle, Send, Star } from "lucide-react";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

interface FeaturedBook {
  id: string;
  book_id: string;
  featured_month: string;
  discussion_prompt: string | null;
  book: {
    id: string;
    title: string;
    author_name: string | null;
    cover_image_url: string | null;
    description: string | null;
    genre: string | null;
    slug: string;
    rating: number | null;
  };
}

interface Discussion {
  id: string;
  content: string;
  created_at: string;
  member: {
    display_name: string | null;
    email: string;
  };
}

export default function ReadingClub() {
  useDocumentMeta({
    title: "Reading Club — Authors Bureau",
    description: "Join the Authors Bureau Reading Club. Discover curated books, join discussions, and connect with fellow readers.",
  });

  const { toast } = useToast();
  const [featured, setFeatured] = useState<FeaturedBook[]>([]);
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinEmail, setJoinEmail] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch featured books with book data
    const { data: featuredData } = await supabase
      .from("reading_club_featured_books")
      .select("*, book:books(id, title, author_name, cover_image_url, description, genre, slug, rating)")
      .order("created_at", { ascending: false });

    setFeatured((featuredData as any[]) || []);

    // Fetch published books for catalog
    const { data: booksData } = await supabase
      .from("books")
      .select("id, title, author_name, cover_image_url, description, genre, slug, rating")
      .not("published_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    setAllBooks(booksData || []);
    setLoading(false);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinEmail.trim()) return;
    setJoining(true);

    const { error } = await supabase.from("reading_club_members").insert({
      email: joinEmail.trim(),
      display_name: joinName.trim() || null,
    });

    if (error?.code === "23505") {
      toast({ title: "You're already a member!", description: "Welcome back to the Reading Club." });
      setJoined(true);
    } else if (error) {
      toast({ title: "Error joining", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Welcome to the Reading Club! 🎉" });
      setJoined(true);
    }
    setJoining(false);
  };

  const fetchDiscussions = async (bookId: string) => {
    setSelectedBookId(bookId);
    const { data } = await supabase
      .from("reading_club_discussions")
      .select("id, content, created_at, member:reading_club_members(display_name, email)")
      .eq("book_id", bookId)
      .order("created_at", { ascending: true });
    setDiscussions((data as any[]) || []);
  };

  const handlePost = async () => {
    if (!newComment.trim() || !selectedBookId) return;
    setPosting(true);

    // For simplicity, get or create member by email
    let memberId: string | null = null;
    if (joinEmail) {
      const { data: existing } = await supabase
        .from("reading_club_members")
        .select("id")
        .eq("email", joinEmail)
        .maybeSingle();
      memberId = existing?.id || null;
    }

    if (!memberId) {
      toast({ title: "Please join the club first to post", variant: "destructive" });
      setPosting(false);
      return;
    }

    const { error } = await supabase.from("reading_club_discussions").insert({
      book_id: selectedBookId,
      member_id: memberId,
      content: newComment.trim(),
    });

    if (error) {
      toast({ title: "Error posting", description: error.message, variant: "destructive" });
    } else {
      setNewComment("");
      fetchDiscussions(selectedBookId);
    }
    setPosting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative py-20 lg:py-28">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-secondary/10 p-4">
              <BookOpen className="h-10 w-10 text-secondary" />
            </div>
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight lg:text-5xl mb-4">
            Authors Bureau <span className="text-gradient-gold">Reading Club</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Discover curated books from our author community. Join discussions, share insights, and connect with fellow readers.
          </p>

          {!joined ? (
            <form onSubmit={handleJoin} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="Your name"
                className="flex-1"
              />
              <Input
                type="email"
                required
                value={joinEmail}
                onChange={(e) => setJoinEmail(e.target.value)}
                placeholder="Your email"
                className="flex-1"
              />
              <Button type="submit" disabled={joining}>
                {joining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                Join Free
              </Button>
            </form>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary text-sm font-medium">
              <Users className="h-4 w-4" /> You're a member!
            </div>
          )}
        </div>
      </section>

      {/* Featured Books */}
      {featured.length > 0 && (
        <section className="py-12 border-t border-border">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="font-heading text-2xl font-bold mb-6">📚 Featured This Month</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((f) => (
                <div
                  key={f.id}
                  className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => fetchDiscussions(f.book_id)}
                >
                  {f.book.cover_image_url && (
                    <img
                      src={f.book.cover_image_url}
                      alt={f.book.title}
                      className="w-full h-48 object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="p-4">
                    <Badge variant="secondary" className="mb-2 text-xs">{f.featured_month}</Badge>
                    <h3 className="font-heading font-semibold line-clamp-1">{f.book.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.book.author_name}</p>
                    {f.discussion_prompt && (
                      <p className="text-xs text-muted-foreground/70 mt-2 italic line-clamp-2">
                        "{f.discussion_prompt}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Book Catalog */}
      <section className="py-12 border-t border-border">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-heading text-2xl font-bold mb-6">📖 Book Catalog</h2>
          {allBooks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No books available yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {allBooks.map((book) => (
                <div
                  key={book.id}
                  className={`rounded-xl border bg-card p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedBookId === book.id ? "border-primary ring-1 ring-primary" : "border-border"
                  }`}
                  onClick={() => fetchDiscussions(book.id)}
                >
                  {book.cover_image_url && (
                    <img
                      src={book.cover_image_url}
                      alt={book.title}
                      className="w-full h-36 object-cover rounded-lg mb-3"
                      loading="lazy"
                    />
                  )}
                  <h4 className="font-heading font-semibold text-sm line-clamp-2">{book.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{book.author_name}</p>
                  {book.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 fill-secondary text-secondary" />
                      <span className="text-xs">{book.rating}</span>
                    </div>
                  )}
                  {book.genre && (
                    <Badge variant="outline" className="mt-2 text-xs">{book.genre}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Discussion Thread */}
      {selectedBookId && (
        <section className="py-12 border-t border-border">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
              <MessageCircle className="h-6 w-6" /> Discussion
            </h2>

            {discussions.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-4">No comments yet — be the first!</p>
            ) : (
              <div className="space-y-4 mb-6">
                {discussions.map((d) => (
                  <div key={d.id} className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm">{d.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {d.member?.display_name || "Reader"} · {new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {joined ? (
              <div className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts..."
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={handlePost} disabled={posting || !newComment.trim()}>
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Join the club above to participate in discussions.</p>
            )}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
