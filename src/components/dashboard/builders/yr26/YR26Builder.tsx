import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowRight, CalendarDays, LayoutList, DollarSign, Handshake } from "lucide-react";
import { toast } from "sonner";
import { StepHeader, AbbyCard, LoadingStep, MultiPaymentLinks, SummaryCard, SuccessCheckmark, HighTicketPrice } from "../yr-shared/YRBuilderShared";
import PublishSuccessScreen from "../shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";
import { getMicrositeUrl } from "@/lib/node-slug-map";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";
import { YRSafeBoundary, SafeText } from "../yr-shared/YRSafeBoundary";

const GEN_MSGS = ["Designing your conference concept...", "Building the programme...", "Creating sponsorship packages...", "Finalising your event plan..."];
const ACT_MSGS = ["Setting up ticket sales...", "Creating sponsorship pipeline...", "Almost ready..."];
interface Props { authorId: string | null; bookId?: string | null; }

export default function YR26Builder({ authorId, bookId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [authorSlug, setAuthorSlug] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { bookTitle: detectedBookTitle } = useAuthorBook();

  useEffect(() => { if (!authorId) return; (async () => {
    const { data: p } = await supabase.from("author_profiles").select("pen_name, author_slug, user_id").eq("id", authorId).single();
    setAuthorName(p?.pen_name || "there");
    setAuthorSlug(p?.author_slug || "");
    const { data: ctx } = await supabase.from("author_context").select("book_title").eq("author_id", authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (ctx?.book_title) { setBookTitle(ctx.book_title); } else {
      const { data: book } = await supabase.from("books").select("title").eq("author_id", p?.user_id || authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (book?.title) setBookTitle(book.title);
    }
    const __draft = await loadBuilderDraft(authorId, "YR-26");
      if (__draft.content) {
        setContent(__draft.content);
        setStep(__draft.isLive ? 3 : Math.max(__draft.currentStep, 2));
      }
    })(); }, [authorId]);

  useEffect(() => { if (step === 1 || (step === 3 && !content?.activated)) { const msgs = step === 1 ? GEN_MSGS : ACT_MSGS; setMsgIndex(0); intervalRef.current = setInterval(() => setMsgIndex(i => (i + 1) % msgs.length), 3000); return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; } }, [step]);
  useEffect(() => { if (step === 2 && content) console.log("[YR-26] step-2 render", content); }, [step, content]);

  const handleGenerate = async () => { setStep(1); setError(null); try { const { data, error: e } = await supabase.functions.invoke("generate-yr26-conference", { body: { author_id: authorId, book_id: bookId ?? null } }); if (e || !data?.success) throw new Error(data?.error || e?.message || "Failed"); setContent(data.content); setStep(2); void autosaveBuilderDraft({ authorId: authorId!, nodeId: "YR-26", nodeName: "Conferences", content: data.content, currentStep: 2 }); } catch (e: any) { setError(e.message); setStep(0); } };
  const handlePublish = async () => { setStep(3); setError(null); try { await publishNodeToSite(authorId!, "YR-26", authorSlug); setContent((p: any) => ({ ...p, activated: true })); } catch (e: any) { setError(e.message); setStep(2); } };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <StepHeader nodeId="YR-26" nodeName="Conferences" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (<AbbyCard><h2 className="text-xl font-bold mb-3">Let's plan your Conference</h2><p className="text-muted-foreground mb-4">Hi {authorName}! Running your own conference positions you as the definitive authority in your field. I'm going to design your complete conference concept based on '{detectedBookTitle || bookTitle || "your book"}' — with an event concept, speaker programme, and ticket pricing. Ready to host your own event?</p><Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}>Build My Conference</Button>{error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}</div>}</AbbyCard>)}
        {step === 1 && <LoadingStep messages={GEN_MSGS} msgIndex={msgIndex} />}
        {step === 2 && content && (
          <YRSafeBoundary nodeId="YR-26" debugContent={content} onReset={() => { setContent(null); setStep(0); }}>
          <div className="space-y-4">
            <AbbyCard><div className="text-muted-foreground"><SafeText value={content.abby_summary} /></div></AbbyCard>
            <Tabs defaultValue="concept" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="concept" className="text-xs py-2"><CalendarDays className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Concept</TabsTrigger>
                <TabsTrigger value="formats" className="text-xs py-2"><DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Formats</TabsTrigger>
                <TabsTrigger value="programme" className="text-xs py-2"><LayoutList className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Programme</TabsTrigger>
                <TabsTrigger value="sponsors" className="text-xs py-2"><Handshake className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Sponsors</TabsTrigger>
              </TabsList>
              <TabsContent value="concept" className="space-y-4 mt-4"><Card><CardContent className="pt-6 space-y-3"><h3 className="text-xl font-bold">{content.conference_title}</h3>{content.tagline && <p className="text-sm font-semibold text-primary italic">"{content.tagline}"</p>}<p className="text-sm">{content.conference_concept}</p></CardContent></Card></TabsContent>
              <TabsContent value="formats" className="space-y-3 mt-4">
                {content.event_formats?.map((f: any, i: number) => (
                  <Card key={i}><CardContent className="pt-6 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2"><h4 className="font-bold">{f.format}</h4><HighTicketPrice price={f.ticket_price_usd} /></div>
                    <div className="flex gap-2 flex-wrap"><span className="text-xs bg-muted px-2.5 py-1 rounded-full">{f.duration}</span><span className="text-xs bg-muted px-2.5 py-1 rounded-full">{f.capacity}</span></div>
                    <SafeText value={f.description} className="text-muted-foreground" />
                  </CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="programme" className="space-y-3 mt-4">
                {content.programme_outline?.map((s: any, i: number) => (
                  <Card key={i}><CardContent className="pt-4 pb-4"><div className="flex items-center gap-2"><span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{s.session_type}</span><h4 className="font-bold text-sm">{s.title}</h4></div><div className="mt-1"><SafeText value={s.description} className="text-muted-foreground" /></div></CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="sponsors" className="space-y-3 mt-4">
                {content.sponsorship_packages?.map((sp: any, i: number) => (
                  <Card key={i} className={sp.price_usd >= 5000 ? "border-amber-300 dark:border-amber-700" : ""}>
                    <CardContent className="pt-6 space-y-2">
                      <div className="flex items-center justify-between"><h4 className="font-bold">{sp.tier}</h4><HighTicketPrice price={sp.price_usd} /></div>
                      <ul className="space-y-1">{sp.benefits?.map((b: string, j: number) => <li key={j} className="flex items-start gap-2 text-sm"><span className="text-green-600">✓</span>{b}</li>)}</ul>
                    </CardContent>
                  </Card>
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
              nodeId="YR-26"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
          </div>
        )}
      </div>
    </div>
  );
}
