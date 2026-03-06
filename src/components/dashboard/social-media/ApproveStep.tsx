import { useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Save, Loader2, Download, FileText, Image, Video, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { SocialPost, CalendarConfig } from "./types";
import { CATEGORY_COLORS, FORMAT_LABELS, FORMAT_COLORS, type ContentFormat } from "./types";
import AbbyCoachingTip from "./AbbyCoachingTip";

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
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "visuals" | "export">("overview");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user?.id) setCloudUserId(data.session.user.id);
    });
  }, []);

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

  const visualPosts = useMemo(() =>
    posts.filter(p => ["carousel", "reel_script", "video_script", "image_caption", "story_script"].includes(p.format)),
    [posts]
  );

  const savePosts = async (status: "draft" | "approved") => {
    const authorId = cloudUserId || user?.id;
    if (!authorId) return;
    setSaving(true);

    try {
      const rows = posts.map(p => ({
        author_id: authorId,
        book_id: config.bookId,
        platform: p.platform,
        content_type: p.category,
        content_text: p.caption,
        day_number: p.day_number,
        scheduled_date: p.scheduled_date,
        image_prompt: p.hashtags.join(", "),
        status: status === "approved" ? "scheduled" : "draft",
      }));

      await supabase
        .from("social_media_content")
        .delete()
        .eq("author_id", authorId)
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

  const exportBufferCSV = () => {
    const headers = ["Text", "Link", "Scheduled Date", "Scheduled Time", "Profile Names"];
    const rows = posts.map(p => {
      const hashtags = p.hashtags.length > 0 ? "\n\n" + p.hashtags.map(h => `#${h}`).join(" ") : "";
      return [
        `"${(p.caption + hashtags).replace(/"/g, '""')}"`,
        "",
        p.scheduled_date,
        p.suggested_time || "09:00",
        p.platform,
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `social-calendar-${config.bookTitle.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV Downloaded", description: "Upload this file to Buffer, Hootsuite, or Later." });
  };

  const exportVisualBrief = () => {
    const lines = visualPosts.map((p, i) => {
      let brief = `--- Post ${i + 1}: Day ${p.day_number} (${p.scheduled_date}) ---\n`;
      brief += `Platform: ${p.platform.toUpperCase()}\n`;
      brief += `Format: ${FORMAT_LABELS[p.format as ContentFormat] || p.format}\n`;
      brief += `Caption: ${p.caption.slice(0, 100)}...\n`;
      if (p.image_prompt) brief += `\n🎨 IMAGE PROMPT:\n${p.image_prompt}\n`;
      if (p.video_shot_list) brief += `\n🎬 VIDEO SHOT LIST:\n${p.video_shot_list}\n`;
      if (p.format_notes) brief += `\n📋 FORMAT NOTES:\n${p.format_notes}\n`;
      return brief;
    });
    const content = `VISUAL ASSET BRIEF — ${config.bookTitle}\n${"=".repeat(50)}\n\n${visualPosts.length} posts need visual assets.\n\n${lines.join("\n\n")}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visual-brief-${config.bookTitle.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Visual Brief Downloaded", description: "Use these prompts to create images with Canva, Midjourney, or DALL·E." });
  };

  const totalPie = Object.values(categoryCounts).reduce((s, v) => s + v, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <AbbyCoachingTip
        title="Your Publishing Game Plan"
        tips={[
          "📋 Step 1: Download the Buffer CSV → upload to buffer.com/publish → all posts auto-schedule.",
          "🎨 Step 2: Download Visual Brief → create images in Canva using the AI prompts → attach to each post.",
          "🎬 Step 3: For Reel/Video posts, follow the shot lists → film with your phone → upload to scheduling tool.",
          "📊 Step 4: After 7 days, check analytics → double down on top-performing content types.",
          "🔁 Step 5: After 30 days, come back here and generate a new calendar based on what worked.",
        ]}
      />

      {/* Summary Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="font-heading text-2xl font-bold">Review & Export</h2>
        <p className="text-sm text-muted-foreground">
          {posts.length} posts ready • {dateRange.start} to {dateRange.end}
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-muted rounded-lg p-0.5 w-fit mx-auto">
        {(["overview", "visuals", "export"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
              activeTab === tab ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "visuals" ? "Visual Assets" : tab === "export" ? "Export & Schedule" : tab}
          </button>
        ))}
      </div>

      {/* === Overview Tab === */}
      {activeTab === "overview" && (
        <>
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
            <CardHeader className="pb-3"><CardTitle className="text-lg">Content Mix</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(categoryCounts).map(([category, count]) => {
                  const pct = Math.round((count / totalPie) * 100);
                  return (
                    <div key={category} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[category]}`} />
                      <span className="text-sm capitalize flex-1">{category}</span>
                      <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${CATEGORY_COLORS[category]}`} style={{ width: `${pct}%` }} />
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
            <CardHeader className="pb-3"><CardTitle className="text-lg">Format Distribution</CardTitle></CardHeader>
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
            <CardHeader className="pb-3"><CardTitle className="text-lg">Schedule Preview</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {posts.slice(0, 28).map((post) => (
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
        </>
      )}

      {/* === Visual Assets Tab === */}
      {activeTab === "visuals" && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Image className="h-5 w-5 text-secondary" />
                  Visual Assets Needed
                </CardTitle>
                <Badge variant="outline" className="text-xs">{visualPosts.length} posts need visuals</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm text-muted-foreground mb-4">
                Each visual post below includes an AI-generated prompt. Use these with Canva, Midjourney, DALL·E, or your designer.
              </p>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {visualPosts.map((post, idx) => (
                  <div key={post.id} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] capitalize">{post.platform}</Badge>
                      <Badge className={`text-[10px] ${FORMAT_COLORS[post.format as ContentFormat]}`}>
                        {FORMAT_LABELS[post.format as ContentFormat]}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">Day {post.day_number} • {post.scheduled_date}</span>
                    </div>
                    <p className="text-xs text-foreground line-clamp-2">{post.caption.slice(0, 120)}...</p>
                    
                    {post.image_prompt && (
                      <div className="rounded-md bg-teal-500/5 border border-teal-500/20 p-2">
                        <p className="text-[10px] font-semibold text-teal-700 mb-1">🎨 Image Prompt</p>
                        <p className="text-xs text-muted-foreground">{post.image_prompt}</p>
                      </div>
                    )}
                    
                    {post.video_shot_list && (
                      <div className="rounded-md bg-pink-500/5 border border-pink-500/20 p-2">
                        <p className="text-[10px] font-semibold text-pink-700 mb-1">🎬 Shot List / Script</p>
                        <p className="text-xs text-muted-foreground whitespace-pre-line">{post.video_shot_list}</p>
                      </div>
                    )}

                    {post.format_notes && !post.image_prompt && !post.video_shot_list && (
                      <div className="rounded-md bg-muted/50 p-2">
                        <p className="text-[10px] font-semibold text-foreground mb-1">📋 Format Notes</p>
                        <p className="text-xs text-muted-foreground">{post.format_notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button variant="outline" onClick={exportVisualBrief} className="w-full">
            <FileText className="h-4 w-4 mr-2" />
            Download Full Visual Brief (.txt)
          </Button>
        </>
      )}

      {/* === Export & Schedule Tab === */}
      {activeTab === "export" && (
        <>
          <AbbyCoachingTip
            title="How to Auto-Schedule Everything"
            expandedByDefault
            tips={[
              "1️⃣ Download the Buffer CSV below.",
              "2️⃣ Go to buffer.com → Publishing → Bulk Create → Upload CSV.",
              "3️⃣ Buffer will auto-schedule all posts at optimal times.",
              "4️⃣ Attach visuals to each post in Buffer's composer.",
              "5️⃣ Review and hit 'Add to Queue'. Done! 🎉",
            ]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:border-primary/30 transition-all" onClick={exportBufferCSV}>
              <CardContent className="p-6 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                  <Download className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold">Download Buffer CSV</h3>
                <p className="text-xs text-muted-foreground">
                  Import all {posts.length} posts into Buffer, Hootsuite, or Later with one upload.
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary/30 transition-all" onClick={exportVisualBrief}>
              <CardContent className="p-6 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-secondary/10 flex items-center justify-center">
                  <Image className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="font-heading font-semibold">Download Visual Brief</h3>
                <p className="text-xs text-muted-foreground">
                  {visualPosts.length} image prompts & video scripts for your designer or AI tools.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Scheduling Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { name: "Buffer", url: "https://publish.buffer.com", desc: "Upload CSV → auto-schedule" },
                  { name: "Later", url: "https://app.later.com", desc: "Drag-and-drop visual planner" },
                  { name: "Canva", url: "https://www.canva.com", desc: "Create carousel slides & graphics" },
                ].map(tool => (
                  <a
                    key={tool.name}
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-border p-3 hover:border-primary/30 hover:bg-muted/30 transition-all flex items-center gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">{tool.name}</p>
                      <p className="text-xs text-muted-foreground">{tool.desc}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

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
          <Button variant="outline" onClick={() => savePosts("draft")} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save as Draft
          </Button>
          <Button onClick={() => savePosts("approved")} disabled={saving} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-6">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            Approve & Save
          </Button>
        </div>
      </div>
    </div>
  );
}
