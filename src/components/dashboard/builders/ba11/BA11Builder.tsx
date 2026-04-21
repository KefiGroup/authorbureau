import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Mic, BookOpen, DollarSign, Globe } from "lucide-react";
import { StepHeader, AbbyCard, LoadingStep, SummaryCard, SuccessCheckmark } from "../ba-shared/BABuilderShared";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import BANodeDownloadCard from "@/components/dashboard/builders/shared/BANodeDownloadCard";
import { publishNodeToSite } from "@/lib/publish-node";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";

const GEN_MSGS = ["Analysing your book's structure for audio...", "Writing your narrator brief...", "Creating chapter-by-chapter recording guides...", "Researching distribution platforms...", "Finalising your audiobook package..."];
const ACT_MSGS = ["Preparing your audiobook production package...", "Setting up your distribution strategy...", "Creating your production checklist...", "Almost ready..."];

interface Props { authorId: string | null; }

export default function BA11Builder({ authorId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [priceOverride, setPriceOverride] = useState<number | null>(null);
  const [authorSlug, setAuthorSlug] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading } = useAuthorBook();
  const [resolvedBookTitle, setResolvedBookTitle] = useState<string>("");

  useEffect(() => {
    if (!authorId) return;
    (async () => {
      const { data: profile } = await supabase.from("author_profiles").select("pen_name, author_slug, user_id").eq("id", authorId).single();
      setAuthorName(profile?.pen_name || "there");
      setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));
      const { data: ctx } = await supabase.from("author_context").select("book_title").eq("author_id", authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (ctx?.book_title) {
        setResolvedBookTitle(ctx.book_title);
        console.log(`[BA-11] book resolution`, { authorId, detectedBookTitle, ctxTitle: ctx?.book_title ?? null, bookTitle: null });
      } else {
        const { data: book } = await supabase.from("books").select("title").eq("author_id", profile?.user_id || authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (book?.title) setResolvedBookTitle(book.title);
        console.log(`[BA-11] book resolution`, { authorId, detectedBookTitle, ctxTitle: null, bookTitle: book?.title ?? null });
      }
      const __draft = await loadBuilderDraft(authorId, "BA-11");
      if (__draft.content) {
        setContent(__draft.content);
        setStep(__draft.isLive ? 3 : Math.max(__draft.currentStep, 2));
      }
    })();
  }, [authorId]);

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
      const { data, error: fnErr } = await supabase.functions.invoke("generate-ba11-audiobook", { body: { author_id: authorId } });
      if (fnErr || !data?.success) throw new Error(data?.error || fnErr?.message || "Generation failed");
      setContent(data.content); setPriceOverride(data.content?.suggested_retail_price_usd || null); setStep(2);
      void autosaveBuilderDraft({ authorId: authorId!, nodeId: "BA-11", nodeName: "Audiobook", content: data.content, currentStep: 2 });
    } catch (e: any) { setError(e.message); setStep(0); }
  };

  const handlePublish = async () => {
    setStep(3);
    setError(null);
    try {
      await publishNodeToSite(authorId!, "BA-11", authorSlug);
      setContent((prev: any) => ({ ...prev, activated: true }));
    } catch (e: any) {
      setError(e.message);
      setStep(2);
    }
  };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <StepHeader nodeId="BA-11" nodeName="Audiobook" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's prepare your Audiobook</h2>
            {!isBookLoading && !hasBook ? (
              <>
                <p className="text-muted-foreground mb-4">Hi {authorName}! Before I can prepare your audiobook, I need to know about your book. Please complete your book profile first.</p>
                <Button onClick={() => navigate("/my-books?returnTo=/node-builder/BA-11")}>Complete Book Profile</Button>
              </>
            ) : (
              <><p className="text-muted-foreground mb-4">Hi {authorName}! Audiobooks are one of the fastest-growing formats in publishing. I'm going to prepare your complete audiobook production package for '{(detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : resolvedBookTitle) || "your book"}' — with a narrator brief, chapter-by-chapter recording guide, and distribution strategy for Audible, Spotify, and Apple Books. Ready to go audio?</p>
                <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate} disabled={isBookLoading}><Sparkles className="h-4 w-4 mr-2" /> Prepare My Audiobook</Button></>
            )}
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <LoadingStep messages={GEN_MSGS} msgIndex={msgIndex} />}
        {step === 2 && content && (
          <div className="space-y-4">
            <AbbyCard><p className="text-muted-foreground">{content.abby_summary}</p></AbbyCard>
            <Tabs defaultValue="brief" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="brief" className="text-xs py-2"><Mic className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Brief</TabsTrigger>
                <TabsTrigger value="chapters" className="text-xs py-2"><BookOpen className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Chapters</TabsTrigger>
                <TabsTrigger value="distribution" className="text-xs py-2"><Globe className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Distribution</TabsTrigger>
                <TabsTrigger value="pricing" className="text-xs py-2"><DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Pricing</TabsTrigger>
              </TabsList>
              <TabsContent value="brief" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h3 className="text-xl font-bold">{content.audiobook_title}</h3>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs bg-muted px-2.5 py-1 rounded-full">{content.narrator_style}</span>
                    <span className="text-xs bg-muted px-2.5 py-1 rounded-full">~{content.estimated_duration_hours}h</span>
                  </div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Narrator Brief</p><p className="text-sm">{content.narrator_brief}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-2">Production Checklist</p>
                    <ul className="space-y-1">{content.production_checklist?.map((c: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><span className="text-green-600">✓</span>{c}</li>)}</ul>
                  </div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="chapters" className="space-y-3 mt-4">
                {content.chapter_guides?.map((ch: any, i: number) => (
                  <Card key={i}><CardContent className="pt-4 pb-4 space-y-2">
                    <div className="flex items-center gap-2"><span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{ch.chapter_number}</span><h4 className="font-bold text-sm">{ch.chapter_title}</h4></div>
                    <div className="pl-9 space-y-1">
                      <div><p className="text-xs font-semibold text-muted-foreground">Key Emphasis Points</p><ul className="space-y-0.5">{ch.key_emphasis_points?.map((p: string, j: number) => <li key={j} className="text-sm">• {p}</li>)}</ul></div>
                      <p className="text-xs"><span className="font-semibold text-muted-foreground">Pacing:</span> {ch.pacing_note}</p>
                      {ch.pronunciation_notes && <p className="text-xs"><span className="font-semibold text-muted-foreground">Pronunciation:</span> {ch.pronunciation_notes}</p>}
                    </div>
                  </CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="distribution" className="space-y-3 mt-4">
                {content.distribution_platforms?.map((p: any, i: number) => (
                  <Card key={i}><CardContent className="pt-4 pb-4 space-y-1">
                    <h4 className="font-bold text-sm">{p.platform}</h4>
                    <div className="flex gap-2 flex-wrap"><span className="text-xs bg-muted px-2 py-0.5 rounded">Royalty: {p.royalty_rate}</span><span className="text-xs bg-muted px-2 py-0.5 rounded">Timeline: {p.timeline}</span></div>
                  </CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="pricing" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4 text-center">
                  <p className="text-xs font-semibold text-muted-foreground">Suggested retail price (USD)</p>
                  <div className="flex items-center justify-center gap-2"><span className="text-3xl font-bold">$</span><Input type="number" className="w-32 text-3xl font-bold text-center" value={priceOverride ?? content.suggested_retail_price_usd ?? 19.99} onChange={(e) => setPriceOverride(Number(e.target.value))} /></div>
                </CardContent></Card>
              </TabsContent>
            </Tabs>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => toast.info("Manual editing coming soon.")}>Edit</Button>
              <Button className="flex-1" size="lg" onClick={handlePublish}>Publish to My Site<ArrowRight className="h-4 w-4 ml-2" /></Button>
            </div>
          </div>
        )}
        {step === 3 && !content?.activated && <LoadingStep messages={ACT_MSGS} msgIndex={msgIndex} />}
        {step === 3 && content?.activated && (
          <>
            <PublishSuccessScreen nodeId="BA-11" authorName={authorName} penNameSlug={authorSlug} />
            <BANodeDownloadCard
              content={content}
              nodeName="Audiobook"
              bookTitle={(detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : resolvedBookTitle) || "Authors-Bureau"}
              authorName={authorName}
              guidance="Your audiobook package is ready. Download it and use it with Audible, Spotify, Apple Books, or any audiobook platform of your choice to start earning revenue from your expertise."
            />
          </>
        )}
      </div>
    </div>
  );
}
