import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowRight, Handshake, Presentation, Mail, Target } from "lucide-react";
import { toast } from "sonner";
import { StepHeader, AbbyCard, LoadingStep, MultiPaymentLinks, SummaryCard, SuccessCheckmark, HighTicketPrice } from "../shared/CategoryBuilderShared";
import PublishSuccessScreen from "../shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";
import { getMicrositeUrl } from "@/lib/node-slug-map";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";
import { YRSafeBoundary, SafeText } from "../yr-shared/YRSafeBoundary";

const GEN_MSGS = ["Designing your sponsorship programme...", "Creating sponsorship packages...", "Building your pitch deck outline...", "Finalising your outreach strategy..."];
const ACT_MSGS = ["Setting up your enquiry pipeline...", "Creating payment links...", "Almost ready..."];
interface Props { authorId: string | null; bookId?: string | null; }

export default function YR28Builder({ authorId, bookId }: Props) {
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

  useEffect(() => { if (!authorId) return; (async () => {
    const { data: p } = await supabase.from("author_profiles").select("pen_name, author_slug, user_id").eq("id", authorId).single();
    setAuthorName(p?.pen_name || "there");
    setAuthorSlug(p?.author_slug || "");
    const { data: ctx } = await supabase.from("author_context").select("book_title").eq("author_id", authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (ctx?.book_title) { setBookTitle(ctx.book_title); } else {
      const { data: book } = await supabase.from("books").select("title").eq("author_id", p?.user_id || authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (book?.title) setBookTitle(book.title);
    }
    const __draft = await loadBuilderDraft(authorId, "YR-28", bookId ?? null);
      if (__draft.content) {
        setContent(__draft.content);
        setStep(__draft.isLive ? 3 : Math.max(__draft.currentStep, 2));
      }
    })(); }, [authorId]);

  useEffect(() => { if (step === 1 || (step === 3 && !content?.activated)) { const msgs = step === 1 ? GEN_MSGS : ACT_MSGS; setMsgIndex(0); intervalRef.current = setInterval(() => setMsgIndex(i => (i + 1) % msgs.length), 3000); return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; } }, [step]);
  useEffect(() => { if (step === 2 && content) console.log("[YR-28] step-2 render", content); }, [step, content]);

  const handleGenerate = async () => { setStep(1); setError(null); try { const { data, error: e } = await supabase.functions.invoke("generate-yr28-sponsors", { body: { author_id: authorId, book_id: bookId ?? null } }); if (e || !data?.success) throw new Error(data?.error || e?.message || "Failed"); setContent(data.content); setStep(2); void autosaveBuilderDraft({ authorId: authorId!, nodeId: "YR-28", nodeName: "Exhibitors / JV", content: data.content, currentStep: 2, bookId: bookId ?? null }); } catch (e: any) { setError(e.message); setStep(0); } };
  const handlePublish = async () => { setStep(3); setError(null); try { await publishNodeToSite(authorId!, "YR-28", authorSlug); setContent((p: any) => ({ ...p, activated: true })); } catch (e: any) { setError(e.message); setStep(2); } };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <StepHeader nodeId="YR-28" nodeName="Exhibitors & Sponsors" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (<AbbyCard><h2 className="text-xl font-bold mb-3">Let's build your Sponsorship Programme</h2><p className="text-muted-foreground mb-4">Hi {authorName}! Attracting exhibitors and sponsors to your events turns your audience into a revenue asset. I'm going to design your complete sponsorship and exhibitor programme — with packages, a pitch deck outline, and an outreach strategy. Ready to attract sponsors?</p><Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}>Build My Sponsorship Programme</Button>{error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}</div>}</AbbyCard>)}
        {step === 1 && <LoadingStep messages={GEN_MSGS} msgIndex={msgIndex} />}
        {step === 2 && content && (
          <YRSafeBoundary nodeId="YR-28" debugContent={content} onReset={() => { setContent(null); setStep(0); }}>
          <div className="space-y-4">
            <AbbyCard><div className="text-muted-foreground"><SafeText value={content.abby_summary} /></div></AbbyCard>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="overview" className="text-xs py-2"><Handshake className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Overview</TabsTrigger>
                <TabsTrigger value="packages" className="text-xs py-2"><Target className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Packages</TabsTrigger>
                <TabsTrigger value="pitch" className="text-xs py-2"><Presentation className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Pitch Deck</TabsTrigger>
                <TabsTrigger value="outreach" className="text-xs py-2"><Mail className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Outreach</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h3 className="text-xl font-bold">{content.programme_title}</h3>
                  {content.tagline && <p className="text-sm font-semibold text-primary italic">"{content.tagline}"</p>}
                  <SafeText value={content.audience_profile} />
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="packages" className="space-y-3 mt-4">
                {content.sponsorship_packages?.map((sp: any, i: number) => (
                  <Card key={i} className={sp.price_usd >= 10000 ? "border-amber-300 dark:border-amber-700" : ""}>
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="font-bold">{sp.tier}</h4>
                        <HighTicketPrice price={sp.price_usd} />
                      </div>
                      <span className="inline-block text-xs bg-muted px-2.5 py-1 rounded-full">{sp.exclusivity}</span>
                      <SafeText value={sp.description} className="text-muted-foreground" />
                      <ul className="space-y-1">{sp.benefits?.map((b: string, j: number) => <li key={j} className="flex items-start gap-2 text-sm"><span className="text-green-600">✓</span>{b}</li>)}</ul>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="pitch" className="space-y-3 mt-4">
                {content.pitch_deck_outline?.map((s: any, i: number) => (
                  <Card key={i}><CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 mb-1"><span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{s.slide}</span><h4 className="font-bold text-sm">{s.title}</h4></div>
                    <div className="pl-9"><SafeText value={s.content_summary} className="text-muted-foreground" /></div>
                  </CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="outreach" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4">
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Target Sponsors</p><SafeText value={content.outreach_strategy?.target_sponsors} /></div>
                  <Card className="bg-muted/30"><CardContent className="pt-4 pb-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Outreach Email</p>
                    {Array.isArray(content.outreach_strategy?.outreach_message)
                      ? <SafeText value={content.outreach_strategy?.outreach_message} />
                      : <p className="text-sm whitespace-pre-line">{content.outreach_strategy?.outreach_message}</p>}
                  </CardContent></Card>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Follow-up</p><SafeText value={content.outreach_strategy?.follow_up_cadence} /></div>
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
              nodeId="YR-28"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
          </div>
        )}
      </div>
    </div>
  );
}
