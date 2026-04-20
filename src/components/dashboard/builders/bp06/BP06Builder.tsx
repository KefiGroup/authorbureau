import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBookContext } from "@/hooks/useBookContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, FileText, LayoutList, DollarSign, Copy } from "lucide-react";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import BookProfileGate from "@/components/dashboard/builders/shared/BookProfileGate";

import BuilderIntroBlock, { BP_INTRO_SPECS, BackToReviewLink } from "@/components/dashboard/builders/shared/BuilderIntroBlock";
import BuilderHeader from "@/components/dashboard/builders/shared/BuilderHeader";
import UnifiedStepper from "@/components/dashboard/builders/shared/UnifiedStepper";
import NodeHowItWorks from "@/components/dashboard/builders/shared/NodeHowItWorks";
import InlineSectionCard from "@/components/dashboard/builders/shared/InlineSectionCard";
import { categoryStyles } from "@/components/dashboard/builders/shared/BuilderTheme";
import { publishNodeToSite } from "@/lib/publish-node";
import { toAbbyError } from "@/lib/abby-error";

const STEPS = ["Introduction", "Generating", "Review", "Publish"];
const GEN_MSGS = [
  "Reading your book's key insights and frameworks...",
  "Designing your companion workbook structure...",
  "Creating 5 workbook sections with exercises...",
  "Writing reflection prompts and action items...",
  "Finalising your workbook blueprint...",
];
const ACT_MSGS = [
  "Setting up your workbook landing page...",
  "Configuring your lead magnet delivery...",
  "Your workbook is almost ready...",
];

interface Props { authorId: string | null; }

export default function BP06Builder({ authorId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [authorSlug, setAuthorSlug] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [hasContext, setHasContext] = useState<boolean | null>(null);
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [priceOverride, setPriceOverride] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading, shouldGate, missingFields, bookId, book } = useBookContext();
  const [overrideGate, setOverrideGate] = useState(false);

  useEffect(() => {
    if (!authorId) return;
    (async () => {
      const { data: profile } = await supabase.from("author_profiles").select("pen_name, author_slug, user_id").eq("id", authorId).single();
      setAuthorName(profile?.pen_name || "there");
      setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));
      // detectedBookTitle/isBookLoading sync handled in separate effect below
      const { data: node } = await supabase.from("author_nodes").select("content_json, status").eq("author_id", authorId).eq("node_id", "BP-06").maybeSingle();
      if (node?.content_json && (node.status === "content_ready" || node.status === "live")) {
        setContent(node.content_json);
        setStep(node.status === "live" ? 3 : 2);
        if (node.status === "live") setContent((p: any) => ({ ...p, activated: true }));
      }
    })();
  }, [authorId]);

  // Propagate late-resolving title from useBookContext into local state
  useEffect(() => {
    if (detectedBookTitle && detectedBookTitle !== "your book") {
      setBookTitle(detectedBookTitle);
      setHasContext(true);
    } else if (!isBookLoading) {
      setHasContext(false);
    }
  }, [detectedBookTitle, isBookLoading]);

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
      const { data, error: fnErr } = await supabase.functions.invoke("generate-bp06-online-course", { body: { author_id: authorId } });
      if (fnErr || !data?.success) throw new Error(data?.error || fnErr?.message || "Generation failed");
      setContent(data.content);
      setPriceOverride(data.content?.suggested_price_usd ?? 0);
      setStep(2);
    } catch (e: any) { setError(e.message); setStep(0); }
  };

  const handlePublish = async () => {
    setStep(3);
    setError(null);
    try {
      await publishNodeToSite(authorId!, "BP-06", authorSlug);
      setContent((prev: any) => ({ ...prev, activated: true }));
    } catch (e: any) {
      setError(e.message);
      setStep(2);
    }
  };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        <BuilderHeader
          nodeId="BP-06"
          title="Workbook"
          subtitle="A printable companion workbook with chapter exercises"
          icon={FileText}
          onBack={() => navigate("/brand-products")}
        />
        <UnifiedStepper
          nodeId="BP-06"
          steps={STEPS}
          current={step}
          onStepClick={(i) => { if (i <= step) setStep(i); }}
        />
      </div>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <NodeHowItWorks nodeId="BP-06" />
        {step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's build your Workbook</h2>
            {isBookLoading ? (
              <p className="text-muted-foreground">Checking your book profile…</p>
            ) : shouldGate && !overrideGate ? (
              <>
                <p className="text-muted-foreground mb-4">Hi {authorName}! Before I can build your workbook, let's make sure your book profile is ready.</p>
                <BookProfileGate
                  shouldGate={shouldGate}
                  hasBook={hasBook}
                  bookId={bookId}
                  book={book}
                  missingFields={missingFields}
                  returnTo="/node-builder/BP-06"
                  onProceedAnyway={hasBook ? () => setOverrideGate(true) : undefined}
                />
              </>
            ) : (
              <><p className="text-muted-foreground mb-4">Hi {authorName}! A companion workbook is the perfect free lead magnet — it builds your email list and gives readers a practical way to apply your ideas. I'm going to design a complete workbook based on '{detectedBookTitle || bookTitle || "your book"}' — with sections, exercises, reflection prompts, and action items. Ready?</p>
                <div className="mb-4"><BuilderIntroBlock spec={BP_INTRO_SPECS["BP-06"]} /></div>
                <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}><Sparkles className="h-4 w-4 mr-2" /> Build My Workbook</Button></>
            )}
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">I hit a snag generating your content. {toAbbyError(error)}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{GEN_MSGS[msgIndex]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /><p className="text-xs text-muted-foreground">Abby usually takes 20–40 seconds</p></div></AbbyCard>}
        {step === 2 && content && (() => {
          const isPaid = (priceOverride ?? content?.suggested_price_usd ?? 0) > 0;
          const review = (
            <ReviewStep
              content={content}
              setContent={setContent}
              authorId={authorId}
              authorName={authorName}
              onActivate={handlePublish}
              onPrevious={() => setStep(0)}
              priceOverride={priceOverride}
              setPriceOverride={setPriceOverride}
            />
          );
          return review;
        })()}
        {step === 3 && !content?.activated && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{ACT_MSGS[msgIndex % ACT_MSGS.length]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /><p className="text-xs text-muted-foreground">Abby usually takes 20–40 seconds</p></div></AbbyCard>}
        {step === 3 && content?.activated && (
          <>
            <PublishSuccessScreen nodeId="BP-06" authorName={authorName} penNameSlug={authorSlug} />
            <BackToReviewLink onClick={() => setStep(2)} />
          </>
        )}
      </div>
    </div>
  );
}

function AbbyCard({ children }: { children: React.ReactNode }) {
  const s = categoryStyles.brand;
  return <Card className={`${s.border} ${s.bg} ${s.glowShadow} overflow-hidden relative`}><div className={`absolute left-0 top-0 bottom-0 w-1 ${s.leftStrip}`} /><CardContent className="pt-6 pl-7"><div className="flex gap-3"><div className={`shrink-0 w-10 h-10 rounded-full ${s.iconBg} flex items-center justify-center`}><Sparkles className={`h-5 w-5 ${s.iconText}`} /></div><div className="flex-1 min-w-0">{children}</div></div></CardContent></Card>;
}

function ReviewStep({ content, setContent, authorId, authorName, onActivate, onPrevious, priceOverride, setPriceOverride }: { content: any; setContent: (c: any) => void; authorId: string | null; authorName: string; onActivate: () => void; onPrevious: () => void; priceOverride: number | null; setPriceOverride: (n: number) => void }) {
  return (
    <div className="space-y-4">
      <AbbyCard><p className="text-muted-foreground">{content.abby_summary}</p></AbbyCard>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-auto">
          <TabsTrigger value="overview" className="text-xs py-2"><FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Overview</TabsTrigger>
          <TabsTrigger value="sections" className="text-xs py-2"><LayoutList className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Sections</TabsTrigger>
          <TabsTrigger value="sales" className="text-xs py-2"><DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Sales Page</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card><CardContent className="pt-6 space-y-3">
            <h3 className="text-xl font-bold">{content.workbook_title}</h3>
            {content.workbook_subtitle && <p className="text-muted-foreground">{content.workbook_subtitle}</p>}
            {content.tagline && <p className="text-sm font-semibold text-primary italic">"{content.tagline}"</p>}
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs bg-muted px-2.5 py-1 rounded-full">{content.page_count}</span>
              <span className="text-xs bg-muted px-2.5 py-1 rounded-full">{content.format}</span>
              <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-full font-semibold">{(content.suggested_price_usd || 0) === 0 ? "FREE Lead Magnet" : `$${content.suggested_price_usd}`}</span>
            </div>
            <div><p className="text-xs font-semibold text-muted-foreground mb-1">Transformation Promise</p><p className="text-sm">{content.transformation_promise}</p></div>
            <div><p className="text-xs font-semibold text-muted-foreground mb-1">Who It's For</p><p className="text-sm">{content.who_its_for}</p></div>
            <div><p className="text-xs font-semibold text-muted-foreground mb-2">What You'll Get</p>
              <ul className="space-y-1">{content.what_youll_get?.map((d: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />{d}</li>)}</ul>
            </div>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="sections" className="space-y-4 mt-4">
          {content.sections?.map((s: any, i: number) => (
            <Card key={i}><CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{s.number}</span><h4 className="font-bold">{s.title}</h4></div>
              <p className="text-sm text-muted-foreground">{s.description}</p>
              <div><p className="text-xs font-semibold text-muted-foreground mb-1">Exercises</p><ul className="space-y-1">{s.exercises?.map((e: string, j: number) => <li key={j} className="text-sm flex items-start gap-2"><span className="text-muted-foreground">{j + 1}.</span>{e}</li>)}</ul></div>
              <Card className="bg-muted/30"><CardContent className="pt-3 pb-3"><p className="text-xs font-semibold text-muted-foreground mb-1">After this section, you can:</p><p className="text-sm">{s.outcome}</p></CardContent></Card>
            </CardContent></Card>
          ))}
        </TabsContent>
        <TabsContent value="sales" className="space-y-4 mt-4">
          <Card><CardContent className="pt-6 space-y-4">
            <div className="rounded-lg bg-muted/50 p-6 text-center space-y-3">
              <h2 className="text-2xl font-bold">{content.sales_page?.headline}</h2>
              <p className="text-muted-foreground">{content.sales_page?.subheadline}</p>
              <p className="text-sm">{content.sales_page?.pain_point}</p>
              <p className="text-sm">{content.sales_page?.solution_statement}</p>
              <span className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary text-primary-foreground text-sm font-medium mt-3">{content.sales_page?.cta_button_text || "Download Free Workbook"}</span>
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
      <div className="space-y-3 pt-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick edits</p>
        <InlineSectionCard nodeId="BP-06" authorId={authorId} content={content} setContent={setContent} path="workbook_title" label="Workbook title" type="input" />
        <InlineSectionCard nodeId="BP-06" authorId={authorId} content={content} setContent={setContent} path="transformation_promise" label="Transformation promise" type="textarea" />
        <InlineSectionCard nodeId="BP-06" authorId={authorId} content={content} setContent={setContent} path="sales_page.headline" label="Sales page headline" type="input" />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button variant="ghost" className="sm:w-auto" onClick={onPrevious}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <Button className="flex-1" size="lg" onClick={onActivate}>Publish to My Site<ArrowRight className="h-4 w-4 ml-2" /></Button>
      </div>
      <p className="text-xs text-center text-muted-foreground">Your workbook will be published as a free lead magnet on your author site.</p>
    </div>
  );
}
