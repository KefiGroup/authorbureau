import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, ShoppingBag, LayoutList, DollarSign, FileText, TrendingUp } from "lucide-react";
import { categoryStyles } from "../shared/BuilderTheme";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";
import { toAbbyError } from "@/lib/abby-error";

const STEPS = ["Introduction", "Generating", "Review", "Publish"];
const GEN_MSGS = ["Studying your book's target audience and events...", "Designing your event sales strategy...", "Creating pricing tiers and materials list...", "Building your post-event follow-up sequence...", "Finalising your Book Sales Kit..."];
const ACT_MSGS = ["Creating your book sales product...", "Setting up your payment page...", "Generating your checkout link...", "Your sales kit is almost ready..."];

interface Props { authorId: string | null; }

export default function BP09Builder({ authorId }: Props) {
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
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading } = useAuthorBook();

  useEffect(() => {
    if (!authorId) return;
    (async () => {
      const { data: profile } = await supabase.from("author_profiles").select("pen_name, author_slug, user_id").eq("id", authorId).single();
      setAuthorName(profile?.pen_name || "there");
      setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));
      const { data: ctx } = await supabase.from("author_context").select("book_title").eq("author_id", authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (ctx?.book_title) { setBookTitle(ctx.book_title); setHasContext(true); } else {
        const { data: book } = await supabase.from("books").select("title").eq("author_id", profile?.user_id || authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (book?.title) { setBookTitle(book.title); setHasContext(true); } else { setHasContext(false); }
      }
      const { data: node } = await supabase.from("author_nodes").select("content_json, status").eq("author_id", authorId).eq("node_id", "BP-09").maybeSingle();
      if (node?.content_json && (node.status === "content_ready" || node.status === "live")) {
        setContent(node.content_json);
        setPriceOverride((node.content_json as any)?.suggested_price_usd || null);
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
    setStep(1); setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-bp09-speaking", { body: { author_id: authorId } });
      if (fnErr || !data?.success) throw new Error(data?.error || fnErr?.message || "Generation failed");
      setContent(data.content);
      setPriceOverride(data.content?.suggested_price_usd || null);
      setStep(2);
    } catch (e: any) { setError(e.message); setStep(0); }
  };

  const handlePublish = async () => {
    setStep(3); setError(null);
    try {
      await publishNodeToSite(authorId!, "BP-09", authorSlug);
      setContent((prev: any) => ({ ...prev, activated: true }));
    } catch (e: any) { setError(e.message); setStep(2); }
  };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className={`border-b border-border bg-gradient-to-r ${categoryStyles.brand.headerGradient} px-4 py-3`}><div className="max-w-3xl mx-auto flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => navigate("/brand-products")}><ArrowLeft className="h-4 w-4" /></Button><div className="flex-1"><h1 className="text-lg font-semibold">Book Sales (Events)</h1></div></div></div>
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-2"><div className="flex items-center gap-1">{STEPS.map((label, i) => (<div key={label} className="flex items-center gap-1 flex-1"><div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${i < step ? categoryStyles.brand.stepDone : i === step ? categoryStyles.brand.stepActiveRing : "bg-muted text-muted-foreground"}`}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</div><span className="text-xs text-muted-foreground hidden sm:inline truncate">{label}</span>{i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}</div>))}</div></div>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard><h2 className="text-xl font-bold mb-3">Let's set up your Book Sales</h2>
            {!isBookLoading && !hasBook ? (<><p className="text-muted-foreground mb-4">Hi {authorName}! Before I can set up your book sales, I need to know about your book. Please complete your book profile first.</p><Button onClick={() => navigate("/my-books?returnTo=/node-builder/BP-09")}>Complete Book Profile</Button></>) : (<><p className="text-muted-foreground mb-4">Hi {authorName}! Selling books at events can be highly profitable with the right setup. I'm going to design your complete event sales kit for '{detectedBookTitle || bookTitle || "your book"}' — with event strategies, pricing tiers, sales materials, and a post-event follow-up sequence. Ready?</p><Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}><Sparkles className="h-4 w-4 mr-2" /> Build My Sales Kit</Button></>)}
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{GEN_MSGS[msgIndex]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /><p className="text-xs text-muted-foreground">This usually takes 20–40 seconds</p></div></AbbyCard>}
        {step === 2 && content && (
          <div className="space-y-4">
            <AbbyCard><p className="text-muted-foreground">{content.abby_summary}</p></AbbyCard>
            <Tabs defaultValue="events" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="events" className="text-xs py-2"><ShoppingBag className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Events</TabsTrigger>
                <TabsTrigger value="pricing" className="text-xs py-2"><DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Pricing</TabsTrigger>
                <TabsTrigger value="materials" className="text-xs py-2"><LayoutList className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Materials</TabsTrigger>
                <TabsTrigger value="projection" className="text-xs py-2"><TrendingUp className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Projection</TabsTrigger>
              </TabsList>
              <TabsContent value="events" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-2">
                  <h3 className="text-xl font-bold">{content.sales_kit_title}</h3>
                  {content.tagline && <p className="text-sm font-semibold text-primary italic">"{content.tagline}"</p>}
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Who It's For</p><p className="text-sm">{content.who_its_for}</p></div>
                </CardContent></Card>
                {content.event_types?.map((ev: any, i: number) => (
                  <Card key={i}><CardContent className="pt-6 space-y-3">
                    <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{ev.number}</span><h4 className="font-bold">{ev.type}</h4></div>
                    <p className="text-sm text-muted-foreground">{ev.description}</p>
                    <div className="flex gap-2 flex-wrap"><span className="text-xs bg-muted px-2.5 py-1 rounded-full">Audience: {ev.ideal_audience_size}</span><span className="text-xs bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-full">Conversion: {ev.expected_conversion_rate}</span></div>
                    <ul className="space-y-1">{ev.materials_needed?.map((m: string, j: number) => <li key={j} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />{m}</li>)}</ul>
                    <Card className="bg-primary/5 border-primary/20"><CardContent className="pt-3 pb-3"><p className="text-xs font-semibold text-primary mb-1">Pro Tip</p><p className="text-sm italic">{ev.tip}</p></CardContent></Card>
                  </CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="pricing" className="space-y-4 mt-4">
                {content.pricing_tiers?.map((tier: any, i: number) => (
                  <Card key={i}><CardContent className="pt-6">
                    <div className="flex items-center justify-between"><h4 className="font-bold">{tier.name}</h4><span className="text-lg font-bold text-primary">${tier.price_usd}</span></div>
                    <p className="text-sm text-muted-foreground mt-1">{tier.description}</p>
                  </CardContent></Card>
                ))}
                <Card><CardContent className="pt-6 space-y-4 text-center">
                  <p className="text-xs font-semibold text-muted-foreground">Edit base book price (USD)</p>
                  <div className="flex items-center justify-center gap-2"><span className="text-3xl font-bold">$</span><Input type="number" className="w-32 text-3xl font-bold text-center" value={priceOverride ?? content.suggested_price_usd ?? 19.99} onChange={(e) => setPriceOverride(Number(e.target.value))} /></div>
                  <p className="text-sm text-muted-foreground">{content.pricing_rationale}</p>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="materials" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h4 className="font-bold">Sales Materials Checklist</h4>
                  <ul className="space-y-2">{content.sales_materials?.map((m: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />{m}</li>)}</ul>
                </CardContent></Card>
                <Card><CardContent className="pt-6 space-y-3">
                  <h4 className="font-bold">Post-Event Follow-Up Sequence</h4>
                  <ol className="space-y-2">{content.post_event_sequence?.map((s: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{i + 1}</span>{s}</li>)}</ol>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="projection" className="space-y-4 mt-4">
                {content.revenue_projection && (
                  <Card><CardContent className="pt-6 space-y-4">
                    <h4 className="font-bold text-center">Revenue Projection</h4>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-4 rounded-lg bg-muted/30"><p className="text-xs font-semibold text-muted-foreground">Events/Month</p><p className="text-2xl font-bold">{content.revenue_projection.events_per_month}</p></div>
                      <div className="p-4 rounded-lg bg-muted/30"><p className="text-xs font-semibold text-muted-foreground">Avg Books Sold</p><p className="text-2xl font-bold">{content.revenue_projection.avg_books_sold}</p></div>
                      <div className="p-4 rounded-lg bg-muted/30"><p className="text-xs font-semibold text-muted-foreground">Per Event</p><p className="text-2xl font-bold">${content.revenue_projection.avg_revenue_per_event}</p></div>
                      <div className="p-4 rounded-lg bg-primary/10"><p className="text-xs font-semibold text-primary">Monthly Total</p><p className="text-2xl font-bold text-primary">${content.revenue_projection.monthly_projection}</p></div>
                    </div>
                  </CardContent></Card>
                )}
                <Card><CardContent className="pt-6 space-y-4"><div className="rounded-lg bg-muted/50 p-6 text-center space-y-3"><h2 className="text-2xl font-bold">{content.sales_page?.headline}</h2><p className="text-muted-foreground">{content.sales_page?.subheadline}</p><p className="text-sm">{content.sales_page?.pain_point}</p><p className="text-sm">{content.sales_page?.solution_statement}</p><span className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary text-primary-foreground text-sm font-medium mt-3">{content.sales_page?.cta_button_text || "Buy Now"}</span></div></CardContent></Card>
              </TabsContent>
            </Tabs>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => toast.info("Manual editing coming soon. Activate now and request changes from ABBY later.")}>Edit</Button>
              <Button className="flex-1" size="lg" onClick={handlePublish}>Publish to My Site<ArrowRight className="h-4 w-4 ml-2" /></Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">Your book sales page and payment link will be set up automatically.</p>
          </div>
        )}
        {step === 3 && !content?.activated && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{ACT_MSGS[msgIndex % ACT_MSGS.length]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /></div></AbbyCard>}
        {step === 3 && content?.activated && <PublishSuccessScreen nodeId="BP-09" authorName={authorName} penNameSlug={authorSlug} />}
      </div>
    </div>
  );
}

function AbbyCard({ children }: { children: React.ReactNode }) {
  const s = categoryStyles.brand;
  return <Card className={`${s.border} ${s.bg} ${s.glowShadow} overflow-hidden relative`}><div className={`absolute left-0 top-0 bottom-0 w-1 ${s.leftStrip}`} /><CardContent className="pt-6 pl-7"><div className="flex gap-3"><div className={`shrink-0 w-10 h-10 rounded-full ${s.iconBg} flex items-center justify-center`}><Sparkles className={`h-5 w-5 ${s.iconText}`} /></div><div className="flex-1 min-w-0">{children}</div></div></CardContent></Card>;
}
