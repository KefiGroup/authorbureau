import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Save, Loader2, Download, FileText, ExternalLink, RefreshCw, Mic, Volume2 } from "lucide-react";
import AbbyCoachingTip from "../social-media/AbbyCoachingTip";
import type { PodcastEpisode, PodcastConfig } from "./types";
import { FORMAT_LABELS, type EpisodeFormat } from "./types";

interface Props {
  episodes: PodcastEpisode[];
  config: PodcastConfig;
  onBack: () => void;
  onDone: () => void;
  onRegenerate?: () => void;
}

export default function ExportDistributeStep({ episodes, config, onBack, onDone, onRegenerate }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user?.id) setCloudUserId(data.session.user.id);
    });
  }, []);

  const totalDuration = useMemo(() => episodes.reduce((s, ep) => s + ep.duration_minutes, 0), [episodes]);

  const savePodcast = async () => {
    const authorId = cloudUserId || user?.id;
    if (!authorId) return;
    setSaving(true);

    try {
      // Upsert podcast
      const { data: existingPodcast } = await supabase
        .from("podcasts" as any)
        .select("id")
        .eq("author_id", authorId)
        .eq("book_id", config.bookId)
        .limit(1)
        .single();

      let podcastId: string;

      if (existingPodcast) {
        podcastId = (existingPodcast as any).id;
        await supabase.from("podcasts" as any).update({
          title: config.podcastTitle,
          episode_count: episodes.length,
          episode_format: config.formatPreference,
          tone: config.tone,
          target_audience: config.targetAudience,
          monetization_goals: config.monetizationGoals,
        }).eq("id", podcastId);

        // Delete old episodes
        await supabase.from("podcast_episodes" as any).delete().eq("podcast_id", podcastId);
      } else {
        const { data: newPodcast, error: insertErr } = await supabase.from("podcasts" as any).insert({
          author_id: authorId,
          book_id: config.bookId,
          title: config.podcastTitle,
          episode_count: episodes.length,
          episode_format: config.formatPreference,
          tone: config.tone,
          target_audience: config.targetAudience,
          monetization_goals: config.monetizationGoals,
        }).select("id").single();

        if (insertErr) throw insertErr;
        podcastId = (newPodcast as any).id;
      }

      // Insert episodes
      const episodeRows = episodes.map(ep => ({
        podcast_id: podcastId,
        author_id: authorId,
        episode_number: ep.episode_number,
        title: ep.title,
        description: ep.description,
        format: ep.format,
        script_markdown: ep.script_markdown,
        show_notes: ep.show_notes,
        intro_script: ep.intro_script,
        outro_script: ep.outro_script,
        pull_quotes: ep.pull_quotes,
        guest_questions: ep.guest_questions,
        ad_markers: ep.ad_markers,
        duration_minutes: ep.duration_minutes,
      }));

      const { error: epErr } = await supabase.from("podcast_episodes" as any).insert(episodeRows);
      if (epErr) throw epErr;

      setSaved(true);
      toast({ title: "Podcast Season Saved! 🎉", description: `${episodes.length} episodes saved to your account.` });
    } catch (e) {
      console.error("Save error:", e);
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const exportScriptsBundle = () => {
    const content = episodes.map(ep => {
      let text = `${"=".repeat(60)}\n`;
      text += `EPISODE ${ep.episode_number}: ${ep.title}\n`;
      text += `Format: ${FORMAT_LABELS[ep.format as EpisodeFormat]} | Duration: ~${ep.duration_minutes} min\n`;
      text += `${"=".repeat(60)}\n\n`;
      text += `--- INTRO ---\n${ep.intro_script}\n\n`;
      text += `--- SCRIPT ---\n${ep.script_markdown}\n\n`;
      text += `--- OUTRO ---\n${ep.outro_script}\n\n`;
      text += `--- SHOW NOTES ---\n${ep.show_notes}\n\n`;
      if (ep.pull_quotes.length > 0) {
        text += `--- PULL QUOTES (for audiograms) ---\n${ep.pull_quotes.map((q, i) => `${i + 1}. "${q}"`).join("\n")}\n\n`;
      }
      if (ep.guest_questions.length > 0) {
        text += `--- INTERVIEW QUESTIONS ---\n${ep.guest_questions.map((q, i) => `Q${i + 1}: ${typeof q === 'string' ? q : JSON.stringify(q)}`).join("\n")}\n\n`;
      }
      return text;
    }).join("\n\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `podcast-scripts-${config.podcastTitle.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Scripts Downloaded", description: "All episode scripts, show notes, and pull quotes in one file." });
  };

  const exportRSSMetadata = () => {
    const metadata = {
      podcast: {
        title: config.podcastTitle,
        description: `A podcast based on "${config.bookTitle}"`,
        language: "en",
        category: "Education",
        author: config.bookTitle,
        episodes: episodes.map(ep => ({
          episode_number: ep.episode_number,
          title: ep.title,
          description: ep.description,
          duration: `${ep.duration_minutes}:00`,
          show_notes_html: ep.show_notes,
        })),
      },
    };

    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rss-metadata-${config.podcastTitle.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "RSS Metadata Downloaded", description: "Use this to populate your podcast hosting platform." });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <AbbyCoachingTip
        title="Abby's Launch & Distribution Checklist"
        expandedByDefault
        tips={[
          "💾 Step 1: SAVE your season first — this stores everything in your account for editing later.",
          "📥 Step 2: Download the Scripts Bundle — this is your recording reference with all scripts, intros, outros, and show notes.",
          "🎙️ Step 3: Record your episodes — use the scripts as guides. Options: self-record or use AI TTS (ElevenLabs) from the Audiobook Studio.",
          "📤 Step 4: Upload recordings to Spotify for Podcasters → copy RSS feed → submit to Apple Podcasts, YouTube, Amazon.",
          "📱 Step 5: Use the pull quotes to create audiogram clips for social media (pairs perfectly with your Social Media Calendar!).",
          "💰 Step 6: Once you hit 500+ downloads/episode, use the Media Kit to pitch sponsors.",
        ]}
      />

      {/* Summary */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="font-heading text-2xl font-bold">Export & Distribute</h2>
        <p className="text-sm text-muted-foreground">
          {episodes.length} episodes • {totalDuration} minutes total
        </p>
        {saved && <Badge className="bg-green-500/10 text-green-700 text-xs">✓ Saved to your account</Badge>}
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:border-primary/30 transition-all" onClick={exportScriptsBundle}>
          <CardContent className="p-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-heading font-semibold">Download Scripts Bundle</h3>
            <p className="text-xs text-muted-foreground">
              All {episodes.length} episode scripts, show notes, pull quotes & interview questions.
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/30 transition-all" onClick={exportRSSMetadata}>
          <CardContent className="p-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-xl bg-secondary/10 flex items-center justify-center">
              <Download className="h-6 w-6 text-secondary" />
            </div>
            <h3 className="font-heading font-semibold">Download RSS Metadata</h3>
            <p className="text-xs text-muted-foreground">
              Episode titles, descriptions & durations for your hosting platform.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recording Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mic className="h-5 w-5 text-secondary" />
            Recording Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-sm">Self-Record</h4>
              </div>
              <p className="text-xs text-muted-foreground">Use the downloaded scripts as your guide. Record with your microphone, edit in Audacity or GarageBand, upload to hosting.</p>
              <Badge variant="outline" className="text-[10px]">Recommended for authenticity</Badge>
            </div>
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-purple-600" />
                <h4 className="font-medium text-sm">AI Voice (ElevenLabs)</h4>
              </div>
              <p className="text-xs text-muted-foreground">Generate audio using your existing Audiobook Studio voice. Same TTS engine, podcast-optimized delivery.</p>
              <Badge variant="outline" className="text-[10px]">Coming soon via Audiobook Studio</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distribution Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Distribution Platforms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { name: "Spotify for Podcasters", url: "https://podcasters.spotify.com/", desc: "Free hosting + distribution" },
              { name: "Apple Podcasts Connect", url: "https://podcastsconnect.apple.com/", desc: "Submit RSS feed" },
              { name: "YouTube Studio", url: "https://studio.youtube.com/", desc: "Upload as podcast playlist" },
            ].map(tool => (
              <a key={tool.name} href={tool.url} target="_blank" rel="noopener noreferrer"
                className="rounded-lg border border-border p-3 hover:border-primary/30 hover:bg-muted/30 transition-all flex items-center gap-3">
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
          <Button variant="outline" onClick={savePodcast} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Season
          </Button>
          <Button onClick={() => { if (!saved) { savePodcast(); } else { onDone(); } }} disabled={saving}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-6">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            {saved ? "Done" : "Save & Finish"}
          </Button>
        </div>
      </div>
    </div>
  );
}
