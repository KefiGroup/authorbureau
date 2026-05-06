import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthReady } from "@/hooks/useAuthReady";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowRight, Award, LayoutList, DollarSign, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { StepHeader, AbbyCard, LoadingStep, MultiPaymentLinks, SummaryCard, SuccessCheckmark, HighTicketPrice } from "../shared/CategoryBuilderShared";
import PublishSuccessScreen from "../shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";
import { getMicrositeUrl } from "@/lib/node-slug-map";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";
import { YRSafeBoundary, SafeText, SafeBlock } from "../shared/YRSafeBoundary";

const GEN_MSGS = ["Designing your certification programme...", "Building the curriculum...", "Creating certification levels...", "Finalising your certification..."];
const ACT_MSGS = ["Setting up your certification platform...", "Creating payment pages...", "Almost ready..."];
interface Props { authorId: string | null; bookId?: string | null; }

export default function YR25Builder({ authorId, bookId }: Props) {
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
      const __draft = await loadBuilderDraft(authorId, "YR-25", activeBookId);
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
      let q = supabase.from("author_nodes").select("content_json,status,microsite_url,activated_at,current_step").eq("author_id", authorId).eq("node_id", "YR-25");
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
  useEffect(() => { if (step === 2 && content) console.log("[YR-25] step-2 render", content); }, [step, content]);

  const handleGenerate = async () => {
    setStep(1); setError(null);
    try {
      const { invokeWithTimeout } = await import("@/lib/invoke-with-timeout");
      const { data, error: e } = await invokeWithTimeout<any>("generate-yr25-certification", { author_id: authorId, book_id: activeBookId }, 90000);
      if (e || !data?.success) throw new Error(data?.error || e?.message || "Failed");
      setContent(data.content); setStep(2);
      void autosaveBuilderDraft({ authorId: authorId!, nodeId: "YR-25", nodeName: "Certification", content: { ...(data.content), _currentStep: 2 }, currentStep: 2, bookId: activeBookId });
    } catch (e: any) { setError(e.message); setStep(0); }
  };
  const handlePublish = async () => {
    if (isPublishing) return;
    if (!authorId || !authorSlug) { toast.error("Profile not ready — please wait a moment."); return; }
    setError(null); setIsPublishing(true);
    try {
      await autosaveBuilderDraft({ authorId, nodeId: "YR-25", nodeName: "Certification", content: { ...(content || {}), _currentStep: 3 }, currentStep: 3, bookId: activeBookId });
      await publishNodeToSite(authorId, "YR-25", authorSlug, activeBookId);
      setContent((p: any) => ({ ...p, activated: true })); setStep(3);
      toast.success("Your Certification is live on your site.");
    } catch (e: any) { setError(e.message); toast.error(`Publish failed: ${e?.message ?? "Unknown error"}`); }
    finally { setIsPublishing(false); }
  };

  if (authorId && !hydrated) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading…</p></div>;

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <StepHeader nodeId="YR-25" nodeName="Certification Program" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (<AbbyCard><h2 className="text-xl font-bold mb-3">Let's build your Certification Programme</h2><p className="text-muted-foreground mb-4">Hi {authorName}! A certification programme turns your methodology into a credential that others can earn — and pay for. I'm going to design your complete certification programme based on '{detectedBookTitle || bookTitle || "your book"}' — with a curriculum, assessment structure, and a certification badge concept. Ready to certify practitioners in your method?</p><Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}>Build My Certification</Button>{error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}</div>}</AbbyCard>)}
        {step === 1 && <LoadingStep messages={GEN_MSGS} msgIndex={msgIndex} />}
        {step === 2 && content && (
          <YRSafeBoundary nodeId="YR-25" debugContent={content} onReset={() => { setContent(null); setStep(0); }}>
          <div className="space-y-4">
            <AbbyCard><div className="text-muted-foreground"><SafeText value={content.abby_summary} /></div></AbbyCard>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="overview" className="text-xs py-2"><Award className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Overview</TabsTrigger>
                <TabsTrigger value="curriculum" className="text-xs py-2"><LayoutList className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Curriculum</TabsTrigger>
                <TabsTrigger value="levels" className="text-xs py-2"><DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Levels</TabsTrigger>
                <TabsTrigger value="badge" className="text-xs py-2"><BadgeCheck className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Badge</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h3 className="text-xl font-bold"><SafeText value={content.certification_title} /></h3>
                  {content.tagline && <p className="text-sm font-semibold text-primary italic">"<SafeText value={content.tagline} />"</p>}
                  <div className="text-sm"><SafeText value={content.certification_promise} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(content.programme_structure || {}).map(([k, v]) => (
                      <div key={k} className="bg-muted/30 p-3 rounded"><p className="text-xs font-semibold text-muted-foreground capitalize">{k.replace(/_/g, " ")}</p><div className="text-sm font-medium"><SafeText value={v} /></div></div>
                    ))}
                  </div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="curriculum" className="space-y-3 mt-4">
                {content.modules?.map((m: any, i: number) => (
                  <Card key={i}><CardContent className="pt-4 pb-4 space-y-2">
                    <div className="flex items-center gap-2"><span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{m.number ?? i + 1}</span><h4 className="font-bold text-sm"><SafeText value={m.title} /></h4></div>
                    <div className="pl-9 text-sm text-muted-foreground"><SafeText value={m.description} /></div>
                    <span className="inline-block text-xs bg-muted px-2 py-0.5 rounded ml-9"><SafeText value={m.assessment} /></span>
                  </CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="levels" className="space-y-3 mt-4">
                {content.certification_levels?.map((l: any, i: number) => (
                  <Card key={i} className={l.price_usd >= 5000 ? "border-amber-300 dark:border-amber-700" : ""}>
                    <CardContent className="pt-6 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{i + 1}</span>
                          <h4 className="font-bold"><SafeText value={l.level} /></h4>
                        </div>
                        <HighTicketPrice price={l.price_usd} />
                      </div>
                      <div className="pl-9"><SafeBlock value={l.requirements} className="text-muted-foreground" /></div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="badge" className="space-y-4 mt-4">
                <Card className="border-primary/30"><CardContent className="pt-6 text-center space-y-3">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto"><BadgeCheck className="h-10 w-10 text-primary" /></div>
                  <h3 className="font-bold text-lg"><SafeText value={content.badge_concept?.badge_name} /></h3>
                  <div className="text-sm text-muted-foreground"><SafeText value={content.badge_concept?.badge_description} /></div>
                  <div className="text-xs text-muted-foreground"><SafeText value={content.badge_concept?.display_guidance} /></div>
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
              nodeId="YR-25"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
          </div>
        )}
      </div>
    </div>
  );
}
