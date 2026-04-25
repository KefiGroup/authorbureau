import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Loader2, Check, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { toAbbyError } from "@/lib/abby-error";
import { AUDIOBOOK_VOICES } from "./voices";

interface Props {
  stepData: Record<string, any>;
  setStepData: (data: Record<string, any>) => void;
  onMarkEdited: (stepId: string) => void;
}

export default function VoiceSelectionStep({ stepData, setStepData, onMarkEdited }: Props) {
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const selectedId: string = stepData.selectedVoiceId || "";

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingVoiceId(null);
  };

  const previewVoice = async (voiceId: string) => {
    if (playingVoiceId === voiceId) {
      stopPlayback();
      return;
    }
    stopPlayback();
    setLoadingVoiceId(voiceId);
    try {
      const { data, error } = await supabase.functions.invoke("ba11-voice-preview", { body: { voiceId } });
      if (error) throw new Error(error.message);
      if (!data?.audioBase64) throw new Error("No audio returned from preview");
      const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
      audio.onended = () => setPlayingVoiceId(null);
      audioRef.current = audio;
      setPlayingVoiceId(voiceId);
      await audio.play();
    } catch (e) {
      toast({ title: "Preview failed", description: toAbbyError(e), variant: "destructive" });
    } finally {
      setLoadingVoiceId(null);
    }
  };

  const selectVoice = (voiceId: string, voiceName: string) => {
    setStepData({ ...stepData, selectedVoiceId: voiceId, selectedVoiceName: voiceName });
    onMarkEdited("voice");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pick a narrator. Hit <strong>Preview</strong> to hear a sample, then <strong>Select</strong> to lock it in for production.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {AUDIOBOOK_VOICES.map((v) => {
          const active = selectedId === v.id;
          const isLoading = loadingVoiceId === v.id;
          const isPlaying = playingVoiceId === v.id;
          return (
            <Card
              key={v.id}
              className={`p-4 transition-colors ${active ? "border-secondary ring-2 ring-secondary/30" : "hover:border-muted-foreground/40"}`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${active ? "bg-secondary text-secondary-foreground" : "bg-muted"}`}>
                  <Mic className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold">{v.name}</h4>
                    <Badge variant="outline" className="text-[10px]">{v.gender}</Badge>
                    {active && <Badge className="text-[10px] gap-1"><Check className="h-3 w-3" /> Selected</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{v.style}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Best for: {v.bestFor}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => previewVoice(v.id)} disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> :
                       isPlaying ? <Pause className="h-3 w-3 mr-1" /> :
                       <Play className="h-3 w-3 mr-1" />}
                      {isPlaying ? "Stop" : "Preview"}
                    </Button>
                    <Button size="sm" variant={active ? "secondary" : "default"} onClick={() => selectVoice(v.id, v.name)}>
                      {active ? "Selected" : "Select"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
