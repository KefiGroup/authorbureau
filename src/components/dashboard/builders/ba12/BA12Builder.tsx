import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Users, Crown, CalendarDays, Mail } from "lucide-react";
import { StepHeader, AbbyCard, LoadingStep, PaymentLinkCard, SummaryCard, SuccessCheckmark } from "../ba-shared/BABuilderShared";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";

const GEN_MSGS = ["Designing your membership community...", "Creating membership tiers and benefits...", "Building your content calendar...", "Writing your welcome sequence...", "Finalising your membership blueprint..."];
const ACT_MSGS = ["Setting up your membership tiers...", "Creating payment links for each tier...", "Configuring your welcome emails...", "Your membership is almost ready..."];

interface Props { authorId: string | null; }

export default function BA12Builder({ authorId }: Props) {
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
      setAuthorName(profile?.pen_name || "there");
      setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));
      const { data: ctx } = await supabase.from("author_context").select("book_title").eq("author_id", authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      setBookTitle(ctx?.book_title || ""); setHasContext(!!ctx?.book_title);
      const { data: node } = await supabase.from("author_nodes").select("content_json, status").eq("author_id", authorId).eq("node_id", "BA-12").maybeSingle();
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
      const { data, error: fnErr } = await supabase.functions.invoke("generate-ba12-membership", { body: { author_id: authorId } });
      if (fnErr || !data?.success) throw new Error(data?.error || fnErr?.message || "Generation failed");
      setContent(data.content); setStep(2);
    } catch (e: any) { setError(e.message); setStep(0); }
  };

  const handlePublish = async () => {
    setStep(3);
    setError(null);
    try {
      await publishNodeToSite(authorId!, "BA-12", authorSlug);
      setContent((prev: any) => ({ ...prev, activated: true }));
    } catch (e: any) {
      setError(e.message);
      setStep(2);
    }
  };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <StepHeader nodeId="BA-12" nodeName="Membership Site" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's build your Membership Community</h2>
            {hasContext === false ? (
              <><p className="text-muted-foreground mb-4">Hi {authorName}! Please complete your book profile first.</p><Button onClick={() => navigate("/my-books?returnTo=/node-builder/BA-12")}>Complete Book Profile</Button></>
            ) : (
              <><p className="text-muted-foreground mb-4">Hi {authorName}! A membership site is your most powerful recurring revenue engine. I'm going to design a complete membership community based on '{bookTitle || "your book"}' — with a membership structure, content calendar, pricing tiers, and a welcome sequence. Ready to build your community?</p>
                <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}><Sparkles className="h-4 w-4 mr-2" /> Build My Membership</Button></>
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
                <TabsTrigger value="overview" className="text-xs py-2"><Users className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Overview</TabsTrigger>
                <TabsTrigger value="tiers" className="text-xs py-2"><Crown className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Tiers</TabsTrigger>
                <TabsTrigger value="calendar" className="text-xs py-2"><CalendarDays className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Calendar</TabsTrigger>
                <TabsTrigger value="welcome" className="text-xs py-2"><Mail className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Welcome</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h3 className="text-xl font-bold">{content.membership_title}</h3>
                  {content.membership_subtitle && <p className="text-muted-foreground">{content.membership_subtitle}</p>}
                  {content.tagline && <p className="text-sm font-semibold text-primary italic">"{content.tagline}"</p>}
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Community Promise</p><p className="text-sm">{content.community_promise}</p></div>
                  <div className="flex gap-2 flex-wrap">{content.content_pillars?.map((p: string, i: number) => <span key={i} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">{p}</span>)}</div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="tiers" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {content.membership_tiers?.map((t: any, i: number) => (
                    <Card key={i} className={i === 1 ? "border-primary" : ""}><CardContent className="pt-6 space-y-3">
                      {i === 1 && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Recommended</span>}
                      <h4 className="font-bold">{t.tier_name}</h4>
                      <p className="text-2xl font-bold">${t.price_monthly_usd}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                      <p className="text-sm text-muted-foreground">{t.description}</p>
                      <ul className="space-y-1">{t.benefits?.map((b: string, j: number) => <li key={j} className="text-sm flex items-start gap-2"><span className="text-green-600">✓</span>{b}</li>)}</ul>
                    </CardContent></Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="calendar" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {content.monthly_content_calendar?.map((w: any, i: number) => (
                    <Card key={i}><CardContent className="pt-4 pb-4 space-y-1">
                      <div className="flex items-center gap-2"><span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">Week {w.week}</span><span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{w.content_type}</span></div>
                      <h4 className="font-semibold text-sm">{w.topic}</h4>
                      <p className="text-xs text-muted-foreground">{w.description}</p>
                    </CardContent></Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="welcome" className="space-y-3 mt-4">
                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />
                  {content.welcome_sequence?.map((e: any, i: number) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-3.5 top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                      <Card><CardContent className="pt-4 pb-4 space-y-1">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">Day {e.day}</span>
                        <h4 className="font-semibold text-sm">{e.title}</h4>
                        <p className="text-xs text-muted-foreground">{e.body_summary}</p>
                      </CardContent></Card>
                    </div>
                  ))}
                </div>
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
              nodeId="BA-12"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
        )}
      </div>
    </div>
  );
}
