import { useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Save, Loader2, Download, Copy, ExternalLink, RefreshCw, Clipboard, Sparkles, ImagePlus, Image as ImageIcon, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import type { SocialPost, CalendarConfig } from "./types";
import { CATEGORY_COLORS, FORMAT_LABELS, FORMAT_COLORS, type ContentFormat } from "./types";
import AbbyCoachingTip from "./AbbyCoachingTip";
import PublishingDashboard from "./PublishingDashboard";

interface Props {
  posts: SocialPost[];
  config: CalendarConfig;
  onBack: () => void;
  onDone: () => void;
  onRegenerate?: () => void;
  onPostsChange?: (posts: SocialPost[]) => void;
}

/** Encode rich post metadata into a single JSON string for the image_prompt DB column */
function encodePostMeta(p: SocialPost): string {
  return JSON.stringify({
    hashtags: p.hashtags,
    format: p.format,
    format_notes: p.format_notes,
    hook: p.hook,
    cta: p.cta,
    image_prompt: p.image_prompt,
    video_shot_list: p.video_shot_list,
    suggested_time: p.suggested_time,
  });
}

/** Build the full post text (caption + hashtags) for clipboard */
function buildPostText(p: SocialPost): string {
  const hashtags = p.hashtags.length > 0 ? "\n\n" + p.hashtags.map(h => `#${h}`).join(" ") : "";
  return p.caption + hashtags;
}

export default function ApproveStep({ posts, config, onBack, onDone, onRegenerate, onPostsChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});

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
    posts.filter(p => p.image_prompt || p.video_shot_list),
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
        image_prompt: encodePostMeta(p),
        status: status === "approved" ? "scheduled" : "draft",
      }));

      await supabase
        .from("social_media_content")
        .delete()
        .eq("author_id", authorId)
        .eq("book_id", config.bookId);

      const { error } = await supabase.from("social_media_content").insert(rows as any);

      if (error) throw error;

      setSaved(true);
      toast({
        title: status === "approved" ? "Calendar Approved! 🎉" : "Saved as Draft",
        description: `${posts.length} posts ${status === "approved" ? "scheduled" : "saved"}.`,
      });
    } catch (e) {
      console.error("Save error:", e);
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copyPostToClipboard = useCallback((post: SocialPost) => {
    const text = buildPostText(post);
    navigator.clipboard.writeText(text);
    setCopiedPostId(post.id);
    toast({ title: "Copied!", description: "Paste into Buffer's 'Create Post' → use their AI Assistant to enhance." });
    setTimeout(() => setCopiedPostId(null), 2000);
  }, [toast]);

  const copyImagePrompt = useCallback((post: SocialPost) => {
    const prompt = post.image_prompt || post.video_shot_list || "";
    navigator.clipboard.writeText(prompt);
    setCopiedPromptId(post.id);
    toast({ title: "Prompt Copied!", description: "Paste into Canva's AI Image Generator or Magic Design." });
    setTimeout(() => setCopiedPromptId(null), 2000);
  }, [toast]);

  const copyAllPosts = useCallback(() => {
    const allText = posts.map((p, i) =>
      `--- Post ${i + 1} (${p.platform.toUpperCase()}) — Day ${p.day_number}, ${p.scheduled_date} ---\n${buildPostText(p)}`
    ).join("\n\n");
    navigator.clipboard.writeText(allText);
    toast({ title: "All Posts Copied!", description: `${posts.length} posts on your clipboard.` });
  }, [posts, toast]);

  const copyAllVisualPrompts = useCallback(() => {
    const allPrompts = visualPosts.map((p, i) => {
      let text = `--- Post ${i + 1} (${p.platform}, Day ${p.day_number}) ---\n`;
      if (p.image_prompt) text += `🎨 Image: ${p.image_prompt}\n`;
      if (p.video_shot_list) text += `🎬 Video: ${p.video_shot_list}\n`;
      return text;
    }).join("\n");
    navigator.clipboard.writeText(allPrompts);
    toast({ title: "All Prompts Copied!", description: `${visualPosts.length} visual prompts on your clipboard. Paste into Canva AI.` });
  }, [visualPosts, toast]);

  const generateImage = useCallback(async (post: SocialPost) => {
    setGeneratingImageId(post.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-social-graphic", {
        body: {
          platform: post.platform,
          imagePrompt: post.image_prompt || post.caption.slice(0, 200),
          bookTitle: config.bookTitle,
          bookCoverUrl: config.bookCoverUrl,
          caption: post.caption,
        },
      });
      if (error) throw error;
      if (data?.imageUrl) {
        setGeneratedImages(prev => ({ ...prev, [post.id]: data.imageUrl }));
        toast({ title: "Image Generated! 🎨", description: `${data.dimensions} graphic ready. Right-click to save, then upload to Buffer.` });
      } else {
        throw new Error(data?.error || "No image returned");
      }
    } catch (e: any) {
      console.error("Image gen error:", e);
      toast({ title: "Generation failed", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setGeneratingImageId(null);
    }
  }, [config, toast]);

  const exportBufferCSV = () => {
    const headers = ["Text", "Link", "Scheduled Date", "Scheduled Time", "Profile Names"];
    const bookLink = config.bookAmazonUrl || "";
    const rows = posts.map(p => {
      const hashtags = p.hashtags.length > 0 ? "\n\n" + p.hashtags.map(h => `#${h}`).join(" ") : "";
      return [
        `"${(p.caption + hashtags).replace(/"/g, '""')}"`,
        `"${bookLink}"`,
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
    toast({ title: "CSV Downloaded", description: "Go to Buffer → Content → Import → upload this file." });
  };

  const totalPie = Object.values(categoryCounts).reduce((s, v) => s + v, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Simplified 3-step workflow */}
      <AbbyCoachingTip
        title="Your 2-Step Publishing Workflow"
        expandedByDefault
        customContent={
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/5 border border-secondary/10">
              <span className="shrink-0 text-lg">1️⃣</span>
              <div>
                <p className="font-semibold text-foreground">Generate images → Download</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Click <ImagePlus className="h-3 w-3 inline" /> <span className="font-medium text-foreground">Generate</span> on any post below — AI creates a platform-sized graphic instantly.
                  Download it and you're ready to post. No Canva needed!
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <span className="shrink-0 text-lg">2️⃣</span>
              <div>
                <p className="font-semibold text-foreground">Copy post + attach image → Schedule in Buffer</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Click <Copy className="h-3 w-3 inline" /> on any post → open{" "}
                  <a href="https://publish.buffer.com" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium inline-flex items-center gap-0.5">
                    Buffer <ExternalLink className="h-3 w-3" />
                  </a>
                  {" → paste text → drag in your generated image → schedule. Done!"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <span className="shrink-0 text-lg">💡</span>
              <div>
                <p className="font-semibold text-foreground">Bulk option: CSV import</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  <button onClick={exportBufferCSV} className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium">
                    Download CSV
                  </button>
                  {" → Buffer → Content → Import → all posts schedule at once."}
                </p>
              </div>
            </div>
          </div>
        }
      />

      {/* Summary Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="font-heading text-2xl font-bold">Review & Publish</h2>
        <p className="text-sm text-muted-foreground">
          {posts.length} posts ready • {dateRange.start} to {dateRange.end}
        </p>
        {saved && (
          <Badge className="bg-green-500/10 text-green-700 text-xs">✓ Saved to your account</Badge>
        )}
      </div>

      {/* Quick Actions Bar */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button variant="outline" size="sm" onClick={copyAllPosts}>
          <Clipboard className="h-3.5 w-3.5 mr-1.5" /> Copy All Posts
        </Button>
        {visualPosts.length > 0 && (
          <Button variant="outline" size="sm" onClick={copyAllVisualPrompts}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Copy All Image Prompts
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={exportBufferCSV}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Download Buffer CSV
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(platformCounts).map(([platform, count]) => (
          <Card key={platform}>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold">{count}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{platform}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Mix + Format Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Content Mix</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {Object.entries(categoryCounts).map(([category, count]) => {
                const pct = Math.round((count / totalPie) * 100);
                return (
                  <div key={category} className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[category]}`} />
                    <span className="text-xs capitalize flex-1">{category}</span>
                    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${CATEGORY_COLORS[category]}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Formats</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(formatCounts).map(([format, count]) => (
                <Badge key={format} className={`${FORMAT_COLORS[format as ContentFormat] || "bg-muted text-muted-foreground"} text-[10px] px-2 py-0.5`}>
                  {FORMAT_LABELS[format as ContentFormat] || format} ({count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* === Posts List with Copy Buttons === */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Your Posts</CardTitle>
            <span className="text-xs text-muted-foreground">{posts.length} total</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {posts.map((post) => (
              <div key={post.id} className="rounded-lg border border-border p-3 space-y-2 group hover:border-primary/20 transition-colors">
                {/* Post header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] capitalize">{post.platform}</Badge>
                    <Badge className={`text-[10px] ${FORMAT_COLORS[post.format as ContentFormat]}`}>
                      {FORMAT_LABELS[post.format as ContentFormat]}
                    </Badge>
                    <Badge className={`text-[10px] ${CATEGORY_COLORS[post.category]}`}>
                      {post.category}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">Day {post.day_number} • {post.scheduled_date}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs opacity-60 group-hover:opacity-100"
                    onClick={() => copyPostToClipboard(post)}
                  >
                    {copiedPostId === post.id ? (
                      <><CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-600" /> Copied</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5 mr-1" /> Copy Post</>
                    )}
                  </Button>
                </div>

                {/* Caption preview */}
                <p className="text-xs text-foreground leading-relaxed">{post.caption.slice(0, 200)}{post.caption.length > 200 ? "..." : ""}</p>

                {/* Hashtags */}
                {post.hashtags.length > 0 && (
                  <p className="text-[10px] text-primary/70">{post.hashtags.map(h => `#${h}`).join(" ")}</p>
                )}

                {/* Image prompt with generate + copy buttons */}
                {post.image_prompt && (
                  <div className="rounded-md bg-secondary/5 border border-secondary/15 p-2 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-secondary mb-0.5">🎨 Visual Prompt</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{post.image_prompt}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[10px]"
                          onClick={() => copyImagePrompt(post)}
                          title="Copy prompt for Canva"
                        >
                          {copiedPromptId === post.id ? (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] bg-secondary/10 border-secondary/20 text-secondary hover:bg-secondary/20"
                          onClick={() => generateImage(post)}
                          disabled={generatingImageId === post.id}
                          title="AI Generate Image"
                        >
                          {generatingImageId === post.id ? (
                            <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Generating…</>
                          ) : (
                            <><ImagePlus className="h-3 w-3 mr-1" /> Generate</>
                          )}
                        </Button>
                      </div>
                    </div>
                    {/* Show generated image */}
                    {generatedImages[post.id] && (
                      <div className="rounded-lg overflow-hidden border border-secondary/20 bg-muted/30">
                        <img 
                          src={generatedImages[post.id]} 
                          alt={`Generated graphic for ${post.platform}`} 
                          className="w-full h-auto max-h-64 object-contain"
                        />
                        <div className="flex items-center justify-between px-2 py-1.5 bg-muted/50">
                          <span className="text-[10px] text-muted-foreground">✓ Ready for {post.platform} — right-click to save</span>
                          <a
                            href={generatedImages[post.id]}
                            download={`${config.bookTitle.replace(/\s+/g, "-")}-${post.platform}-day${post.day_number}.png`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-secondary font-medium hover:underline flex items-center gap-0.5"
                          >
                            <Download className="h-3 w-3" /> Download
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Generate image button for posts WITHOUT an image prompt */}
                {!post.image_prompt && !post.video_shot_list && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] text-muted-foreground hover:text-secondary"
                    onClick={() => generateImage(post)}
                    disabled={generatingImageId === post.id}
                  >
                    {generatingImageId === post.id ? (
                      <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Generating…</>
                    ) : (
                      <><ImagePlus className="h-3 w-3 mr-1" /> Generate Image</>
                    )}
                  </Button>
                )}
                {/* Show generated image for non-prompt posts */}
                {!post.image_prompt && generatedImages[post.id] && (
                  <div className="rounded-lg overflow-hidden border border-secondary/20 bg-muted/30">
                    <img 
                      src={generatedImages[post.id]} 
                      alt={`Generated graphic for ${post.platform}`} 
                      className="w-full h-auto max-h-64 object-contain"
                    />
                    <div className="flex items-center justify-between px-2 py-1.5 bg-muted/50">
                      <span className="text-[10px] text-muted-foreground">✓ Ready for {post.platform}</span>
                      <a
                        href={generatedImages[post.id]}
                        download={`${config.bookTitle.replace(/\s+/g, "-")}-${post.platform}-day${post.day_number}.png`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-secondary font-medium hover:underline flex items-center gap-0.5"
                      >
                        <Download className="h-3 w-3" /> Download
                      </a>
                    </div>
                  </div>
                )}

                {/* Video shot list with copy */}
                {post.video_shot_list && (
                  <div className="rounded-md bg-accent/5 border border-accent/15 p-2 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-accent-foreground mb-0.5">🎬 Video Script</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{post.video_shot_list}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-[10px] shrink-0"
                      onClick={() => { 
                        navigator.clipboard.writeText(post.video_shot_list);
                        toast({ title: "Script Copied!" });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>← Back</Button>
          {onRegenerate && (
            <Button variant="outline" onClick={onRegenerate}>
              <RefreshCw className="h-4 w-4 mr-1" /> Regenerate
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => savePosts("draft")} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Draft
          </Button>
          <Button onClick={() => savePosts("approved")} disabled={saving} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-6">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            Approve & Save
          </Button>
        </div>
      </div>

      {/* Done button after saving */}
      {saved && (
        <div className="text-center pt-2">
          <Button onClick={onDone} variant="outline" className="px-8">
            ✓ Done — Return to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
