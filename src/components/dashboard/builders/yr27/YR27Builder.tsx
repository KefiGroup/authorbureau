import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthReady } from "@/hooks/useAuthReady";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ArrowRight, Heart, Gift, Mail, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { StepHeader, AbbyCard, LoadingStep, MultiPaymentLinks, SummaryCard, SuccessCheckmark } from "../shared/CategoryBuilderShared";
import PublishSuccessScreen from "../shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";
import { getMicrositeUrl } from "@/lib/node-slug-map";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";
import { YRSafeBoundary, SafeText } from "../shared/YRSafeBoundary";

const GEN_MSGS = ["Designing your fundraising campaign...", "Creating donation tiers...", "Building your communication plan...", "Finalising your campaign..."];
const ACT_MSGS = ["Creating donation payment links...", "Almost ready..."];
interface Props { authorId: string | null; bookId?: string | null; }

export default function YR27Builder({ authorId, bookId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const { isReady: isAuthReady } = useAuthReady();
  const [authorName, setAuthorName] = useState("");
  const [authorSlug, setAuthorSlug] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading } = useAuthorBook();

  useEffect(() => { if (!isAuthReady || !authorId) return; (async () => {
    const { data: p } = await supabase.from("author_profiles").select("pen_name, author_slug, user_id").eq("id", authorId).single();
    setAuthorName(p?.pen_name || "there");
    setAuthorSlug(p?.author_slug || "");
    if (detectedBookTitle && detectedBookTitle !== "your book") {
      setBookTitle(detectedBookTitle);
    } else {
      const { resolveBookTitle: _rbt } = await import("@/lib/resolve-book-title");
      const _t = await _rbt(authorId, bookId ?? null, p?.user_id);
      if (_t) setBookTitle(_t);
    }
    const __draft = await loadBuilderDraft(authorId, "YR-27", bookId ?? null);
      if (__draft.content) {
        setContent(__draft.content);
        { const _saved = (__draft.content as any)?._currentStep; setStep(__draft.isLive ? (3) : (typeof _saved === "number" ? _saved : Math.max(__draft.currentStep, 2))); }
      }
    })(); }, [authorId, detectedBookTitle, isAuthReady]);

  useEffect(() => { if (step === 1 || (step === 3 && !content?.activated)) { const msgs = step === 1 ? GEN_MSGS : ACT_MSGS; setMsgIndex(0); intervalRef.current = setInterval(() => setMsgIndex(i => (i + 1) % msgs.length), 3000); return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; } }, [step]);
  useEffect(() => { if (step === 2 && content) console.log("[YR-27] step-2 render", content); }, [step, content]);

  const handleGenerate = async () => { setStep(1); setError(null); try { const { data, error: e } = await supabase.functions.invoke("generate-yr27-fundraising", { body: { author_id: authorId, book_id: bookId ?? null } }); if (e || !data?.success) throw new Error(data?.error || e?.message || "Failed"); setContent(data.content); setStep(2); void autosaveBuilderDraft({ authorId: authorId!, nodeId: "YR-27", nodeName: "Fund Raising", content: { ...(data.content), _currentStep: 2 }, currentStep: 2, bookId: bookId ?? null }); } catch (e: any) { setError(e.message); setStep(0); } };
  const handlePublish = async () => { setStep(3); setError(null); try { await publishNodeToSite(authorId!, "YR-27", authorSlug); setContent((p: any) => ({ ...p, activated: true })); } catch (e: any) { setError(e.message); setStep(2); } };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <StepHeader nodeId="YR-27" nodeName="Fundraising" step={step} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (<AbbyCard><h2 className="text-xl font-bold mb-3">Let's launch your Fundraising Campaign</h2><p className="text-muted-foreground mb-4">Hi {authorName}! Fundraising connects your platform to a cause greater than yourself — and builds deep loyalty with your audience. I'm going to design a complete fundraising campaign based on '{bookTitle || "your book"}' — with a campaign concept, donation tiers, and a donor communication plan. Ready to make an impact?</p><Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}>Build My Campaign</Button>{error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}</div>}</AbbyCard>)}
        {step === 1 && <LoadingStep messages={GEN_MSGS} msgIndex={msgIndex} />}
        {step === 2 && content && (
          <YRSafeBoundary nodeId="YR-27" debugContent={content} onReset={() => { setContent(null); setStep(0); }}>
          <div className="space-y-4">
            <AbbyCard><div className="text-muted-foreground"><SafeText value={content.abby_summary} /></div></AbbyCard>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="overview" className="text-xs py-2"><Heart className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Overview</TabsTrigger>
                <TabsTrigger value="tiers" className="text-xs py-2"><Gift className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Tiers</TabsTrigger>
                <TabsTrigger value="comms" className="text-xs py-2"><Mail className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Comms Plan</TabsTrigger>
                <TabsTrigger value="settings" className="text-xs py-2"><Settings2 className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h3 className="text-xl font-bold">{content.campaign_title}</h3>
                  {content.tagline && <p className="text-sm font-semibold text-primary italic">"{content.tagline}"</p>}
                  <p className="text-sm">{content.cause_alignment}</p>
                  <div className="flex gap-4"><div className="bg-muted/30 p-3 rounded flex-1"><p className="text-xs font-semibold text-muted-foreground">Goal</p><p className="text-lg font-bold">${content.campaign_goal_usd?.toLocaleString()}</p></div><div className="bg-muted/30 p-3 rounded flex-1"><p className="text-xs font-semibold text-muted-foreground">Duration</p><p className="text-lg font-bold">{content.campaign_duration_days} days</p></div></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Impact Statement</p><p className="text-sm font-medium">{content.impact_statement}</p></div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="tiers" className="space-y-3 mt-4">
                {content.donation_tiers?.map((t: any, i: number) => (
                  <Card key={i}><CardContent className="pt-6 flex items-center justify-between">
                    <div><h4 className="font-bold">{t.tier_name}</h4><SafeText value={t.benefit} className="text-muted-foreground" /></div>
                    <span className="text-xl font-bold">${t.amount_usd}</span>
                  </CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="comms" className="space-y-3 mt-4">
                <div className="relative pl-6 border-l-2 border-primary/20">
                  {content.donor_communication_plan?.map((c: any, i: number) => (
                    <div key={i} className="relative mb-6 last:mb-0">
                      <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-primary" />
                      <Card><CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-2 mb-1"><span className="text-xs bg-muted px-2 py-0.5 rounded-full">Day {c.day}</span><span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{c.type}</span></div>
                        <h4 className="font-bold text-sm">{c.subject}</h4>
                        <SafeText value={c.summary} className="text-muted-foreground" />
                      </CardContent></Card>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="settings" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Charity / Beneficiary Name</p>
                    <Input
                      value={content.charity_name || ""}
                      placeholder="e.g. Make-A-Wish Foundation"
                      onChange={(e) => {
                        const next = { ...content, charity_name: e.target.value };
                        setContent(next);
                        if (authorId) void autosaveBuilderDraft({ authorId, nodeId: "YR-27", nodeName: "Fund Raising", content: { ...(next), _currentStep: 2 }, currentStep: 2, bookId: bookId ?? null });
                      }}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">Shown on the donate button: "Donate to {`{this name}`}"</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">External Donation Link (URL)</p>
                    <Input
                      type="url"
                      value={content.external_donation_url || ""}
                      placeholder="https://www.gofundme.com/your-campaign"
                      onChange={(e) => {
                        const next = { ...content, external_donation_url: e.target.value };
                        setContent(next);
                        if (authorId) void autosaveBuilderDraft({ authorId, nodeId: "YR-27", nodeName: "Fund Raising", content: { ...(next), _currentStep: 2 }, currentStep: 2, bookId: bookId ?? null });
                      }}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">Donations go directly to your charity. Authors Bureau does not collect or hold donation funds — paste the charity's own donation page (GoFundMe, PayPal Giving Fund, the charity's website, etc.).</p>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Campaign Goal (USD, display only)</p>
                    <Input type="number" defaultValue={content.campaign_goal_usd} className="max-w-xs" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Campaign Duration (days, display only)</p>
                    <Input type="number" defaultValue={content.campaign_duration_days} className="max-w-xs" />
                  </div>
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
              nodeId="YR-27"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
          </div>
        )}
      </div>
    </div>
  );
}
