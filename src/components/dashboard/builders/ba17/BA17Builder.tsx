import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Layers, Package, TrendingUp, ArrowDown } from "lucide-react";
import { StepHeader, AbbyCard, LoadingStep, PaymentLinkCard, SummaryCard, SuccessCheckmark } from "../ba-shared/BABuilderShared";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";

const GEN_MSGS = ["Designing your product ladder...", "Creating your 3 bundle offers...", "Building your upsell sequences...", "Configuring your downsell...", "Finalising your upsell system..."];
const ACT_MSGS = ["Creating your bundle products...", "Setting up payment links...", "Configuring your upsell flows...", "Almost ready..."];

interface Props { authorId: string | null; }

export default function BA17Builder({ authorId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [hasContext, setHasContext] = useState<boolean | null>(null);
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
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
      const { data: node } = await supabase.from("author_nodes").select("content_json, status").eq("author_id", authorId).eq("node_id", "BA-17").maybeSingle();
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
      const { data, error: fnErr } = await supabase.functions.invoke("generate-ba17-upsells", { body: { author_id: authorId } });
      if (fnErr || !data?.success) throw new Error(data?.error || fnErr?.message || "Generation failed");
      setContent(data.content); setStep(2);
    } catch (e: any) { setError(e.message); setStep(0); }
  };

  const handlePublish = async () => {
    setStep(3);
    setError(null);
    try {
      await publishNodeToSite(authorId!, "BA-17", authorSlug);
      setContent((prev: any) => ({ ...prev, activated: true }));
    } catch (e: any) {
      setError(e.message);
      setStep(2);
    }
  };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <StepHeader nodeId="BA-17" nodeName="Upsells & Bundles" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's build your Upsells & Bundles</h2>
            {hasContext === false ? (
              <><p className="text-muted-foreground mb-4">Hi {authorName}! Please complete your book profile first.</p><Button onClick={() => navigate("/my-books?returnTo=/node-builder/BA-17")}>Complete Book Profile</Button></>
            ) : (
              <><p className="text-muted-foreground mb-4">Hi {authorName}! Upsells and bundles are the fastest way to increase your average order value. I'm going to design a complete product ladder for '{bookTitle || "your book"}' — with 3 bundle offers and 3 upsell sequences. Ready to maximise every sale?</p>
                <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}><Sparkles className="h-4 w-4 mr-2" /> Build My Upsell System</Button></>
            )}
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <LoadingStep messages={GEN_MSGS} msgIndex={msgIndex} />}
        {step === 2 && content && (
          <div className="space-y-4">
            <AbbyCard><p className="text-muted-foreground">{content.abby_summary}</p></AbbyCard>
            <Tabs defaultValue="ladder" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="ladder" className="text-xs py-2"><Layers className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Ladder</TabsTrigger>
                <TabsTrigger value="bundles" className="text-xs py-2"><Package className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Bundles</TabsTrigger>
                <TabsTrigger value="upsells" className="text-xs py-2"><TrendingUp className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Upsells</TabsTrigger>
                <TabsTrigger value="downsell" className="text-xs py-2"><ArrowDown className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Downsell</TabsTrigger>
              </TabsList>
              <TabsContent value="ladder" className="mt-4">
                <Card><CardContent className="pt-6">
                  <h3 className="font-bold mb-4 text-center">{content.product_ladder_title}</h3>
                  <div className="flex flex-col items-center gap-2">
                    {content.bundles?.slice().reverse().map((b: any, i: number) => (
                      <div key={i} className={`w-full rounded-lg border p-3 text-center ${i === 0 ? "bg-primary/10 border-primary" : "bg-muted/30"}`} style={{ maxWidth: `${100 - i * 15}%` }}>
                        <p className="font-bold text-sm">{b.bundle_name}</p>
                        <p className="text-lg font-bold">${b.bundle_price_usd}</p>
                      </div>
                    ))}
                  </div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="bundles" className="space-y-3 mt-4">
                {content.bundles?.map((b: any, i: number) => (
                  <Card key={i}><CardContent className="pt-4 pb-4 space-y-2">
                    <div className="flex items-center justify-between"><h4 className="font-bold text-sm">{b.bundle_name}</h4><span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full">Save ${b.savings_usd}</span></div>
                    {b.tagline && <p className="text-xs text-primary italic">{b.tagline}</p>}
                    <div className="flex items-center gap-3"><span className="text-xs line-through text-muted-foreground">${b.individual_value_usd}</span><span className="text-lg font-bold">${b.bundle_price_usd}</span></div>
                    <ul className="space-y-0.5">{b.products_included?.map((p: string, j: number) => <li key={j} className="text-sm flex items-start gap-2"><span className="text-green-600">✓</span>{p}</li>)}</ul>
                  </CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="upsells" className="space-y-3 mt-4">
                {content.upsell_sequences?.map((u: any, i: number) => (
                  <Card key={i}><CardContent className="pt-4 pb-4 space-y-2">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">Trigger: {u.trigger}</span>
                    <h4 className="font-bold text-sm">{u.upsell_headline}</h4>
                    <p className="text-sm text-muted-foreground">{u.upsell_copy}</p>
                    <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Product:</span><span className="text-sm font-medium">{u.upsell_product}</span><span className="text-sm font-bold text-primary">${u.upsell_price_usd}</span></div>
                  </CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="downsell" className="space-y-4 mt-4">
                <Card className="border-amber-200 dark:border-amber-900"><CardContent className="pt-6 space-y-2">
                  <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded">Trigger: {content.downsell?.trigger}</span>
                  <h4 className="font-bold">{content.downsell?.downsell_headline}</h4>
                  <div className="flex items-center gap-2"><span className="text-sm">{content.downsell?.downsell_product}</span><span className="text-lg font-bold text-primary">${content.downsell?.downsell_price_usd}</span></div>
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
              nodeId="BA-17"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
        )}
      </div>
    </div>
  );
}
