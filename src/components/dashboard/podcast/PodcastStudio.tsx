import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WIZARD_STEPS } from "./types";
import type { PodcastEpisode, PodcastConfig } from "./types";
import PodcastSetupGuideStep from "./SetupGuideStep";
import PodcastConfigureStep from "./ConfigureStep";
import PodcastGeneratingStep from "./GeneratingStep";
import EpisodeEditorStep from "./EpisodeEditorStep";
import MonetizationKitStep from "./MonetizationKitStep";
import ExportDistributeStep from "./ExportDistributeStep";

interface Props {
  onExit: () => void;
  initialBookId?: string;
  initialBookTitle?: string;
  initialBookCoverUrl?: string | null;
}

export default function PodcastStudio({ onExit, initialBookId, initialBookTitle, initialBookCoverUrl }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<PodcastConfig>({
    bookId: initialBookId || "",
    bookTitle: initialBookTitle || "",
    bookCoverUrl: initialBookCoverUrl || null,
    podcastTitle: (initialBookTitle || "") + " Podcast",
    episodeCount: 10,
    formatPreference: "mix",
    tone: "Conversational",
    targetAudience: "",
    monetizationGoals: ["book_sales", "lead_capture"],
  });
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const restoredRef = useRef(false);

  // Restore saved podcast season
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    if (!config.bookId) { setLoadingSaved(false); return; }

    const loadSaved = async () => {
      try {
        const { data: cloudSession } = await supabase.auth.getSession();
        const authorId = cloudSession?.session?.user?.id || user?.id;
        if (!authorId) { setLoadingSaved(false); return; }

        const { data: podcast } = await supabase
          .from("podcasts" as any)
          .select("id, title, episode_count, episode_format, tone, target_audience, monetization_goals")
          .eq("author_id", authorId)
          .eq("book_id", config.bookId)
          .limit(1)
          .single();

        if (!podcast) { setLoadingSaved(false); return; }

        const p = podcast as any;
        setConfig(prev => ({
          ...prev,
          podcastTitle: p.title || prev.podcastTitle,
          episodeCount: p.episode_count || prev.episodeCount,
          formatPreference: p.episode_format || prev.formatPreference,
          tone: p.tone || prev.tone,
          targetAudience: p.target_audience || prev.targetAudience,
          monetizationGoals: Array.isArray(p.monetization_goals) ? p.monetization_goals : prev.monetizationGoals,
        }));

        const { data: eps } = await supabase
          .from("podcast_episodes" as any)
          .select("*")
          .eq("podcast_id", p.id)
          .order("episode_number", { ascending: true });

        if (eps && (eps as any[]).length > 0) {
          const restored: PodcastEpisode[] = (eps as any[]).map(ep => ({
            id: ep.id,
            episode_number: ep.episode_number,
            title: ep.title,
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
            audio_url: ep.audio_url,
            tts_voice_id: ep.tts_voice_id,
            tts_status: ep.tts_status || "pending",
            status: ep.status || "draft",
          }));
          setEpisodes(restored);
          setStep(5); // Jump to Export
        }
      } finally {
        setLoadingSaved(false);
      }
    };

    loadSaved();
  }, [config.bookId, user?.id]);

  const handleRegenerate = () => {
    setEpisodes([]);
    setStep(1);
  };

  return (
    <div className="space-y-0">
      <Button variant="ghost" size="sm" onClick={onExit} className="mb-3 -ml-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Podcast
      </Button>

      {/* Progress Stepper */}
      <div className="flex items-center justify-between mb-2">
        {WIZARD_STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center flex-1">
            <div className="flex flex-col items-center text-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step ? "bg-green-500 text-white" : i === step ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : "bg-muted text-muted-foreground"
              }`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${i === step ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div className={`h-px flex-1 mx-1 ${i < step ? "bg-green-500" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Book Context Bar */}
      {config.bookId && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/50 border border-border/50 mb-4">
          {config.bookCoverUrl ? (
            <img src={config.bookCoverUrl} alt="" className="w-8 h-10 rounded object-cover" />
          ) : (
            <div className="w-8 h-10 rounded bg-muted flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{config.bookTitle}</p>
            <p className="text-[10px] text-muted-foreground">
              {config.podcastTitle} • {config.episodeCount} episodes
            </p>
          </div>
          <Badge variant="outline" className="ml-auto text-[10px]">Source Book</Badge>
        </motion.div>
      )}

      {/* Step Content */}
      <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
        {loadingSaved ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading your saved podcast...
          </div>
        ) : (
          <>
            {step === 0 && <PodcastSetupGuideStep onNext={() => setStep(1)} bookTitle={config.bookTitle} bookCoverUrl={config.bookCoverUrl} />}
            {step === 1 && <PodcastConfigureStep config={config} onConfigChange={setConfig} onNext={() => setStep(2)} />}
            {step === 2 && <PodcastGeneratingStep config={config} onComplete={eps => { setEpisodes(eps); setStep(3); }} onBack={() => setStep(1)} />}
            {step === 3 && <EpisodeEditorStep episodes={episodes} onEpisodesChange={setEpisodes} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
            {step === 4 && <MonetizationKitStep episodes={episodes} config={config} onNext={() => setStep(5)} onBack={() => setStep(3)} />}
            {step === 5 && <ExportDistributeStep episodes={episodes} config={config} onBack={() => setStep(4)} onDone={onExit} onRegenerate={handleRegenerate} />}
          </>
        )}
      </motion.div>
    </div>
  );
}
