import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowRight, Crown, Users, ClipboardList, FileText } from "lucide-react";
import { toast } from "sonner";
import { StepHeader, AbbyCard, LoadingStep, MultiPaymentLinks, SummaryCard, SuccessCheckmark, HighTicketPrice } from "../yr-shared/YRBuilderShared";
import PublishSuccessScreen from "../shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";
import { getMicrositeUrl } from "@/lib/node-slug-map";

const GEN_MSGS = ["Designing your exclusive mastermind...", "Crafting membership tiers...", "Building your application process...", "Finalising your mastermind programme..."];
const ACT_MSGS = ["Setting up your membership tiers...", "Creating payment pages...", "Almost ready..."];
interface Props { authorId: string | null; }

export default function YR23Builder({ authorId }: Props) {
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
    const { data: node } = await supabase.from("author_nodes").select("content_json, status").eq("author_id", authorId).eq("node_id", "YR-23").maybeSingle();
    if (node?.content_json && (node.status === "content_ready" || node.status === "live")) { setContent(node.content_json); setStep(node.status === "live" ? 3 : 2); if (node.status === "live") setContent((p: any) => ({ ...p, activated: true })); }
  })(); }, [authorId]);

  useEffect(() => { if (step === 1 || (step === 3 && !content?.activated)) { const msgs = step === 1 ? GEN_MSGS : ACT_MSGS; setMsgIndex(0); intervalRef.current = setInterval(() => setMsgIndex(i => (i + 1) % msgs.length), 3000); return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; } }, [step]);

  const handleGenerate = async () => { setStep(1); setError(null); try { const { data, error: e } = await supabase.functions.invoke("generate-yr23-mastermind", { body: { author_id: authorId } }); if (e || !data?.success) throw new Error(data?.error || e?.message || "Failed"); setContent(data.content); setStep(2); } catch (e: any) { setError(e.message); setStep(0); } };
  const handlePublish = async () => { setStep(3); setError(null); try { await publishNodeToSite(authorId!, "YR-23", authorSlug); setContent((p: any) => ({ ...p, activated: true })); } catch (e: any) { setError(e.message); setStep(2); } };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <StepHeader nodeId="YR-23" nodeName="Mastermind" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (<AbbyCard><h2 className="text-xl font-bold mb-3">Let's build your Mastermind</h2><p className="text-muted-foreground mb-4">Hi {authorName}! A mastermind is the most exclusive and highest-value community you can create. I'm going to design your complete mastermind programme based on '{detectedBookTitle || "your book"}' — with a structure, application process, and a sales page. Ready to build your inner circle?</p><Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}>Build My Mastermind</Button>{error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}</AbbyCard>)}
        {step === 1 && <LoadingStep messages={GEN_MSGS} msgIndex={msgIndex} />}
        {step === 2 && content && (
          <div className="space-y-4">
            <AbbyCard><p className="text-muted-foreground">{content.abby_summary}</p></AbbyCard>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="overview" className="text-xs py-2"><Crown className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Overview</TabsTrigger>
                <TabsTrigger value="tiers" className="text-xs py-2"><Users className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Tiers</TabsTrigger>
                <TabsTrigger value="application" className="text-xs py-2"><ClipboardList className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Application</TabsTrigger>
                <TabsTrigger value="sales" className="text-xs py-2"><FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Sales Page</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h3 className="text-xl font-bold">{content.mastermind_title}</h3>
                  {content.tagline && <p className="text-sm font-semibold text-primary italic">"{content.tagline}"</p>}
                  <p className="text-sm">{content.programme_promise}</p>
                  <div className="flex gap-2 flex-wrap">{content.curriculum_pillars?.map((p: string, i: number) => <span key={i} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">{p}</span>)}</div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="tiers" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {content.membership_tiers?.map((t: any, i: number) => (
                    <Card key={i} className="border-amber-300 dark:border-amber-700">
                      <CardContent className="pt-6 space-y-3">
                        <h4 className="font-bold">{t.tier_name}</h4>
                        <HighTicketPrice price={t.price_annual_usd} /><span className="text-xs text-muted-foreground">/year</span>
                        <p className="text-xs text-muted-foreground">{t.group_size} · {t.meeting_cadence}</p>
                        <ul className="space-y-1">{t.benefits?.map((b: string, j: number) => <li key={j} className="flex items-start gap-2 text-sm"><span className="text-green-600">✓</span>{b}</li>)}</ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="application" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-2">Only accept applicants who meet your ideal client criteria</p>
                  <ol className="space-y-2">{content.application_questions?.map((q: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><span className="font-bold text-primary">{i + 1}.</span>{q}</li>)}</ol>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="sales" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4">
                  <h3 className="text-xl font-bold">{content.sales_page?.headline}</h3>
                  <p className="text-muted-foreground">{content.sales_page?.subheadline}</p>
                  <p className="text-sm">{content.sales_page?.who_its_for}</p>
                  <ul className="space-y-1">{content.sales_page?.what_youll_get?.map((w: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><span className="text-green-600">✓</span>{w}</li>)}</ul>
                  <Button className="w-full">{content.sales_page?.cta_button_text || "Apply for Membership"}</Button>
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
          <div className="space-y-6">
            <PublishSuccessScreen
              nodeId="YR-23"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
          </div>
        )}
      </div>
    </div>
  );
}
