import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Edit3, Rocket, RefreshCw, Loader2, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RecommendedWebinar {
  title?: string;
  description?: string;
  abstract?: string;
  topic?: string;
  duration_minutes?: number;
  duration?: number;
  target_outcome?: string;
  outcome?: string;
}

interface Props {
  bookId: string;
  bookTitle?: string;
  authorId: string | null;
  contentJson: any;
  onPromoted: () => void;
  onRegenerate?: () => void;
}

function extractRecommended(content: any): RecommendedWebinar {
  const rec = content?.recommended_webinar || {};
  const firstTopic = Array.isArray(content?.webinar_topics) ? content.webinar_topics[0] : null;
  return {
    title: rec.title || firstTopic?.title || "Your AI-generated webinar",
    description: rec.description || rec.abstract || firstTopic?.abstract || firstTopic?.description || "",
    duration_minutes: rec.duration_minutes || rec.duration || 60,
    target_outcome: rec.target_outcome || rec.outcome || firstTopic?.target_outcome || "",
    abstract: rec.abstract || firstTopic?.abstract || "",
    topic: rec.topic || firstTopic?.topic || "",
  };
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export default function AIWebinarPreviewCard({
  bookId,
  bookTitle,
  authorId,
  contentJson,
  onPromoted,
  onRegenerate,
}: Props) {
  const navigate = useNavigate();
  const rec = extractRecommended(contentJson);
  const [promoting, setPromoting] = useState(false);

  const builderUrl = `/node-builder/BP-05?bookId=${bookId}${
    bookTitle ? `&bookTitle=${encodeURIComponent(bookTitle)}` : ""
  }`;

  const handlePromote = async () => {
    if (!authorId) {
      toast.error("Author profile not loaded yet — try again in a moment.");
      return;
    }
    if (!rec.title) {
      toast.error("AI content is missing a title — open the builder to set one.");
      return;
    }
    setPromoting(true);
    const title = rec.title.slice(0, 200);
    const description = (rec.description || rec.abstract || "").slice(0, 4000);
    const slug = slugify(title);
    const { error } = await supabase.from("webinars" as any).insert({
      author_id: authorId,
      book_id: bookId,
      title,
      description: description || null,
      script_markdown: description || "",
      status: "draft",
      price: 0,
      is_free: true,
      duration_minutes: rec.duration_minutes || 60,
      slug,
    } as any);
    setPromoting(false);
    if (error) {
      toast.error("Could not create webinar: " + error.message);
      return;
    }
    toast.success("Webinar created from AI content. Add date, room URL, and publish.");
    onPromoted();
  };

  return (
    <Card className="border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                AI-Generated · Live in Brand Tab
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Your AI engine produced this webinar but it isn’t scheduled yet.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Video className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
            <h3 className="text-base font-semibold leading-snug">{rec.title}</h3>
          </div>
          {rec.description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{rec.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            {rec.duration_minutes ? <span>⏱ {rec.duration_minutes} min</span> : null}
            {rec.target_outcome ? <span className="truncate">🎯 {rec.target_outcome}</span> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-emerald-200/60">
          <Button size="sm" onClick={handlePromote} disabled={promoting}>
            {promoting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5 mr-1.5" />}
            Promote to live webinar
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate(builderUrl)}>
            <Edit3 className="h-3.5 w-3.5 mr-1.5" /> Edit content
          </Button>
          {onRegenerate && (
            <Button size="sm" variant="ghost" onClick={onRegenerate}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
