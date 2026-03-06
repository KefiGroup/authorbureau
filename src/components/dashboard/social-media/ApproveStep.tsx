import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Save, Loader2 } from "lucide-react";
import { useState } from "react";
import type { SocialPost, CalendarConfig } from "./types";
import { CATEGORY_COLORS, FORMAT_LABELS, FORMAT_COLORS, type ContentFormat } from "./types";

interface Props {
  posts: SocialPost[];
  config: CalendarConfig;
  onBack: () => void;
  onDone: () => void;
}

export default function ApproveStep({ posts, config, onBack, onDone }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach(p => { counts[p.platform] = (counts[p.platform] || 0) + 1; });
    return counts;
  }, [posts]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
    return counts;
  }, [posts]);

  const formatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach(p => { counts[p.format] = (counts[p.format] || 0) + 1; });
    return counts;
  }, [posts]);

  const dateRange = useMemo(() => {
    if (posts.length === 0) return { start: "", end: "" };
    const dates = posts.map(p => p.scheduled_date).sort();
    return { start: dates[0], end: dates[dates.length - 1] };
  }, [posts]);

  const savePosts = async (status: "draft" | "approved") => {
    if (!user) return;
    setSaving(true);

    try {
      const rows = posts.map(p => ({
        author_id: user.id,
        book_id: config.bookId,
        platform: p.platform,
        content_type: p.category,
        content_text: p.caption,
        day_number: p.day_number,
        scheduled_date: p.scheduled_date,
        image_prompt: p.hashtags.join(", "),
        status: status === "approved" ? "scheduled" : "draft",
      }));

      // Delete old content for this book first
      await supabase
        .from("social_media_content")
        .delete()
        .eq("author_id", user.id)
        .eq("book_id", config.bookId);

      const { error } = await supabase.from("social_media_content").insert(rows as any);

      if (error) throw error;

      toast({
        title: status === "approved" ? "Calendar Approved! 🎉" : "Saved as Draft",
        description: `${posts.length} posts ${status === "approved" ? "scheduled" : "saved"}.`,
      });
      onDone();
    } catch (e) {
      console.error("Save error:", e);
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totalPie = Object.values(categoryCounts).reduce((s, v) => s + v, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Summary Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="font-heading text-2xl font-bold">Review & Approve</h2>
        <p className="text-sm text-muted-foreground">
          {posts.length} posts ready • {dateRange.start} to {dateRange.end}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(platformCounts).map(([platform, count]) => (
          <Card key={platform}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground capitalize">{platform}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Mix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Content Mix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(categoryCounts).map(([category, count]) => {
              const pct = Math.round((count / totalPie) * 100);
              return (
                <div key={category} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[category]}`} />
                  <span className="text-sm capitalize flex-1">{category}</span>
                  <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${CATEGORY_COLORS[category]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">{pct}% ({count})</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Format Mix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Format Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(formatCounts).map(([format, count]) => (
              <Badge key={format} className={`${FORMAT_COLORS[format as ContentFormat] || "bg-muted text-muted-foreground"} text-xs px-3 py-1`}>
                {FORMAT_LABELS[format as ContentFormat] || format} ({count})
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Schedule Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {posts.slice(0, 28).map((post, i) => (
              <div
                key={post.id}
                className="aspect-square rounded bg-muted/50 flex items-center justify-center"
                title={`${post.scheduled_date}: ${post.platform} - ${post.category}`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[post.category]}`} />
              </div>
            ))}
            {posts.length > 28 && (
              <div className="aspect-square rounded bg-muted/50 flex items-center justify-center col-span-7">
                <span className="text-[10px] text-muted-foreground">+{posts.length - 28} more posts</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Stats */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span>{posts.filter(p => p.ai_generated).length} AI-generated</span>
        <span>•</span>
        <span>{posts.filter(p => p.edited).length} manually edited</span>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => savePosts("draft")}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save as Draft
          </Button>
          <Button
            onClick={() => savePosts("approved")}
            disabled={saving}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-6"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            Approve & Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}
