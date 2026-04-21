import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowRight, ArrowLeft, Headphones, FileAudio, Mic, Wand2, Rocket } from "lucide-react";
import { StepHeader, AbbyCard } from "../ba-shared/BABuilderShared";
import AudiobookStepRenderer from "../audiobook/AudiobookStepRenderer";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";

interface Props { authorId: string | null; }

const STUDIO_STEPS = [
  { id: "setup", label: "Setup", icon: Headphones },
  { id: "optimize", label: "Manuscript", icon: FileAudio },
  { id: "voice", label: "Voice", icon: Mic },
  { id: "production", label: "Production", icon: Wand2 },
  { id: "publish", label: "Publish & Distribute", icon: Rocket },
];

export default function BA11Builder({ authorId }: Props) {
  const navigate = useNavigate();
  const { hasBook, bookTitle: detectedBookTitle, bookId, isLoading: isBookLoading } = useAuthorBook();
  const [authorName, setAuthorName] = useState("");
  const [userId, setUserId] = useState("");
  const [resolvedBookTitle, setResolvedBookTitle] = useState("");
  const [resolvedBookId, setResolvedBookId] = useState<string>("");
  const [intro, setIntro] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [generationState, setGenerationState] = useState<"idle" | "queued" | "analyzing" | "generating" | "complete" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authorId) return;
    (async () => {
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("pen_name, user_id")
        .eq("id", authorId)
        .single();
      setAuthorName(profile?.pen_name || "there");
      setUserId(profile?.user_id || "");
      if (!detectedBookTitle || detectedBookTitle === "your book") {
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
      const draft = await loadBuilderDraft(authorId, "BA-11");
      if (draft.content?.studio) {
        setStepData(draft.content.studio);
        setStepIdx(Math.min(draft.currentStep || 0, STUDIO_STEPS.length - 1));
        setIntro(false);
      }
    })();
  }, [authorId, detectedBookTitle]);

  const displayBookTitle = (detectedBookTitle && detectedBookTitle !== "your book") ? detectedBookTitle : resolvedBookTitle;
  const effectiveBookId = bookId || resolvedBookId;
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

  const handleNext = () => {
    if (stepIdx < STUDIO_STEPS.length - 1) {
      const next = stepIdx + 1;
      setStepIdx(next);
      persistDraft(stepData, next);
    }
  };
  const handleBack = () => setStepIdx(Math.max(0, stepIdx - 1));

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
                <Button onClick={() => navigate("/my-books?returnTo=/node-builder/BA-11")}>
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
                  return (
                    <button
                      key={s.id}
                      onClick={() => setStepIdx(i)}
                      className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-md transition-colors min-w-[80px] ${
                        active ? "bg-secondary/10 text-secondary" : done ? "text-foreground" : "text-muted-foreground"
                      }`}
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

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={handleBack} disabled={stepIdx === 0}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              {stepIdx < STUDIO_STEPS.length - 1 ? (
                <Button onClick={handleNext}>
                  Next: {STUDIO_STEPS[stepIdx + 1].label} <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <div />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
