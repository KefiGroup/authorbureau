import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowRight, Mic, DollarSign, FileText, ListChecks, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { StepHeader, AbbyCard, LoadingStep, SummaryCard, SuccessCheckmark, HighTicketPrice } from "../yr-shared/YRBuilderShared";
import PublishSuccessScreen from "../shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";
import { getMicrositeUrl } from "@/lib/node-slug-map";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";
import { YRSafeBoundary, SafeText } from "../yr-shared/YRSafeBoundary";

const GEN_MSGS = ["Crafting your signature talks...", "Building your speaker one-sheet...", "Designing your fee schedule...", "Finalising your speaking business..."];
const ACT_MSGS = ["Setting up your speaking enquiry pipeline...", "Creating your booking calendar...", "Almost ready..."];

interface Props { authorId: string | null; bookId?: string | null; }

export default function YR21Builder({ authorId, bookId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [authorSlug, setAuthorSlug] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [expandedTalks, setExpandedTalks] = useState<Record<number, boolean>>({});
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
      const __draft = await loadBuilderDraft(authorId, "YR-21", bookId ?? null);
      if (__draft.content) {
        setContent(__draft.content);
        setStep(__draft.isLive ? 3 : Math.max(__draft.currentStep, 2));
      }
    })();
  }, [authorId]);

  useEffect(() => {
    if (step === 1 || (step === 3 && !content?.activated)) {
      const msgs = step === 1 ? GEN_MSGS : ACT_MSGS;
      setMsgIndex(0); intervalRef.current = setInterval(() => setMsgIndex(i => (i + 1) % msgs.length), 3000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [step]);
  useEffect(() => { if (step === 2 && content) console.log("[YR-21] step-2 render", content); }, [step, content]);

  const handleGenerate = async () => {
    setStep(1); setError(null);
    try {
      const { data, error: e } = await supabase.functions.invoke("generate-yr21-speaking", { body: { author_id: authorId, book_id: bookId ?? null } });
      if (e || !data?.success) throw new Error(data?.error || e?.message || "Generation failed");
      setContent(data.content); setStep(2);
      void autosaveBuilderDraft({ authorId: authorId!, nodeId: "YR-21", nodeName: "Keynotes", content: data.content, currentStep: 2, bookId: bookId ?? null });
    } catch (e: any) { setError(e.message); setStep(0); }
  };

  const handlePublish = async () => {
    setStep(3);
    setError(null);
    try {
      await publishNodeToSite(authorId!, "YR-21", authorSlug);
      setContent((prev: any) => ({ ...prev, activated: true }));
    } catch (e: any) {
      setError(e.message);
      setStep(2);
    }
  };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  const feeSchedule = content?.fee_schedule;
  const feeRows = feeSchedule ? [
    { ...feeSchedule.keynote_half_day },
    { ...feeSchedule.keynote_full_day },
    { ...feeSchedule.virtual_keynote },
    { ...feeSchedule.corporate_training },
    { ...feeSchedule.international },
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <StepHeader nodeId="YR-21" nodeName="Keynote Speaking" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's build your Speaking Business</h2>
            <p className="text-muted-foreground mb-4">Hi {authorName}! Keynote speaking is one of the most prestigious and lucrative ways to share your expertise. I'm going to build your complete speaking business — with 3 signature talks, a speaker one-sheet, and a fee schedule. Ready to take the stage?</p>
            <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}>Build My Speaking Business</Button>
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <LoadingStep messages={GEN_MSGS} msgIndex={msgIndex} />}
        {step === 2 && content && (
          <YRSafeBoundary nodeId="YR-21" debugContent={content} onReset={() => { setContent(null); setStep(0); }}>
          <div className="space-y-4">
            <AbbyCard><div className="text-muted-foreground"><SafeText value={content.abby_summary} /></div></AbbyCard>
            <Tabs defaultValue="talks" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="talks" className="text-xs py-2"><Mic className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Talks</TabsTrigger>
                <TabsTrigger value="fees" className="text-xs py-2"><DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Fee Schedule</TabsTrigger>
                <TabsTrigger value="onesheet" className="text-xs py-2"><FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> One-Sheet</TabsTrigger>
                <TabsTrigger value="booking" className="text-xs py-2"><ListChecks className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Booking</TabsTrigger>
              </TabsList>
              <TabsContent value="talks" className="space-y-3 mt-4">
                {content.signature_talks?.map((t: any, i: number) => (
                  <Card key={i} className={i === 0 ? "border-primary/30" : ""}>
                    <CardContent className="pt-4 pb-4 space-y-2 cursor-pointer" onClick={() => setExpandedTalks(p => ({ ...p, [i]: !p[i] }))}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {i === 0 && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">ABBY's Top Pick</span>}
                          <h4 className="font-bold text-sm">{t.talk_title}</h4>
                        </div>
                        {expandedTalks[i] ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      {expandedTalks[i] && (
                        <div className="space-y-2 pt-2">
                          <p className="text-sm text-muted-foreground">{t.description}</p>
                          <div className="flex gap-1 flex-wrap">{t.duration_options?.map((d: string, j: number) => <span key={j} className="text-xs bg-muted px-2 py-0.5 rounded-full">{d}</span>)}</div>
                          <p className="text-xs text-muted-foreground">Audience: {t.audience}</p>
                          <ul className="space-y-1">{t.key_takeaways?.map((k: string, j: number) => <li key={j} className="flex items-start gap-2 text-sm"><span className="text-green-600">✓</span>{k}</li>)}</ul>
                          <p className="text-sm italic border-l-2 border-primary pl-3">"{t.opening_hook}"</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="fees" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6">
                  <div className="space-y-3">
                    {feeRows.map((f: any, i: number) => {
                      const isHigh = f.fee_range?.includes("10,000") || f.fee_range?.includes("15,000") || f.fee_range?.includes("25,000") || f.fee_range?.includes("50,000");
                      return (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${isHigh ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" : "bg-muted/30"}`}>
                          <span className="text-sm font-medium">{f.label}</span>
                          <span className={`font-bold ${isHigh ? "text-amber-700 dark:text-amber-400 text-lg" : ""}`}>{f.fee_range}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="onesheet" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4">
                  <h3 className="text-lg font-bold">{content.speaker_one_sheet?.headline}</h3>
                  <p className="text-sm">{(content.speaker_one_sheet?.bio_short || "").replace(/<[^>]+>/g, "")}</p>
                  <div className="flex gap-2 flex-wrap">{content.speaker_one_sheet?.topics?.map((t: string, i: number) => <span key={i} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">{t}</span>)}</div>
                  <div className="border-t pt-3"><p className="text-xs font-semibold text-muted-foreground mb-1">Full Bio</p><p className="text-sm">{(content.speaker_one_sheet?.bio_long || "").replace(/<[^>]+>/g, "")}</p></div>
                  <div className="flex gap-2 flex-wrap">{content.speaker_one_sheet?.past_clients_placeholder?.map((c: string, i: number) => <span key={i} className="text-xs bg-muted px-2.5 py-1 rounded-full">{c}</span>)}</div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="booking" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  {content.booking_process?.map((s: string, i: number) => <div key={i} className="flex items-start gap-3"><span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">{i + 1}</span><p className="text-sm pt-1">{s}</p></div>)}
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
              nodeId="YR-21"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
          </div>
        )}
      </div>
    </div>
  );
}
