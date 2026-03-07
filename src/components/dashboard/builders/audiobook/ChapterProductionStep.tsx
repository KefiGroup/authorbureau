import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Play, Loader2, Upload, Clock, CheckCircle2, Circle, Wand2 } from "lucide-react";
import type { AudiobookStepProps, AudioChapter, NarrationType } from "./types";
import { VOICE_OPTIONS } from "./types";
import { toast } from "sonner";

export default function ChapterProductionStep({ stepData, setStepData, onMarkEdited, bookTitle }: AudiobookStepProps) {
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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts-audiobook`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "generate",
            text: ch.optimizedText || ch.originalText,
            voiceId: selectedVoice.elevenLabsId,
            chapterId: ch.id,
            bookTitle,
          }),
        }
      );
      if (!response.ok) throw new Error("Generation failed");
      const data = await response.json();
      updateChapter(idx, { status: "audio-generated", audioUrl: data.audioUrl || "" });
      toast.success(`Audio generated for ${ch.title}!`);
    } catch {
      toast.error("Audio generation failed");
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

  if (chapters.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No chapters found. Go back and optimize your manuscript first.</p>;
  }

  const active = activeIdx !== null ? chapters[activeIdx] : null;

  return (
    <div className="space-y-4">
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

          {/* Audio player */}
          {active.audioUrl && (
            <div className="rounded-lg bg-muted/30 p-3">
              <audio controls src={active.audioUrl} className="w-full h-8" />
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
