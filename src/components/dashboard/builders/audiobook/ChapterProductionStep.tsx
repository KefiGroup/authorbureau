import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Wand2, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { toAbbyError } from "@/lib/abby-error";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

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

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ba11-audiobook-generate`;

/**
 * Resolve a fresh token, retrying briefly if the shared-auth restore is in
 * flight (matches the manuscript-retrieval pattern). Returns null only if
 * no token can be obtained after retries.
 */
async function resolveTokenWithRetry(): Promise<string | null> {
  let token = await getActiveToken();
  for (let i = 0; i < 6 && !token; i++) {
    await new Promise((r) => setTimeout(r, 250));
    token = await getActiveToken();
  }
  return token;
}

async function callGenerate(payload: Record<string, unknown>, token: string) {
  const resp = await fetchWithTimeout(
    FN_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    },
    60000,
  );
  const text = await resp.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  return { ok: resp.ok, status: resp.status, data };
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
      let token = await resolveTokenWithRetry();
      if (!token) throw new Error("AUTH_RESTORING: Your session is still restoring. Please wait a moment and try again.");

      let { ok, status, data } = await callGenerate(
        { voiceId, chapterText: c.text, chapterIndex: idx, bookId },
        token,
      );

      // Auth-style failure: force one token refresh and retry once.
      if (!ok && (status === 401 || /AUTH_RESTORING|Unauthorized|invalid jwt/i.test(String(data?.error || "")))) {
        token = (await getActiveToken({ forceRefresh: true })) ?? token;
        ({ ok, status, data } = await callGenerate(
          { voiceId, chapterText: c.text, chapterIndex: idx, bookId },
          token,
        ));
      }

      if (!ok) throw new Error(data?.error || `Chapter generation failed (${status})`);
      const audioUrl: string = data?.audioUrl || "";
      if (!audioUrl) throw new Error(data?.error || "STORAGE_FAILED: No audio URL returned.");

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
    toast({ title: "Production complete", description: `${pending.length} chapter${pending.length === 1 ? "" : "s"} processed.` });
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
          // Only disable the row currently generating. Keep regenerate / generate
          // buttons clickable during a batch run so the author can intervene.
          const disabled = isBusy;
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
                  disabled={disabled}
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
