import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Calendar, List, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { useToast } from "@/hooks/use-toast";
import type { SocialMediaPost, SocialMediaConfig } from "./types";
import { CONTENT_TYPE_LABELS, PLATFORM_CONFIG } from "./types";
import { addDays, format, startOfWeek, endOfWeek, isSameWeek } from "date-fns";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookId: string;
  bookTitle: string;
  plan: Record<string, any> | null;
  generationState: string;
  setGenerationState: (s: "idle" | "queued" | "analyzing" | "generating" | "complete" | "error") => void;
  userId: string;
}

export default function ContentGenerationStep({
  stepData, setStepData, onMarkEdited, bookId, bookTitle, plan,
  generationState, setGenerationState, userId,
}: Props) {
  const { toast } = useToast();
  const config: SocialMediaConfig = stepData["setup"]?.config || {
    platforms: ["linkedin", "instagram"],
    frequency: {},
    contentPillars: [],
    tone: "Mix",
    duration: 90,
  };
  const posts: SocialMediaPost[] = stepData["generate"]?.posts || [];
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState("");
  const [generating, setGenerating] = useState(false);

  const generatePosts = async () => {
    setGenerating(true);
    setGenerationState("queued");
    try {
      const token = await getActiveToken();
      if (!token) {
        setGenerating(false);
        setGenerationState("error");
        toast({ title: "Session expired", description: "Please sign out and back in.", variant: "destructive" });
        return;
      }

      setTimeout(() => setGenerationState("analyzing"), 1500);
      setTimeout(() => setGenerationState("generating"), 4000);

      const resp = await fetchWithTimeout(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [{
            role: "system",
            content: `You are a social media content strategist for authors. Generate a ${config.duration}-day social media calendar.

Book: "${bookTitle}"
Platforms: ${config.platforms.join(", ")}
Content pillars: ${config.contentPillars.join(", ")}
Tone: ${config.tone}
Frequency: ${JSON.stringify(config.frequency)}
Business plan context: ${plan ? JSON.stringify(plan).slice(0, 1500) : "None"}

Return ONLY a JSON array of posts. Each post:
{
  "platform": "linkedin|instagram|facebook|x|tiktok",
  "date": "YYYY-MM-DD",
  "caption": "Full post text (150-280 chars)",
  "contentType": "quote|tip|story|cta|bts",
  "hashtags": ["tag1", "tag2", "tag3"],
  "ctaLabel": "Read more|Get the workbook|etc",
  "imagePrompt": "Brief image description for graphic generation"
}

Generate 3-5 posts per week per platform. Space them evenly. Start from tomorrow. Use varied content types. Make captions engaging and platform-appropriate. No markdown wrapping.`,
          }],
          bookId,
          isPremium: true,
        }),
      }, 120000);

      if (!resp.ok || !resp.body) {
        const errText = await resp.text().catch(() => "");
        throw new Error(errText || `Generation failed (${resp.status})`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) accumulated += delta;
          } catch (error) {
      console.error(error);
    }
        }
      }

      // Parse the JSON from accumulated text
      const jsonMatch = accumulated.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No valid JSON array found");

      const rawPosts = JSON.parse(jsonMatch[0]);
      const generatedPosts: SocialMediaPost[] = rawPosts.map((p: any, idx: number) => ({
        id: `post-${idx}-${Date.now()}`,
        platform: p.platform || "linkedin",
        date: p.date || format(addDays(new Date(), idx + 1), "yyyy-MM-dd"),
        caption: p.caption || "",
        contentType: p.contentType || "tip",
        hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
        ctaLink: "",
        ctaLabel: p.ctaLabel || "",
        imagePrompt: p.imagePrompt || "",
        imageUrl: null,
        status: "draft",
        edited: false,
      }));

      setStepData(prev => ({ ...prev, generate: { ...prev.generate, posts: generatedPosts } }));
      setGenerationState("complete");
      toast({ title: `${generatedPosts.length} posts generated!`, description: "Review your calendar below." });
    } catch (err) {
      console.error("Social media generation error:", err);
      setGenerationState("error");
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveEdit = (postId: string) => {
    setStepData(prev => ({
      ...prev,
      generate: {
        ...prev.generate,
        posts: posts.map(p => p.id === postId ? { ...p, caption: editBuffer, edited: true } : p),
      },
    }));
    onMarkEdited("generate");
    setEditingPost(null);
  };

  const regenerateWeek = (weekStart: Date) => {
    toast({ title: "Regenerating week...", description: "This feature will regenerate all posts for the selected week." });
  };

  if (posts.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center border-dashed border-2">
          <Sparkles className="h-10 w-10 text-secondary/40 mx-auto mb-4" />
          <h3 className="font-heading text-lg font-semibold mb-2">Generate Your Content Calendar</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            AI will create a {config.duration}-day calendar with platform-specific posts extracted from your book chapters.
          </p>
          <Button
            onClick={generatePosts}
            disabled={generating}
            className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate {config.duration}-Day Calendar
          </Button>
        </Card>
      </div>
    );
  }

  // Group posts by week for calendar view
  const weeks: Map<string, SocialMediaPost[]> = new Map();
  posts.forEach(p => {
    const ws = format(startOfWeek(new Date(p.date), { weekStartsOn: 1 }), "yyyy-MM-dd");
    if (!weeks.has(ws)) weeks.set(ws, []);
    weeks.get(ws)!.push(p);
  });

  return (
    <div className="space-y-4">
      {/* View toggle + stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{posts.length} posts</Badge>
          {config.platforms.map(p => (
            <Badge key={p} variant="outline" className="text-[10px]">
              {PLATFORM_CONFIG[p]?.label}: {posts.filter(post => post.platform === p).length}
            </Badge>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          <button
            onClick={() => setView("calendar")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${view === "calendar" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}`}
          >
            <Calendar className="h-3 w-3 inline mr-1" /> Calendar
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${view === "list" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}`}
          >
            <List className="h-3 w-3 inline mr-1" /> List
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {view === "calendar" ? (
        Array.from(weeks.entries()).map(([weekStart, weekPosts]) => (
          <Card key={weekStart} className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
              <span className="text-xs font-semibold">
                Week of {format(new Date(weekStart), "MMM d")} — {format(endOfWeek(new Date(weekStart), { weekStartsOn: 1 }), "MMM d")}
              </span>
              <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => regenerateWeek(new Date(weekStart))}>
                <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
              </Button>
            </div>
            <div className="divide-y divide-border">
              {weekPosts.map(post => {
                const typeInfo = CONTENT_TYPE_LABELS[post.contentType] || CONTENT_TYPE_LABELS.tip;
                const isExpanded = expandedPostId === post.id;
                return (
                  <div key={post.id} className="px-4 py-3">
                    <button
                      onClick={() => setExpandedPostId(isExpanded ? null : post.id)}
                      className="w-full flex items-center gap-3 text-left"
                    >
                      <div className={`w-6 h-6 rounded-full ${PLATFORM_CONFIG[post.platform]?.color || "bg-muted"} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
                        {(PLATFORM_CONFIG[post.platform]?.label || "?")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{format(new Date(post.date), "EEE, MMM d")}</span>
                          <Badge className={`text-[9px] px-1.5 py-0 ${typeInfo.color}`}>
                            {typeInfo.emoji} {typeInfo.label}
                          </Badge>
                          {post.edited && <Badge variant="secondary" className="text-[9px] px-1">Edited</Badge>}
                        </div>
                        <p className="text-sm truncate mt-0.5">{post.caption}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                    </button>
                    {isExpanded && (
                      <div className="mt-3 pl-9 space-y-3">
                        {editingPost === post.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editBuffer}
                              onChange={e => setEditBuffer(e.target.value)}
                              rows={4}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleSaveEdit(post.id)}>Save</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingPost(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm whitespace-pre-wrap">{post.caption}</p>
                            {post.hashtags.length > 0 && (
                              <p className="text-xs text-secondary">
                                {post.hashtags.map(h => `#${h}`).join(" ")}
                              </p>
                            )}
                            {post.ctaLabel && (
                              <p className="text-xs text-muted-foreground">CTA: {post.ctaLabel}</p>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setEditingPost(post.id); setEditBuffer(post.caption); }}
                              className="text-xs h-7"
                            >
                              Edit Post
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))
      ) : (
        /* List View */
        <div className="space-y-2">
          {posts.map(post => {
            const typeInfo = CONTENT_TYPE_LABELS[post.contentType] || CONTENT_TYPE_LABELS.tip;
            return (
              <Card key={post.id} className="p-3 flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full ${PLATFORM_CONFIG[post.platform]?.color || "bg-muted"} flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-0.5`}>
                  {(PLATFORM_CONFIG[post.platform]?.label || "?")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-muted-foreground">{format(new Date(post.date), "EEE, MMM d")}</span>
                    <Badge className={`text-[9px] px-1.5 py-0 ${typeInfo.color}`}>
                      {typeInfo.emoji} {typeInfo.label}
                    </Badge>
                  </div>
                  <p className="text-sm">{post.caption}</p>
                  {post.hashtags.length > 0 && (
                    <p className="text-xs text-secondary mt-1">{post.hashtags.map(h => `#${h}`).join(" ")}</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
