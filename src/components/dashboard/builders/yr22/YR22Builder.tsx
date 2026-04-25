import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowRight, Building2, LayoutList, DollarSign, FileText } from "lucide-react";
import { toast } from "sonner";
import { StepHeader, AbbyCard, LoadingStep, MultiPaymentLinks, SummaryCard, SuccessCheckmark, HighTicketPrice } from "../shared/CategoryBuilderShared";
import PublishSuccessScreen from "../shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";
import { getMicrositeUrl } from "@/lib/node-slug-map";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";
import { YRSafeBoundary, SafeText } from "../yr-shared/YRSafeBoundary";

const GEN_MSGS = ["Designing your corporate training programme...", "Building training format options...", "Crafting your proposal template...", "Finalising your corporate offer..."];
const ACT_MSGS = ["Creating your enquiry pipeline...", "Setting up payment pages...", "Almost ready..."];
interface Props { authorId: string | null; bookId?: string | null; }

export default function YR22Builder({ authorId, bookId }: Props) {
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
    const __draft = await loadBuilderDraft(authorId, "YR-22", bookId ?? null);
      if (__draft.content) {
        setContent(__draft.content);
        setStep(__draft.isLive ? 3 : Math.max(__draft.currentStep, 2));
      }
    })(); }, [authorId]);

  useEffect(() => { if (step === 1 || (step === 3 && !content?.activated)) { const msgs = step === 1 ? GEN_MSGS : ACT_MSGS; setMsgIndex(0); intervalRef.current = setInterval(() => setMsgIndex(i => (i + 1) % msgs.length), 3000); return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; } }, [step]);
  useEffect(() => { if (step === 2 && content) console.log("[YR-22] step-2 render", content); }, [step, content]);

  const handleGenerate = async () => { setStep(1); setError(null); try { const { data, error: e } = await supabase.functions.invoke("generate-yr22-corporate", { body: { author_id: authorId, book_id: bookId ?? null } }); if (e || !data?.success) throw new Error(data?.error || e?.message || "Failed"); setContent(data.content); setStep(2); void autosaveBuilderDraft({ authorId: authorId!, nodeId: "YR-22", nodeName: "Training Programs", content: data.content, currentStep: 2, bookId: bookId ?? null }); } catch (e: any) { setError(e.message); setStep(0); } };
  const handlePublish = async () => { setStep(3); setError(null); try { await publishNodeToSite(authorId!, "YR-22", authorSlug); setContent((p: any) => ({ ...p, activated: true })); } catch (e: any) { setError(e.message); setStep(2); } };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <StepHeader nodeId="YR-22" nodeName="Corporate Training" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (<AbbyCard><h2 className="text-xl font-bold mb-3">Let's build your Corporate Training</h2><p className="text-muted-foreground mb-4">Hi {authorName}! Corporate training is where your expertise meets the biggest budgets. I'm going to design your complete corporate training offer based on '{detectedBookTitle || bookTitle || "your book"}' — with a training programme, a corporate proposal template, and a pricing structure. Ready to train organisations?</p><Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}>Build My Corporate Training</Button>{error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}</div>}</AbbyCard>)}
        {step === 1 && <LoadingStep messages={GEN_MSGS} msgIndex={msgIndex} />}
        {step === 2 && content && (
          <YRSafeBoundary nodeId="YR-22" debugContent={content} onReset={() => { setContent(null); setStep(0); }}>
          <div className="space-y-4">
            <AbbyCard><div className="text-muted-foreground"><SafeText value={content.abby_summary} /></div></AbbyCard>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="overview" className="text-xs py-2"><Building2 className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Overview</TabsTrigger>
                <TabsTrigger value="formats" className="text-xs py-2"><DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Formats</TabsTrigger>
                <TabsTrigger value="outline" className="text-xs py-2"><LayoutList className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Outline</TabsTrigger>
                <TabsTrigger value="proposal" className="text-xs py-2"><FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Proposal</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h3 className="text-xl font-bold">{content.programme_title}</h3>
                  {content.tagline && <p className="text-sm font-semibold text-primary italic">"{content.tagline}"</p>}
                  <div className="flex gap-2 flex-wrap">{content.target_organisations?.map((o: string, i: number) => <span key={i} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">{o}</span>)}</div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Learning Outcomes</p><ul className="space-y-1">{content.learning_outcomes?.map((o: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><span className="text-green-600">✓</span>{o}</li>)}</ul></div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="formats" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {content.training_formats?.map((f: any, i: number) => (
                    <Card key={i} className={f.price_usd >= 10000 ? "border-amber-300 dark:border-amber-700" : ""}>
                      <CardContent className="pt-6 space-y-2">
                        <h4 className="font-bold">{f.format}</h4>
                        <HighTicketPrice price={f.price_usd} />
                        <p className="text-xs text-muted-foreground">{f.duration} · {f.participants}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="outline" className="space-y-3 mt-4">
                {content.programme_outline?.map((m: any, i: number) => (
                  <Card key={i}><CardContent className="pt-4 pb-4 space-y-1">
                    <div className="flex items-center gap-2"><span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{i + 1}</span><h4 className="font-bold text-sm">{m.title}</h4></div>
                    <p className="text-sm text-muted-foreground pl-9">{m.description}</p><p className="text-xs text-muted-foreground pl-9">{m.duration}</p>
                  </CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="proposal" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4">
                  {["executive_summary", "the_challenge", "the_solution", "investment", "next_steps"].map((key) => (
                    <div key={key}><p className="text-xs font-semibold text-muted-foreground mb-1 capitalize">{key.replace(/_/g, " ")}</p><p className="text-sm">{content.proposal_template?.[key]}</p></div>
                  ))}
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
              nodeId="YR-22"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
          </div>
        )}
      </div>
    </div>
  );
}
