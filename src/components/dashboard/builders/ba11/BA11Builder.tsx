import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthReady } from "@/hooks/useAuthReady";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowRight, ArrowLeft, Headphones, FileAudio, Mic, Wand2, Rocket } from "lucide-react";
import { StepHeader, AbbyCard } from "../shared/CategoryBuilderShared";
import AudiobookStepRenderer from "../audiobook/AudiobookStepRenderer";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft, listAudiobookChapters } from "@/lib/builder-autosave";

interface Props { authorId: string | null; bookId?: string | null; }

const STUDIO_STEPS = [
  { id: "setup", label: "Setup", icon: Headphones },
  { id: "optimize", label: "Manuscript", icon: FileAudio },
  { id: "voice", label: "Voice", icon: Mic },
  { id: "production", label: "Production", icon: Wand2 },
  { id: "publish", label: "Publish & Distribute", icon: Rocket },
];

export default function BA11Builder({ authorId, bookId }: Props) {
  const navigate = useNavigate();
  const { hasBook, bookTitle: detectedBookTitle, bookId: detectedBookId, isLoading: isBookLoading } = useAuthorBook();
  const [authorName, setAuthorName] = useState("");
  const [userId, setUserId] = useState("");
  const [resolvedBookTitle, setResolvedBookTitle] = useState("");
  const [resolvedBookId, setResolvedBookId] = useState<string>("");
  const [intro, setIntro] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [generationState, setGenerationState] = useState<"idle" | "queued" | "analyzing" | "generating" | "complete" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const { isReady: isAuthReady } = useAuthReady();

  useEffect(() => {
    if (!isAuthReady || !authorId) return;
    (async () => {
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("pen_name, user_id")
        .eq("id", authorId)
        .single();
      setAuthorName(profile?.pen_name || "there");
      setUserId(profile?.user_id || "");
      // Per-book resolution: prefer the bookId in scope, then fall back to author's latest.
      if (bookId) {
        const { data: book } = await supabase
          .from("books")
          .select("id, title")
          .eq("id", bookId)
          .maybeSingle();
        if (book) {
          setResolvedBookTitle(book.title || "");
          setResolvedBookId(book.id);
        }
      } else if (!detectedBookTitle || detectedBookTitle === "your book") {
        const { data: book } = await supabase
          .from("books")
          .select("id, title")
          .eq("author_id", profile?.user_id || authorId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (book) {
          setResolvedBookTitle(book.title);
          setResolvedBookId(book.id);
        }
      }
      const draft = await loadBuilderDraft(authorId, "BA-11", bookId ?? null);
      if (draft.content?.studio) {
        // Sanitize: strip any blob: URLs that died with the previous session.
        // They will be re-attached from storage in a follow-up effect once bookId is known.
        const studio = draft.content.studio as Record<string, unknown>;
        const rawChapters = Array.isArray(studio.chapters) ? (studio.chapters as Array<Record<string, unknown>>) : [];
        const sanitized = rawChapters.map((c) => {
          const url = typeof c?.audioUrl === "string" ? c.audioUrl : "";
          if (url.startsWith("blob:")) {
            return { ...c, audioUrl: "", status: "script-ready" };
          }
          return c;
        });
        setStepData({ ...studio, chapters: sanitized });
        const savedStep = (draft.content as any)?._currentStep;
        const resumeIdx = typeof savedStep === "number" ? savedStep : (draft.currentStep || 0);
        setStepIdx(Math.min(resumeIdx, STUDIO_STEPS.length - 1));
        setIntro(false);
      }
    })();
  }, [authorId, detectedBookTitle, isAuthReady]);

  // Re-attach permanent storage URLs to chapters once we know the bookId.
  // This heals existing rows that were saved with stale blob: URLs and
  // restores "Audio Ready" status for chapters whose MP3s exist in the bucket.
  useEffect(() => {
    const targetBookId = bookId || resolvedBookId;
    if (!authorId || !targetBookId) return;
    const chapters = (stepData.chapters as Array<Record<string, unknown>> | undefined) ?? [];
    if (chapters.length === 0) return;
    // Only run when at least one chapter is missing audioUrl (i.e. needs healing).
    const needsHealing = chapters.some((c) => !c?.audioUrl || c.audioUrl === "");
    if (!needsHealing) return;

    let cancelled = false;
    (async () => {
      const files = await listAudiobookChapters(authorId, targetBookId);
      if (cancelled || files.length === 0) return;
      const byIndex = new Map(files.map((f) => [f.index, f.publicUrl]));
      let changed = false;
      const healed = chapters.map((c, i) => {
        const url = typeof c?.audioUrl === "string" ? c.audioUrl : "";
        if (!url && byIndex.has(i)) {
          changed = true;
          return { ...c, audioUrl: byIndex.get(i), status: "audio-generated" };
        }
        return c;
      });
      if (!changed) return;
      const nextStudio = { ...stepData, chapters: healed };
      setStepData(nextStudio);
      // Persist the cleaned-up draft so the bad blob row is overwritten.
      void autosaveBuilderDraft({
        authorId,
        nodeId: "BA-11",
        nodeName: "Audiobook",
        content: { studio: nextStudio, _currentStep: stepIdx },
        currentStep: stepIdx,
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId, bookId, resolvedBookId, stepData.chapters?.length]);

  const displayBookTitle = (detectedBookTitle && detectedBookTitle !== "your book") ? detectedBookTitle : resolvedBookTitle;
  const effectiveBookId = bookId || detectedBookId || resolvedBookId;
  const isIntroReady = Boolean(authorName && authorName !== "there" && displayBookTitle);
  const noBookFound = !isBookLoading && !hasBook && !resolvedBookTitle;

  const persistDraft = (data: Record<string, any>, currentStep: number) => {
    if (!authorId) return;
    void autosaveBuilderDraft({
      authorId,
      nodeId: "BA-11",
      nodeName: "Audiobook",
      content: { studio: data },
      currentStep,
    });
  };

  const onMarkEdited = (_stepId: string) => {
    persistDraft(stepData, stepIdx);
  };

  const canAdvance = (idx: number): { ok: boolean; hint?: string } => {
    const step = STUDIO_STEPS[idx];
    if (!step) return { ok: true };
    switch (step.id) {
      case "setup":
        return stepData.setup?.narration
          ? { ok: true }
          : { ok: false, hint: "Choose a narrator style to continue." };
      case "optimize": {
        const chapters = stepData.chapters ?? [];
        return chapters.length > 0
          ? { ok: true }
          : { ok: false, hint: "Click Optimize for Audio to continue." };
      }
      case "voice":
        return stepData.selectedVoiceId
          ? { ok: true }
          : { ok: false, hint: "Select a voice to continue." };
      case "production": {
        const chapters = stepData.chapters ?? [];
        const anyDone = chapters.some((c: any) => c?.status === "audio-generated" || c?.status === "reviewed");
        return anyDone
          ? { ok: true }
          : { ok: false, hint: "Generate at least one chapter before publishing." };
      }
      default:
        return { ok: true };
    }
  };

  const advanceGate = canAdvance(stepIdx);

  const handleNext = () => {
    if (!advanceGate.ok) return;
    if (stepIdx < STUDIO_STEPS.length - 1) {
      const next = stepIdx + 1;
      setStepIdx(next);
      persistDraft(stepData, next);
    }
  };
  const handleBack = () => setStepIdx(Math.max(0, stepIdx - 1));

  const canJumpTo = (target: number) => {
    if (target <= stepIdx) return true;
    for (let i = stepIdx; i < target; i++) {
      if (!canAdvance(i).ok) return false;
    }
    return true;
  };

  if (!authorId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Please set up your author profile first.</p>
      </div>
    );
  }

  const currentStep = STUDIO_STEPS[stepIdx];

  return (
    <div className="min-h-screen bg-background">
      <StepHeader nodeId="BA-11" nodeName="Audiobook" step={intro ? 0 : 2} />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {intro && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's produce your real audiobook</h2>
            {noBookFound ? (
              <>
                <p className="text-muted-foreground mb-4">
                  Hi {authorName}! Before we record, I need to know about your book. Please complete your book profile first.
                </p>
                <Button onClick={() => navigate(`/my-books?returnTo=${encodeURIComponent(`/node-builder/BA-11${bookId ? `?bookId=${bookId}` : ""}`)}`)}>
                  Complete Book Profile
                </Button>
              </>
            ) : !isIntroReady ? (
              <p className="text-muted-foreground mb-4">Loading your book details…</p>
            ) : (
              <>
                <p className="text-muted-foreground mb-4">
                  Hi {authorName}! I'll walk you through turning <strong>{displayBookTitle}</strong> into a real audiobook — splitting your manuscript into chapters, picking an ElevenLabs voice (or your own), generating MP3s, and packaging it for ACX, Spotify, Apple Books, and your own storefront. Ready?
                </p>
                <Button className="w-full sm:w-auto" size="lg" onClick={() => setIntro(false)}>
                  <Sparkles className="h-4 w-4 mr-2" /> Start Audiobook Production
                </Button>
              </>
            )}
            {error && (
              <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {toAbbyError(error)}
              </div>
            )}
          </AbbyCard>
        )}

        {!intro && (
          <>
            {/* Studio progress */}
            <Card className="p-4">
              <div className="flex items-center justify-between gap-2 overflow-x-auto">
                {STUDIO_STEPS.map((s, i) => {
                  const Icon = s.icon;
                  const active = i === stepIdx;
                  const done = i < stepIdx;
                  const allowed = canJumpTo(i);
                  return (
                    <button
                      key={s.id}
                      onClick={() => allowed && setStepIdx(i)}
                      disabled={!allowed}
                      className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-md transition-colors min-w-[80px] ${
                        active ? "bg-secondary/10 text-secondary" : done ? "text-foreground" : "text-muted-foreground"
                      } ${!allowed ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        active ? "bg-secondary text-secondary-foreground" : done ? "bg-accent/20 text-accent" : "bg-muted"
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-medium text-center leading-tight">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-lg font-bold mb-4">{currentStep.label}</h3>
              <AudiobookStepRenderer
                stepId={currentStep.id}
                stepData={stepData}
                setStepData={setStepData}
                onMarkEdited={onMarkEdited}
                bookId={effectiveBookId || ""}
                bookTitle={displayBookTitle}
                plan={null}
                generationState={generationState}
                setGenerationState={setGenerationState}
                userId={userId}
              />
            </Card>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between gap-3">
                <Button variant="outline" onClick={handleBack} disabled={stepIdx === 0}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                {stepIdx < STUDIO_STEPS.length - 1 ? (
                  <Button onClick={handleNext} disabled={!advanceGate.ok}>
                    Next: {STUDIO_STEPS[stepIdx + 1].label} <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <div />
                )}
              </div>
              {!advanceGate.ok && advanceGate.hint && stepIdx < STUDIO_STEPS.length - 1 && (
                <p className="text-xs text-muted-foreground text-right">{advanceGate.hint}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
