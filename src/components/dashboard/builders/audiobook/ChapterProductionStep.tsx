import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Wand2, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { toAbbyError } from "@/lib/abby-error";

interface Chapter {
  index: number;
  title: string;
  text: string;
  status: "script-ready" | "audio-generated" | "reviewed";
  audioUrl: string;
}

interface Props {
  stepData: Record<string, any>;
  setStepData: (data: Record<string, any>) => void;
  onMarkEdited: (stepId: string) => void;
  bookId: string;
}

export default function ChapterProductionStep({ stepData, setStepData, onMarkEdited, bookId }: Props) {
  const chapters: Chapter[] = stepData.chapters ?? [];
  const voiceId: string = stepData.selectedVoiceId || "";
  const voiceName: string = stepData.selectedVoiceName || "";
  const [busyIdx, setBusyIdx] = useState<number | null>(null);
  const [batchActive, setBatchActive] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  const generateOne = async (idx: number, chaptersOverride?: Chapter[]): Promise<Chapter[]> => {
    const list = chaptersOverride ?? chapters;
    const c = list[idx];
    if (!c) return list;
    setBusyIdx(idx);
    try {
      const { data, error } = await supabase.functions.invoke("ba11-audiobook-generate", {
        body: { voiceId, chapterText: c.text, chapterIndex: idx, bookId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const audioUrl: string = data?.audioUrl || "";
      if (!audioUrl) throw new Error("No audio URL returned");
      const next = list.map((x, i) =>
        i === idx ? { ...x, audioUrl, status: "audio-generated" as const } : x,
      );
      setStepData({ ...stepData, chapters: next });
      onMarkEdited("production");
      return next;
    } catch (e) {
      toast({ title: `Chapter ${idx + 1} failed`, description: toAbbyError(e), variant: "destructive" });
      throw e;
    } finally {
      setBusyIdx(null);
    }
  };

  const generateAll = async () => {
    if (!voiceId) {
      toast({ title: "Pick a voice first", variant: "destructive" });
      return;
    }
    const pending = chapters
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.status !== "audio-generated");
    if (pending.length === 0) return;
    setBatchActive(true);
    setBatchProgress(0);
    let working = chapters;
    for (let n = 0; n < pending.length; n++) {
      const { i } = pending[n];
      try {
        working = await generateOne(i, working);
      } catch {
        // toast already shown — keep going
      }
      setBatchProgress(Math.round(((n + 1) / pending.length) * 100));
      // Throttle to avoid ElevenLabs rate limits
      await new Promise((r) => setTimeout(r, 1500));
    }
    setBatchActive(false);
    toast({ title: "Production complete", description: `${pending.length} chapter${pending.length === 1 ? "" : "s"} generated.` });
  };

  const generatedCount = chapters.filter((c) => c.status === "audio-generated").length;

  if (!voiceId) {
    return (
      <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-300 text-sm flex gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
        <span>Go back and select a voice before generating audio.</span>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm">
          <p>
            Voice locked: <strong>{voiceName}</strong>. Generated{" "}
            <strong>{generatedCount}</strong> of <strong>{chapters.length}</strong> chapters.
          </p>
        </div>
        <Button onClick={generateAll} disabled={batchActive || generatedCount === chapters.length}>
          {batchActive ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
          {generatedCount === chapters.length ? "All chapters generated" : "Generate All Chapters"}
        </Button>
      </div>

      {batchActive && <Progress value={batchProgress} />}

      <div className="space-y-2">
        {chapters.map((c, i) => {
          const isBusy = busyIdx === i;
          const ready = c.status === "audio-generated" && !!c.audioUrl;
          return (
            <Card key={i} className="p-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline">{i + 1}</Badge>
                <span className="font-medium flex-1 min-w-0 truncate">{c.title}</span>
                {ready ? (
                  <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                    <CheckCircle2 className="h-3 w-3" /> Audio Ready
                  </Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
                <Button
                  size="sm"
                  variant={ready ? "outline" : "default"}
                  onClick={() => generateOne(i)}
                  disabled={isBusy || batchActive}
                >
                  {isBusy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> :
                   ready ? <RefreshCw className="h-3 w-3 mr-1" /> :
                   <Wand2 className="h-3 w-3 mr-1" />}
                  {ready ? "Regenerate" : "Generate"}
                </Button>
              </div>
              {ready && (
                <audio controls src={c.audioUrl} className="w-full mt-3" preload="none" />
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
