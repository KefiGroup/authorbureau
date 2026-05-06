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
import { Sparkles, ArrowLeft, ArrowRight, Check, Users, Package, Target } from "lucide-react";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import BANodeDownloadCard from "@/components/dashboard/builders/shared/BANodeDownloadCard";
import ExportPackageCard from "@/components/dashboard/builders/shared/ExportPackageCard";
import { publishNodeToSite } from "@/lib/publish-node";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";

const STEPS = ["Introduction", "Generating", "Review", "Publish"];
const GEN_MSGS = ["Designing your affiliate programme...", "Creating commission tiers...", "Building affiliate resources...", "Planning your recruitment strategy...", "Finalising your programme..."];
const ACT_MSGS = ["Setting up your affiliate programme...", "Creating affiliate resources...", "Almost ready..."];

interface Props { authorId: string | null; bookId?: string | null; }

export default function BA16Builder({ authorId, bookId }: Props) {
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading, bookId: hookBookId } = useAuthorBook();
  const activeBookId = bookId ?? hookBookId ?? null;
  const [resolvedBookTitle, setResolvedBookTitle] = useState<string>("");

  useEffect(() => {
    if (!isAuthReady || !authorId) return;
    (async () => {
      const { data: profile } = await supabase.from("author_profiles").select("pen_name, author_slug, user_id").eq("id", authorId).single();
      setAuthorName(profile?.pen_name || "there");
      setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));
      const { resolveBookTitle } = await import("@/lib/resolve-book-title");
      const _title = await resolveBookTitle(authorId, activeBookId, profile?.user_id);
      if (_title) setResolvedBookTitle(_title);
      const __draft = await loadBuilderDraft(authorId, "BA-16", activeBookId);
      let hydratedFromDraft = false;
      if (__draft.content) {
        hydratedFromDraft = true;
        setContent(__draft.content);
        const isActuallyLive = __draft.isLive && !!__draft.micrositeUrl;
        const _saved = (__draft.content as any)?._currentStep;
        let nextStep = isActuallyLive ? 3 : (typeof _saved === "number" ? _saved : Math.max(__draft.currentStep, 2));
        if (nextStep >= 3 && !isActuallyLive) {
          nextStep = 2;
          toast.info("Resuming from review — please publish again.");
        }
        setStep(nextStep);
      }
      if (!hydratedFromDraft) {
        // Two-tier hydration: fall back to author_nodes for this book.
        let q = supabase.from("author_nodes").select("content_json,status,microsite_url,activated_at").eq("author_id", authorId).eq("node_id", "BA-16");
        if (activeBookId) q = q.eq("book_id", activeBookId);
        const { data: node } = await q.maybeSingle();
        if (node?.content_json) {
          const isPublished = node.status === "live" || !!node.activated_at || !!node.microsite_url;
          setContent(isPublished ? { ...(node.content_json as any), activated: true } : node.content_json);
          setStep(isPublished ? 3 : (node.status === "content_ready" ? 2 : 0));
        }
      }
      setHydrated(true);
    })();
  }, [authorId, isAuthReady, activeBookId]);

  useEffect(() => {
    if (step === 1 || (step === 3 && !content?.activated)) {
      const msgs = step === 1 ? GEN_MSGS : ACT_MSGS;
      setMsgIndex(0);
      intervalRef.current = setInterval(() => setMsgIndex((i) => (i + 1) % msgs.length), 3000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [step]);

  const handleGenerate = async () => {
    setStep(1); setError(null);
    try {
      const { invokeWithTimeout } = await import("@/lib/invoke-with-timeout");
      const { data, error: fnErr } = await invokeWithTimeout<any>("generate-ba16-affiliate", { author_id: authorId, book_id: activeBookId }, 90000);
      if (fnErr || !data?.success) throw new Error(data?.error || fnErr?.message || "Generation failed");
      setContent(data.content); setStep(2);
      void autosaveBuilderDraft({ authorId: authorId!, nodeId: "BA-16", nodeName: "Affiliates", content: { ...(data.content), _currentStep: 2 }, currentStep: 2, bookId: activeBookId });
    } catch (e: any) { setError(e.message); setStep(0); }
  };

  const handlePublish = async () => {
    if (isPublishing) return;
    setError(null);
    setIsPublishing(true);
    setStep(3);
    try {
      // Pre-save before publish to avoid race conditions.
      await autosaveBuilderDraft({ authorId: authorId!, nodeId: "BA-16", nodeName: "Affiliates", content: { ...(content || {}), _currentStep: 2 }, currentStep: 2, bookId: activeBookId });
      await publishNodeToSite(authorId!, "BA-16", authorSlug, activeBookId);
      setContent((prev: any) => ({ ...prev, activated: true }));
      toast.success("Your Affiliate Programme page is live on your site.");
    } catch (e: any) {
      setError(e.message);
      setStep(2);
      toast.error(`Publish failed: ${e.message ?? "Unknown error"}`);
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
      <div className="border-b border-border bg-card px-4 py-3"><div className="max-w-3xl mx-auto flex items-center gap-3"><div className="flex-1"><h1 className="text-lg font-semibold">Affiliates</h1></div></div></div>
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-2"><div className="flex items-center gap-1">{STEPS.map((label, i) => (<div key={label} className="flex items-center gap-1 flex-1"><div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-muted text-muted-foreground"}`}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</div><span className="text-xs text-muted-foreground hidden sm:inline truncate">{label}</span>{i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}</div>))}</div></div>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard><h2 className="text-xl font-bold mb-3">Let's build your Affiliate Programme</h2>
            {noBookFound ? (
              <>
                <p className="text-muted-foreground mb-4">Hi {authorName}! Before I design your affiliate programme, I need to know about your book. Please complete your book profile first.</p>
                <Button onClick={() => navigate(`/my-books?returnTo=${encodeURIComponent(`/node-builder/BA-16${activeBookId ? `?bookId=${activeBookId}` : ""}`)}`)}>Complete Book Profile</Button>
              </>
            ) : !isIntroReady ? (
              <p className="text-muted-foreground mb-4">Loading your book details…</p>
            ) : (<><p className="text-muted-foreground mb-4">Hi {authorName}! An affiliate programme turns your readers into revenue partners. I'll design a programme based on '{displayBookTitle}' — with commission tiers, resources, and a recruitment strategy. Ready?</p><Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}><Sparkles className="h-4 w-4 mr-2" /> Design My Programme</Button></>)}
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{GEN_MSGS[msgIndex]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /><p className="text-xs text-muted-foreground">Abby usually takes 20–40 seconds</p></div></AbbyCard>}
        {step === 2 && content && (
          <div className="space-y-4">
            <AbbyCard><p className="text-muted-foreground">{content.abby_summary}</p></AbbyCard>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-2 h-auto">
                <TabsTrigger value="overview" className="text-xs py-2"><Package className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Overview</TabsTrigger>
                <TabsTrigger value="resources" className="text-xs py-2"><Target className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Resources</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h3 className="text-xl font-bold">{content.programme_title || "Your Affiliate Programme"}</h3>
                  <p className="text-sm text-muted-foreground">{content.overview}</p>
                  {content.commission_tiers?.map((t: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50"><h4 className="font-bold text-sm">{t.name}</h4><p className="text-xs text-muted-foreground">{t.description} — {t.commission}</p></div>
                  ))}
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="resources" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.affiliate_resources || "Affiliate resources will appear here."}</p></CardContent></Card>
              </TabsContent>
            </Tabs>
            <ExportPackageCard
              content={content}
              nodeName="Affiliate Programme"
              bookTitle={(detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : resolvedBookTitle) || "Authors-Bureau"}
              authorName={authorName}
              guidance="Export your full affiliate package — commission tiers, resources, recruitment plan. Upload to Teachable, Kajabi, Thinkific, ThriveCart, or any platform."
            />
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => toast.info("Manual editing coming soon.")}>Edit</Button>
              <Button className="flex-1" size="lg" onClick={handlePublish} disabled={isPublishing}>{isPublishing ? "Publishing…" : <>Publish to My Site<ArrowRight className="h-4 w-4 ml-2" /></>}</Button>
            </div>
          </div>
        )}
        {step === 3 && !content?.activated && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{ACT_MSGS[msgIndex % ACT_MSGS.length]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /><p className="text-xs text-muted-foreground">Abby usually takes 20–40 seconds</p></div></AbbyCard>}
        {step === 3 && content?.activated && (
          <>
            <PublishSuccessScreen nodeId="BA-16" authorName={authorName} penNameSlug={authorSlug} />
            <BANodeDownloadCard content={content} nodeName="Affiliate Programme" bookTitle={(detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : resolvedBookTitle) || "Authors-Bureau"} authorName={authorName} guidance="Your affiliate programme package is ready. Download it and use it with Teachable, Kajabi, Thinkific, ThriveCart, or any affiliate platform of your choice to recruit partners and start earning." />
          </>
        )}
      </div>
    </div>
  );
}

function AbbyCard({ children }: { children: React.ReactNode }) {
  return <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-6"><div className="flex gap-3"><div className="shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"><Sparkles className="h-5 w-5 text-primary" /></div><div className="flex-1 min-w-0">{children}</div></div></CardContent></Card>;
}
