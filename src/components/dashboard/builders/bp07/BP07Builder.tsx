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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, GraduationCap, LayoutList, DollarSign, FileText, Share2, GraduationCap as PortalIcon, ExternalLink, FileDown } from "lucide-react";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";

import BuilderIntroBlock, { BP_INTRO_SPECS, BackToReviewLink } from "@/components/dashboard/builders/shared/BuilderIntroBlock";
import InlineSectionCard from "@/components/dashboard/builders/shared/InlineSectionCard";
import { categoryStyles } from "@/components/dashboard/builders/shared/BuilderTheme";
import { publishNodeToSite } from "@/lib/publish-node";
import { toAbbyError } from "@/lib/abby-error";

const STEPS = ["Introduction", "Generating", "Review", "Publish"];
const GEN_MSGS = ["Analyzing your book for a self-paced study programme...", "Designing a 21-day reading and exercise schedule...", "Mapping chapters to daily themes and lessons...", "Creating practical exercises and reflection prompts...", "Finalising your Home Study Programme..."];
const ACT_MSGS = ["Creating your home study product...", "Setting up your payment page...", "Generating your checkout link...", "Your programme is almost ready..."];

interface Props { authorId: string | null; }

export default function BP07Builder({ authorId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [authorSlug, setAuthorSlug] = useState("");
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [priceOverride, setPriceOverride] = useState<number | null>(null);
  const [channels, setChannels] = useState<{ readers_bureau: boolean; thinkific: boolean; email_pdf: boolean }>({ readers_bureau: true, thinkific: false, email_pdf: false });
  const [savingChannels, setSavingChannels] = useState(false);
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
      const { data: node } = await supabase.from("author_nodes").select("content_json, status").eq("author_id", authorId).eq("node_id", "BP-07").maybeSingle();
      if (node?.content_json && (node.status === "content_ready" || node.status === "live")) {
        const cj = node.content_json as any;
        setContent(cj);
        setPriceOverride(cj?.suggested_price_usd || null);
        const dc: string[] = Array.isArray(cj?.delivery_channels) ? cj.delivery_channels : ["readers_bureau"];
        setChannels({
          readers_bureau: true,
          thinkific: dc.includes("thinkific"),
          email_pdf: dc.includes("email_pdf"),
        });
        setStep(node.status === "live" ? 3 : 2);
        if (node.status === "live") setContent((p: any) => ({ ...p, activated: true }));
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
    console.info("[BP-07] generate clicked", { authorId, hasBook, bookTitle: detectedBookTitle });
    setStep(1); setError(null);
    try {
      let token = await getActiveToken();
      if (!token) {
        await supabase.auth.refreshSession().catch(() => null);
        token = await getActiveToken();
      }
      console.info("[BP-07] token resolved", { hasToken: !!token });
      if (!token) throw new Error("We couldn't verify your sign-in. Please refresh the page and try again.");
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-bp07-coaching`,
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
      console.info("[BP-07] http status", res.status);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Request failed (${res.status})`);
      setContent(data.content);
      setPriceOverride(data.content?.suggested_price_usd || null);
      setStep(2);
    } catch (e: any) {
      const msg = toAbbyError(e?.message || "Generation failed");
      console.error("[BP-07] generate failed", e);
      setError(msg);
      setStep(0);
      toast.error(msg, { duration: 12000 });
    }
  };

  const handlePublish = async () => {
    setStep(3); setError(null);
    try {
      await publishNodeToSite(authorId!, "BP-07", authorSlug);
      setContent((prev: any) => ({ ...prev, activated: true }));
    } catch (e: any) { setError(e.message); setStep(2); }
  };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-2 space-y-3">
        <BuilderHeader nodeId="BP-07" title="Home Study Course" subtitle="Self-paced programme built from your book" icon={GraduationCap} onBack={() => navigate("/brand-products")} />
        <UnifiedStepper
          nodeId="BP-07"
          steps={STEPS}
          current={step}
          onStepClick={(i) => { if (i <= step) setStep(i); }}
        />
      </div>
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        <NodeHowItWorks nodeId="BP-07" />
        {step === 0 && (
          <AbbyCard><h2 className="text-xl font-bold mb-3">Let's build your Home Study Course</h2>
            {!isBookLoading && !hasResolvedBook ? (
              <>
                <p className="text-muted-foreground mb-4">Hi {authorName}! Before I can build your home study course, I need to know about your book. Please complete your book profile first.</p>
                <Button onClick={() => navigate("/my-books?returnTo=/node-builder/BP-07")}>Complete Book Profile</Button>
              </>
            ) : (
              <><p className="text-muted-foreground mb-4">Hi {authorName}! A self-paced home study course is perfect for readers who want to go deeper with your ideas. I'm going to design a 21-day programme based on '{(detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : resolvedBookTitle) || "your book"}' — with daily readings, exercises, reflections, and action items. Ready?</p><div className="mb-4"><BuilderIntroBlock spec={BP_INTRO_SPECS["BP-07"]} /></div><Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate} disabled={isBookLoading && !hasResolvedBook}><Sparkles className="h-4 w-4 mr-2" /> Design My Programme</Button></>
            )}
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{GEN_MSGS[msgIndex]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /><p className="text-xs text-muted-foreground">Abby usually takes 30–60 seconds</p></div></AbbyCard>}
        {step === 2 && content && (
          <div className="space-y-4">
            <AbbyCard><p className="text-muted-foreground">{content.abby_summary}</p></AbbyCard>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="overview" className="text-xs py-2"><GraduationCap className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Overview</TabsTrigger>
                <TabsTrigger value="schedule" className="text-xs py-2"><LayoutList className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Schedule</TabsTrigger>
                <TabsTrigger value="pricing" className="text-xs py-2"><DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Pricing</TabsTrigger>
                <TabsTrigger value="sales" className="text-xs py-2"><FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Sales Page</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h3 className="text-xl font-bold">{content.programme_title}</h3>
                  {content.programme_subtitle && <p className="text-muted-foreground">{content.programme_subtitle}</p>}
                  {content.tagline && <p className="text-sm font-semibold text-primary italic">"{content.tagline}"</p>}
                  <div className="flex gap-2 flex-wrap"><span className="text-xs bg-muted px-2.5 py-1 rounded-full">{content.duration}</span><span className="text-xs bg-muted px-2.5 py-1 rounded-full">{content.format}</span></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Transformation Promise</p><p className="text-sm">{content.transformation_promise}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Who It's For</p><p className="text-sm">{content.who_its_for}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-2">What You'll Get</p><ul className="space-y-1">{content.what_youll_get?.map((d: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />{d}</li>)}</ul></div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="schedule" className="space-y-4 mt-4">
                {content.study_weeks?.map((week: any, wi: number) => (
                  <Card key={wi}><CardContent className="pt-6 space-y-3">
                    <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{week.week}</span><div><h4 className="font-bold">{week.title}</h4><p className="text-xs text-muted-foreground">{week.theme}</p></div></div>
                    <div className="space-y-2">
                      {week.days?.map((day: any, di: number) => (
                        <div key={di} className="p-3 rounded-lg bg-muted/30 space-y-1">
                          <p className="text-xs font-semibold text-primary">Day {day.day}</p>
                          <p className="text-sm"><span className="font-medium">Read:</span> {day.reading}</p>
                          <p className="text-sm"><span className="font-medium">Exercise:</span> {day.exercise}</p>
                          <p className="text-sm text-muted-foreground italic">Reflect: {day.reflection}</p>
                          <p className="text-sm"><span className="font-medium">Action:</span> {day.action}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="pricing" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4 text-center">
                  <p className="text-xs font-semibold text-muted-foreground">Your price (USD)</p>
                  <div className="flex items-center justify-center gap-2"><span className="text-3xl font-bold">$</span><Input type="number" className="w-32 text-3xl font-bold text-center" value={priceOverride ?? content.suggested_price_usd ?? 47} onChange={(e) => setPriceOverride(Number(e.target.value))} /></div>
                  <p className="text-sm text-muted-foreground">{content.pricing_rationale}</p>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="sales" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4"><div className="rounded-lg bg-muted/50 p-6 text-center space-y-3"><h2 className="text-2xl font-bold">{content.sales_page?.headline}</h2><p className="text-muted-foreground">{content.sales_page?.subheadline}</p><p className="text-sm">{content.sales_page?.pain_point}</p><p className="text-sm">{content.sales_page?.solution_statement}</p><span className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary text-primary-foreground text-sm font-medium mt-3">{content.sales_page?.cta_button_text || "Start Your Journey"}</span></div></CardContent></Card>
              </TabsContent>
            </Tabs>
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick edits</p>
              <InlineSectionCard nodeId="BP-07" authorId={authorId} content={content} setContent={setContent} path="programme_title" label="Programme title" type="input" />
              <InlineSectionCard nodeId="BP-07" authorId={authorId} content={content} setContent={setContent} path="transformation_promise" label="Transformation promise" type="textarea" />
              <InlineSectionCard nodeId="BP-07" authorId={authorId} content={content} setContent={setContent} path="sales_page.headline" label="Sales page headline" type="input" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="ghost" className="sm:w-auto" onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button className="flex-1" size="lg" onClick={handlePublish}>Publish to My Site<ArrowRight className="h-4 w-4 ml-2" /></Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">Your home study course will be set up automatically with a payment link.</p>
          </div>
        )}
        {step === 3 && !content?.activated && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{ACT_MSGS[msgIndex % ACT_MSGS.length]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /><p className="text-xs text-muted-foreground">Abby usually takes 20–40 seconds</p></div></AbbyCard>}
        {step === 3 && content?.activated && <><PublishSuccessScreen nodeId="BP-07" authorName={authorName} penNameSlug={authorSlug} /><BackToReviewLink onClick={() => setStep(2)} /></>}
      </div>
    </div>
  );
}

function AbbyCard({ children }: { children: React.ReactNode }) {
  const s = categoryStyles.brand;
  return <Card className={`${s.border} ${s.bg} ${s.glowShadow} overflow-hidden relative`}><div className={`absolute left-0 top-0 bottom-0 w-1 ${s.leftStrip}`} /><CardContent className="pt-6 pl-7"><div className="flex gap-3"><div className={`shrink-0 w-10 h-10 rounded-full ${s.iconBg} flex items-center justify-center`}><Sparkles className={`h-5 w-5 ${s.iconText}`} /></div><div className="flex-1 min-w-0">{children}</div></div></CardContent></Card>;
}
