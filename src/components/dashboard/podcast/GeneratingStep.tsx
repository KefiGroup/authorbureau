import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import type { PodcastEpisode, PodcastConfig } from "./types";
import { FORMAT_LABELS, FORMAT_COLORS, type EpisodeFormat } from "./types";
import AbbyCoachingTip from "../social-media/AbbyCoachingTip";

async function getActiveToken(): Promise<string | null> {
  const { data: cloudSession } = await cloudSupabase.auth.getSession();
  if (cloudSession?.session?.access_token) return cloudSession.session.access_token;
  const { data: sharedSession } = await sharedSupabase.auth.getSession();
  return sharedSession?.session?.access_token ?? null;
}

interface Props {
  config: PodcastConfig;
  onComplete: (episodes: PodcastEpisode[]) => void;
  onBack: () => void;
}

type GenState = "queued" | "analyzing" | "generating" | "complete" | "error";

export default function PodcastGeneratingStep({ config, onComplete, onBack }: Props) {
  const [state, setState] = useState<GenState>("queued");
  const [progress, setProgress] = useState(0);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [latestEpisodes, setLatestEpisodes] = useState<Partial<PodcastEpisode>[]>([]);
  const [error, setError] = useState("");
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    startGeneration();
  }, [startGeneration]);

  const startGeneration = async () => {
    setState("queued");
    setProgress(2);
    await new Promise(r => setTimeout(r, 1500));
    setState("analyzing");
    setProgress(8);
    await new Promise(r => setTimeout(r, 2500));
    setState("generating");

    try {
      const token = await getActiveToken();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-podcast-season`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            bookId: config.bookId,
            episodeCount: config.episodeCount,
            formatPreference: config.formatPreference,
            tone: config.tone,
            targetAudience: config.targetAudience,
            monetizationGoals: config.monetizationGoals,
            podcastTitle: config.podcastTitle,
          }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(errData.error || `HTTP ${resp.status}`);
      }

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
              const parsed = tryParsePartialEpisodes(fullContent);
              if (parsed.length > generatedCount) {
                setGeneratedCount(parsed.length);
                setLatestEpisodes(parsed.slice(-3));
                setProgress(Math.min(10 + (parsed.length / config.episodeCount) * 85, 95));
              }
            }
          } catch (error) {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      const allEpisodes = parseEpisodesFromContent(fullContent);
      if (allEpisodes.length === 0) throw new Error("No episodes were generated. Please try again.");

      setGeneratedCount(allEpisodes.length);
      setProgress(100);
      setState("complete");
      await new Promise(r => setTimeout(r, 1500));
      onComplete(allEpisodes);
    } catch (e) {
      console.error("Generation error:", e);
      setError(e instanceof Error ? e.message : "Unknown error");
      setState("error");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      <AbbyCoachingTip
        title="What Abby Is Creating Right Now"
        tips={[
          "📖 Reading your manuscript to extract key themes, frameworks, stories, and teaching moments for each episode.",
          "🎙️ Writing production-ready scripts with speaker cues, timing markers, and natural conversational flow.",
          "📝 Generating SEO-optimized show notes with timestamps, key takeaways, and resource links.",
          "💬 Extracting pull quotes designed for 15-30 second audiogram social clips.",
          "💰 Placing natural ad break markers and weaving in monetization touchpoints.",
        ]}
      />

      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
          {state === "error" ? <AlertCircle className="h-10 w-10 text-destructive" /> : state === "complete" ? <CheckCircle2 className="h-10 w-10 text-green-600" /> : <Sparkles className="h-10 w-10 text-secondary animate-pulse" />}
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold">
            {state === "queued" && "Preparing..."}
            {state === "analyzing" && "Reading your manuscript..."}
            {state === "generating" && "Writing episode scripts..."}
            {state === "complete" && "Your podcast season is ready! 🎉"}
            {state === "error" && "Something went wrong"}
          </h2>
          {state === "generating" && (
            <p className="text-muted-foreground mt-1">
              Generated <span className="font-semibold text-foreground">{generatedCount}</span> of{" "}
              <span className="font-semibold text-foreground">{config.episodeCount}</span> episodes...
            </p>
          )}
        </div>
        <Progress value={progress} className="h-2 max-w-md mx-auto" />
        {state === "error" && (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={onBack}>Back</Button>
              <Button onClick={() => { hasStarted.current = false; setError(""); startGeneration(); }}>Try Again</Button>
            </div>
          </div>
        )}
      </div>

      {latestEpisodes.length > 0 && state === "generating" && (
        <div className="space-y-3 max-h-60 overflow-y-auto px-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Latest generated</p>
          <AnimatePresence>
            {latestEpisodes.map((ep, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3 }}>
                <Card className="border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">Ep {ep.episode_number}</Badge>
                      <Badge className={`text-[10px] ${FORMAT_COLORS[ep.format as EpisodeFormat] || "bg-muted"}`}>{FORMAT_LABELS[ep.format as EpisodeFormat] || ep.format}</Badge>
                    </div>
                    <p className="text-sm font-medium">{ep.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ep.description}</p>
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

function tryParsePartialEpisodes(content: string): Partial<PodcastEpisode>[] {
  try {
    const match = content.match(/\[[\s\S]*?\{[\s\S]*?\}/);
    if (!match) return [];
    let json = match[0];
    if (!json.endsWith("]")) json += "]";
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed;
  } catch (error) {
    const objects = content.match(/\{[^{}]*\}/g);
    if (objects) {
      try { return objects.map(o => JSON.parse(o)).filter(o => o.title || o.episode_number); } catch (error) {
      console.error(error);
    }
    }
  }
  return [];
}

function parseEpisodesFromContent(content: string): PodcastEpisode[] {
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    let json = jsonMatch[0].replace(/```json\s*/g, "").replace(/```\s*/g, "");
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((ep: any, idx: number) => ({
      id: crypto.randomUUID(),
      episode_number: ep.episode_number || idx + 1,
      title: ep.title || `Episode ${idx + 1}`,
      description: ep.description || "",
      format: ep.format || "solo_teaching",
      script_markdown: ep.script_markdown || "",
      show_notes: ep.show_notes || "",
      intro_script: ep.intro_script || "",
      outro_script: ep.outro_script || "",
      pull_quotes: Array.isArray(ep.pull_quotes) ? ep.pull_quotes : [],
      guest_questions: Array.isArray(ep.guest_questions) ? ep.guest_questions : [],
      ad_markers: Array.isArray(ep.ad_markers) ? ep.ad_markers : [],
      duration_minutes: ep.duration_minutes || 20,
      tts_status: "pending" as const,
      status: "draft" as const,
    }));
  } catch (e) {
    console.error("Failed to parse episodes:", e);
    return [];
  }
}
