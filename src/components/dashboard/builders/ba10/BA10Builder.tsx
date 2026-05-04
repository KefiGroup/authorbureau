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
import { Sparkles, ArrowRight, BookOpen, LayoutList, DollarSign, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { StepHeader, AbbyCard, LoadingStep, PaymentLinkCard, SummaryCard, SuccessCheckmark } from "../shared/CategoryBuilderShared";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import BANodeDownloadCard from "@/components/dashboard/builders/shared/BANodeDownloadCard";
import ExportPackageCard from "@/components/dashboard/builders/shared/ExportPackageCard";
import { publishNodeToSite } from "@/lib/publish-node";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";

const GEN_MSGS = ["Studying your book's key insights and frameworks...", "Designing your professional course structure...", "Creating 8 detailed course modules with lessons...", "Writing your course description...", "Finalising your course blueprint..."];
const ACT_MSGS = ["Creating your course on the platform...", "Setting up your payment page...", "Generating your checkout link...", "Your course is almost ready..."];

interface Props { authorId: string | null; bookId?: string | null; }

export default function BA10Builder({ authorId, bookId }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const devUnlock = searchParams.get("unlock") === "true";
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const { isReady: isAuthReady } = useAuthReady();
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [priceOverride, setPriceOverride] = useState<number | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({});
  const [authorSlug, setAuthorSlug] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading } = useAuthorBook();
  const [resolvedBookTitle, setResolvedBookTitle] = useState<string>("");

  useEffect(() => {
    if (!isAuthReady || !authorId) return;
    (async () => {
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("pen_name, author_slug, user_id")
        .eq("id", authorId)
        .maybeSingle();

      setAuthorName(profile?.pen_name || "there");
      setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));

      const { resolveBookTitle } = await import("@/lib/resolve-book-title");
      const _title = await resolveBookTitle(authorId, bookId ?? null, profile?.user_id);
      if (_title) setResolvedBookTitle(_title);

      const draft = await loadBuilderDraft(authorId, "BA-10", bookId ?? null);
      if (draft.content) {
        setContent(draft.content);
        { const _saved = (draft.content as any)?._currentStep; setStep(draft.isLive ? 3 : (typeof _saved === "number" ? _saved : Math.max(draft.currentStep, 2))); }
      }
          setHydrated(true);
})();
  }, [authorId, isAuthReady, bookId]);

  useEffect(() => {
    if (step === 1 || (step === 3 && !content?.activated)) {
      const msgs = step === 1 ? GEN_MSGS : ACT_MSGS;
      setMsgIndex(0);
      intervalRef.current = setInterval(() => setMsgIndex((i) => (i + 1) % msgs.length), 3000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [step, content?.activated]);

  const handleGenerate = async () => {
    console.log("[BA-10] Build My Course clicked", { authorId });
    setStep(1); setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-ba10-online-course", { body: { author_id: authorId, book_id: bookId ?? null } });
      console.log("[BA-10] generate response", { data, fnErr });
      if (fnErr || !data?.success) throw new Error(data?.error || fnErr?.message || "Generation failed");
      setContent(data.content);
      setPriceOverride(data.content?.suggested_price_usd || null);
      setStep(2);
      // Auto-save draft so a refresh won't bump the author back to step 0
      void autosaveBuilderDraft({ authorId: authorId!, nodeId: "BA-10", nodeName: "Online Course", content: { ...(data.content), _currentStep: 2 }, currentStep: 2, bookId: bookId ?? null });
    } catch (e: any) {
      console.error("[BA-10] generate error", e);
      const raw = String(e?.message || "");
      const isMappingError = /re-linked|account mapping|AUTH_USER_MISSING/i.test(raw);
      const friendly = isMappingError
        ? "Your author account needs to be re-linked before Abby can save this course. Please contact support."
        : toAbbyError(raw);
      setError(friendly);
      setStep(0);
      toast.error(friendly);
    }
  };

  const handlePublish = async () => {
    setStep(3);
    setError(null);
    try {
      await publishNodeToSite(authorId!, "BA-10", authorSlug);
      setContent((prev: any) => ({ ...prev, activated: true }));
    } catch (e: any) {
      setError(e.message);
      setStep(2);
    }
  };

  if (isAuthReady && authorId && !hydrated) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-background">

        <p className="text-muted-foreground">Loading…</p>

      </div>

    );

  }

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  const toggleModule = (i: number) => setExpandedModules(prev => ({ ...prev, [i]: !prev[i] }));

  const displayBookTitle = (detectedBookTitle && detectedBookTitle !== "your book")
    ? detectedBookTitle
    : resolvedBookTitle;
  const isIntroReady = Boolean(authorName && authorName !== "there" && displayBookTitle);
  const noBookFound = !isBookLoading && !hasBook && !resolvedBookTitle && !detectedBookTitle;

  return (
    <div className="min-h-screen bg-background">
      <StepHeader nodeId="BA-10" nodeName="Online Course" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's build your Online Course</h2>
            {noBookFound ? (
              <>
                <p className="text-muted-foreground mb-4">Hi {authorName}! Before I can build your course, I need to know about your book. Please complete your book profile first.</p>
                <Button onClick={() => navigate(`/my-books?returnTo=${encodeURIComponent(`/node-builder/BA-10${bookId ? `?bookId=${bookId}` : ""}`)}`)}>Complete Book Profile</Button>
              </>
            ) : !isIntroReady ? (
              <p className="text-muted-foreground mb-4">Loading your book details…</p>
            ) : (
              <>
                <p className="text-muted-foreground mb-4">Hi {authorName}! You've already built your brand products — now it's time to scale your expertise with a professional online course. I'm going to design a complete course based on '{displayBookTitle}' — with a course structure, module content outlines, and a course description. Your students will get a world-class learning experience. Ready to build your course?</p>
                <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}><Sparkles className="h-4 w-4 mr-2" /> Build My Course</Button>
              </>
            )}
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">I hit a snag generating your content. {toAbbyError(error)}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <LoadingStep messages={GEN_MSGS} msgIndex={msgIndex} />}
        {step === 2 && content && (
          <div className="space-y-4">
            <AbbyCard><p className="text-muted-foreground">{content.abby_summary}</p></AbbyCard>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="overview" className="text-xs py-2"><BookOpen className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Overview</TabsTrigger>
                <TabsTrigger value="curriculum" className="text-xs py-2"><LayoutList className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Curriculum</TabsTrigger>
                <TabsTrigger value="pricing" className="text-xs py-2"><DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Pricing</TabsTrigger>
                <TabsTrigger value="description" className="text-xs py-2"><FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Description</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h3 className="text-xl font-bold">{content.course_title}</h3>
                  {content.course_subtitle && <p className="text-muted-foreground">{content.course_subtitle}</p>}
                  {content.tagline && <p className="text-sm font-semibold text-primary italic">"{content.tagline}"</p>}
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs bg-muted px-2.5 py-1 rounded-full">{content.duration}</span>
                    <span className="text-xs bg-muted px-2.5 py-1 rounded-full">{content.difficulty_level}</span>
                  </div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Transformation Promise</p><p className="text-sm">{content.transformation_promise}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Who It's For</p><p className="text-sm">{content.who_its_for}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-2">What You'll Get</p>
                    <ul className="space-y-1">{content.what_youll_get?.map((d: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><span className="text-green-600">✓</span>{d}</li>)}</ul>
                  </div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="curriculum" className="space-y-3 mt-4">
                {content.modules?.map((m: any, i: number) => (
                  <Card key={i} className="cursor-pointer" onClick={() => toggleModule(i)}>
                    <CardContent className="pt-4 pb-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{m.number}</span>
                          <h4 className="font-bold text-sm">{m.title}</h4>
                        </div>
                        {expandedModules[i] ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      {expandedModules[i] && (
                        <div className="pl-10 space-y-2 pt-1">
                          <p className="text-sm text-muted-foreground">{m.description}</p>
                          <div className="space-y-1">
                            {m.lessons?.map((l: any, j: number) => (
                              <div key={j} className="flex items-center gap-2 text-sm">
                                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{typeof l === 'string' ? 'Lesson' : l.type}</span>
                                <span>{typeof l === 'string' ? l : l.title}</span>
                                {typeof l !== 'string' && l.duration_minutes && <span className="text-xs text-muted-foreground">({l.duration_minutes}min)</span>}
                              </div>
                            ))}
                          </div>
                          <Card className="bg-muted/30"><CardContent className="pt-3 pb-3"><p className="text-xs font-semibold text-muted-foreground mb-1">After this module:</p><p className="text-sm">{m.outcome}</p></CardContent></Card>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="pricing" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4 text-center">
                  <p className="text-xs font-semibold text-muted-foreground">Your price (USD)</p>
                  <div className="flex items-center justify-center gap-2"><span className="text-3xl font-bold">$</span><Input type="number" className="w-32 text-3xl font-bold text-center" value={priceOverride ?? content.suggested_price_usd ?? 497} onChange={(e) => setPriceOverride(Number(e.target.value))} /></div>
                  <p className="text-sm text-muted-foreground">{content.pricing_rationale}</p>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="description" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line">{content.course_description_long}</div>
                </CardContent></Card>
              </TabsContent>
            </Tabs>
            <ExportPackageCard
              content={content}
              nodeName="Online Course"
              bookTitle={(detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : resolvedBookTitle) || "Authors-Bureau"}
              authorName={authorName}
              guidance="Export your full course package — modules, lessons, pricing, sales copy. Upload to Teachable, Kajabi, Thinkific, or any platform."
            />
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => toast.info("Manual editing coming soon. Activate now and request changes later.")}>Edit</Button>
              <Button className="flex-1" size="lg" onClick={handlePublish}>Publish to My Site<ArrowRight className="h-4 w-4 ml-2" /></Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">Your course will be set up automatically on your course platform.</p>
          </div>
        )}
        {step === 3 && !content?.activated && <LoadingStep messages={ACT_MSGS} msgIndex={msgIndex} />}
        {step === 3 && content?.activated && (
          <>
            <PublishSuccessScreen
              nodeId="BA-10"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
            <BANodeDownloadCard
              content={content}
              nodeName="Online Course"
              bookTitle={(detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : resolvedBookTitle) || "Authors-Bureau"}
              authorName={authorName}
              guidance="Your course package is ready. Download it and upload it to Teachable, Kajabi, Thinkific, or any online course platform of your choice to start earning revenue from your expertise."
            />
          </>
        )}
      </div>
    </div>
  );
}
