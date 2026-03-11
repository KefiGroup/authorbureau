import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, BookOpen, Users, Calendar, TrendingUp, Share2, ArrowRight, MessageSquare,
  CheckCircle2, Sparkles, BookHeart, Award, Clock, Target,
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

  // Feature request modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [authorBooks, setAuthorBooks] = useState<Array<{ id: string; title: string; cover_image_url: string | null }>>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [requestMessage, setRequestMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingRequests, setExistingRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // Fetch books via edge function to handle dual-backend identity
        const token = await getActiveToken();
        let books: Array<{ id: string; title: string; cover_image_url: string | null }> = [];
        if (token) {
          try {
            const resp = await fetchWithTimeout(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`,
              { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
            );
            const result = await resp.json();
            books = (result.books || []).map((b: any) => ({ id: b.id, title: b.title, cover_image_url: b.cover_image_url }));
          } catch (err) {
            console.error("Failed to fetch books for reading club:", err);
          }
        }

        if (!books.length) {
          setLoading(false);
          return;
        }

        setAuthorBooks(books);
        const bookIds = books.map((b) => b.id);
        const bookMap = Object.fromEntries(books.map((b) => [b.id, b]));

        // Check existing feature requests
        const { data: requests } = await (supabase as any)
          .from("feature_requests")
          .select("book_id")
          .eq("author_id", user.id)
          .eq("request_type", "reading_club");
        if (requests) {
          setExistingRequests(new Set(requests.map((r: any) => r.book_id)));
        }

        // Get featured entries
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

  const handleSubmitRequest = async () => {
    if (!user || !selectedBookId) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("feature_requests")
        .insert({
          author_id: user.id,
          book_id: selectedBookId,
          request_type: "reading_club",
          status: "pending",
          admin_notes: requestMessage.trim() || null,
        });
      if (error) throw error;
      setSubmitted(true);
      setExistingRequests(prev => new Set([...prev, selectedBookId]));
      toast({ title: "Your request has been submitted for review! 📚" });
    } catch (err) {
      toast({ title: "Failed to submit", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No books featured — show value proposition
  if (featuredBooks.length === 0) {
    return (
      <div className="max-w-4xl space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto">
            <BookHeart className="h-8 w-8 text-secondary" />
          </div>
          <h2 className="font-heading text-2xl font-bold">Get Your Book Featured in the Reading Club</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
            The <strong>Authors Bureau Reading Club</strong> runs structured <strong>100-Day Reading Challenges</strong> that
            connect your book with a growing community of committed readers who pledge to read just 2 minutes every day.
          </p>
        </div>

        {/* What is the 100-Day Challenge */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-secondary" />
            <h3 className="font-heading text-lg font-semibold">What is the 100-Day Reading Challenge?</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The 100-Day Reading Challenge is an accountability-driven program where readers commit to reading your book
            for just <strong>2 minutes per day</strong> for 100 consecutive days. Readers track their daily progress,
            earn streak badges, and join community discussions about your book's key ideas.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <Clock className="h-4 w-4 text-secondary mb-1" />
              <p className="text-xs font-semibold">Low Commitment</p>
              <p className="text-[10px] text-muted-foreground">Just 2 minutes/day removes the barrier to starting</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <TrendingUp className="h-4 w-4 text-secondary mb-1" />
              <p className="text-xs font-semibold">High Completion</p>
              <p className="text-[10px] text-muted-foreground">Streak tracking and accountability drive finish rates</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <MessageSquare className="h-4 w-4 text-secondary mb-1" />
              <p className="text-xs font-semibold">Community Discussions</p>
              <p className="text-[10px] text-muted-foreground">Readers discuss your book's ideas and share insights</p>
            </div>
          </div>
        </Card>

        {/* Benefits for Authors */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-accent" />
            <h3 className="font-heading text-lg font-semibold">Benefits for You as an Author</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Users, label: "New Readers", desc: "Reach avid readers actively looking for their next book to commit to." },
              { icon: Sparkles, label: "Social Proof & Reviews", desc: "Challenge completions generate authentic reviews and word-of-mouth recommendations." },
              { icon: Share2, label: "Microsite Traffic", desc: "Your author microsite is linked from the challenge page, driving qualified traffic." },
              { icon: BookOpen, label: "Reader Engagement", desc: "Daily reading accountability means readers actually finish your book and absorb your message." },
            ].map((b) => (
              <div key={b.label} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <b.icon className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{b.label}</p>
                  <p className="text-xs text-muted-foreground">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* CTA Card */}
        <Card className="p-6 border-secondary/20 bg-secondary/5 text-center space-y-4">
          <h3 className="font-heading font-semibold">Ready to get your book featured?</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Submit a request and our team will review your book for inclusion in the next Reading Club season.
            We typically review requests within 3-5 business days.
          </p>
          {authorBooks.length > 0 ? (
            <Button
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              onClick={() => {
                setSubmitted(false);
                setRequestMessage("");
                setSelectedBookId(authorBooks[0]?.id || "");
                setShowRequestModal(true);
              }}
            >
              Request to Feature Your Book <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">You need to add a book first before requesting a feature.</p>
              <Button variant="outline" onClick={() => onNavigate?.("my-books")}>
                Add Your First Book <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          )}
        </Card>

        {/* Feature Request Modal */}
        <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">
                {submitted ? "Request Submitted! 🎉" : "Request to Feature Your Book"}
              </DialogTitle>
              <DialogDescription>
                {submitted
                  ? "Your request has been submitted for review! Our team will get back to you within 3-5 business days."
                  : "Select which book you'd like to submit and add an optional message for our review team."}
              </DialogDescription>
            </DialogHeader>

            {submitted ? (
              <div className="flex flex-col items-center py-4 gap-3">
                <CheckCircle2 className="h-12 w-12 text-accent" />
                <p className="text-sm text-muted-foreground text-center">
                  Your request is now <strong>Pending Review</strong>. You'll be notified when your book is approved for the Reading Club.
                </p>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Select a Book</Label>
                  <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a book..." />
                    </SelectTrigger>
                    <SelectContent>
                      {authorBooks.map((book) => (
                        <SelectItem
                          key={book.id}
                          value={book.id}
                          disabled={existingRequests.has(book.id)}
                        >
                          {book.title} {existingRequests.has(book.id) ? "(Already Requested)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Message to Review Team (optional)</Label>
                  <Textarea
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder="Tell us why your book would be a great fit for the Reading Club..."
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 text-right">{requestMessage.length}/500</p>
                </div>
                {existingRequests.has(selectedBookId) && (
                  <p className="text-xs text-muted-foreground">
                    You've already submitted a request for this book. Our team is reviewing it.
                  </p>
                )}
              </div>
            )}

            <DialogFooter className="gap-2">
              {submitted ? (
                <Button variant="outline" onClick={() => setShowRequestModal(false)}>Close</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setShowRequestModal(false)}>Cancel</Button>
                  <Button
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    onClick={handleSubmitRequest}
                    disabled={!selectedBookId || submitting || existingRequests.has(selectedBookId)}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    {submitting ? "Submitting..." : "Submit Request"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Your Books in the Reading Club</h2>
          <p className="text-sm text-muted-foreground mt-1">
            See how readers are engaging with your books through challenges and discussions.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSubmitted(false);
            setRequestMessage("");
            setSelectedBookId(authorBooks[0]?.id || "");
            setShowRequestModal(true);
          }}
        >
          Request Another Book <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
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
                <img src={fb.book_cover} alt={fb.book_title} className="w-20 h-28 object-cover rounded-lg shrink-0 shadow-sm" />
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

      {/* Feature Request Modal (also available from featured view) */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {submitted ? "Request Submitted! 🎉" : "Request to Feature Your Book"}
            </DialogTitle>
            <DialogDescription>
              {submitted
                ? "Your request has been submitted for review!"
                : "Select which book you'd like to submit and add an optional message."}
            </DialogDescription>
          </DialogHeader>
          {submitted ? (
            <div className="flex flex-col items-center py-4 gap-3">
              <CheckCircle2 className="h-12 w-12 text-accent" />
              <p className="text-sm text-muted-foreground text-center">
                Your request is now <strong>Pending Review</strong>. We typically review within 3-5 business days.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Select a Book</Label>
                <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                  <SelectTrigger><SelectValue placeholder="Choose a book..." /></SelectTrigger>
                  <SelectContent>
                    {authorBooks.map((book) => (
                      <SelectItem key={book.id} value={book.id} disabled={existingRequests.has(book.id)}>
                        {book.title} {existingRequests.has(book.id) ? "(Already Requested)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Message (optional)</Label>
                <Textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Tell us why your book would be a great fit..."
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {submitted ? (
              <Button variant="outline" onClick={() => setShowRequestModal(false)}>Close</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowRequestModal(false)}>Cancel</Button>
                <Button
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  onClick={handleSubmitRequest}
                  disabled={!selectedBookId || submitting || existingRequests.has(selectedBookId)}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
