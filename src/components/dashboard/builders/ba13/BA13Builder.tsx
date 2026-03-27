import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Users, LayoutList, DollarSign, FileText } from "lucide-react";
import { StepHeader, AbbyCard, LoadingStep, PaymentLinkCard, SummaryCard, SuccessCheckmark } from "../ba-shared/BABuilderShared";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";

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

  useEffect(() => {
    if (!authorId) return;
    (async () => {
      const { data: profile } = await supabase.from("author_profiles").select("pen_name, author_slug").eq("id", authorId).single();
      setAuthorName(profile?.pen_name || "there");
      setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));
      const { data: ctx } = await supabase.from("author_context").select("book_title").eq("author_id", authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      setBookTitle(ctx?.book_title || ""); setHasContext(!!ctx?.book_title);
      const { data: node } = await supabase.from("author_nodes").select("content_json, status").eq("author_id", authorId).eq("node_id", "BA-13").maybeSingle();
      if (node?.content_json && (node.status === "content_ready" || node.status === "live")) {
        setContent(node.content_json); setStep(node.status === "live" ? 3 : 2);
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
    setStep(1); setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-ba13-group-coaching", { body: { author_id: authorId } });
      if (fnErr || !data?.success) throw new Error(data?.error || fnErr?.message || "Generation failed");
      setContent(data.content); setPriceOverride(data.content?.suggested_price_usd || null); setStep(2);
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
      <StepHeader nodeId="BA-13" nodeName="Group Coaching" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's build your Group Coaching Programme</h2>
            {hasContext === false ? (
              <><p className="text-muted-foreground mb-4">Hi {authorName}! Please complete your book profile first.</p><Button onClick={() => navigate("/my-books?returnTo=/node-builder/BA-13")}>Complete Book Profile</Button></>
            ) : (
              <><p className="text-muted-foreground mb-4">Hi {authorName}! Group coaching lets you serve more clients at a higher impact than 1-on-1. I'm going to design a complete group coaching programme based on '{bookTitle || "your book"}' — with a cohort structure, session plan, and a sales page. Ready to coach your first group?</p>
                <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}><Sparkles className="h-4 w-4 mr-2" /> Build My Programme</Button></>
            )}
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <LoadingStep messages={GEN_MSGS} msgIndex={msgIndex} />}
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
                  {content.tagline && <p className="text-sm font-semibold text-primary italic">"{content.tagline}"</p>}
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs bg-muted px-2.5 py-1 rounded-full">{content.cohort_size}</span>
                    <span className="text-xs bg-muted px-2.5 py-1 rounded-full">{content.duration}</span>
                    <span className="text-xs bg-muted px-2.5 py-1 rounded-full">{content.session_format}</span>
                  </div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Transformation</p><p className="text-sm">{content.transformation_promise}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Who It's For</p><p className="text-sm">{content.who_its_for}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-2">What You'll Get</p>
                    <ul className="space-y-1">{content.what_youll_get?.map((d: string, i: number) => <li key={i} className="text-sm flex items-start gap-2"><span className="text-green-600">✓</span>{d}</li>)}</ul>
                  </div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="curriculum" className="space-y-3 mt-4">
                {content.curriculum?.map((w: any, i: number) => (
                  <Card key={i}><CardContent className="pt-4 pb-4 space-y-2">
                    <div className="flex items-center gap-2"><span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{w.week}</span><h4 className="font-bold text-sm">{w.title}</h4></div>
                    <p className="text-sm text-muted-foreground pl-9">{w.focus}</p>
                    <p className="text-xs text-primary pl-9">📝 {w.homework}</p>
                  </CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="pricing" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4 text-center">
                  <p className="text-xs font-semibold text-muted-foreground">Your price (USD)</p>
                  <div className="flex items-center justify-center gap-2"><span className="text-3xl font-bold">$</span><Input type="number" className="w-32 text-3xl font-bold text-center" value={priceOverride ?? content.suggested_price_usd ?? 1997} onChange={(e) => setPriceOverride(Number(e.target.value))} /></div>
                  <p className="text-sm text-muted-foreground">{content.pricing_rationale}</p>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="sales" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4">
                  <div className="rounded-lg bg-muted/50 p-6 text-center space-y-3">
                    <h2 className="text-2xl font-bold">{content.sales_page?.headline}</h2>
                    <p className="text-muted-foreground">{content.sales_page?.subheadline}</p>
                    <p className="text-sm">{content.sales_page?.pain_point}</p>
                    <p className="text-sm">{content.sales_page?.solution_statement}</p>
                    <span className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary text-primary-foreground text-sm font-medium mt-3">{content.sales_page?.cta_button_text || "Join Now"}</span>
                  </div>
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
