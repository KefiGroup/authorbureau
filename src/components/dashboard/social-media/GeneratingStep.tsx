import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import type { SocialPost, CalendarConfig, CATEGORY_COLORS } from "./types";
import AbbyCoachingTip from "./AbbyCoachingTip";

async function getActiveToken(): Promise<string | null> {
  const { data: cloudSession } = await cloudSupabase.auth.getSession();
  if (cloudSession?.session?.access_token) return cloudSession.session.access_token;
  const { data: sharedSession } = await sharedSupabase.auth.getSession();
  return sharedSession?.session?.access_token ?? null;
}

const CATEGORY_BG: Record<string, string> = {
  tips: "bg-blue-500/10 text-blue-700",
  quotes: "bg-amber-500/10 text-amber-700",
  stories: "bg-purple-500/10 text-purple-700",
  promotions: "bg-green-500/10 text-green-700",
  engagement: "bg-rose-500/10 text-rose-700",
};

interface Props {
  config: CalendarConfig;
  onComplete: (posts: SocialPost[]) => void;
  onBack: () => void;
}

type GenState = "queued" | "analyzing" | "generating" | "complete" | "error";

export default function GeneratingStep({ config, onComplete, onBack }: Props) {
  const [state, setState] = useState<GenState>("queued");
  const [progress, setProgress] = useState(0);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [totalExpected, setTotalExpected] = useState(0);
  const [latestPosts, setLatestPosts] = useState<Partial<SocialPost>[]>([]);
  const [error, setError] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [latestPosts]);

  const startGeneration = async () => {
    setState("queued");
    setProgress(2);

    await new Promise(r => setTimeout(r, 1500));
    setState("analyzing");
    setProgress(8);

    await new Promise(r => setTimeout(r, 2000));
    setState("generating");

    const postsPerDay = config.frequency === "daily" ? 1 : config.frequency === "3x" ? 3 / 7 : 5 / 7;
    const total = Math.round(postsPerDay * config.duration);
    setTotalExpected(total);

    try {
      const token = await getActiveToken();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-social-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            bookId: config.bookId,
            platforms: config.platforms,
            frequency: config.frequency,
            contentMix: config.contentMix,
            tones: config.tones,
            duration: config.duration,
            topicsEmphasize: config.topicsEmphasize,
            topicsAvoid: config.topicsAvoid,
          }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(errData.error || `HTTP ${resp.status}`);
      }

      // Read SSE stream
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              // Try to parse incremental posts from the accumulated content
              const parsed = tryParsePartialPosts(fullContent);
              if (parsed.length > generatedCount) {
                setGeneratedCount(parsed.length);
                setLatestPosts(parsed.slice(-5));
                setProgress(Math.min(10 + (parsed.length / Math.max(total, 1)) * 85, 95));
              }
            }
          } catch (error) {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Parse final result
      const allPosts = parsePostsFromContent(fullContent, config);
      if (allPosts.length === 0) {
        throw new Error("No posts were generated. Please try again.");
      }

      setGeneratedCount(allPosts.length);
      setProgress(100);
      setState("complete");

      // Short delay before moving to review
      await new Promise(r => setTimeout(r, 1500));
      onComplete(allPosts);
    } catch (e) {
      console.error("Generation error:", e);
      setError(e instanceof Error ? e.message : "Unknown error");
      setState("error");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      <AbbyCoachingTip
        title="What Abby Is Doing Right Now"
        tips={[
          "📖 Reading your manuscript to extract key themes, quotes, frameworks, and teaching moments.",
          "🧠 Applying the 80/20 content strategy — 80% value, 20% promotion — proven to build audience trust.",
          "🎨 Assigning the highest-engagement format for each platform (Carousels for LinkedIn, Reels for Instagram, etc.).",
          "🪝 Writing scroll-stopping hooks and platform-specific CTAs for every post.",
        ]}
      />
      {/* Status */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
          {state === "error" ? (
            <AlertCircle className="h-10 w-10 text-destructive" />
          ) : state === "complete" ? (
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          ) : (
            <Sparkles className="h-10 w-10 text-secondary animate-pulse" />
          )}
        </div>

        <div>
          <h2 className="font-heading text-2xl font-bold">
            {state === "queued" && "Preparing..."}
            {state === "analyzing" && "Reading your manuscript..."}
            {state === "generating" && "Creating your content calendar..."}
            {state === "complete" && "Your calendar is ready! 🎉"}
            {state === "error" && "Something went wrong"}
          </h2>
          {state === "generating" && totalExpected > 0 && (
            <p className="text-muted-foreground mt-1">
              Generated <span className="font-semibold text-foreground">{generatedCount}</span> of{" "}
              <span className="font-semibold text-foreground">{totalExpected}</span> posts...
            </p>
          )}
        </div>

        {/* Progress Bar */}
        <Progress value={progress} className="h-2 max-w-md mx-auto" />

        {state === "error" && (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={onBack}>Back</Button>
              <Button onClick={() => { hasStarted.current = false; setError(""); startGeneration(); }}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Live Feed */}
      {latestPosts.length > 0 && state === "generating" && (
        <div ref={feedRef} className="space-y-3 max-h-80 overflow-y-auto px-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Latest generated</p>
          <AnimatePresence>
            {latestPosts.map((post, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                        {post.platform}
                      </Badge>
                      <Badge className={`text-[10px] shrink-0 capitalize ${CATEGORY_BG[post.category || "tips"]}`}>
                        {post.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{post.caption}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function tryParsePartialPosts(content: string): Partial<SocialPost>[] {
  try {
    // Try to find JSON array in content
    const match = content.match(/\[[\s\S]*?\{[\s\S]*?\}/);
    if (!match) return [];
    
    // Try adding closing brackets
    let json = match[0];
    if (!json.endsWith("]")) json += "]";
    
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed;
  } catch (error) {
    // Count complete objects
    const objects = content.match(/\{[^{}]*\}/g);
    if (objects) {
      try {
        return objects.map(o => JSON.parse(o)).filter(o => o.caption || o.platform);
      } catch (error) {
      console.error(error);
    }
    }
  }
  return [];
}

function parsePostsFromContent(content: string, config: CalendarConfig): SocialPost[] {
  try {
    // Extract JSON array
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    
    // Clean markdown fences
    let json = jsonMatch[0];
    json = json.replace(/```json\s*/g, "").replace(/```\s*/g, "");
    
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];

    const today = new Date();
    return parsed.map((p: any, idx: number) => {
      const dayNum = p.day_number || idx + 1;
      const date = new Date(today);
      date.setDate(date.getDate() + dayNum - 1);

      return {
        id: crypto.randomUUID(),
        platform: (p.platform || config.platforms[0]).toLowerCase(),
        caption: p.caption || p.content || "",
        hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
        category: p.category || "tips",
        format: p.format || "text_post",
        format_notes: p.format_notes || "",
        hook: p.hook || "",
        cta: p.cta || "",
        image_prompt: p.image_prompt || "",
        video_shot_list: p.video_shot_list || "",
        suggested_time: p.suggested_time || "09:00",
        day_number: dayNum,
        scheduled_date: date.toISOString().split("T")[0],
        status: "draft" as const,
        ai_generated: true,
        edited: false,
      };
    });
  } catch (e) {
    console.error("Failed to parse posts:", e);
    return [];
  }
}
