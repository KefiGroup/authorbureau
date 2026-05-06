import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthReady } from "@/hooks/useAuthReady";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowRight, Gem, MessageSquare, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { StepHeader, AbbyCard, LoadingStep, MultiPaymentLinks, SummaryCard, SuccessCheckmark, HighTicketPrice } from "../shared/CategoryBuilderShared";
import PublishSuccessScreen from "../shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";
import { getMicrositeUrl } from "@/lib/node-slug-map";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";
import { YRSafeBoundary, SafeText } from "../shared/YRSafeBoundary";

const GEN_MSGS = ["Crafting your premium transformation packages...", "Designing high-value offer structures...", "Building your sales conversation guide...", "Finalising your big ticket offers..."];
const ACT_MSGS = ["Creating your premium payment pages...", "Setting up your sales pipeline...", "Almost ready..."];

interface Props { authorId: string | null; bookId?: string | null; }

export default function YR20Builder({ authorId, bookId }: Props) {
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

      const __draft = await loadBuilderDraft(authorId, "YR-20", activeBookId);
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

      let nodeQuery = supabase.from("author_nodes")
        .select("content_json, status, microsite_url, activated_at, current_step")
        .eq("author_id", authorId).eq("node_id", "YR-20");
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
  useEffect(() => { if (step === 2 && content) console.log("[YR-20] step-2 render", content); }, [step, content]);

  const handleGenerate = async () => {
    setStep(1); setError(null);
    try {
      const { invokeWithTimeout } = await import("@/lib/invoke-with-timeout");
      const { data, error: e } = await invokeWithTimeout<any>("generate-yr20-big-ticket", { author_id: authorId, book_id: activeBookId }, 90000);
      if (e || !data?.success) throw new Error(data?.error || e?.message || "Generation failed");
      setContent(data.content); setStep(2);
      void autosaveBuilderDraft({ authorId: authorId!, nodeId: "YR-20", nodeName: "Consulting", content: { ...(data.content), _currentStep: 2 }, currentStep: 2, bookId: activeBookId });
    } catch (e: any) { setError(e.message); setStep(0); }
  };

  const handlePublish = async () => {
    if (isPublishing) return;
    if (!authorId || !authorSlug) { toast.error("Profile not ready — please wait a moment."); return; }
    setError(null);
    setIsPublishing(true);
    try {
      await autosaveBuilderDraft({ authorId, nodeId: "YR-20", nodeName: "Consulting", content: { ...(content || {}), _currentStep: 3 }, currentStep: 3, bookId: activeBookId });
      await publishNodeToSite(authorId, "YR-20", authorSlug, activeBookId);
      setContent((prev: any) => ({ ...prev, activated: true }));
      setStep(3);
      toast.success("Your Big Ticket Offers are live on your site.");
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
      <StepHeader nodeId="YR-20" nodeName="Big Ticket Offers" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's create your Big Ticket Offers</h2>
            <p className="text-muted-foreground mb-4">Hi {authorName}! Big ticket offers are where the real transformation happens — and where the real revenue is. I'm going to design 3 premium transformation packages based on '{detectedBookTitle || bookTitle || "your book"}' — each priced between $5,000 and $25,000. Ready to create your most powerful offers?</p>
            <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}>Build My Big Ticket Offers</Button>
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <LoadingStep messages={GEN_MSGS} msgIndex={msgIndex} />}
        {step === 2 && content && (
          <YRSafeBoundary nodeId="YR-20" debugContent={content} onReset={() => { setContent(null); setStep(0); }}>
          <div className="space-y-4">
            <AbbyCard><div className="text-muted-foreground"><SafeText value={content.abby_summary} /></div></AbbyCard>
            <Tabs defaultValue="offers" className="w-full">
              <TabsList className="w-full grid grid-cols-3 h-auto">
                <TabsTrigger value="offers" className="text-xs py-2"><Gem className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Offers</TabsTrigger>
                <TabsTrigger value="sales" className="text-xs py-2"><MessageSquare className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Sales Guide</TabsTrigger>
                <TabsTrigger value="pricing" className="text-xs py-2"><DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Strategy</TabsTrigger>
              </TabsList>
              <TabsContent value="offers" className="space-y-3 mt-4">
                {content.offers?.map((o: any, i: number) => (
                  <Card key={i} className="border-amber-300 dark:border-amber-700">
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="font-bold text-lg">{o.offer_name}</h4>
                        <HighTicketPrice price={o.price_usd} />
                      </div>
                      <div className="flex gap-2 flex-wrap"><span className="text-xs bg-muted px-2.5 py-1 rounded-full">{o.duration}</span><span className="text-xs bg-muted px-2.5 py-1 rounded-full">{o.format}</span></div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg"><p className="text-sm font-medium">{o.transformation_promise}</p></div>
                      <div><p className="text-xs font-semibold text-muted-foreground mb-1">What's Included</p>
                        <ul className="space-y-1">{o.what_included?.map((w: string, j: number) => <li key={j} className="flex items-start gap-2 text-sm"><span className="text-green-600">✓</span>{w}</li>)}</ul>
                      </div>
                      <p className="text-sm">{o.ideal_client}</p>
                      <span className="inline-block text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2.5 py-1 rounded-full font-medium">{o.urgency_element}</span>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="sales" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4">
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Opening</p><p className="text-sm">{content.sales_conversation_guide?.opening}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-2">Discovery Questions</p>
                    <ol className="space-y-2">{content.sales_conversation_guide?.discovery_questions?.map((q: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><span className="font-bold text-primary">{i + 1}.</span>{q}</li>)}</ol>
                  </div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Presenting the Offer</p><p className="text-sm">{content.sales_conversation_guide?.presenting_the_offer}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-2">Handling Objections</p>
                    {content.sales_conversation_guide?.handling_objections?.map((o: string, i: number) => <p key={i} className="text-sm bg-muted/50 p-2 rounded mb-1">{o}</p>)}
                  </div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="pricing" className="space-y-4 mt-4">
                <AbbyCard><p className="text-sm text-muted-foreground">These prices are strategically positioned for the transformation they deliver. The entry offer validates interest, the mid-tier delivers deep change, and the flagship creates a complete life transformation. Never apologise for premium pricing — your expertise commands it.</p></AbbyCard>
              </TabsContent>
            </Tabs>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => toast.info("Manual editing coming soon.")}>Edit</Button>
              <Button className="flex-1" size="lg" onClick={handlePublish}>Publish to My Site<ArrowRight className="h-4 w-4 ml-2" /></Button>
            </div>
          </div>
          </YRSafeBoundary>
        )}
        {step === 3 && !content?.activated && <LoadingStep messages={ACT_MSGS} msgIndex={msgIndex} />}
        {step === 3 && content?.activated && (
          <div className="space-y-6">
            <PublishSuccessScreen
              nodeId="YR-20"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
          </div>
        )}
      </div>
    </div>
  );
}
