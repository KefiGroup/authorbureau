import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Newspaper, FileText, Mail, Target } from "lucide-react";
import { StepHeader, AbbyCard, LoadingStep, SummaryCard, SuccessCheckmark } from "../ba-shared/BABuilderShared";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";

const GEN_MSGS = ["Building your media kit...", "Writing your press release...", "Creating your media pitch template...", "Identifying target media outlets...", "Finalising your PR strategy..."];
const ACT_MSGS = ["Setting up your media outreach pipeline...", "Preparing your press materials...", "Almost ready..."];

interface Props { authorId: string | null; }

export default function BA15Builder({ authorId }: Props) {
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
      setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));
      setAuthorName(profile?.pen_name || "there");
      const { data: ctx } = await supabase.from("author_context").select("book_title").eq("author_id", authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      setBookTitle(ctx?.book_title || ""); setHasContext(!!ctx?.book_title);
      const { data: node } = await supabase.from("author_nodes").select("content_json, status").eq("author_id", authorId).eq("node_id", "BA-15").maybeSingle();
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
      const { data, error: fnErr } = await supabase.functions.invoke("generate-ba15-media-pr", { body: { author_id: authorId } });
      if (fnErr || !data?.success) throw new Error(data?.error || fnErr?.message || "Generation failed");
      setContent(data.content); setStep(2);
    } catch (e: any) { setError(e.message); setStep(0); }
  };

  const handlePublish = async () => {
    setStep(3);
    setError(null);
    try {
      await publishNodeToSite(authorId!, "BA-15", authorSlug);
      setContent((prev: any) => ({ ...prev, activated: true }));
    } catch (e: any) {
      setError(e.message);
      setStep(2);
    }
  };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <StepHeader nodeId="BA-15" nodeName="Media & PR" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's build your Media Kit</h2>
            {hasContext === false ? (
              <><p className="text-muted-foreground mb-4">Hi {authorName}! Please complete your book profile first.</p><Button onClick={() => navigate("/my-books?returnTo=/node-builder/BA-15")}>Complete Book Profile</Button></>
            ) : (
              <><p className="text-muted-foreground mb-4">Hi {authorName}! Media coverage and PR are the fastest ways to build credibility and reach new audiences. I'm going to build your complete media kit — with a speaker bio, press release, media pitch template, and a list of target media outlets. Ready to get featured?</p>
                <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}><Sparkles className="h-4 w-4 mr-2" /> Build My Media Kit</Button></>
            )}
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <LoadingStep messages={GEN_MSGS} msgIndex={msgIndex} />}
        {step === 2 && content && (
          <div className="space-y-4">
            <AbbyCard><p className="text-muted-foreground">{content.abby_summary}</p></AbbyCard>
            <Tabs defaultValue="kit" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="kit" className="text-xs py-2"><Newspaper className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Media Kit</TabsTrigger>
                <TabsTrigger value="press" className="text-xs py-2"><FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Press Release</TabsTrigger>
                <TabsTrigger value="pitch" className="text-xs py-2"><Mail className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Pitch</TabsTrigger>
                <TabsTrigger value="outlets" className="text-xs py-2"><Target className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Outlets</TabsTrigger>
              </TabsList>
              <TabsContent value="kit" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h3 className="text-xl font-bold">{content.speaker_headline}</h3>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-2">Talking Points</p>
                    <ol className="space-y-1 list-decimal list-inside">{content.talking_points?.map((tp: string, i: number) => <li key={i} className="text-sm">{tp}</li>)}</ol>
                  </div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="press" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4">
                  <h2 className="text-xl font-bold">{content.press_release?.headline}</h2>
                  <p className="text-muted-foreground font-medium">{content.press_release?.subheadline}</p>
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line">{content.press_release?.body}</div>
                  <Card className="bg-muted/30"><CardContent className="pt-3 pb-3"><p className="text-xs font-semibold text-muted-foreground mb-1">Boilerplate</p><p className="text-sm">{content.press_release?.boilerplate}</p></CardContent></Card>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="pitch" className="space-y-4 mt-4">
                <Card className="border-primary/20"><CardContent className="pt-6 space-y-3">
                  <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Subject</p><p className="font-semibold text-sm">{content.media_pitch_template?.subject_line}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Opening</p><p className="text-sm">{content.media_pitch_template?.opening}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Story Hook</p><p className="text-sm">{content.media_pitch_template?.hook}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Credentials</p><p className="text-sm">{content.media_pitch_template?.credentials}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Call to Action</p><p className="text-sm">{content.media_pitch_template?.call_to_action}</p></div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="outlets" className="space-y-3 mt-4">
                {content.target_media_outlets?.map((o: any, i: number) => (
                  <Card key={i}><CardContent className="pt-4 pb-4 space-y-1">
                    <div className="flex items-center gap-2"><h4 className="font-bold text-sm">{o.outlet}</h4><span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{o.type}</span></div>
                    <p className="text-xs text-muted-foreground">Audience: {o.audience}</p>
                    <p className="text-xs"><span className="font-semibold">Pitch angle:</span> {o.pitch_angle}</p>
                  </CardContent></Card>
                ))}
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
              nodeId="BA-15"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
        )}
      </div>
    </div>
  );
}
