import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, Crown, LayoutList, DollarSign, FileText, Copy } from "lucide-react";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";

const STEPS = ["Introduction", "Generating", "Review", "Publish"];
const GEN_MSGS = ["Studying your book's core principles...", "Designing your mastermind programme...", "Creating 3 programme pillars...", "Writing your high-ticket sales page...", "Finalising your mastermind blueprint..."];
const ACT_MSGS = ["Creating your mastermind product...", "Setting up your payment page...", "Generating your checkout link...", "Your mastermind is almost ready..."];

interface Props { authorId: string | null; }

export default function BP08Builder({ authorId }: Props) {
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

  useEffect(() => {
    if (!authorId) return;
    (async () => {
      const { data: profile } = await supabase.from("author_profiles").select("pen_name, author_slug").eq("id", authorId).single();
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
          .eq("author_id", authorId)
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
      const { data: node } = await supabase.from("author_nodes").select("content_json, status").eq("author_id", authorId).eq("node_id", "BP-08").maybeSingle();
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
      const { data, error: fnErr } = await supabase.functions.invoke("generate-bp08-mastermind", { body: { author_id: authorId } });
      if (fnErr || !data?.success) throw new Error(data?.error || fnErr?.message || "Generation failed");
      setContent(data.content);
      setPriceOverride(data.content?.suggested_price_usd || null);
      setStep(2);
    } catch (e: any) { setError(e.message); setStep(0); }
  };

  const handlePublish = async () => {
    setStep(3);
    setError(null);
    try {
      await publishNodeToSite(authorId!, "BP-08", authorSlug);
      setContent((prev: any) => ({ ...prev, activated: true }));
    } catch (e: any) {
      setError(e.message);
      setStep(2);
    }
  };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-4 py-3"><div className="max-w-3xl mx-auto flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => navigate("/brand-products")}><ArrowLeft className="h-4 w-4" /></Button><div className="flex-1"><h1 className="text-lg font-semibold">Mastermind</h1><p className="text-xs text-muted-foreground">BP-08</p></div></div></div>
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-2"><div className="flex items-center gap-1">{STEPS.map((label, i) => (<div key={label} className="flex items-center gap-1 flex-1"><div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-muted text-muted-foreground"}`}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</div><span className="text-xs text-muted-foreground hidden sm:inline truncate">{label}</span>{i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}</div>))}</div></div>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard><h2 className="text-xl font-bold mb-3">Let's build your Mastermind</h2>
            {hasContext === false ? (<><p className="text-muted-foreground mb-4">Hi {authorName}! Before I can build your mastermind, I need to know about your book. Please complete your book profile first.</p><Button onClick={() => navigate("/my-books?returnTo=/node-builder/BP-08")}>Complete Book Profile</Button></>) : (<><p className="text-muted-foreground mb-4">Hi {authorName}! A mastermind is the most exclusive and highest-value product you can offer. I'm going to design a premium mastermind programme based on '{bookTitle || "your book"}' — with a group structure, meeting cadence, member benefits, and a high-ticket sales page. Ready to build your inner circle?</p><Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}><Sparkles className="h-4 w-4 mr-2" /> Design My Mastermind</Button></>)}
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">I hit a snag. {error}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{GEN_MSGS[msgIndex]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /><p className="text-xs text-muted-foreground">This usually takes 20–40 seconds</p></div></AbbyCard>}
        {step === 2 && content && (
          <div className="space-y-4">
            <AbbyCard><p className="text-muted-foreground">{content.abby_summary}</p></AbbyCard>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="overview" className="text-xs py-2"><Crown className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Overview</TabsTrigger>
                <TabsTrigger value="pillars" className="text-xs py-2"><LayoutList className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Pillars</TabsTrigger>
                <TabsTrigger value="pricing" className="text-xs py-2"><DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Pricing</TabsTrigger>
                <TabsTrigger value="sales" className="text-xs py-2"><FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Sales Page</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h3 className="text-xl font-bold">{content.mastermind_title}</h3>
                  {content.mastermind_subtitle && <p className="text-muted-foreground">{content.mastermind_subtitle}</p>}
                  {content.tagline && <p className="text-sm font-semibold text-primary italic">"{content.tagline}"</p>}
                  <div className="flex gap-2 flex-wrap"><span className="text-xs bg-muted px-2.5 py-1 rounded-full">{content.duration}</span><span className="text-xs bg-muted px-2.5 py-1 rounded-full">{content.group_size}</span><span className="text-xs bg-muted px-2.5 py-1 rounded-full">{content.meeting_cadence}</span></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Transformation Promise</p><p className="text-sm">{content.transformation_promise}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Who It's For</p><p className="text-sm">{content.who_its_for}</p></div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="pillars" className="space-y-4 mt-4">
                {content.pillars?.map((p: any, i: number) => (
                  <Card key={i}><CardContent className="pt-6 space-y-3">
                    <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{p.number}</span><h4 className="font-bold">{p.title}</h4></div>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                  </CardContent></Card>
                ))}
                <Card><CardContent className="pt-6"><p className="text-xs font-semibold text-muted-foreground mb-2">Member Benefits</p><ul className="space-y-1">{content.member_benefits?.map((b: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />{b}</li>)}</ul></CardContent></Card>
              </TabsContent>
              <TabsContent value="pricing" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4 text-center">
                  <p className="text-xs font-semibold text-muted-foreground">Your price (USD)</p>
                  <div className="flex items-center justify-center gap-2"><span className="text-3xl font-bold">$</span><Input type="number" className="w-36 text-3xl font-bold text-center" value={priceOverride ?? content.suggested_price_usd ?? 9997} onChange={(e) => setPriceOverride(Number(e.target.value))} /></div>
                  <p className="text-sm text-muted-foreground">{content.pricing_rationale}</p>
                  <p className="text-xs text-primary font-medium">Premium pricing reflects the exclusivity and high-touch nature of your mastermind.</p>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="sales" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4"><div className="rounded-lg bg-muted/50 p-6 text-center space-y-3"><h2 className="text-2xl font-bold">{content.sales_page?.headline}</h2><p className="text-muted-foreground">{content.sales_page?.subheadline}</p><p className="text-sm">{content.sales_page?.exclusivity_statement}</p><span className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary text-primary-foreground text-sm font-medium mt-3">{content.sales_page?.cta_button_text || "Apply for Membership"}</span></div></CardContent></Card>
              </TabsContent>
            </Tabs>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => toast.info("Manual editing coming soon. Activate now and request changes from ABBY later.")}>Edit</Button>
              <Button className="flex-1" size="lg" onClick={handlePublish}>Publish to My Site<ArrowRight className="h-4 w-4 ml-2" /></Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">Your mastermind will be set up automatically with a payment link.</p>
          </div>
        )}
        {step === 3 && !content?.activated && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{ACT_MSGS[msgIndex % ACT_MSGS.length]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /></div></AbbyCard>}
        {step === 3 && content?.activated && (
          <PublishSuccessScreen
              nodeId="BP-08"
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
