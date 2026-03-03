import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, Trophy, BookOpen, RefreshCw, Users, Calendar, TrendingUp } from "lucide-react";

interface PublishedBook {
  id: string;
  title: string;
  author_name: string | null;
  cover_image_url: string | null;
}

export default function ReadingClubTab() {
  const { toast } = useToast();
  const [books, setBooks] = useState<PublishedBook[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ participants: 0, totalLogs: 0, members: 0 });

  // Feature book form
  const [selectedBookId, setSelectedBookId] = useState("");
  const [featuredMonth, setFeaturedMonth] = useState(() => {
    const now = new Date();
    return `${now.toLocaleString("en", { month: "long" })} ${now.getFullYear()}`;
  });
  const [discussionPrompt, setDiscussionPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Challenge form
  const [challengeBookId, setChallengeBookId] = useState("");
  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeDesc, setChallengeDesc] = useState(
    "Commit to just 2 minutes of reading every day for 100 days."
  );
  const [submittingChallenge, setSubmittingChallenge] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [booksRes, featuredRes, challengesRes, participantsRes, logsRes, membersRes] = await Promise.all([
      supabase.from("books").select("id, title, author_name, cover_image_url").not("published_at", "is", null).order("title"),
      supabase.from("reading_club_featured_books").select("*, book:books(id, title, author_name)").order("created_at", { ascending: false }),
      supabase.from("reading_club_challenges").select("*, book:books(id, title, author_name)").order("created_at", { ascending: false }),
      supabase.from("reading_challenge_entries").select("id", { count: "exact", head: true }),
      supabase.from("reading_challenge_daily_logs").select("id", { count: "exact", head: true }),
      supabase.from("reading_club_members").select("id", { count: "exact", head: true }),
    ]);
    setBooks(booksRes.data || []);
    setFeatured(featuredRes.data || []);
    setChallenges((challengesRes.data as any[]) || []);
    setStats({
      participants: participantsRes.count ?? 0,
      totalLogs: logsRes.count ?? 0,
      members: membersRes.count ?? 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleFeatureBook = async () => {
    if (!selectedBookId || !featuredMonth.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("reading_club_featured_books").insert({
      book_id: selectedBookId,
      featured_month: featuredMonth.trim(),
      discussion_prompt: discussionPrompt.trim() || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Book featured! 🎉" });
      setSelectedBookId("");
      setDiscussionPrompt("");
      fetchAll();
    }
    setSubmitting(false);
  };

  const handleCreateChallenge = async () => {
    if (!challengeBookId || !challengeTitle.trim()) return;
    setSubmittingChallenge(true);
    const { error } = await supabase.from("reading_club_challenges").insert({
      book_id: challengeBookId,
      title: challengeTitle.trim(),
      description: challengeDesc.trim() || null,
      duration_days: 100,
      status: "active",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Challenge created! 🏆" });
      setChallengeBookId("");
      setChallengeTitle("");
      fetchAll();
    }
    setSubmittingChallenge(false);
  };

  const handleDeleteFeatured = async (id: string) => {
    const { error } = await supabase.from("reading_club_featured_books").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", variant: "destructive" });
    else fetchAll();
  };

  const handleDeleteChallenge = async (id: string) => {
    const { error } = await supabase.from("reading_club_challenges").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", variant: "destructive" });
    else fetchAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold">Reading Club</h2>
        <Button variant="outline" size="sm" onClick={fetchAll}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Active Challengers", value: stats.participants, icon: TrendingUp },
          { label: "Total Daily Logs", value: stats.totalLogs, icon: Calendar },
          { label: "Club Members (legacy)", value: stats.members, icon: Users },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold font-heading">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Feature a Book */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-heading font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-secondary" /> Feature a Book
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Book</label>
            <Select value={selectedBookId} onValueChange={setSelectedBookId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a published book" />
              </SelectTrigger>
              <SelectContent>
                {books.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.title} — {b.author_name || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Featured Month</label>
            <Input
              value={featuredMonth}
              onChange={(e) => setFeaturedMonth(e.target.value)}
              placeholder="e.g. March 2026"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Discussion Prompt (optional)</label>
          <Textarea
            value={discussionPrompt}
            onChange={(e) => setDiscussionPrompt(e.target.value)}
            placeholder="What question should readers discuss?"
            rows={2}
          />
        </div>
        <Button onClick={handleFeatureBook} disabled={submitting || !selectedBookId}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Feature Book
        </Button>
      </div>

      {/* Existing Featured Books */}
      {featured.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Featured Books ({featured.length})
          </h3>
          <div className="space-y-2">
            {featured.map((f: any) => (
              <div key={f.id} className="rounded-lg border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{f.book?.title}</p>
                  <p className="text-xs text-muted-foreground">{f.book?.author_name} · {f.featured_month}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteFeatured(f.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create a Challenge */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-heading font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-secondary" /> Create 100-Day Challenge
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Book</label>
            <Select value={challengeBookId} onValueChange={(val) => {
              setChallengeBookId(val);
              const book = books.find((b) => b.id === val);
              if (book) setChallengeTitle(`100-Day Reading Challenge: ${book.title}`);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a published book" />
              </SelectTrigger>
              <SelectContent>
                {books.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.title} — {b.author_name || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Challenge Title</label>
            <Input
              value={challengeTitle}
              onChange={(e) => setChallengeTitle(e.target.value)}
              placeholder="Auto-fills when you pick a book"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={challengeDesc}
            onChange={(e) => setChallengeDesc(e.target.value)}
            rows={2}
          />
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">100 days</Badge>
          <Badge variant="outline">2 min/day</Badge>
        </div>
        <Button onClick={handleCreateChallenge} disabled={submittingChallenge || !challengeBookId || !challengeTitle.trim()}>
          {submittingChallenge ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Create Challenge
        </Button>
      </div>

      {/* Existing Challenges */}
      {challenges.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Challenges ({challenges.length})
          </h3>
          <div className="space-y-2">
            {challenges.map((ch: any) => (
              <div key={ch.id} className="rounded-lg border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{ch.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {ch.book?.title} · {ch.duration_days} days ·{" "}
                    <Badge variant={ch.status === "active" ? "default" : "secondary"} className="text-xs">
                      {ch.status}
                    </Badge>
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteChallenge(ch.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
