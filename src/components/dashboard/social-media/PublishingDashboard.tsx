import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Copy, CheckCircle2, ExternalLink, Download,
  Loader2, Calendar, ChevronLeft, ChevronRight, Clock,
  Image as ImageIcon, Palette,
} from "lucide-react";
import type { SocialPost, CalendarConfig, ContentFormat } from "./types";
import { FORMAT_LABELS, FORMAT_COLORS, CATEGORY_COLORS } from "./types";
import ImageStylePicker from "./ImageStylePicker";

interface Props {
  posts: SocialPost[];
  config: CalendarConfig;
  onPostsChange: (posts: SocialPost[]) => void;
}

const PLATFORM_POST_URLS: Record<string, { label: string; url: string }> = {
  linkedin: { label: "LinkedIn", url: "https://www.linkedin.com/feed/?shareActive=true" },
  instagram: { label: "Instagram", url: "https://www.instagram.com/" },
  x: { label: "X / Twitter", url: "https://x.com/compose/post" },
  facebook: { label: "Facebook", url: "https://www.facebook.com/" },
};

function buildPostText(p: SocialPost): string {
  const hashtags = p.hashtags.length > 0 ? "\n\n" + p.hashtags.map(h => `#${h}`).join(" ") : "";
  return p.caption + hashtags;
}

export default function PublishingDashboard({ posts, config, onPostsChange }: Props) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date().toISOString().split("T")[0];
    const hasToday = posts.some(p => p.scheduled_date === today);
    if (hasToday) return today;
    const futureDates = posts.map(p => p.scheduled_date).filter(d => d >= today).sort();
    return futureDates[0] || posts[0]?.scheduled_date || today;
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [markingId, setMarkingId] = useState<string | null>(null);

  const allDates = useMemo(() => {
    const dateSet = new Set(posts.map(p => p.scheduled_date));
    return Array.from(dateSet).sort();
  }, [posts]);

  const todayStr = new Date().toISOString().split("T")[0];

  const dayPosts = useMemo(() =>
    posts.filter(p => p.scheduled_date === selectedDate),
    [posts, selectedDate]
  );

  const stats = useMemo(() => ({
    total: posts.length,
    posted: posts.filter(p => p.status === "approved").length,
    remaining: posts.filter(p => p.status !== "approved").length,
  }), [posts]);

  const navigateDate = (direction: -1 | 1) => {
    const idx = allDates.indexOf(selectedDate);
    const nextIdx = idx + direction;
    if (nextIdx >= 0 && nextIdx < allDates.length) {
      setSelectedDate(allDates[nextIdx]);
    }
  };

  const copyPost = useCallback((post: SocialPost) => {
    navigator.clipboard.writeText(buildPostText(post));
    setCopiedId(post.id);
    toast({ title: "Copied!", description: `Paste into ${post.platform} now.` });
    setTimeout(() => setCopiedId(null), 2000);
  }, [toast]);

  const generateImage = useCallback(async (post: SocialPost) => {
    setGeneratingId(post.id);
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
        toast({ title: "Image ready! 🎨", description: "Download it and attach to your post." });
      } else {
        throw new Error(data?.error || "No image returned");
      }
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingId(null);
    }
  }, [config, toast]);

  const markAsPosted = useCallback(async (postId: string) => {
    setMarkingId(postId);
    try {
      // Update in DB
      await supabase
        .from("social_media_content")
        .update({ status: "posted" } as any)
        .eq("id", postId);

      // Update local state
      onPostsChange(posts.map(p =>
        p.id === postId ? { ...p, status: "approved" as const } : p
      ));
      toast({ title: "Marked as posted ✓" });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    } finally {
      setMarkingId(null);
    }
  }, [posts, onPostsChange, toast]);

  const isToday = selectedDate === todayStr;
  const isPast = selectedDate < todayStr;
  const dateLabel = isToday ? "Today" : isPast ? "Past" : "Upcoming";

  const formatDate = (d: string) => {
    const date = new Date(d + "T12:00:00");
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Progress bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-heading font-semibold text-sm">Publishing Progress</h3>
            <span className="text-xs text-muted-foreground">
              {stats.posted}/{stats.total} posted
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${stats.total > 0 ? (stats.posted / stats.total) * 100 : 0}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Date navigator */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateDate(-1)}
          disabled={allDates.indexOf(selectedDate) <= 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <div className="flex items-center gap-2 justify-center">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-heading text-lg font-bold">{formatDate(selectedDate)}</h2>
            <Badge
              variant={isToday ? "default" : "outline"}
              className={`text-[10px] ${isToday ? "bg-green-500 text-white" : ""}`}
            >
              {dateLabel}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {dayPosts.length} post{dayPosts.length !== 1 ? "s" : ""} scheduled
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateDate(1)}
          disabled={allDates.indexOf(selectedDate) >= allDates.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick jump to today */}
      {!isToday && posts.some(p => p.scheduled_date === todayStr) && (
        <div className="text-center">
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(todayStr)}>
            Jump to Today
          </Button>
        </div>
      )}

      {/* Day's posts */}
      {dayPosts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            No posts scheduled for this date.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {dayPosts.map((post, idx) => {
            const isPosted = post.status === "approved";
            const platformInfo = PLATFORM_POST_URLS[post.platform];
            return (
              <Card
                key={post.id}
                className={`transition-all ${isPosted ? "opacity-60 border-green-500/30" : "hover:border-primary/20"}`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] capitalize font-semibold">
                        {post.platform}
                      </Badge>
                      <Badge className={`text-[10px] ${FORMAT_COLORS[post.format as ContentFormat]}`}>
                        {FORMAT_LABELS[post.format as ContentFormat]}
                      </Badge>
                      <Badge className={`text-[10px] text-white ${CATEGORY_COLORS[post.category]}`}>
                        {post.category}
                      </Badge>
                      {post.suggested_time && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-3 w-3" /> {post.suggested_time}
                        </span>
                      )}
                    </div>
                    {isPosted && (
                      <Badge className="bg-green-500/10 text-green-700 text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Posted
                      </Badge>
                    )}
                  </div>

                  {/* Caption */}
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {post.caption}
                  </p>

                  {/* Hashtags */}
                  {post.hashtags.length > 0 && (
                    <p className="text-xs text-primary/70">
                      {post.hashtags.map(h => `#${h}`).join(" ")}
                    </p>
                  )}

                  {/* Generated image */}
                  {generatedImages[post.id] && (
                    <div className="rounded-lg overflow-hidden border border-secondary/20">
                      <img
                        src={generatedImages[post.id]}
                        alt={`${post.platform} graphic`}
                        className="w-full h-auto max-h-72 object-contain bg-muted/30"
                      />
                      <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
                        <span className="text-[10px] text-muted-foreground">✓ Platform-ready graphic</span>
                        <a
                          href={generatedImages[post.id]}
                          download={`${config.bookTitle.replace(/\s+/g, "-")}-${post.platform}-day${post.day_number}.png`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-secondary font-medium hover:underline flex items-center gap-1"
                        >
                          <Download className="h-3.5 w-3.5" /> Download
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {!isPosted && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {/* Step 1: Copy */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8"
                        onClick={() => copyPost(post)}
                      >
                        {copiedId === post.id ? (
                          <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-600" /> Copied!</>
                        ) : (
                          <><Copy className="h-3.5 w-3.5 mr-1.5" /> 1. Copy Text</>
                        )}
                      </Button>

                      {/* Step 2: Generate image */}
                      {!generatedImages[post.id] && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 border-secondary/30 text-secondary hover:bg-secondary/10"
                          onClick={() => generateImage(post)}
                          disabled={generatingId === post.id}
                        >
                          {generatingId === post.id ? (
                            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generating…</>
                          ) : (
                            <><ImagePlus className="h-3.5 w-3.5 mr-1.5" /> 2. Generate Image</>
                          )}
                        </Button>
                      )}

                      {/* Step 3: Open platform */}
                      {platformInfo && (
                        <a href={platformInfo.url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="text-xs h-8">
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                            3. Open {platformInfo.label}
                          </Button>
                        </a>
                      )}

                      {/* Step 4: Mark as posted */}
                      <Button
                        size="sm"
                        className="text-xs h-8 bg-green-600 hover:bg-green-700 text-white ml-auto"
                        onClick={() => markAsPosted(post.id)}
                        disabled={markingId === post.id}
                      >
                        {markingId === post.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Done — Mark as Posted</>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Date overview strip */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Calendar Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {allDates.map(date => {
              const datePosts = posts.filter(p => p.scheduled_date === date);
              const allPosted = datePosts.every(p => p.status === "approved");
              const isSelected = date === selectedDate;
              const dateIsToday = date === todayStr;
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`
                    px-2 py-1 rounded text-[10px] font-medium transition-all border
                    ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""}
                    ${allPosted ? "bg-green-500/10 text-green-700 border-green-500/20" :
                      dateIsToday ? "bg-primary/10 text-primary border-primary/20" :
                      "bg-muted/50 text-muted-foreground border-border hover:bg-muted"}
                  `}
                >
                  {new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  <span className="ml-1 opacity-70">({datePosts.length})</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
