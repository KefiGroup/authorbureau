import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthReady } from "@/hooks/useAuthReady";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, Newspaper, FileText, Mail, Target } from "lucide-react";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import BANodeDownloadCard from "@/components/dashboard/builders/shared/BANodeDownloadCard";
import ExportPackageCard from "@/components/dashboard/builders/shared/ExportPackageCard";
import { publishNodeToSite } from "@/lib/publish-node";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";

const STEPS = ["Introduction", "Generating", "Review", "Publish"];
const GEN_MSGS = ["Building your media kit...", "Writing your press release...", "Creating your media pitch template...", "Identifying target media outlets...", "Finalising your PR strategy..."];
const ACT_MSGS = ["Setting up your media outreach pipeline...", "Preparing your press materials...", "Almost ready..."];

interface Props { authorId: string | null; bookId?: string | null; }

export default function BA15Builder({ authorId, bookId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const { isReady: isAuthReady } = useAuthReady();
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [authorSlug, setAuthorSlug] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading, bookId: hookBookId } = useAuthorBook();
  const activeBookId = bookId ?? hookBookId ?? null;
  const [resolvedBookTitle, setResolvedBookTitle] = useState<string>("");

  useEffect(() => {
    if (!isAuthReady || !authorId) return;
    let cancelled = false;
    (async () => {
      const { data: profile } = await supabase.from("author_profiles").select("pen_name, author_slug, user_id").eq("id", authorId).single();
      if (cancelled) return;
      setAuthorName(profile?.pen_name || "there");
      setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));
      const { resolveBookTitle } = await import("@/lib/resolve-book-title");
      const _title = await resolveBookTitle(authorId, activeBookId, profile?.user_id);
      if (cancelled) return;
      if (_title) setResolvedBookTitle(_title);

      const __draft = await loadBuilderDraft(authorId, "BA-15", activeBookId);
      if (cancelled) return;
      if (__draft.content) {
        const isActuallyLive = __draft.isLive && !!__draft.micrositeUrl;
        const savedStep = __draft.currentStep ?? 0;
        const isHalfPublished = !isActuallyLive && savedStep >= 3;
        setContent({ ...__draft.content, activated: isActuallyLive });
        const _saved = (__draft.content as any)?._currentStep;
        setStep(isActuallyLive ? 3 : isHalfPublished ? 2 : (typeof _saved === "number" ? _saved : Math.max(savedStep, 2)));
        if (isHalfPublished) {
          toast.info("Your last publish didn't complete — please click Publish again.");
        }
        setHydrated(true);
        return;
      }

      // Tier 2: direct author_nodes scoped by activeBookId
      let nodeQuery = supabase
        .from("author_nodes")
        .select("content_json, status, microsite_url, activated_at, current_step")
        .eq("author_id", authorId)
        .eq("node_id", "BA-15");
      if (activeBookId) nodeQuery = nodeQuery.eq("book_id", activeBookId);
      const { data: node } = await nodeQuery.maybeSingle();
      if (cancelled) return;
      if (node?.content_json) {
        const baseContent = node.content_json as any;
        const isPublished = node.status === "live" || !!node.activated_at || !!node.microsite_url;
        const savedStep = typeof baseContent?._currentStep === "number" ? baseContent._currentStep : null;
        setContent(isPublished ? { ...baseContent, activated: true } : baseContent);
        setStep(isPublished ? 3 : (savedStep !== null ? savedStep : 2));
      }
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [authorId, isAuthReady, activeBookId]);

  useEffect(() => {
    if (step === 1 || (isPublishing && !content?.activated)) {
      const msgs = step === 1 ? GEN_MSGS : ACT_MSGS;
      setMsgIndex(0);
      intervalRef.current = setInterval(() => setMsgIndex((i) => (i + 1) % msgs.length), 3000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [step, isPublishing, content?.activated]);

  const handleGenerate = async () => {
    setStep(1); setError(null);
    try {
      const { invokeWithTimeout } = await import("@/lib/invoke-with-timeout");
      const { data, error: fnErr } = await invokeWithTimeout<any>("generate-ba15-media-pr", { author_id: authorId, book_id: activeBookId }, 90000);
      if (fnErr || !data?.success) throw new Error(data?.error || fnErr?.message || "Generation failed");
      setContent(data.content); setStep(2);
      void autosaveBuilderDraft({ authorId: authorId!, nodeId: "BA-15", nodeName: "Media & PR", content: { ...(data.content), _currentStep: 2 }, currentStep: 2, bookId: activeBookId });
    } catch (e: any) { setError(e.message); setStep(0); }
  };

  const handleSaveDraft = async () => {
    if (!authorId || !content) return;
    setIsSavingDraft(true);
    try {
      const result = await autosaveBuilderDraft({
        authorId, nodeId: "BA-15", nodeName: "Media & PR",
        content: { ...content, _currentStep: step },
        currentStep: step, bookId: activeBookId,
      });
      if (result.ok) toast.success("Draft saved!");
      else toast.error(toAbbyError(result.error || "Failed to save draft"));
    } finally { setIsSavingDraft(false); }
  };

  const handlePublish = async () => {
    if (isPublishing) return;
    if (!authorId || !authorSlug) {
      toast.error("Author profile not loaded yet — please wait a moment and try again.");
      return;
    }
    setError(null);
    setIsPublishing(true);
    try {
      await autosaveBuilderDraft({
        authorId, nodeId: "BA-15", nodeName: "Media & PR",
        content: { ...content, _currentStep: 3 },
        currentStep: 3, bookId: activeBookId,
      });
      await publishNodeToSite(authorId, "BA-15", authorSlug, activeBookId);
      setContent((prev: any) => ({ ...prev, activated: true }));
      setStep(3);
      toast.success("Your Press Kit page is live on your site.");
    } catch (e: any) {
      console.error("[BA15] publish failed", e);
      setError(e?.message || "Unknown error");
      toast.error(`Publish failed: ${e?.message ?? "Unknown error"}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const displayBookTitle = (detectedBookTitle && detectedBookTitle !== "your book") ? detectedBookTitle : resolvedBookTitle;
  const isIntroReady = Boolean(authorName && authorName !== "there" && displayBookTitle);
  const noBookFound = !isBookLoading && !hasBook && !resolvedBookTitle && !detectedBookTitle;

  if (authorId && !hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-4 py-3"><div className="max-w-3xl mx-auto flex items-center gap-3"><div className="flex-1"><h1 className="text-lg font-semibold">Media & PR</h1></div></div></div>
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-2"><div className="flex items-center gap-1">{STEPS.map((label, i) => (<div key={label} className="flex items-center gap-1 flex-1"><div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-muted text-muted-foreground"}`}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</div><span className="text-xs text-muted-foreground hidden sm:inline truncate">{label}</span>{i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}</div>))}</div></div>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard><h2 className="text-xl font-bold mb-3">Let's build your Media & PR Strategy</h2>
            {noBookFound ? (
              <>
                <p className="text-muted-foreground mb-4">Hi {authorName}! Before I build your media kit, I need to know about your book. Please complete your book profile first.</p>
                <Button onClick={() => navigate(`/my-books?returnTo=${encodeURIComponent(`/node-builder/BA-15${activeBookId ? `?bookId=${activeBookId}` : ""}`)}`)}>Complete Book Profile</Button>
              </>
            ) : !isIntroReady ? (
              <p className="text-muted-foreground mb-4">Loading your book details…</p>
            ) : (<><p className="text-muted-foreground mb-4">Hi {authorName}! Media outreach amplifies your authority to mainstream audiences. I'll create a complete PR kit based on '{displayBookTitle}' — including a media kit, press release, and pitch template. Ready?</p><Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}><Sparkles className="h-4 w-4 mr-2" /> Build My Media Kit</Button></>)}
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{GEN_MSGS[msgIndex]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /><p className="text-xs text-muted-foreground">Abby usually takes 20–40 seconds</p></div></AbbyCard>}
        {step === 2 && content && (
          <div className="space-y-4">
            <AbbyCard><p className="text-muted-foreground">{content.abby_summary}</p></AbbyCard>
            <Tabs defaultValue="media-kit" className="w-full">
              <TabsList className="w-full grid grid-cols-3 h-auto">
                <TabsTrigger value="media-kit" className="text-xs py-2"><Newspaper className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Media Kit</TabsTrigger>
                <TabsTrigger value="press" className="text-xs py-2"><FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Press Release</TabsTrigger>
                <TabsTrigger value="pitch" className="text-xs py-2"><Mail className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Pitch</TabsTrigger>
              </TabsList>
              <TabsContent value="media-kit" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h3 className="text-xl font-bold">{content.media_kit_title || "Your Media Kit"}</h3>
                  <p className="text-sm text-muted-foreground">{content.media_kit_content || content.media_kit}</p>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="press" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6">
                  {typeof content.press_release === "string" ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.press_release}</p>
                  ) : content.press_release ? (
                    <div className="space-y-3">
                      {content.press_release.headline && <h3 className="font-bold">{content.press_release.headline}</h3>}
                      {content.press_release.subheadline && <p className="italic text-sm">{content.press_release.subheadline}</p>}
                      {content.press_release.body && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.press_release.body}</p>}
                      {content.press_release.boilerplate && <p className="text-xs text-muted-foreground">{content.press_release.boilerplate}</p>}
                    </div>
                  ) : <p className="text-sm text-muted-foreground italic">No press release generated.</p>}
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="pitch" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6">
                  {(() => {
                    const pitch = content.pitch_template ?? content.media_pitch_template;
                    if (typeof pitch === "string") return <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pitch}</p>;
                    if (pitch && typeof pitch === "object") {
                      const lines = [
                        pitch.subject_line && `Subject: ${pitch.subject_line}`,
                        pitch.opening,
                        pitch.hook,
                        pitch.credentials,
                        pitch.call_to_action,
                      ].filter(Boolean).join("\n\n");
                      return <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lines}</p>;
                    }
                    return <p className="text-sm text-muted-foreground italic">No pitch template generated.</p>;
                  })()}
                </CardContent></Card>
              </TabsContent>
            </Tabs>
            <ExportPackageCard
              content={content}
              nodeName="Media Kit"
              bookTitle={(detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : resolvedBookTitle) || "Authors-Bureau"}
              authorName={authorName}
              guidance="Export your full media kit — bio, press release, pitch templates. Send to journalists, podcast hosts, and event organisers."
            />
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={handleSaveDraft} disabled={isSavingDraft}>{isSavingDraft ? "Saving…" : "Save Draft"}</Button>
              <Button className="flex-1" size="lg" onClick={handlePublish} disabled={isPublishing || !authorSlug}>{isPublishing ? "Publishing…" : "Publish to My Site"}<ArrowRight className="h-4 w-4 ml-2" /></Button>
            </div>
          </div>
        )}
        {isPublishing && !content?.activated && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{ACT_MSGS[msgIndex % ACT_MSGS.length]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /><p className="text-xs text-muted-foreground">Abby usually takes 20–40 seconds</p></div></AbbyCard>}
        {step === 3 && content?.activated && !isPublishing && (
          <>
            <PublishSuccessScreen nodeId="BA-15" authorName={authorName} penNameSlug={authorSlug} />
            <BANodeDownloadCard content={content} nodeName="Media Kit" bookTitle={(detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : resolvedBookTitle) || "Authors-Bureau"} authorName={authorName} guidance="Your media kit is ready. Download it and send it to journalists, podcast hosts, and event organisers to land press, interviews, and speaking opportunities." />
          </>
        )}
      </div>
    </div>
  );
}

function AbbyCard({ children }: { children: React.ReactNode }) {
  return <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-6"><div className="flex gap-3"><div className="shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"><Sparkles className="h-5 w-5 text-primary" /></div><div className="flex-1 min-w-0">{children}</div></div></CardContent></Card>;
}
