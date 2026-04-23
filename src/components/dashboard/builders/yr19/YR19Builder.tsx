import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowRight, Users, FileText, DollarSign, Shield } from "lucide-react";
import { StepHeader, AbbyCard, LoadingStep, MultiPaymentLinks, SummaryCard, SuccessCheckmark, HighTicketPrice } from "../yr-shared/YRBuilderShared";
import PublishSuccessScreen from "../shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";
import { getMicrositeUrl } from "@/lib/node-slug-map";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";
import { YRSafeBoundary } from "../yr-shared/YRSafeBoundary";

const GEN_MSGS = ["Analysing your book's coaching potential...", "Designing your coaching packages...", "Creating your discovery call script...", "Outlining your client agreement...", "Finalising your coaching practice..."];
const ACT_MSGS = ["Setting up your coaching calendar...", "Creating your payment pages...", "Generating your booking links...", "Almost ready..."];

interface Props { authorId: string | null; }

export default function YR19Builder({ authorId }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const devUnlock = searchParams.get("unlock") === "true";
  const [step, setStep] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [authorSlug, setAuthorSlug] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading } = useAuthorBook();

  useEffect(() => {
    if (!authorId) return;
    (async () => {
      const { data: p } = await supabase.from("author_profiles").select("pen_name, author_slug, user_id").eq("id", authorId).single();
      setAuthorName(p?.pen_name || "there");
      setAuthorSlug(p?.author_slug || "");
      const { data: ctx } = await supabase.from("author_context").select("book_title").eq("author_id", authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (ctx?.book_title) { setBookTitle(ctx.book_title); } else {
        const { data: book } = await supabase.from("books").select("title").eq("author_id", p?.user_id || authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (book?.title) setBookTitle(book.title);
      }
      const __draft = await loadBuilderDraft(authorId, "YR-19");
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
      intervalRef.current = setInterval(() => setMsgIndex(i => (i + 1) % msgs.length), 3000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [step]);

  const handleGenerate = async () => {
    setStep(1); setError(null);
    try {
      const { data, error: e } = await supabase.functions.invoke("generate-yr19-coaching", { body: { author_id: authorId } });
      if (e || !data?.success) throw new Error(data?.error || e?.message || "Generation failed");
      setContent(data.content); setStep(2);
      void autosaveBuilderDraft({ authorId: authorId!, nodeId: "YR-19", nodeName: "Coaching", content: data.content, currentStep: 2 });
    } catch (e: any) { setError(e.message); setStep(0); }
  };

  const handlePublish = async () => {
    setStep(3);
    setError(null);
    try {
      await publishNodeToSite(authorId!, "YR-19", authorSlug);
      setContent((prev: any) => ({ ...prev, activated: true }));
    } catch (e: any) {
      setError(e.message);
      setStep(2);
    }
  };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <StepHeader nodeId="YR-19" nodeName="1-on-1 Coaching" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's build your Coaching Practice</h2>
            <p className="text-muted-foreground mb-4">Hi {authorName}! 1-on-1 coaching is the most direct way to create transformation and command premium fees. I'm going to design your complete coaching practice based on '{detectedBookTitle || bookTitle || "your book"}' — with coaching packages, a discovery call script, and a client agreement outline. Ready to build your coaching practice?</p>
            <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}>Build My Coaching Practice</Button>
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <LoadingStep messages={GEN_MSGS} msgIndex={msgIndex} />}
        {step === 2 && content && (
          <YRSafeBoundary onReset={() => { setContent(null); setStep(0); }}>
          <div className="space-y-4">
            <AbbyCard><p className="text-muted-foreground">{content.abby_summary}</p></AbbyCard>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="overview" className="text-xs py-2"><Users className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Overview</TabsTrigger>
                <TabsTrigger value="packages" className="text-xs py-2"><DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Packages</TabsTrigger>
                <TabsTrigger value="discovery" className="text-xs py-2"><FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Discovery Call</TabsTrigger>
                <TabsTrigger value="agreement" className="text-xs py-2"><Shield className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Agreement</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h3 className="text-xl font-bold">{content.practice_title}</h3>
                  {content.tagline && <p className="text-sm font-semibold text-primary italic">"{content.tagline}"</p>}
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Coaching Philosophy</p><p className="text-sm">{content.coaching_philosophy}</p></div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="packages" className="space-y-3 mt-4">
                {content.packages?.map((pkg: any, i: number) => (
                  <Card key={i} className={pkg.price_usd >= 2997 ? "border-amber-300 dark:border-amber-700" : ""}>
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold">{pkg.package_name}</h4>
                        <HighTicketPrice price={pkg.price_usd} />
                      </div>
                      <p className="text-xs text-muted-foreground">{pkg.duration}</p>
                      <p className="text-sm">{pkg.description}</p>
                      <div><p className="text-xs font-semibold text-muted-foreground mb-1">Outcomes</p>
                        <ul className="space-y-1">{pkg.outcomes?.map((o: string, j: number) => <li key={j} className="flex items-start gap-2 text-sm"><span className="text-green-600">✓</span>{o}</li>)}</ul>
                      </div>
                      <p className="text-xs text-muted-foreground italic">Ideal for: {pkg.ideal_for}</p>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="discovery" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4">
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Opening</p><p className="text-sm">{content.discovery_call_script?.opening}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-2">Key Questions</p>
                    <ol className="space-y-2">{content.discovery_call_script?.key_questions?.map((q: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><span className="text-primary font-bold">{i + 1}.</span>{q}</li>)}</ol>
                  </div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Closing</p><p className="text-sm">{content.discovery_call_script?.closing}</p></div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="agreement" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-3">⚠️ This is an outline — please have a legal professional review before use</p>
                  <ol className="space-y-2">{content.client_agreement_outline?.map((c: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><span className="font-bold text-primary">{i + 1}.</span>{c}</li>)}</ol>
                </CardContent></Card>
              </TabsContent>
            </Tabs>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => toast.info("Manual editing coming soon.")}>Edit</Button>
              <Button className="flex-1" size="lg" onClick={handlePublish}>Publish to My Site<ArrowRight className="h-4 w-4 ml-2" /></Button>
            </div>
          </div>
          </YRSafeBoundary>
        )}
        {step === 3 && !content?.activated && <LoadingStep messages={ACT_MSGS} msgIndex={msgIndex} />}
        {step === 3 && content?.activated && (
          <div className="space-y-6">
            <PublishSuccessScreen
              nodeId="YR-19"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
          </div>
        )}
      </div>
    </div>
  );
}
