import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Download, CheckCircle2, TrendingUp, Sparkles, Loader2, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { SocialMediaPost, SocialMediaConfig } from "./types";
import { PLATFORM_CONFIG, CONTENT_TYPE_LABELS } from "./types";
import { format } from "date-fns";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookId: string;
  bookTitle: string;
  userId: string;
  plan: Record<string, any> | null;
}

export default function SocialMediaPublishStep({
  stepData, setStepData, onMarkEdited, bookId, bookTitle, userId, plan,
}: Props) {
  const { toast } = useToast();
  const posts: SocialMediaPost[] = stepData["generate"]?.posts || [];
  const config: SocialMediaConfig = stepData["setup"]?.config || { platforms: [], frequency: {}, contentPillars: [], tone: "Mix", duration: 90 };
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [previewMode, setPreviewMode] = useState<"calendar" | "stats">("stats");

  // Stats
  const postsByPlatform: Record<string, number> = {};
  const postsByType: Record<string, number> = {};
  posts.forEach(p => {
    postsByPlatform[p.platform] = (postsByPlatform[p.platform] || 0) + 1;
    postsByType[p.contentType] = (postsByType[p.contentType] || 0) + 1;
  });

  const estimatedFollowerGrowth = Math.round(posts.length * 0.4);
  const estimatedPageVisits = Math.round(posts.length * 2.5);

  const handlePublish = async () => {
    if (!userId || !bookId) return;
    setPublishing(true);
    try {
      // Save all posts to social_media_content table
      const rows = posts.map(p => ({
        author_id: userId,
        book_id: bookId,
        platform: p.platform,
        content_type: p.contentType,
        content_text: p.caption,
        day_number: posts.indexOf(p) + 1,
        scheduled_date: p.date,
        status: "scheduled",
        image_prompt: JSON.stringify({
          hashtags: p.hashtags,
          format: p.contentType,
          cta: p.ctaLabel,
          image_prompt: p.imagePrompt,
          suggested_time: "09:00",
        }),
      }));

      // Delete existing content for this book first
      await supabase
        .from("social_media_content")
        .delete()
        .eq("author_id", userId)
        .eq("book_id", bookId);

      // Insert in batches of 50
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { error } = await supabase.from("social_media_content").insert(batch);
        if (error) throw error;
      }

      setPublished(true);
      toast({ title: "Calendar published!", description: `${posts.length} posts saved and scheduled.` });
    } catch (err) {
      console.error("Publish error:", err);
      toast({ title: "Publish failed", variant: "destructive" });
    }
    setPublishing(false);
  };

  const exportCSV = () => {
    const headers = ["Date", "Platform", "Content Type", "Caption", "Hashtags", "CTA"];
    const csvRows = [
      headers.join(","),
      ...posts.map(p =>
        [
          p.date,
          p.platform,
          p.contentType,
          `"${p.caption.replace(/"/g, '""')}"`,
          `"${p.hashtags.map(h => "#" + h).join(" ")}"`,
          `"${p.ctaLabel}"`,
        ].join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `social-calendar-${bookTitle.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported" });
  };

  if (posts.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed border-2">
        <Share2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold mb-2">No Content to Publish</h3>
        <p className="text-sm text-muted-foreground">Generate your calendar first.</p>
      </Card>
    );
  }

  if (published) {
    return (
      <Card className="p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>
        <h3 className="font-heading text-xl font-bold mb-2">Calendar Published! 🎉</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          {posts.length} posts have been saved and scheduled. Export as CSV to use with Buffer, Hootsuite, or Later.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Abby's projection */}
      <Card className="p-5 border-secondary/20 bg-secondary/5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1">Abby's Projection</p>
            <p className="text-sm text-muted-foreground">
              Consistent posting for {config.duration} days typically grows an author's following by 30-50% and drives{" "}
              <strong className="text-foreground">~{estimatedPageVisits} visitors</strong> to your product pages.
              With {posts.length} posts across {config.platforms.length} platforms, you're set for maximum visibility.
            </p>
          </div>
        </div>
      </Card>

      {/* Calendar Overview */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-secondary" /> Calendar Overview
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-2xl font-bold">{posts.length}</p>
            <p className="text-[10px] text-muted-foreground">Total Posts</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-2xl font-bold">{config.duration}</p>
            <p className="text-[10px] text-muted-foreground">Days</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-2xl font-bold">{config.platforms.length}</p>
            <p className="text-[10px] text-muted-foreground">Platforms</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-2xl font-bold">{posts.filter(p => p.imageUrl).length}</p>
            <p className="text-[10px] text-muted-foreground">Graphics Ready</p>
          </div>
        </div>

        {/* By platform breakdown */}
        <div className="space-y-2">
          {Object.entries(postsByPlatform).map(([platform, count]) => (
            <div key={platform} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full ${PLATFORM_CONFIG[platform]?.color || "bg-muted"} flex items-center justify-center text-white text-[8px] font-bold`}>
                {(PLATFORM_CONFIG[platform]?.label || "?")[0]}
              </div>
              <span className="text-xs font-medium flex-1">{PLATFORM_CONFIG[platform]?.label}</span>
              <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary rounded-full"
                  style={{ width: `${(count / posts.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Content type breakdown */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">Content Mix</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(postsByType).map(([type, count]) => {
            const info = CONTENT_TYPE_LABELS[type] || CONTENT_TYPE_LABELS.tip;
            return (
              <Badge key={type} className={`${info.color} text-xs`}>
                {info.emoji} {info.label}: {count}
              </Badge>
            );
          })}
        </div>
      </Card>

      {/* Growth projection */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-green-500" />
          <h3 className="text-sm font-semibold">Estimated Impact</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-lg font-bold text-green-600">+{estimatedFollowerGrowth}</p>
            <p className="text-[10px] text-muted-foreground">New followers</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-secondary">{estimatedPageVisits}</p>
            <p className="text-[10px] text-muted-foreground">Page visits</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-600">{Math.round(estimatedPageVisits * 0.03)}</p>
            <p className="text-[10px] text-muted-foreground">Est. conversions</p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={exportCSV} className="flex-1">
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
        <Button
          onClick={handlePublish}
          disabled={publishing}
          className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
          Publish Calendar
        </Button>
      </div>
    </div>
  );
}
