import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import { Share2, Loader2, Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SocialMediaStudio from "./social-media/SocialMediaStudio";
import BookBuilderContextBar, { useBookContext } from "./BookBuilderContextBar";

interface SocialContent {
  id: string;
  platform: string;
  content_type: string;
  content_text: string;
  status: string;
  book_id: string;
  created_at: string;
}

export default function SocialMediaManager() {
  const { user } = useAuth();
  const { bookId, bookTitle, bookCoverUrl } = useBookContext();
  const [content, setContent] = useState<SocialContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const navigate = useNavigate();
  // Auto-launch studio when arriving from Book Hub with a book context
  const [showStudio, setShowStudio] = useState(!!bookId);

  const loadContent = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("social_media_content" as any)
      .select("*")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false });
    if (bookId) {
      query = query.eq("book_id", bookId);
    }
    const { data, error } = await query;
    if (!error && data) setContent(data as any);
    setLoading(false);
  };

  useEffect(() => { loadContent(); }, [user, bookId]);

  if (showStudio) {
    return (
      <>
        <SocialMediaStudio
          onExit={() => {
            if (bookId) {
              navigate(`/dashboard/book/${bookId}?tab=automate`);
            } else {
              setShowStudio(false);
              loadContent();
            }
          }}
          initialBookId={bookId}
          initialBookTitle={bookTitle ? decodeURIComponent(bookTitle) : ""}
          initialBookCoverUrl={bookCoverUrl}
        />
      </>
    );
  }

  const selected = content.find(c => c.id === selectedId);

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;
  }

  if (content.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <BookBuilderContextBar backTab="automate" />
        <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-6">
          <Share2 className="h-8 w-8 text-secondary" />
        </div>
        <h2 className="font-heading text-2xl font-bold mb-3">Social Media Content Calendar</h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-lg mx-auto mb-6">
          Generate a 90-day AI-powered content calendar from your book. The AI reads your manuscript and creates platform-specific posts for LinkedIn, Instagram, X, and Facebook.
        </p>
        <Button onClick={() => setShowStudio(true)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Plus className="h-4 w-4 mr-2" /> Create Content Calendar
        </Button>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="max-w-4xl space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>← Back</Button>
        <Card><CardContent className="p-0">
          <div className="px-6 py-4 border-b border-border bg-muted/30">
            <h3 className="font-heading font-semibold text-lg">Social Media Calendar</h3>
            <p className="text-xs text-muted-foreground mt-1">Platform: {selected.platform} • Type: {selected.content_type}</p>
          </div>
          <div className="px-6 py-6"><MarkdownRenderer content={selected.content_text} /></div>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <BookBuilderContextBar backTab="automate" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Social Media Content</h2>
          <p className="text-sm text-muted-foreground mt-1">{content.length} post{content.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowStudio(true)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Plus className="h-4 w-4 mr-2" /> New Calendar
        </Button>
      </div>
      <div className="grid gap-4">
        {content.map(c => (
          <Card key={c.id} className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all" onClick={() => setSelectedId(c.id)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0"><Share2 className="h-5 w-5 text-secondary" /></div>
                <div>
                  <h3 className="font-medium text-sm">Social Media Calendar</h3>
                  <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-xs">{c.status}</Badge>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
