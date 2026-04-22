import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Play, Loader2, Upload, Clock, CheckCircle2, Circle, Wand2, Mic } from "lucide-react";
import type { AudiobookStepProps, AudioChapter, NarrationType } from "./types";
import { VOICE_OPTIONS } from "./types";
import { toast } from "sonner";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";

export default function ChapterProductionStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle }: AudiobookStepProps) {
  const chapters: AudioChapter[] = stepData.chapters || [];
  const setup = stepData.setup || {};
  const narration: NarrationType = setup.narration || "ai-voice";
  const selectedVoice = VOICE_OPTIONS.find(v => v.id === stepData.selectedVoiceId);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  const updateChapter = (idx: number, updates: Partial<AudioChapter>) => {
    setStepData(prev => ({
      ...prev,
      chapters: (prev.chapters || []).map((c: AudioChapter, i: number) => i === idx ? { ...c, ...updates } : c),
    }));
    onMarkEdited("production");
  };

  const handleGenerateAudio = async (idx: number) => {
    const ch = chapters[idx];
    if (!ch || !selectedVoice) { toast.error("Select a voice first"); return; }
    setGenerating(ch.id);
    try {
      const token = await getActiveToken();
      if (!token) throw new Error("Not authenticated");
      const response = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ba11-audiobook-generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            bookId,
            voiceId: selectedVoice.elevenLabsId,
            chapterText: ch.optimizedText || ch.originalText,
            chapterIndex: idx,
          }),
        },
        120000,
      );
      let data: { audioBase64?: string; audioUrl?: string; audioUrlError?: string; error?: string; details?: string } = {};
      try { data = await response.json(); } catch { /* non-JSON */ }
      if (!response.ok) {
        const msg = data?.error || `Generation failed (HTTP ${response.status})`;
        throw new Error(data?.details ? `${msg}: ${data.details}` : msg);
      }

      // Only the permanent https storage URL is persisted to author_nodes.
      // Blob URLs die on reload, so they stay in component state only via previewBlobUrl.
      const permanentUrl = data.audioUrl || "";
      let previewBlobUrl = "";
      if (data.audioBase64) {
        const bin = atob(data.audioBase64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: "audio/mpeg" });
        previewBlobUrl = URL.createObjectURL(blob);
      }

      if (permanentUrl) {
        // Use permanent URL for both persistence and playback (it's already a real URL).
        updateChapter(idx, { status: "audio-generated", audioUrl: permanentUrl });
        toast.success(`Audio generated for ${ch.title}!`);
      } else {
        // Storage upload failed — keep blob in transient field so user can preview now,
        // but DO NOT mark as audio-generated, so resume won't think it has real audio.
        updateChapter(idx, {
          status: "script-ready",
          audioUrl: "",
          // @ts-expect-error transient field, intentionally not in AudioChapter type
          previewBlobUrl,
        });
        const detail = data.audioUrlError ? ` (${data.audioUrlError})` : "";
        toast.warning(
          `Audio playable in this session, but saving to permanent storage failed${detail}. Please regenerate before publishing.`,
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Audio generation failed";
      toast.error(msg);
    }
    setGenerating(null);
  };

  const statusIcon = (status: AudioChapter["status"]) => {
    switch (status) {
      case "reviewed": return <CheckCircle2 className="h-3.5 w-3.5 text-accent" />;
      case "audio-generated": return <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />;
      case "script-ready": return <Circle className="h-3.5 w-3.5 text-amber-500" />;
      default: return <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />;
    }
  };

  const statusLabel = (status: AudioChapter["status"]) => {
    switch (status) {
      case "reviewed": return "Reviewed";
      case "audio-generated": return "Audio Ready";
      case "script-ready": return "Script Ready";
      default: return "Not Started";
    }
  };

  const readyCount = chapters.filter(c => c.status === "audio-generated" || c.status === "reviewed").length;

  if (chapters.length === 0) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground text-center py-8">No chapters found. Go back and optimize your manuscript first.</p>
      </div>
    );
  }

  const active = activeIdx !== null ? chapters[activeIdx] : null;

  return (
    <div className="space-y-5">
      <AbbyRecommendationCard>
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Mic className="h-4 w-4 text-secondary" />
            <span className="text-sm font-semibold text-foreground">Abby's Production Strategy</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            {narration === "ai-voice" ? (
              <>Generate chapters <strong>sequentially</strong> for consistent audio quality. The AI voice maintains better tone when chapters flow in order. You've selected <strong>{selectedVoice?.name || "a voice"}</strong> — review each chapter's audio before moving on.</>
            ) : narration === "author" ? (
              <>Record in <strong>20-30 minute sessions</strong> to keep your voice consistent. Drink room-temperature water between takes. Upload each chapter as you complete it — this lets you track progress visually.</>
            ) : (
              <>Work with your narrator to produce chapters in order. Upload each finished chapter here to track progress. Ensure audio meets <strong>192kbps / 44.1kHz</strong> standards for distribution.</>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            Progress: <strong>{readyCount}</strong> of <strong>{chapters.length}</strong> chapters complete
          </p>
        </div>
      </AbbyRecommendationCard>


      {/* Chapter list */}
      <div className="space-y-1.5">
        {chapters.map((ch, idx) => (
          <Card
            key={ch.id}
            className={`p-3 cursor-pointer transition-all hover:bg-muted/30 ${activeIdx === idx ? "ring-1 ring-secondary border-secondary" : ""}`}
            onClick={() => setActiveIdx(activeIdx === idx ? null : idx)}
          >
            <div className="flex items-center gap-3">
              {statusIcon(ch.status)}
              <span className="text-sm font-medium flex-1 truncate">{ch.title}</span>
              <Badge variant="outline" className="text-[9px]">{statusLabel(ch.status)}</Badge>
              {ch.estimatedMinutes && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" /> {ch.estimatedMinutes}m
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Chapter detail */}
      {active && activeIdx !== null && (
        <Card className="p-5 space-y-4">
          <h3 className="font-heading text-sm font-semibold">{active.title}</h3>

          {/* Audio player — prefer permanent URL, fall back to in-session blob preview */}
          {(active.audioUrl || (active as AudioChapter & { previewBlobUrl?: string }).previewBlobUrl) && (
            <div className="rounded-lg bg-muted/30 p-3">
              <audio
                controls
                src={active.audioUrl || (active as AudioChapter & { previewBlobUrl?: string }).previewBlobUrl}
                className="w-full h-8"
              />
            </div>
          )}

          {/* Script */}
          <div>
            <label className="text-xs font-medium block mb-1">Chapter Script</label>
            <Textarea
              value={active.optimizedText || active.originalText}
              onChange={e => updateChapter(activeIdx, { optimizedText: e.target.value })}
              rows={6}
              className="text-xs"
            />
          </div>

          {/* Narrator notes */}
          <div>
            <label className="text-xs font-medium block mb-1">Notes for Narrator</label>
            <Input
              value={active.narratorNotes || ""}
              onChange={e => updateChapter(activeIdx, { narratorNotes: e.target.value })}
              placeholder="e.g. Read this section with more energy..."
              className="text-xs h-8"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {narration === "ai-voice" && (
              <Button size="sm" onClick={() => handleGenerateAudio(activeIdx)} disabled={generating === active.id}>
                {generating === active.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}
                Generate Audio
              </Button>
            )}
            {(narration === "author" || narration === "professional") && (
              <Button size="sm" variant="outline">
                <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload Audio
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => updateChapter(activeIdx, { status: "reviewed" })}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Mark Reviewed
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
