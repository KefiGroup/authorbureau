import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthReady } from "@/hooks/useAuthReady";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowRight, Users, FileText, DollarSign, Shield } from "lucide-react";
import { StepHeader, AbbyCard, LoadingStep, MultiPaymentLinks, SummaryCard, SuccessCheckmark, HighTicketPrice } from "../shared/CategoryBuilderShared";
import PublishSuccessScreen from "../shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";
import { getMicrositeUrl } from "@/lib/node-slug-map";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";
import { YRSafeBoundary, SafeText } from "../shared/YRSafeBoundary";

const GEN_MSGS = ["Designing your coaching practice..."];
const ACT_MSGS = ["Publishing your coaching practice..."];

interface Props { authorId: string | null; bookId?: string | null; }

export default function YR19Builder({ authorId, bookId }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const devUnlock = searchParams.get("unlock") === "true";
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

      // Tier 1: shared autosave draft
      const __draft = await loadBuilderDraft(authorId, "YR-19", activeBookId);
      if (cancelled) return;
      if (__draft.content) {
        const isActuallyLive = __draft.isLive && !!__draft.micrositeUrl;
        const savedStep = __draft.currentStep ?? 0;
        const isHalfPublished = !isActuallyLive && savedStep >= 3;
        setContent({ ...(__draft.content as any), activated: isActuallyLive });
        const _saved = (__draft.content as any)?._currentStep;
        setStep(isActuallyLive ? 3 : isHalfPublished ? 2 : (typeof _saved === "number" ? _saved : Math.max(savedStep, 2)));
        if (isHalfPublished) toast.info("Your last publish didn't complete — please click Publish again.");
        setHydrated(true);
        return;
      }

      // Tier 2: direct author_nodes read scoped by activeBookId
      let nodeQuery = supabase.from("author_nodes")
        .select("content_json, status, microsite_url, activated_at, current_step")
        .eq("author_id", authorId).eq("node_id", "YR-19");
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
      intervalRef.current = setInterval(() => setMsgIndex(i => (i + 1) % msgs.length), 3000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [step, isPublishing, content?.activated]);
  useEffect(() => { if (step === 2 && content) console.log("[YR-19] step-2 render", content); }, [step, content]);

  const handleGenerate = async () => {
    setStep(1); setError(null);
    try {
      const { invokeWithTimeout } = await import("@/lib/invoke-with-timeout");
      const { data, error: e } = await invokeWithTimeout<any>("generate-yr19-coaching", { author_id: authorId, book_id: activeBookId }, 90000);
      if (e || !data?.success) throw new Error(data?.error || e?.message || "Generation failed");
      setContent(data.content); setStep(2);
      void autosaveBuilderDraft({ authorId: authorId!, nodeId: "YR-19", nodeName: "Coaching", content: { ...(data.content), _currentStep: 2 }, currentStep: 2, bookId: activeBookId });
    } catch (e: any) { setError(e.message); setStep(0); }
  };

  const handlePublish = async () => {
    if (isPublishing) return;
    if (!authorId || !authorSlug) { toast.error("Profile not ready — please wait a moment."); return; }
    setError(null);
    setIsPublishing(true);
    try {
      await autosaveBuilderDraft({ authorId, nodeId: "YR-19", nodeName: "Coaching", content: { ...(content || {}), _currentStep: 3 }, currentStep: 3, bookId: activeBookId });
      await publishNodeToSite(authorId, "YR-19", authorSlug, activeBookId);
      setContent((prev: any) => ({ ...prev, activated: true }));
      setStep(3);
      toast.success("Your Coaching practice is live on your site.");
    } catch (e: any) {
      setError(e.message);
      toast.error(`Publish failed: ${e?.message ?? "Unknown error"}`);
    } finally {
      setIsPublishing(false);
    }
  };

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
      <StepHeader nodeId="YR-19" nodeName="1-on-1 Coaching" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's build your Coaching Practice</h2>
            <p className="text-muted-foreground mb-4">Hi {authorName}! 1-on-1 coaching is the most direct way to create transformation and command premium fees. I'm going to design your complete coaching practice based on '{detectedBookTitle || bookTitle || "your book"}' — with coaching packages, a discovery call script, and a client agreement outline. Ready to build your coaching practice?</p>
            <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}>Build My Coaching Practice</Button>
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <LoadingStep messages={GEN_MSGS} msgIndex={msgIndex} />}
        {step === 2 && content && (
          <YRSafeBoundary nodeId="YR-19" debugContent={content} onReset={() => { setContent(null); setStep(0); }}>
          <div className="space-y-4">
            <AbbyCard><div className="text-muted-foreground"><SafeText value={content.abby_summary} /></div></AbbyCard>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="overview" className="text-xs py-2"><Users className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Overview</TabsTrigger>
                <TabsTrigger value="packages" className="text-xs py-2"><DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Packages</TabsTrigger>
                <TabsTrigger value="discovery" className="text-xs py-2"><FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Discovery Call</TabsTrigger>
                <TabsTrigger value="agreement" className="text-xs py-2"><Shield className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Agreement</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h3 className="text-xl font-bold">{content.practice_title}</h3>
                  {content.tagline && <p className="text-sm font-semibold text-primary italic">"{content.tagline}"</p>}
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Coaching Philosophy</p><p className="text-sm">{content.coaching_philosophy}</p></div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="packages" className="space-y-3 mt-4">
                {content.packages?.map((pkg: any, i: number) => (
                  <Card key={i} className={pkg.price_usd >= 2997 ? "border-amber-300 dark:border-amber-700" : ""}>
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold">{pkg.package_name}</h4>
                        <HighTicketPrice price={pkg.price_usd} />
                      </div>
                      <p className="text-xs text-muted-foreground">{pkg.duration}</p>
                      <p className="text-sm">{pkg.description}</p>
                      <div><p className="text-xs font-semibold text-muted-foreground mb-1">Outcomes</p>
                        <ul className="space-y-1">{pkg.outcomes?.map((o: string, j: number) => <li key={j} className="flex items-start gap-2 text-sm"><span className="text-green-600">✓</span>{o}</li>)}</ul>
                      </div>
                      <p className="text-xs text-muted-foreground italic">Ideal for: {pkg.ideal_for}</p>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="discovery" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4">
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Opening</p><p className="text-sm">{content.discovery_call_script?.opening}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-2">Key Questions</p>
                    <ol className="space-y-2">{content.discovery_call_script?.key_questions?.map((q: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><span className="text-primary font-bold">{i + 1}.</span>{q}</li>)}</ol>
                  </div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Closing</p><p className="text-sm">{content.discovery_call_script?.closing}</p></div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="agreement" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-3">⚠️ This is an outline — please have a legal professional review before use</p>
                  <ol className="space-y-2">{content.client_agreement_outline?.map((c: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><span className="font-bold text-primary">{i + 1}.</span>{c}</li>)}</ol>
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
              nodeId="YR-19"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
          </div>
        )}
      </div>
    </div>
  );
}
