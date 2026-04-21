import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Loader2, Volume2, Mic, CheckCircle2 } from "lucide-react";
import { VOICE_OPTIONS, type AudiobookStepProps, type NarrationType, type VoiceOption } from "./types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AbbyCoachingTip from "@/components/dashboard/social-media/AbbyCoachingTip";


const VOICE_INSTRUCTIONS = {
  "ai-voice": {
    summary: "Choose the AI voice that will narrate your entire audiobook. Preview each voice to hear how it sounds with your book's content.",
    items: [
      { label: "Filter voices", description: "Use the gender and tone filters to narrow down voices that match your book's style." },
      { label: "Preview a voice", description: "Click the play button on any voice card to hear a sample read from your book." },
      { label: "Select your narrator", description: "Click a voice card to select it. You can change your selection anytime before production." },
    ],
  },
  author: {
    summary: "You've chosen to narrate your own audiobook. Review the equipment checklist and recording tips below to ensure professional quality.",
    items: [
      { label: "Prepare your space", description: "Set up a quiet room with soft furnishings to minimize echo and background noise." },
      { label: "Check your equipment", description: "Ensure you have a quality USB microphone, pop filter, and monitoring headphones." },
      { label: "Do a test recording", description: "Record 60 seconds, listen back, and adjust mic placement before starting." },
    ],
  },
  professional: {
    summary: "You've chosen to hire a professional narrator. Review the guidance below to find and hire the right voice for your book.",
    items: [
      { label: "Browse narrators", description: "Visit ACX.com or similar marketplaces to find narrators in your genre." },
      { label: "Request auditions", description: "Send a passage from YOUR book — not generic text — to hear how they handle your content." },
      { label: "Negotiate terms", description: "Choose between per-finished-hour rates ($200-$400) or royalty-share to manage costs." },
    ],
  },
};

export default function VoiceSelectionStep({ stepData, setStepData, onMarkEdited, bookTitle }: AudiobookStepProps) {
  const setup = stepData.setup || {};
  const narration: NarrationType = setup.narration || "ai-voice";
  const selectedVoiceId = stepData.selectedVoiceId || "";
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterTone, setFilterTone] = useState<string>("all");

  const update = (field: string, value: any) => {
    setStepData(prev => ({ ...prev, [field]: value }));
    onMarkEdited("voice");
  };

  const handlePreview = async (voice: VoiceOption) => {
    setPlayingId(voice.id);
    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-tts-audiobook", {
        body: { action: "preview-voice", voiceKey: voice.id },
      });
      if (error) throw error;
      if (!data?.audioBase64) throw new Error("No audio returned");
      const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => { setPlayingId(null); toast.error("Could not play voice preview"); };
      await audio.play();
    } catch (error) {
      console.error("Voice preview error:", error);
      toast.error("Could not play voice preview");
      setPlayingId(null);
    }
  };

  const filteredVoices = VOICE_OPTIONS.filter(v => {
    if (filterGender !== "all" && v.gender !== filterGender) return false;
    if (filterTone !== "all" && v.tone !== filterTone) return false;
    return true;
  });

  // Author-narrated UI
  if (narration === "author") {
    return (
      <div className="space-y-5">
        
        <AbbyCoachingTip
          title="Recording Tips for Author Narration"
          expandedByDefault
          tips={[
            "Use a quiet room with soft furnishings to absorb echo.",
            "A USB condenser microphone ($50-$150) dramatically improves quality.",
            "Record in 20-30 minute sessions to keep your voice fresh.",
            "Keep a glass of room-temperature water nearby.",
            "Read slightly slower than conversational speed.",
            "Do a 60-second test recording and listen back before committing.",
          ]}
        />
        <Card className="p-5 space-y-3">
          <h3 className="font-heading text-sm font-semibold">Equipment Checklist</h3>
          {["USB Microphone (Blue Yeti, Audio-Technica AT2020)", "Pop filter", "Quiet recording space", "Headphones for monitoring", "Recording software (Audacity — free)"].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  // Professional narrator UI
  if (narration === "professional") {
    return (
      <div className="space-y-5">
        
        <AbbyCoachingTip
          title="Finding a Professional Narrator"
          expandedByDefault
          tips={[
            "ACX.com connects authors with professional narrators.",
            "Budget $200-$400 per finished hour for quality narration.",
            "Request audition recordings with YOUR text, not generic samples.",
            "Non-fiction books benefit from conversational, warm voices.",
            "A royalty-share model can reduce upfront costs.",
          ]}
        />
        <Card className="p-5 text-center">
          <Mic className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">Narrator Marketplace Coming Soon</p>
          <p className="text-xs text-muted-foreground">In the meantime, visit ACX.com to find and hire a narrator.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => window.open("https://www.acx.com", "_blank")}>
            Visit ACX.com
          </Button>
        </Card>
      </div>
    );
  }

  // AI Voice selection
  return (
    <div className="space-y-5">
      
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div>
          <Label className="text-[10px]">Gender</Label>
          <div className="flex gap-1 mt-1">
            {["all", "female", "male"].map(g => (
              <Badge key={g} variant={filterGender === g ? "default" : "outline"} className="cursor-pointer text-xs capitalize" onClick={() => setFilterGender(g)}>
                {g === "all" ? "All" : g}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-[10px]">Tone</Label>
          <div className="flex gap-1 mt-1">
            {["all", "Warm", "Conversational", "Authoritative", "Energetic", "Elegant"].map(t => (
              <Badge key={t} variant={filterTone === t ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setFilterTone(t)}>
                {t === "all" ? "All" : t}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Voice grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filteredVoices.map(voice => {
          const isSelected = selectedVoiceId === voice.id;
          const isPlaying = playingId === voice.id;
          return (
            <Card
              key={voice.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                isSelected ? "ring-2 ring-secondary border-secondary" : ""
              }`}
              onClick={() => update("selectedVoiceId", voice.id)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isSelected ? "bg-secondary text-secondary-foreground" : "bg-muted"}`}>
                  <Volume2 className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{voice.name}</p>
                  <div className="flex gap-1 mt-0.5">
                    <Badge variant="outline" className="text-[9px]">{voice.gender}</Badge>
                    <Badge variant="outline" className="text-[9px]">{voice.accent}</Badge>
                    <Badge variant="outline" className="text-[9px]">{voice.tone}</Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={(e) => { e.stopPropagation(); handlePreview(voice); }}
                  disabled={isPlaying}
                >
                  {isPlaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                </Button>
              </div>
              {isSelected && (
                <p className="text-[10px] text-secondary mt-2 font-medium">✓ Selected for your audiobook</p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
