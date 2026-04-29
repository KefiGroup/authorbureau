import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchWithTimeout, getActiveToken } from "@/lib/get-active-token";
import BuilderHeader from "@/components/dashboard/builders/shared/BuilderHeader";
import UnifiedStepper from "@/components/dashboard/builders/shared/UnifiedStepper";
import NodeHowItWorks from "@/components/dashboard/builders/shared/NodeHowItWorks";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, BookOpen, LayoutList, DollarSign, FileText, Gift } from "lucide-react";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";

import BuilderIntroBlock, { BP_INTRO_SPECS, BackToReviewLink } from "@/components/dashboard/builders/shared/BuilderIntroBlock";
import InlineSectionCard from "@/components/dashboard/builders/shared/InlineSectionCard";
import { categoryStyles } from "@/components/dashboard/builders/shared/BuilderTheme";
import { publishNodeToSite } from "@/lib/publish-node";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";
import { startGeneration, getGeneration } from "@/lib/builder-generation-registry";

const STEPS = ["Introduction", "Generating", "Review", "Publish"];
const GEN_MSGS = ["Studying your book's unique qualities...", "Designing special edition concepts...", "Creating 3 premium edition tiers...", "Writing your exclusivity sales page...", "Finalising your special editions blueprint..."];
const ACT_MSGS = ["Saving your special editions to your library...", "Storing your edition tiers...", "Filing your sales-page copy...", "Almost done — your editions will live in your library..."];

interface Props { authorId: string | null; bookId?: string | null; }

export default function BP08Builder({ authorId, bookId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [authorSlug, setAuthorSlug] = useState("");
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [priceOverride, setPriceOverride] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading } = useAuthorBook();
  const [resolvedBookTitle, setResolvedBookTitle] = useState<string>("");
  const hasResolvedBook = hasBook || Boolean(resolvedBookTitle) || Boolean(detectedBookTitle && detectedBookTitle !== "your book");

  useEffect(() => {
    if (!authorId) return;
    (async () => {
      const { data: profile } = await supabase.from("author_profiles").select("pen_name, author_slug, user_id").eq("id", authorId).single();
      setAuthorName(profile?.pen_name || "there");
      setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));
      const { data: ctx } = await supabase.from("author_context").select("book_title").eq("author_id", authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (ctx?.book_title) {
        setResolvedBookTitle(ctx.book_title);
      } else {
        const { data: book } = await supabase.from("books").select("title").eq("author_id", profile?.user_id || authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (book?.title) setResolvedBookTitle(book.title);
      }

      const inflight = getGeneration<any>(authorId, "BP-08");
      if (inflight) {
        setStep(1);
        attachToGeneration(inflight);
        return;
      }

      const draft = await loadBuilderDraft(authorId, "BP-08", bookId ?? null);
      const cj = draft.content as any;
      if (cj && Object.keys(cj).length > 0) {
        setContent(cj);
        setPriceOverride(cj?.suggested_price_usd || null);
        const savedStep = Number(cj?._currentStep ?? draft.currentStep ?? (draft.isLive ? 3 : 2));
        setStep(Math.min(3, Math.max(2, savedStep)));
        if (draft.isLive) setContent((p: any) => ({ ...p, activated: true }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId]);

  useEffect(() => {
    if (step === 1 || (step === 3 && !content?.activated)) {
      const msgs = step === 1 ? GEN_MSGS : ACT_MSGS;
      setMsgIndex(0);
      intervalRef.current = setInterval(() => setMsgIndex((i) => (i + 1) % msgs.length), 3000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [step]);

  const runGeneration = async () => {
    let token = await getActiveToken();
    if (!token) {
      await supabase.auth.refreshSession().catch(() => null);
      token = await getActiveToken();
    }
    console.info("[BP-08] token resolved", { hasToken: !!token });
    if (!token) throw new Error("We couldn't verify your sign-in. Please refresh the page and try again.");
    const res = await fetchWithTimeout(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-bp08-mastermind`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ author_id: authorId }),
      },
      180_000,
    );
    console.info("[BP-08] http status", res.status);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) throw new Error(data?.error || `Request failed (${res.status})`);
    const newContent = { ...(data.content || {}), _currentStep: 2 };
    if (authorId) {
      await autosaveBuilderDraft({
        authorId,
        nodeId: "BP-08",
        nodeName: "Special Editions",
        content: newContent,
        currentStep: 2, bookId: bookId ?? null });
    }
    return newContent;
  };

  const attachToGeneration = async (promise: Promise<any>) => {
    try {
      const newContent = await promise;
      setContent(newContent);
      setPriceOverride(newContent?.suggested_price_usd || null);
      setStep(2);
    } catch (e: any) {
      const msg = toAbbyError(e?.message || "Generation failed");
      console.error("[BP-08] generate failed", e);
      setError(msg);
      setStep(0);
      toast.error(msg, { duration: 12000 });
    }
  };

  const handleGenerate = async () => {
    console.info("[BP-08] generate clicked", { authorId });
    if (!authorId) return;
    setStep(1); setError(null);
    const promise = startGeneration(authorId, "BP-08", runGeneration);
    await attachToGeneration(promise);
  };

  const handlePublish = async () => {
    setStep(3); setError(null);
    try {
      if (content && authorId) {
        const resolvedPrice = priceOverride ?? content.suggested_price_usd;
        const merged = { ...content, suggested_price_usd: resolvedPrice, price: resolvedPrice, _currentStep: 3 };
        await autosaveBuilderDraft({
          authorId,
          nodeId: "BP-08",
          nodeName: "Special Editions",
          content: merged,
          currentStep: 3, bookId: bookId ?? null });
        setContent(merged);
      }
      await publishNodeToSite(authorId!, "BP-08", authorSlug);
      setContent((prev: any) => ({ ...prev, activated: true }));
    } catch (e: any) {
      const msg = toAbbyError(e?.message || "Publish failed");
      setError(msg);
      toast.error(msg, { duration: 12000 });
      setStep(2);
    }
  };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-2 space-y-3">
        <BuilderHeader nodeId="BP-08" title="Special Editions" subtitle="Premium tiers + collector bundles for your book" icon={Gift} onBack={() => navigate(bookId ? `/book-hub/${bookId}?tab=revenue-streams` : "/dashboard?section=my-books")} />
        <UnifiedStepper
          nodeId="BP-08"
          steps={STEPS}
          current={step}
          onStepClick={(i) => { if (i <= step) setStep(i); }}
        />
      </div>
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        <NodeHowItWorks nodeId="BP-08" />
        {step === 0 && (
          <AbbyCard><h2 className="text-xl font-bold mb-3">Let's create your Special Editions</h2>
            {!isBookLoading && !hasResolvedBook ? (
              <>
                <p className="text-muted-foreground mb-4">Hi {authorName}! Before I can design your special editions, I need to know about your book. Please complete your book profile first.</p>
                <Button onClick={() => navigate("/my-books?returnTo=/node-builder/BP-08")}>Complete Book Profile</Button>
              </>
              ) : (<><p className="text-muted-foreground mb-4">Hi {authorName}! Special editions turn your book into a premium collectible experience. I'm going to design 3 special edition tiers for '{(detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : resolvedBookTitle) || "your book"}' — from a signed copy to a VIP collector's package. These create premium pricing opportunities and make perfect gifts. Ready?</p><div className="mb-4"><BuilderIntroBlock spec={BP_INTRO_SPECS["BP-08"]} /></div><Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate} disabled={isBookLoading && !hasResolvedBook}><Sparkles className="h-4 w-4 mr-2" /> Design My Special Editions</Button></>)}
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{GEN_MSGS[msgIndex]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /><p className="text-xs text-muted-foreground">Abby usually takes 20–40 seconds</p></div></AbbyCard>}
        {step === 2 && content && (
          <div className="space-y-4">
            <AbbyCard><p className="text-muted-foreground">{content.abby_summary}</p></AbbyCard>
            <Tabs defaultValue="editions" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="editions" className="text-xs py-2"><Gift className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Editions</TabsTrigger>
                <TabsTrigger value="bundle" className="text-xs py-2"><BookOpen className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Bundle</TabsTrigger>
                <TabsTrigger value="pricing" className="text-xs py-2"><DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Pricing</TabsTrigger>
                <TabsTrigger value="sales" className="text-xs py-2"><FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Sales Page</TabsTrigger>
              </TabsList>
              <TabsContent value="editions" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-2">
                  <h3 className="text-xl font-bold">{content.edition_title}</h3>
                  {content.edition_subtitle && <p className="text-muted-foreground">{content.edition_subtitle}</p>}
                  {content.tagline && <p className="text-sm font-semibold text-primary italic">"{content.tagline}"</p>}
                </CardContent></Card>
                {content.editions?.map((ed: any, i: number) => (
                  <Card key={i}><CardContent className="pt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{ed.number}</span><h4 className="font-bold">{ed.name}</h4></div>
                      <span className="text-lg font-bold text-primary">${ed.suggested_price_usd}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{ed.description}</p>
                    <p className="text-xs text-muted-foreground italic">{ed.print_specs}</p>
                    <ul className="space-y-1">{ed.includes?.map((item: string, j: number) => <li key={j} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />{item}</li>)}</ul>
                  </CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="bundle" className="space-y-4 mt-4">
                {content.bundle_offer && (
                  <Card className="border-primary/30 bg-primary/5"><CardContent className="pt-6 space-y-3">
                    <h3 className="text-xl font-bold">{content.bundle_offer.name}</h3>
                    <p className="text-sm text-muted-foreground">{content.bundle_offer.description}</p>
                    <div className="text-center py-4"><p className="text-3xl font-bold text-primary">${content.bundle_offer.suggested_price_usd}</p><p className="text-xs text-green-600 font-semibold mt-1">{content.bundle_offer.savings_note}</p></div>
                  </CardContent></Card>
                )}
                <div><p className="text-xs font-semibold text-muted-foreground mb-1">Who It's For</p><p className="text-sm">{content.who_its_for}</p></div>
                <div><p className="text-xs font-semibold text-muted-foreground mb-1">Marketing Angle</p><p className="text-sm">{content.marketing_angle}</p></div>
              </TabsContent>
              <TabsContent value="pricing" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4 text-center">
                  <p className="text-xs font-semibold text-muted-foreground">Base edition price (USD)</p>
                  <div className="flex items-center justify-center gap-2"><span className="text-3xl font-bold">$</span><Input type="number" className="w-32 text-3xl font-bold text-center" value={priceOverride ?? content.suggested_price_usd ?? 49} onChange={(e) => setPriceOverride(Number(e.target.value))} /></div>
                  <p className="text-sm text-muted-foreground">{content.pricing_rationale}</p>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="sales" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4"><div className="rounded-lg bg-muted/50 p-6 text-center space-y-3"><h2 className="text-2xl font-bold">{content.sales_page?.headline}</h2><p className="text-muted-foreground">{content.sales_page?.subheadline}</p><p className="text-sm">{content.sales_page?.exclusivity_statement}</p><span className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary text-primary-foreground text-sm font-medium mt-3">{content.sales_page?.cta_button_text || "Order Special Edition"}</span></div></CardContent></Card>
              </TabsContent>
            </Tabs>
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick edits</p>
              <InlineSectionCard nodeId="BP-08" authorId={authorId} content={content} setContent={setContent} path="edition_title" label="Edition title" type="input" />
              <InlineSectionCard nodeId="BP-08" authorId={authorId} content={content} setContent={setContent} path="marketing_angle" label="Marketing angle" type="textarea" />
              <InlineSectionCard nodeId="BP-08" authorId={authorId} content={content} setContent={setContent} path="sales_page.headline" label="Sales page headline" type="input" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="ghost" className="sm:w-auto" onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button className="flex-1" size="lg" onClick={handlePublish}>Save to My Library<ArrowRight className="h-4 w-4 ml-2" /></Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">Special editions stay in your library — no public sales page or auto-payment link. You handle printing, signing, and fulfillment off-platform, then take orders directly from gift buyers.</p>
          </div>
        )}
        {step === 3 && !content?.activated && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{ACT_MSGS[msgIndex % ACT_MSGS.length]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /><p className="text-xs text-muted-foreground">Abby usually takes 5–10 seconds</p></div></AbbyCard>}
        {step === 3 && content?.activated && <><PublishSuccessScreen nodeId="BP-08" authorName={authorName} penNameSlug={authorSlug} abbyMessage={`Your special editions are saved to your library, ${authorName}. When a gift buyer asks for one — at an event, in your DMs, or via your contact form — open your library, copy the edition details, and quote them directly. You stay in control of pricing, signing, and timing for each premium order.`} /><BackToReviewLink onClick={() => setStep(2)} /></>}
      </div>
    </div>
  );
}

function AbbyCard({ children }: { children: React.ReactNode }) {
  const s = categoryStyles.brand;
  return <Card className={`${s.border} ${s.bg} ${s.glowShadow} overflow-hidden relative`}><div className={`absolute left-0 top-0 bottom-0 w-1 ${s.leftStrip}`} /><CardContent className="pt-6 pl-7"><div className="flex gap-3"><div className={`shrink-0 w-10 h-10 rounded-full ${s.iconBg} flex items-center justify-center`}><Sparkles className={`h-5 w-5 ${s.iconText}`} /></div><div className="flex-1 min-w-0">{children}</div></div></CardContent></Card>;
}
