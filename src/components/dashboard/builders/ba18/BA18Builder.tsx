import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBookContext } from "@/hooks/useBookContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, Handshake, Users, Mail, ListChecks } from "lucide-react";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";

const STEPS = ["Introduction", "Generating", "Review", "Publish"];
const GEN_MSGS = ["Designing your JV partnership strategy...", "Creating ideal partner profiles...", "Writing your partnership pitch...", "Building your outreach checklist...", "Finalising your strategy..."];
const ACT_MSGS = ["Setting up your partnerships pipeline...", "Preparing your outreach materials...", "Almost ready..."];

interface Props { authorId: string | null; }

export default function BA18Builder({ authorId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [hasContext, setHasContext] = useState<boolean | null>(null);
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [authorSlug, setAuthorSlug] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading } = useBookContext();

  useEffect(() => {
    if (!authorId) return;
    (async () => {
      const { data: profile } = await supabase.from("author_profiles").select("pen_name, author_slug, user_id").eq("id", authorId).single();
      setAuthorName(profile?.pen_name || "there");
      setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));
      const { data: ctx } = await supabase.from("author_context").select("book_title").eq("author_id", authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (ctx?.book_title) {
        setBookTitle(ctx.book_title);
        setHasContext(true);
      } else {
        const { data: book } = await supabase.from("books").select("title").eq("author_id", profile?.user_id || authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (book?.title) { setBookTitle(book.title); setHasContext(true); } else { setHasContext(false); }
      }
      const __draft = await loadBuilderDraft(authorId, "BA-18");
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
      intervalRef.current = setInterval(() => setMsgIndex((i) => (i + 1) % msgs.length), 3000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [step]);

  const handleGenerate = async () => {
    setStep(1); setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-ba18-jv-partnerships", { body: { author_id: authorId } });
      if (fnErr || !data?.success) throw new Error(data?.error || fnErr?.message || "Generation failed");
      setContent(data.content); setStep(2);
      void autosaveBuilderDraft({ authorId: authorId!, nodeId: "BA-18", nodeName: "Revenue Sharing", content: data.content, currentStep: 2 });
    } catch (e: any) { setError(e.message); setStep(0); }
  };

  const handlePublish = async () => {
    setStep(3); setError(null);
    try { await publishNodeToSite(authorId!, "BA-18", authorSlug); setContent((prev: any) => ({ ...prev, activated: true })); }
    catch (e: any) { setError(e.message); setStep(2); }
  };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-4 py-3"><div className="max-w-3xl mx-auto flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => navigate("/build-authority")}><ArrowLeft className="h-4 w-4" /></Button><div className="flex-1"><h1 className="text-lg font-semibold">Revenue Sharing</h1></div></div></div>
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-2"><div className="flex items-center gap-1">{STEPS.map((label, i) => (<div key={label} className="flex items-center gap-1 flex-1"><div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-muted text-muted-foreground"}`}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</div><span className="text-xs text-muted-foreground hidden sm:inline truncate">{label}</span>{i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}</div>))}</div></div>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard><h2 className="text-xl font-bold mb-3">Let's build your Revenue Sharing Strategy</h2>
            {!isBookLoading && hasContext !== null && !hasBook && !hasContext ? (
              <>
                <p className="text-muted-foreground mb-4">Hi {authorName}! Before I design your revenue sharing strategy, I need to know about your book. Please complete your book profile first.</p>
                <Button onClick={() => navigate("/my-books?returnTo=/node-builder/BA-18")}>Complete Book Profile</Button>
              </>
            ) : (<><p className="text-muted-foreground mb-4">Hi {authorName}! Revenue sharing is the ultimate partnership model. I'll design a JV strategy based on '{detectedBookTitle || bookTitle || "your book"}' — with ideal partner profiles, a pitch template, and an outreach checklist. Ready?</p><Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate} disabled={isBookLoading}><Sparkles className="h-4 w-4 mr-2" /> Design My Strategy</Button></>)}
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{GEN_MSGS[msgIndex]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /><p className="text-xs text-muted-foreground">Abby usually takes 20–40 seconds</p></div></AbbyCard>}
        {step === 2 && content && (
          <div className="space-y-4">
            <AbbyCard><p className="text-muted-foreground">{content.abby_summary}</p></AbbyCard>
            <Tabs defaultValue="partners" className="w-full">
              <TabsList className="w-full grid grid-cols-3 h-auto">
                <TabsTrigger value="partners" className="text-xs py-2"><Users className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Partners</TabsTrigger>
                <TabsTrigger value="pitch" className="text-xs py-2"><Mail className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Pitch</TabsTrigger>
                <TabsTrigger value="checklist" className="text-xs py-2"><ListChecks className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Checklist</TabsTrigger>
              </TabsList>
              <TabsContent value="partners" className="space-y-4 mt-4">
                {content.ideal_partners?.map((p: any, i: number) => (
                  <Card key={i}><CardContent className="pt-6 space-y-2">
                    <h4 className="font-bold">{p.type}</h4>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                    <p className="text-xs text-primary">{p.revenue_model}</p>
                  </CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="pitch" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.pitch_template}</p></CardContent></Card>
              </TabsContent>
              <TabsContent value="checklist" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  {content.outreach_checklist?.map((item: string, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <Checkbox checked={checkedItems[i] || false} onCheckedChange={(checked) => setCheckedItems(prev => ({ ...prev, [i]: !!checked }))} />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </CardContent></Card>
              </TabsContent>
            </Tabs>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => toast.info("Manual editing coming soon.")}>Edit</Button>
              <Button className="flex-1" size="lg" onClick={handlePublish}>Publish to My Site<ArrowRight className="h-4 w-4 ml-2" /></Button>
            </div>
          </div>
        )}
        {step === 3 && !content?.activated && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{ACT_MSGS[msgIndex % ACT_MSGS.length]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /><p className="text-xs text-muted-foreground">Abby usually takes 20–40 seconds</p></div></AbbyCard>}
        {step === 3 && content?.activated && <PublishSuccessScreen nodeId="BA-18" authorName={authorName} penNameSlug={authorSlug} />}
      </div>
    </div>
  );
}

function AbbyCard({ children }: { children: React.ReactNode }) {
  return <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-6"><div className="flex gap-3"><div className="shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"><Sparkles className="h-5 w-5 text-primary" /></div><div className="flex-1 min-w-0">{children}</div></div></CardContent></Card>;
}
