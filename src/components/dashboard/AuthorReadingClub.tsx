import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, BookOpen, Users, Calendar, TrendingUp, Share2, ArrowRight, MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FeaturedBook {
  id: string;
  book_id: string;
  featured_month: string;
  discussion_prompt: string | null;
  book_title: string;
  book_cover: string | null;
  participant_count: number;
  discussion_count: number;
}

interface Props {
  onNavigate?: (section: string) => void;
}

export default function AuthorReadingClub({ onNavigate }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [featuredBooks, setFeaturedBooks] = useState<FeaturedBook[]>([]);
  const [totalReaders, setTotalReaders] = useState(0);
  const [totalDiscussions, setTotalDiscussions] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // Get author's books
        const { data: authorBooks } = await supabase
          .from("books")
          .select("id, title, cover_image_url")
          .eq("author_id", user.id);

        if (!authorBooks?.length) {
          setLoading(false);
          return;
        }

        const bookIds = authorBooks.map((b) => b.id);
        const bookMap = Object.fromEntries(authorBooks.map((b) => [b.id, b]));

        // Get featured entries for author's books
        const { data: featured } = await supabase
          .from("reading_club_featured_books")
          .select("*")
          .in("book_id", bookIds)
          .order("featured_month", { ascending: false });

        // Get challenge participant counts
        const { data: challenges } = await supabase
          .from("reading_club_challenges")
          .select("id, book_id")
          .in("book_id", bookIds);

        const challengeIds = (challenges || []).map((c) => c.id);
        let participantCounts: Record<string, number> = {};
        if (challengeIds.length > 0) {
          const { data: participants } = await supabase
            .from("reading_club_challenge_participants")
            .select("challenge_id")
            .in("challenge_id", challengeIds);

          (participants || []).forEach((p) => {
            const challenge = challenges?.find((c) => c.id === p.challenge_id);
            if (challenge) {
              participantCounts[challenge.book_id] = (participantCounts[challenge.book_id] || 0) + 1;
            }
          });
        }

        // Get discussion counts
        const { data: discussions } = await supabase
          .from("reading_club_discussions")
          .select("book_id")
          .in("book_id", bookIds);

        let discussionCounts: Record<string, number> = {};
        (discussions || []).forEach((d) => {
          discussionCounts[d.book_id] = (discussionCounts[d.book_id] || 0) + 1;
        });

        const results: FeaturedBook[] = (featured || []).map((f) => ({
          id: f.id,
          book_id: f.book_id,
          featured_month: f.featured_month,
          discussion_prompt: f.discussion_prompt,
          book_title: bookMap[f.book_id]?.title || "Unknown",
          book_cover: bookMap[f.book_id]?.cover_image_url || null,
          participant_count: participantCounts[f.book_id] || 0,
          discussion_count: discussionCounts[f.book_id] || 0,
        }));

        setFeaturedBooks(results);
        setTotalReaders(Object.values(participantCounts).reduce((a, b) => a + b, 0));
        setTotalDiscussions(Object.values(discussionCounts).reduce((a, b) => a + b, 0));
      } catch {
        toast({ title: "Failed to load Reading Club data", variant: "destructive" });
      }
      setLoading(false);
    })();
  }, [user, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No books featured
  if (featuredBooks.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto">
          <BookOpen className="h-8 w-8 text-secondary" />
        </div>
        <h2 className="font-heading text-2xl font-bold">Your Books in the Reading Club</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
          Your books aren't in the Reading Club yet. The Reading Club helps readers discover and engage
          with your books through 100-Day Challenges and community discussions.
        </p>
        <Card className="max-w-md mx-auto p-6 border-secondary/20 bg-secondary/5 text-left">
          <h3 className="font-heading font-semibold text-sm mb-2">Want to get your book featured?</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Featured books get dedicated reading challenges and community discussions, driving reader engagement and discovery.
          </p>
          <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            Request to Feature Your Book <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-bold">Your Books in the Reading Club</h2>
        <p className="text-sm text-muted-foreground mt-1">
          See how readers are engaging with your books through challenges and discussions.
        </p>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Readers", value: totalReaders, icon: Users, color: "text-primary" },
          { label: "Books Featured", value: featuredBooks.length, icon: BookOpen, color: "text-secondary" },
          { label: "Discussion Posts", value: totalDiscussions, icon: MessageSquare, color: "text-accent" },
          { label: "Active Challenges", value: featuredBooks.length, icon: TrendingUp, color: "text-muted-foreground" },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-[11px] text-muted-foreground">{stat.label}</span>
            </div>
            <p className={`text-xl font-heading font-bold ${stat.color}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Featured Book Cards */}
      <div className="space-y-4">
        {featuredBooks.map((fb) => (
          <Card key={fb.id} className="p-5">
            <div className="flex gap-5">
              {fb.book_cover && (
                <img
                  src={fb.book_cover}
                  alt={fb.book_title}
                  className="w-20 h-28 object-cover rounded-lg shrink-0 shadow-sm"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-heading font-bold text-lg">{fb.book_title}</h3>
                    <Badge variant="secondary" className="text-[10px] mt-1">
                      <Calendar className="h-3 w-3 mr-1" />
                      Featured: {fb.featured_month}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mt-2">
                  100-Day Reading Challenge — "Commit to just 2 minutes of reading every day"
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-lg font-heading font-bold text-primary">{fb.participant_count}</p>
                    <p className="text-[10px] text-muted-foreground">Readers Enrolled</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-lg font-heading font-bold text-accent">{fb.discussion_count}</p>
                    <p className="text-[10px] text-muted-foreground">Discussions</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-lg font-heading font-bold text-secondary">
                      {fb.participant_count > 0 ? "Active" : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Status</p>
                  </div>
                </div>

                {fb.discussion_prompt && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">Discussion Prompt:</span> "{fb.discussion_prompt}"
                    </p>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => window.open("/reading-club", "_blank")}>
                    <MessageSquare className="h-3.5 w-3.5 mr-1" /> View Discussion
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/reading-club`);
                      toast({ title: "Link copied!" });
                    }}
                  >
                    <Share2 className="h-3.5 w-3.5 mr-1" /> Share Challenge Link
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
