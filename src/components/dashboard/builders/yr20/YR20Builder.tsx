import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowRight, Gem, MessageSquare, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { StepHeader, AbbyCard, LoadingStep, MultiPaymentLinks, SummaryCard, SuccessCheckmark, HighTicketPrice } from "../yr-shared/YRBuilderShared";
import PublishSuccessScreen from "../shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";
import { getMicrositeUrl } from "@/lib/node-slug-map";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";
import { YRSafeBoundary } from "../yr-shared/YRSafeBoundary";

const GEN_MSGS = ["Crafting your premium transformation packages...", "Designing high-value offer structures...", "Building your sales conversation guide...", "Finalising your big ticket offers..."];
const ACT_MSGS = ["Creating your premium payment pages...", "Setting up your sales pipeline...", "Almost ready..."];

interface Props { authorId: string | null; }

export default function YR20Builder({ authorId }: Props) {
  const navigate = useNavigate();
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
      const __draft = await loadBuilderDraft(authorId, "YR-20");
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
      const { data, error: e } = await supabase.functions.invoke("generate-yr20-big-ticket", { body: { author_id: authorId } });
      if (e || !data?.success) throw new Error(data?.error || e?.message || "Generation failed");
      setContent(data.content); setStep(2);
      void autosaveBuilderDraft({ authorId: authorId!, nodeId: "YR-20", nodeName: "Consulting", content: data.content, currentStep: 2 });
    } catch (e: any) { setError(e.message); setStep(0); }
  };

  const handlePublish = async () => {
    setStep(3);
    setError(null);
    try {
      await publishNodeToSite(authorId!, "YR-20", authorSlug);
      setContent((prev: any) => ({ ...prev, activated: true }));
    } catch (e: any) {
      setError(e.message);
      setStep(2);
    }
  };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <StepHeader nodeId="YR-20" nodeName="Big Ticket Offers" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's create your Big Ticket Offers</h2>
            <p className="text-muted-foreground mb-4">Hi {authorName}! Big ticket offers are where the real transformation happens — and where the real revenue is. I'm going to design 3 premium transformation packages based on '{detectedBookTitle || bookTitle || "your book"}' — each priced between $5,000 and $25,000. Ready to create your most powerful offers?</p>
            <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}>Build My Big Ticket Offers</Button>
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <LoadingStep messages={GEN_MSGS} msgIndex={msgIndex} />}
        {step === 2 && content && (
          <YRSafeBoundary onReset={() => { setContent(null); setStep(0); }}>
          <div className="space-y-4">
            <AbbyCard><p className="text-muted-foreground">{content.abby_summary}</p></AbbyCard>
            <Tabs defaultValue="offers" className="w-full">
              <TabsList className="w-full grid grid-cols-3 h-auto">
                <TabsTrigger value="offers" className="text-xs py-2"><Gem className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Offers</TabsTrigger>
                <TabsTrigger value="sales" className="text-xs py-2"><MessageSquare className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Sales Guide</TabsTrigger>
                <TabsTrigger value="pricing" className="text-xs py-2"><DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Strategy</TabsTrigger>
              </TabsList>
              <TabsContent value="offers" className="space-y-3 mt-4">
                {content.offers?.map((o: any, i: number) => (
                  <Card key={i} className="border-amber-300 dark:border-amber-700">
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="font-bold text-lg">{o.offer_name}</h4>
                        <HighTicketPrice price={o.price_usd} />
                      </div>
                      <div className="flex gap-2 flex-wrap"><span className="text-xs bg-muted px-2.5 py-1 rounded-full">{o.duration}</span><span className="text-xs bg-muted px-2.5 py-1 rounded-full">{o.format}</span></div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg"><p className="text-sm font-medium">{o.transformation_promise}</p></div>
                      <div><p className="text-xs font-semibold text-muted-foreground mb-1">What's Included</p>
                        <ul className="space-y-1">{o.what_included?.map((w: string, j: number) => <li key={j} className="flex items-start gap-2 text-sm"><span className="text-green-600">✓</span>{w}</li>)}</ul>
                      </div>
                      <p className="text-sm">{o.ideal_client}</p>
                      <span className="inline-block text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2.5 py-1 rounded-full font-medium">{o.urgency_element}</span>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="sales" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4">
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Opening</p><p className="text-sm">{content.sales_conversation_guide?.opening}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-2">Discovery Questions</p>
                    <ol className="space-y-2">{content.sales_conversation_guide?.discovery_questions?.map((q: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><span className="font-bold text-primary">{i + 1}.</span>{q}</li>)}</ol>
                  </div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Presenting the Offer</p><p className="text-sm">{content.sales_conversation_guide?.presenting_the_offer}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-2">Handling Objections</p>
                    {content.sales_conversation_guide?.handling_objections?.map((o: string, i: number) => <p key={i} className="text-sm bg-muted/50 p-2 rounded mb-1">{o}</p>)}
                  </div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="pricing" className="space-y-4 mt-4">
                <AbbyCard><p className="text-sm text-muted-foreground">These prices are strategically positioned for the transformation they deliver. The entry offer validates interest, the mid-tier delivers deep change, and the flagship creates a complete life transformation. Never apologise for premium pricing — your expertise commands it.</p></AbbyCard>
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
              nodeId="YR-20"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
          </div>
        )}
      </div>
    </div>
  );
}
