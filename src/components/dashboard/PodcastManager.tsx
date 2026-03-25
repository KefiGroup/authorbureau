import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Podcast, Loader2, Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import PodcastStudio from "./podcast/PodcastStudio";
import BookBuilderContextBar, { useBookContext } from "./BookBuilderContextBar";

interface PodcastRow {
  id: string;
  title: string;
  episode_count: number;
  status: string;
  created_at: string;
  book_id: string;
}

export default function PodcastManager() {
  const { user } = useAuth();
  const { bookId, bookTitle, bookCoverUrl } = useBookContext();
  const [podcasts, setPodcasts] = useState<PodcastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [showStudio, setShowStudio] = useState(!!bookId);

  const loadPodcasts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: cloudSession } = await supabase.auth.getSession();
    const authorId = cloudSession?.session?.user?.id || user.id;

    let query = supabase.from("podcasts" as any).select("id, title, episode_count, status, created_at, book_id").eq("author_id", authorId).order("created_at", { ascending: false });
    if (bookId) query = query.eq("book_id", bookId);

    const { data, error } = await query;
    if (!error && data) setPodcasts(data as any);
    setLoading(false);
  }, [user, bookId]);

  useEffect(() => { loadPodcasts(); }, [loadPodcasts]);

  if (showStudio) {
    return (
      <PodcastStudio
        onExit={() => {
          if (bookId) {
            navigate(`/dashboard/book/${bookId}?tab=broadcast`);
          } else {
            setShowStudio(false);
            loadPodcasts();
          }
        }}
        initialBookId={bookId}
        initialBookTitle={bookTitle ? decodeURIComponent(bookTitle) : ""}
        initialBookCoverUrl={bookCoverUrl}
      />
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;
  }

  if (podcasts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <BookBuilderContextBar backTab="broadcast" />
        <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-6">
          <Podcast className="h-8 w-8 text-secondary" />
        </div>
        <h2 className="font-heading text-2xl font-bold mb-3">Podcast Studio</h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-lg mx-auto mb-6">
          Generate a complete podcast season from your book — production-ready scripts, SEO show notes, sponsorship media kit, and distribution metadata. All powered by AI.
        </p>
        <Button onClick={() => setShowStudio(true)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Plus className="h-4 w-4 mr-2" /> Create Podcast Season
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <BookBuilderContextBar backTab="broadcast" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Podcast Seasons</h2>
          <p className="text-sm text-muted-foreground mt-1">{podcasts.length} season{podcasts.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowStudio(true)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Plus className="h-4 w-4 mr-2" /> New Season
        </Button>
      </div>
      <div className="grid gap-4">
        {podcasts.map(p => (
          <Card key={p.id} className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all" onClick={() => setShowStudio(true)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                  <Podcast className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{p.title}</h3>
                  <p className="text-xs text-muted-foreground">{p.episode_count} episodes • {new Date(p.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-xs">{p.status}</Badge>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
