import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthReady } from "@/hooks/useAuthReady";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ArrowRight, Palmtree, CalendarDays, DollarSign, Sparkles as SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { StepHeader, AbbyCard, LoadingStep, MultiPaymentLinks, SummaryCard, SuccessCheckmark, HighTicketPrice } from "../shared/CategoryBuilderShared";
import PublishSuccessScreen from "../shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";
import { getMicrositeUrl } from "@/lib/node-slug-map";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";
import { YRSafeBoundary, SafeText, SafeBlock } from "../shared/YRSafeBoundary";

const GEN_MSGS = ["Designing your retreat experience...", "Crafting your itinerary...", "Building retreat packages...", "Finalising your retreat programme..."];
const ACT_MSGS = ["Creating your booking pages...", "Setting up payment links...", "Almost ready..."];
interface Props { authorId: string | null; bookId?: string | null; }

export default function YR24Builder({ authorId, bookId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const { isReady: isAuthReady } = useAuthReady();
  const [authorName, setAuthorName] = useState("");
  const [authorSlug, setAuthorSlug] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading } = useAuthorBook();

  useEffect(() => { if (!isAuthReady || !authorId) return; (async () => {
    const { data: p } = await supabase.from("author_profiles").select("pen_name, author_slug, user_id").eq("id", authorId).single();
    setAuthorName(p?.pen_name || "there");
    setAuthorSlug(p?.author_slug || "");
    const { resolveBookTitle: _rbt } = await import("@/lib/resolve-book-title");
    const _t = await _rbt(authorId, bookId ?? null, p?.user_id);
    if (_t) setBookTitle(_t);
    const __draft = await loadBuilderDraft(authorId, "YR-24", bookId ?? null);
      if (__draft.content) {
        setContent(__draft.content);
        { const _saved = (__draft.content as any)?._currentStep; setStep(__draft.isLive ? (3) : (typeof _saved === "number" ? _saved : Math.max(__draft.currentStep, 2))); }
      }
    setHydrated(true); })(); }, [authorId, isAuthReady]);

  useEffect(() => { if (step === 1 || (step === 3 && !content?.activated)) { const msgs = step === 1 ? GEN_MSGS : ACT_MSGS; setMsgIndex(0); intervalRef.current = setInterval(() => setMsgIndex(i => (i + 1) % msgs.length), 3000); return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; } }, [step]);
  useEffect(() => { if (step === 2 && content) console.log("[YR-24] step-2 render", content); }, [step, content]);

  const handleGenerate = async () => { setStep(1); setError(null); try { const { data, error: e } = await supabase.functions.invoke("generate-yr24-retreats", { body: { author_id: authorId, book_id: bookId ?? null } }); if (e || !data?.success) throw new Error(data?.error || e?.message || "Failed"); setContent(data.content); setStep(2); void autosaveBuilderDraft({ authorId: authorId!, nodeId: "YR-24", nodeName: "Retreats", content: { ...(data.content), _currentStep: 2 }, currentStep: 2, bookId: bookId ?? null }); } catch (e: any) { setError(e.message); setStep(0); } };
  const handlePublish = async () => { setStep(3); setError(null); try { await publishNodeToSite(authorId!, "YR-24", authorSlug); setContent((p: any) => ({ ...p, activated: true })); } catch (e: any) { setError(e.message); setStep(2); } };

  if (authorId && !hydrated) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading…</p></div>;

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <StepHeader nodeId="YR-24" nodeName="Retreats" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (<AbbyCard><h2 className="text-xl font-bold mb-3">Let's plan your Retreat</h2><p className="text-muted-foreground mb-4">Hi {authorName}! Retreats create the deepest transformation and command the highest per-person fees. I'm going to design your complete retreat experience based on '{detectedBookTitle || bookTitle || "your book"}' — with a retreat concept, itinerary, and pricing. Ready to create an unforgettable experience?</p><Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}>Build My Retreat</Button>{error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}</div>}</AbbyCard>)}
        {step === 1 && <LoadingStep messages={GEN_MSGS} msgIndex={msgIndex} />}
        {step === 2 && content && (
          <YRSafeBoundary nodeId="YR-24" debugContent={content} onReset={() => { setContent(null); setStep(0); }}>
          <div className="space-y-4">
            <AbbyCard><div className="text-muted-foreground"><SafeText value={content.abby_summary} /></div></AbbyCard>
            <Tabs defaultValue="concept" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="concept" className="text-xs py-2"><Palmtree className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Concept</TabsTrigger>
                <TabsTrigger value="options" className="text-xs py-2"><DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Options</TabsTrigger>
                <TabsTrigger value="itinerary" className="text-xs py-2"><CalendarDays className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Itinerary</TabsTrigger>
                <TabsTrigger value="pricing" className="text-xs py-2"><SparklesIcon className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Pricing</TabsTrigger>
              </TabsList>
              <TabsContent value="concept" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h3 className="text-xl font-bold"><SafeText value={content.retreat_title} /></h3>
                  {content.tagline && <p className="text-sm font-semibold text-primary italic">"<SafeText value={content.tagline} />"</p>}
                  <div className="text-sm"><SafeText value={content.retreat_concept} /></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Transformation Arc</p>{(() => {
                    const t = content.transformation_arc;
                    if (t == null) return null;
                    if (typeof t === "string") return <SafeBlock value={t} />;
                    if (Array.isArray(t)) return <SafeBlock value={t} />;
                    return (
                      <div className="space-y-3 text-sm">
                        {t.starting_point != null && (
                          <div className="space-y-1"><p className="text-xs font-semibold text-muted-foreground">Starting point</p><SafeBlock value={t.starting_point} /></div>
                        )}
                        {t.breakthroughs != null && (
                          <div className="space-y-1"><p className="text-xs font-semibold text-muted-foreground">Breakthroughs</p><SafeBlock value={t.breakthroughs} /></div>
                        )}
                        {t.capabilities_built != null && (
                          <div className="space-y-1"><p className="text-xs font-semibold text-muted-foreground">Capabilities built</p><SafeBlock value={t.capabilities_built} /></div>
                        )}
                        {t.measurable_shifts != null && (
                          <div className="space-y-1"><p className="text-xs font-semibold text-muted-foreground">Measurable shifts</p><SafeBlock value={t.measurable_shifts} /></div>
                        )}
                        {t.take_home_assets != null && (
                          <div className="space-y-1"><p className="text-xs font-semibold text-muted-foreground">Take-home assets</p><SafeBlock value={t.take_home_assets} /></div>
                        )}
                      </div>
                    );
                  })()}</div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="options" className="space-y-3 mt-4">
                {content.retreat_options?.map((o: any, i: number) => (
                  <Card key={i} className="border-amber-300 dark:border-amber-700">
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2"><h4 className="font-bold"><SafeText value={o.format} /></h4><HighTicketPrice price={o.price_per_person_usd} /><span className="text-xs text-muted-foreground">/person</span></div>
                      <div className="flex gap-2 flex-wrap"><span className="text-xs bg-muted px-2.5 py-1 rounded-full"><SafeText value={o.duration} /></span><span className="text-xs bg-muted px-2.5 py-1 rounded-full"><SafeText value={o.group_size} /></span><span className="text-xs bg-muted px-2.5 py-1 rounded-full"><SafeText value={o.location_type} /></span></div>
                      <ul className="space-y-1">{o.includes?.map((inc: any, j: number) => <li key={j} className="flex items-start gap-2 text-sm"><span className="text-green-600">✓</span><SafeText value={inc} /></li>)}</ul>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="itinerary" className="space-y-3 mt-4">
                {content.sample_itinerary?.map((d: any, i: number) => (
                  <Card key={i}><CardContent className="pt-4 pb-4">
                    <h4 className="font-bold text-sm mb-2">Day {d.day}: <SafeText value={d.title} /></h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-muted/30 p-2 rounded"><p className="font-semibold text-muted-foreground mb-1">Morning</p><SafeBlock value={d.morning} /></div>
                      <div className="bg-muted/30 p-2 rounded"><p className="font-semibold text-muted-foreground mb-1">Afternoon</p><SafeBlock value={d.afternoon} /></div>
                      <div className="bg-muted/30 p-2 rounded"><p className="font-semibold text-muted-foreground mb-1">Evening</p><SafeBlock value={d.evening} /></div>
                    </div>
                  </CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="pricing" className="space-y-3 mt-4">
                {content.retreat_options?.map((o: any, i: number) => (
                  <Card key={i}><CardContent className="pt-6 space-y-2 text-center">
                    <p className="text-xs font-semibold text-muted-foreground"><SafeText value={o.format} /> — Price per person (USD)</p>
                    <div className="flex items-center justify-center gap-2"><span className="text-2xl font-bold">$</span><Input type="number" className="w-32 text-2xl font-bold text-center" defaultValue={o.price_per_person_usd} /></div>
                  </CardContent></Card>
                ))}
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
              nodeId="YR-24"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
          </div>
        )}
      </div>
    </div>
  );
}
