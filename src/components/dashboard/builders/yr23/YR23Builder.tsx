import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthReady } from "@/hooks/useAuthReady";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowRight, Crown, Users, ClipboardList, FileText } from "lucide-react";
import { toast } from "sonner";
import { StepHeader, AbbyCard, LoadingStep, MultiPaymentLinks, SummaryCard, SuccessCheckmark, HighTicketPrice } from "../shared/CategoryBuilderShared";
import PublishSuccessScreen from "../shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";
import { getMicrositeUrl } from "@/lib/node-slug-map";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";
import { YRSafeBoundary, SafeText, SafeBlock } from "../shared/YRSafeBoundary";

const GEN_MSGS = ["Designing your exclusive mastermind...", "Crafting membership tiers...", "Building your application process...", "Finalising your mastermind programme..."];
const ACT_MSGS = ["Setting up your membership tiers...", "Creating payment pages...", "Almost ready..."];
interface Props { authorId: string | null; bookId?: string | null; }

export default function YR23Builder({ authorId, bookId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const { isReady: isAuthReady } = useAuthReady();
  const [authorName, setAuthorName] = useState("");
  const [authorSlug, setAuthorSlug] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading, bookId: hookBookId } = useAuthorBook();
  const activeBookId = bookId ?? hookBookId ?? null;
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (!isAuthReady || !authorId) return;
    let cancelled = false;
    (async () => {
      const { data: p } = await supabase.from("author_profiles").select("pen_name, author_slug, user_id").eq("id", authorId).single();
      if (cancelled) return;
      setAuthorName(p?.pen_name || "there");
      setAuthorSlug(p?.author_slug || "");
      const { resolveBookTitle: _rbt } = await import("@/lib/resolve-book-title");
      const _t = await _rbt(authorId, activeBookId, p?.user_id);
      if (cancelled) return;
      if (_t) setBookTitle(_t);
      const __draft = await loadBuilderDraft(authorId, "YR-23", activeBookId);
      if (cancelled) return;
      if (__draft.content) {
        const isActuallyLive = __draft.isLive && !!__draft.micrositeUrl;
        const savedStep = __draft.currentStep ?? 0;
        const isHalfPublished = !isActuallyLive && savedStep >= 3;
        setContent({ ...(__draft.content as any), activated: isActuallyLive });
        const _saved = (__draft.content as any)?._currentStep;
        setStep(isActuallyLive ? 3 : isHalfPublished ? 2 : (typeof _saved === "number" ? _saved : Math.max(savedStep, 2)));
        if (isHalfPublished) toast.info("Your last publish didn't complete — please click Publish again.");
        setHydrated(true); return;
      }
      let q = supabase.from("author_nodes").select("content_json,status,microsite_url,activated_at,current_step").eq("author_id", authorId).eq("node_id", "YR-23");
      if (activeBookId) q = q.eq("book_id", activeBookId);
      const { data: node } = await q.maybeSingle();
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

  useEffect(() => { if (step === 1 || (isPublishing && !content?.activated)) { const msgs = step === 1 ? GEN_MSGS : ACT_MSGS; setMsgIndex(0); intervalRef.current = setInterval(() => setMsgIndex(i => (i + 1) % msgs.length), 3000); return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; } }, [step, isPublishing, content?.activated]);
  useEffect(() => { if (step === 2 && content) console.log("[YR-23] step-2 render", content); }, [step, content]);

  const handleGenerate = async () => {
    setStep(1); setError(null);
    try {
      const { invokeWithTimeout } = await import("@/lib/invoke-with-timeout");
      // Sprint 9 fix: silent retry once on timeout/transient failure. The 4-section
      // mastermind generator occasionally exceeds the AI gateway window; one
      // automatic retry resolves the vast majority without user intervention.
      let data: any = null; let e: any = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        const res = await invokeWithTimeout<any>("generate-yr23-mastermind", { author_id: authorId, book_id: activeBookId }, 90000);
        data = res.data; e = res.error;
        if (data?.success) break;
        if (attempt === 1) {
          console.warn("[YR-23] generation attempt 1 failed, silently retrying", e?.message || data?.error);
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
      if (e || !data?.success) throw new Error(data?.error || e?.message || "Failed");
      setContent(data.content); setStep(2);
      void autosaveBuilderDraft({ authorId: authorId!, nodeId: "YR-23", nodeName: "Masterminds", content: { ...(data.content), _currentStep: 2 }, currentStep: 2, bookId: activeBookId });
    } catch (e: any) { setError(e.message); setStep(0); }
  };
  const handlePublish = async () => {
    if (isPublishing) return;
    if (!authorId || !authorSlug) { toast.error("Profile not ready — please wait a moment."); return; }
    setError(null); setIsPublishing(true);
    try {
      await autosaveBuilderDraft({ authorId, nodeId: "YR-23", nodeName: "Masterminds", content: { ...(content || {}), _currentStep: 3 }, currentStep: 3, bookId: activeBookId });
      await publishNodeToSite(authorId, "YR-23", authorSlug, activeBookId);
      setContent((p: any) => ({ ...p, activated: true })); setStep(3);
      toast.success("Your Mastermind is live on your site.");
    } catch (e: any) { setError(e.message); toast.error(`Publish failed: ${e?.message ?? "Unknown error"}`); }
    finally { setIsPublishing(false); }
  };

  if (authorId && !hydrated) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading…</p></div>;

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <StepHeader nodeId="YR-23" nodeName="Mastermind" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (<AbbyCard><h2 className="text-xl font-bold mb-3">Let's build your Mastermind</h2><p className="text-muted-foreground mb-4">Hi {authorName}! A mastermind is the most exclusive and highest-value community you can create. I'm going to design your complete mastermind programme based on '{detectedBookTitle || bookTitle || "your book"}' — with a structure, application process, and a sales page. Ready to build your inner circle?</p><Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}>Build My Mastermind</Button>{error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}</div>}</AbbyCard>)}
        {step === 1 && <LoadingStep messages={GEN_MSGS} msgIndex={msgIndex} />}
        {step === 2 && content && (
          <YRSafeBoundary nodeId="YR-23" debugContent={content} onReset={() => { setContent(null); setStep(0); }}>
          <div className="space-y-4">
            <AbbyCard><div className="text-muted-foreground"><SafeText value={content.abby_summary} /></div></AbbyCard>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="overview" className="text-xs py-2"><Crown className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Overview</TabsTrigger>
                <TabsTrigger value="tiers" className="text-xs py-2"><Users className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Tiers</TabsTrigger>
                <TabsTrigger value="application" className="text-xs py-2"><ClipboardList className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Application</TabsTrigger>
                <TabsTrigger value="sales" className="text-xs py-2"><FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Sales Page</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h3 className="text-xl font-bold"><SafeText value={content.mastermind_title} /></h3>
                  {content.tagline && <p className="text-sm font-semibold text-primary italic">"<SafeText value={content.tagline} />"</p>}
                  <div className="text-sm"><SafeText value={content.programme_promise} /></div>
                  <div className="flex gap-2 flex-wrap">{content.curriculum_pillars?.map((p: any, i: number) => {
                    const name = typeof p === "string" ? p : (p?.pillar_name || p?.name || p?.title);
                    return name ? <span key={i} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">{String(name)}</span> : null;
                  })}</div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="tiers" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {content.membership_tiers?.map((t: any, i: number) => (
                    <Card key={i} className="border-amber-300 dark:border-amber-700">
                      <CardContent className="pt-6 space-y-3">
                        <h4 className="font-bold"><SafeText value={t.tier_name} /></h4>
                        <HighTicketPrice price={t.price_annual_usd} /><span className="text-xs text-muted-foreground">/year</span>
                        <p className="text-xs text-muted-foreground"><SafeText value={t.group_size} /> · <SafeText value={t.meeting_cadence} /></p>
                        <ul className="space-y-1">{t.benefits?.map((b: any, j: number) => <li key={j} className="flex items-start gap-2 text-sm"><span className="text-green-600">✓</span><SafeText value={b} /></li>)}</ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="application" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-2">Only accept applicants who meet your ideal client criteria</p>
                  <ol className="space-y-2">{content.application_questions?.map((q: any, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><span className="font-bold text-primary">{i + 1}.</span><SafeText value={q} /></li>)}</ol>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="sales" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4">
                  <h3 className="text-xl font-bold"><SafeText value={content.sales_page?.headline} /></h3>
                  <div className="text-muted-foreground"><SafeText value={content.sales_page?.subheadline} /></div>
                  <SafeBlock value={content.sales_page?.who_its_for} />
                  <ul className="space-y-1">{content.sales_page?.what_youll_get?.map((w: any, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><span className="text-green-600">✓</span><SafeText value={w} /></li>)}</ul>
                  <Button className="w-full">{typeof content.sales_page?.cta_button_text === "string" ? content.sales_page.cta_button_text : "Apply for Membership"}</Button>
                </CardContent></Card>
              </TabsContent>
            </Tabs>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => toast.info("Manual editing coming soon.")}>Edit</Button>
              <Button className="flex-1" size="lg" onClick={handlePublish} disabled={isPublishing}>{isPublishing ? "Publishing…" : "Publish to My Site"}<ArrowRight className="h-4 w-4 ml-2" /></Button>
            </div>
          </div>
          </YRSafeBoundary>
        )}
        {isPublishing && !content?.activated && <LoadingStep messages={ACT_MSGS} msgIndex={msgIndex} />}
        {step === 3 && content?.activated && (
          <div className="space-y-6">
            <PublishSuccessScreen
              nodeId="YR-23"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
          </div>
        )}
      </div>
    </div>
  );
}
