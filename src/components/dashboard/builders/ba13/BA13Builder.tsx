import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, Users, LayoutList, DollarSign, FileText } from "lucide-react";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";
import { Progress } from "@/components/ui/progress";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";

const STEPS = ["Introduction", "Generating", "Review", "Publish"];
const GEN_MSGS = ["Designing your group coaching programme...", "Creating your 8-week curriculum...", "Writing your sales page...", "Finalising your programme blueprint..."];
const ACT_MSGS = ["Setting up your group sessions...", "Creating your payment page...", "Your programme is almost ready..."];

interface Props { authorId: string | null; }

export default function BA13Builder({ authorId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [hasContext, setHasContext] = useState<boolean | null>(null);
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [priceOverride, setPriceOverride] = useState<number | null>(null);
  const [authorSlug, setAuthorSlug] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading } = useAuthorBook();

  useEffect(() => {
    if (!authorId) return;
    (async () => {
      const { data: profile } = await supabase.from("author_profiles").select("pen_name, author_slug, user_id").eq("id", authorId).single();
      setAuthorName(profile?.pen_name || "there");
      setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));
      const { data: ctx } = await supabase.from("author_context").select("book_title").eq("author_id", authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (ctx?.book_title) {
        setBookTitle(ctx.book_title);
        setHasContext(true);
      } else {
        const { data: book } = await supabase
          .from("books")
          .select("title")
          .eq("author_id", profile?.user_id || authorId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (book?.title) {
          setBookTitle(book.title);
          setHasContext(true);
        } else {
          setHasContext(false);
        }
      }
      const __draft = await loadBuilderDraft(authorId, "BA-13");
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
      const { data, error: fnErr } = await supabase.functions.invoke("generate-ba13-group-coaching", { body: { author_id: authorId } });
      if (fnErr || !data?.success) throw new Error(data?.error || fnErr?.message || "Generation failed");
      setContent(data.content);
      setPriceOverride(data.content?.suggested_price_usd || null);
      setStep(2);
      void autosaveBuilderDraft({ authorId: authorId!, nodeId: "BA-13", nodeName: "Group Coaching", content: data.content, currentStep: 2 });
    } catch (e: any) { setError(e.message); setStep(0); }
  };

  const handlePublish = async () => {
    setStep(3);
    setError(null);
    try {
      await publishNodeToSite(authorId!, "BA-13", authorSlug);
      setContent((prev: any) => ({ ...prev, activated: true }));
    } catch (e: any) {
      setError(e.message);
      setStep(2);
    }
  };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-4 py-3"><div className="max-w-3xl mx-auto flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => navigate("/build-authority")}><ArrowLeft className="h-4 w-4" /></Button><div className="flex-1"><h1 className="text-lg font-semibold">Group Coaching</h1></div></div></div>
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-2"><div className="flex items-center gap-1">{STEPS.map((label, i) => (<div key={label} className="flex items-center gap-1 flex-1"><div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-muted text-muted-foreground"}`}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</div><span className="text-xs text-muted-foreground hidden sm:inline truncate">{label}</span>{i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}</div>))}</div></div>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard><h2 className="text-xl font-bold mb-3">Let's build your Group Coaching Programme</h2>
            {!isBookLoading && hasContext !== null && !hasBook && !hasContext ? (
              <>
                <p className="text-muted-foreground mb-4">Hi {authorName}! Before I design your programme, I need to know about your book. Please complete your book profile first.</p>
                <Button onClick={() => navigate("/my-books?returnTo=/node-builder/BA-13")}>Complete Book Profile</Button>
              </>
            ) : (<><p className="text-muted-foreground mb-4">Hi {authorName}! Group coaching is one of the most powerful ways to monetise your expertise. I'm going to design an 8-week group coaching programme based on '{detectedBookTitle || bookTitle || "your book"}' — with a curriculum, pricing strategy, and sales page. Ready?</p><Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate} disabled={isBookLoading}><Sparkles className="h-4 w-4 mr-2" /> Design My Programme</Button></>)}
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{GEN_MSGS[msgIndex]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /><p className="text-xs text-muted-foreground">Abby usually takes 20–40 seconds</p></div></AbbyCard>}
        {step === 2 && content && (
          <div className="space-y-4">
            <AbbyCard><p className="text-muted-foreground">{content.abby_summary}</p></AbbyCard>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="overview" className="text-xs py-2"><Users className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Overview</TabsTrigger>
                <TabsTrigger value="curriculum" className="text-xs py-2"><LayoutList className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Curriculum</TabsTrigger>
                <TabsTrigger value="pricing" className="text-xs py-2"><DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Pricing</TabsTrigger>
                <TabsTrigger value="sales" className="text-xs py-2"><FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Sales Page</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h3 className="text-xl font-bold">{content.programme_title}</h3>
                  {content.programme_subtitle && <p className="text-muted-foreground">{content.programme_subtitle}</p>}
                  {content.tagline && <p className="text-sm font-semibold text-primary italic">"{content.tagline}"</p>}
                  <div className="flex gap-2 flex-wrap"><span className="text-xs bg-muted px-2.5 py-1 rounded-full">{content.duration}</span><span className="text-xs bg-muted px-2.5 py-1 rounded-full">{content.group_size}</span><span className="text-xs bg-muted px-2.5 py-1 rounded-full">{content.session_frequency}</span></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Transformation Promise</p><p className="text-sm">{content.transformation_promise}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Who It's For</p><p className="text-sm">{content.who_its_for}</p></div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="curriculum" className="space-y-4 mt-4">
                {content.weeks?.map((w: any, i: number) => (
                  <Card key={i}><CardContent className="pt-6 space-y-2">
                    <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{w.week_number}</span><h4 className="font-bold">{w.title}</h4></div>
                    <p className="text-sm text-muted-foreground">{w.description}</p>
                    {w.activity && <p className="text-xs text-primary">Activity: {w.activity}</p>}
                  </CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="pricing" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4 text-center">
                  <p className="text-xs font-semibold text-muted-foreground">Your price (USD)</p>
                  <div className="flex items-center justify-center gap-2"><span className="text-3xl font-bold">$</span><Input type="number" className="w-36 text-3xl font-bold text-center" value={priceOverride ?? content.suggested_price_usd ?? 997} onChange={(e) => setPriceOverride(Number(e.target.value))} /></div>
                  <p className="text-sm text-muted-foreground">{content.pricing_rationale}</p>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="sales" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4"><div className="rounded-lg bg-muted/50 p-6 text-center space-y-3"><h2 className="text-2xl font-bold">{content.sales_page?.headline}</h2><p className="text-muted-foreground">{content.sales_page?.subheadline}</p><span className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary text-primary-foreground text-sm font-medium mt-3">{content.sales_page?.cta_button_text || "Join the Programme"}</span></div></CardContent></Card>
              </TabsContent>
            </Tabs>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => toast.info("Manual editing coming soon.")}>Edit</Button>
              <Button className="flex-1" size="lg" onClick={handlePublish}>Publish to My Site<ArrowRight className="h-4 w-4 ml-2" /></Button>
            </div>
          </div>
        )}
        {step === 3 && !content?.activated && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{ACT_MSGS[msgIndex % ACT_MSGS.length]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /><p className="text-xs text-muted-foreground">Abby usually takes 20–40 seconds</p></div></AbbyCard>}
        {step === 3 && content?.activated && (
          <PublishSuccessScreen
            nodeId="BA-13"
            authorName={authorName}
            penNameSlug={authorSlug}
          />
        )}
      </div>
    </div>
  );
}

function AbbyCard({ children }: { children: React.ReactNode }) {
  return <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-6"><div className="flex gap-3"><div className="shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"><Sparkles className="h-5 w-5 text-primary" /></div><div className="flex-1 min-w-0">{children}</div></div></CardContent></Card>;
}
