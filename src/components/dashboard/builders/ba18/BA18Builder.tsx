import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Handshake, Users, Mail, ListChecks } from "lucide-react";
import { StepHeader, AbbyCard, LoadingStep, SummaryCard, SuccessCheckmark } from "../ba-shared/BABuilderShared";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";

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

  useEffect(() => {
    if (!authorId) return;
    (async () => {
      const { data: profile } = await supabase.from("author_profiles").select("pen_name, author_slug").eq("id", authorId).single();
      setAuthorName(profile?.pen_name || "there");
      setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));
      const { data: ctx } = await supabase.from("author_context").select("book_title").eq("author_id", authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      setBookTitle(ctx?.book_title || ""); setHasContext(!!ctx?.book_title);
      const { data: node } = await supabase.from("author_nodes").select("content_json, status").eq("author_id", authorId).eq("node_id", "BA-18").maybeSingle();
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
      const { data, error: fnErr } = await supabase.functions.invoke("generate-ba18-jv-partnerships", { body: { author_id: authorId } });
      if (fnErr || !data?.success) throw new Error(data?.error || fnErr?.message || "Generation failed");
      setContent(data.content); setStep(2);
    } catch (e: any) { setError(e.message); setStep(0); }
  };

  const handlePublish = async () => {
    setStep(3);
    setError(null);
    try {
      await publishNodeToSite(authorId!, "BA-18", authorSlug);
      setContent((prev: any) => ({ ...prev, activated: true }));
    } catch (e: any) {
      setError(e.message);
      setStep(2);
    }
  };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <StepHeader nodeId="BA-18" nodeName="JV Partnerships" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's build your JV Partnerships</h2>
            {hasContext === false ? (
              <><p className="text-muted-foreground mb-4">Hi {authorName}! Please complete your book profile first.</p><Button onClick={() => navigate("/my-books?returnTo=/node-builder/BA-18")}>Complete Book Profile</Button></>
            ) : (
              <><p className="text-muted-foreground mb-4">Hi {authorName}! Joint venture partnerships with complementary authors and experts can 10x your reach overnight. I'm going to design your complete JV partnership strategy — with ideal partner profiles, a partnership pitch, and a revenue share structure. Ready to find your JV partners?</p>
                <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}><Sparkles className="h-4 w-4 mr-2" /> Build My JV Strategy</Button></>
            )}
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <LoadingStep messages={GEN_MSGS} msgIndex={msgIndex} />}
        {step === 2 && content && (
          <div className="space-y-4">
            <AbbyCard><p className="text-muted-foreground">{content.abby_summary}</p></AbbyCard>
            <Tabs defaultValue="strategy" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="strategy" className="text-xs py-2"><Handshake className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Strategy</TabsTrigger>
                <TabsTrigger value="partners" className="text-xs py-2"><Users className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Partners</TabsTrigger>
                <TabsTrigger value="pitch" className="text-xs py-2"><Mail className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Pitch</TabsTrigger>
                <TabsTrigger value="checklist" className="text-xs py-2"><ListChecks className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Checklist</TabsTrigger>
              </TabsList>
              <TabsContent value="strategy" className="space-y-3 mt-4">
                <h3 className="font-bold">{content.jv_strategy_title}</h3>
                {content.partnership_types?.map((pt: any, i: number) => (
                  <Card key={i}><CardContent className="pt-4 pb-4 space-y-1">
                    <h4 className="font-bold text-sm">{pt.type}</h4>
                    <p className="text-sm text-muted-foreground">{pt.description}</p>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{pt.revenue_model}</span>
                  </CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="partners" className="space-y-3 mt-4">
                {content.ideal_partner_profiles?.map((p: any, i: number) => (
                  <Card key={i}><CardContent className="pt-4 pb-4 space-y-2">
                    <h4 className="font-bold text-sm">{p.profile_type}</h4>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                    <div className="flex gap-2 flex-wrap">{p.examples?.map((e: string, j: number) => <span key={j} className="text-xs bg-muted px-2 py-0.5 rounded">{e}</span>)}</div>
                    <p className="text-xs text-primary">{p.why_good_fit}</p>
                  </CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="pitch" className="space-y-4 mt-4">
                <Card className="border-primary/20"><CardContent className="pt-6 space-y-3">
                  <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Subject</p><p className="font-semibold text-sm">{content.partnership_pitch?.subject_line}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Opening</p><p className="text-sm">{content.partnership_pitch?.opening}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Value Proposition</p><p className="text-sm">{content.partnership_pitch?.value_proposition}</p></div>
                  <div className="bg-primary/5 rounded-lg p-3"><p className="text-xs font-semibold text-muted-foreground mb-1">Revenue Share</p><p className="text-sm font-medium">{content.partnership_pitch?.revenue_share}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Call to Action</p><p className="text-sm">{content.partnership_pitch?.call_to_action}</p></div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="checklist" className="space-y-3 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  {content.outreach_checklist?.map((item: string, i: number) => (
                    <label key={i} className="flex items-start gap-3 cursor-pointer">
                      <Checkbox checked={!!checkedItems[i]} onCheckedChange={(checked) => setCheckedItems(prev => ({ ...prev, [i]: !!checked }))} />
                      <span className={`text-sm ${checkedItems[i] ? "line-through text-muted-foreground" : ""}`}>{item}</span>
                    </label>
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
        {step === 3 && !content?.activated && <LoadingStep messages={ACT_MSGS} msgIndex={msgIndex} />}
        {step === 3 && content?.activated && (
          <PublishSuccessScreen
              nodeId="BA-18"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
        )}
      </div>
    </div>
  );
}
