import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Mic, LayoutList, Globe, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { StepHeader, AbbyCard, LoadingStep, PaymentLinkCard, SummaryCard, SuccessCheckmark } from "../ba-shared/BABuilderShared";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";

const GEN_MSGS = ["Designing your podcast concept...", "Creating your first 10 episode ideas...", "Planning your distribution strategy...", "Building your launch plan...", "Finalising your podcast blueprint..."];
const ACT_MSGS = ["Creating your podcast show...", "Setting up your distribution...", "Your podcast is almost ready..."];

interface Props { authorId: string | null; }

export default function BA14Builder({ authorId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [hasContext, setHasContext] = useState<boolean | null>(null);
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [expandedEpisodes, setExpandedEpisodes] = useState<Record<number, boolean>>({});
  const [authorSlug, setAuthorSlug] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!authorId) return;
    (async () => {
      const { data: profile } = await supabase.from("author_profiles").select("pen_name, author_slug").eq("id", authorId).single();
      setAuthorName(profile?.pen_name || "there");
      setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));
      const { data: ctx } = await supabase.from("author_context").select("book_title").eq("author_id", authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      setBookTitle(ctx?.book_title || ""); setHasContext(!!ctx?.book_title);
      const { data: node } = await supabase.from("author_nodes").select("content_json, status").eq("author_id", authorId).eq("node_id", "BA-14").maybeSingle();
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
      const { data, error: fnErr } = await supabase.functions.invoke("generate-ba14-podcast", { body: { author_id: authorId } });
      if (fnErr || !data?.success) throw new Error(data?.error || fnErr?.message || "Generation failed");
      setContent(data.content); setStep(2);
    } catch (e: any) { setError(e.message); setStep(0); }
  };

  const handlePublish = async () => {
    setStep(3);
    setError(null);
    try {
      await publishNodeToSite(authorId!, "BA-14", authorSlug);
      setContent((prev: any) => ({ ...prev, activated: true }));
    } catch (e: any) {
      setError(e.message);
      setStep(2);
    }
  };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  const toggleEpisode = (i: number) => setExpandedEpisodes(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="min-h-screen bg-background">
      <StepHeader nodeId="BA-14" nodeName="Podcast" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's launch your Podcast</h2>
            {hasContext === false ? (
              <><p className="text-muted-foreground mb-4">Hi {authorName}! Please complete your book profile first.</p><Button onClick={() => navigate("/my-books?returnTo=/node-builder/BA-14")}>Complete Book Profile</Button></>
            ) : (
              <><p className="text-muted-foreground mb-4">Hi {authorName}! A podcast is one of the most powerful ways to build a loyal audience and establish your authority. I'm going to design your complete podcast — with a show concept, episode format, first 10 episode titles, and distribution strategy. Ready to hit record?</p>
                <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}><Sparkles className="h-4 w-4 mr-2" /> Design My Podcast</Button></>
            )}
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <LoadingStep messages={GEN_MSGS} msgIndex={msgIndex} />}
        {step === 2 && content && (
          <div className="space-y-4">
            <AbbyCard><p className="text-muted-foreground">{content.abby_summary}</p></AbbyCard>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="overview" className="text-xs py-2"><Mic className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Overview</TabsTrigger>
                <TabsTrigger value="episodes" className="text-xs py-2"><LayoutList className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Episodes</TabsTrigger>
                <TabsTrigger value="distribution" className="text-xs py-2"><Globe className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Distribution</TabsTrigger>
                <TabsTrigger value="launch" className="text-xs py-2"><CalendarDays className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Launch Plan</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h3 className="text-xl font-bold">{content.show_title}</h3>
                  {content.show_subtitle && <p className="text-muted-foreground">{content.show_subtitle}</p>}
                  {content.tagline && <p className="text-sm font-semibold text-primary italic">"{content.tagline}"</p>}
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs bg-muted px-2.5 py-1 rounded-full">{content.episode_format}</span>
                    <span className="text-xs bg-muted px-2.5 py-1 rounded-full">{content.episode_length_minutes}min</span>
                    <span className="text-xs bg-muted px-2.5 py-1 rounded-full">{content.release_cadence}</span>
                  </div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Show Description</p><p className="text-sm whitespace-pre-line">{content.show_description}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Target Listener</p><p className="text-sm">{content.target_listener}</p></div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="episodes" className="space-y-2 mt-4">
                {content.first_10_episodes?.map((ep: any, i: number) => (
                  <Card key={i} className="cursor-pointer" onClick={() => toggleEpisode(i)}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{ep.number}</span>
                          <h4 className="font-semibold text-sm">{ep.title}</h4>
                        </div>
                        {expandedEpisodes[i] ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      {expandedEpisodes[i] && (
                        <div className="pl-8 pt-2 space-y-2">
                          <p className="text-sm text-muted-foreground">{ep.description}</p>
                          <div className="space-y-0.5">{ep.key_points?.map((p: string, j: number) => <p key={j} className="text-xs">• {p}</p>)}</div>
                          <p className="text-xs italic text-primary">🎙️ "{ep.hook}"</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="distribution" className="space-y-4 mt-4">
                <div className="flex flex-wrap gap-2">{content.distribution_platforms?.map((p: string, i: number) => <span key={i} className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">{p}</span>)}</div>
                <Card><CardContent className="pt-4 pb-4"><p className="text-xs font-semibold text-muted-foreground mb-1">Monetisation Strategy</p><p className="text-sm">{content.monetisation_strategy}</p></CardContent></Card>
              </TabsContent>
              <TabsContent value="launch" className="space-y-3 mt-4">
                {[{ week: 1, task: "Record first 3 episodes" }, { week: 2, task: "Submit to directories" }, { week: 3, task: "Launch with 3 episodes" }, { week: 4, task: "Promote on social media" }].map((w, i) => (
                  <Card key={i}><CardContent className="pt-4 pb-4 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{w.week}</span>
                    <div><p className="text-xs text-muted-foreground">Week {w.week}</p><p className="text-sm font-medium">{w.task}</p></div>
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
              nodeId="BA-14"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
        )}
      </div>
    </div>
  );
}
