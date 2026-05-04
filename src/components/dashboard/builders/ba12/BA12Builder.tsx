import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthReady } from "@/hooks/useAuthReady";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, Users, Crown, CalendarDays, Mail } from "lucide-react";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import BANodeDownloadCard from "@/components/dashboard/builders/shared/BANodeDownloadCard";
import ExportPackageCard from "@/components/dashboard/builders/shared/ExportPackageCard";
import { publishNodeToSite } from "@/lib/publish-node";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";
import { normaliseMembership, isLegacyMembership } from "./normalise";

const STEPS = ["Introduction", "Generating", "Review", "Publish"];
const GEN_MSGS = ["Designing your membership community...", "Creating membership tiers and benefits...", "Building your content calendar...", "Writing your welcome sequence...", "Finalising your membership blueprint..."];
const ACT_MSGS = ["Setting up your membership tiers...", "Creating payment links for each tier...", "Configuring your welcome emails...", "Your membership is almost ready..."];

interface Props { authorId: string | null; bookId?: string | null; }

export default function BA12Builder({ authorId, bookId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const { isReady: isAuthReady } = useAuthReady();
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [priceOverride, setPriceOverride] = useState<number | null>(null);
  const [authorSlug, setAuthorSlug] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading } = useAuthorBook();
  const [resolvedBookTitle, setResolvedBookTitle] = useState<string>("");

  useEffect(() => {
    if (!isAuthReady || !authorId) return;
    (async () => {
      const { data: profile } = await supabase.from("author_profiles").select("pen_name, author_slug, user_id").eq("id", authorId).single();
      setAuthorName(profile?.pen_name || "there");
      setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));
      const { resolveBookTitle } = await import("@/lib/resolve-book-title");
      const _title = await resolveBookTitle(authorId, bookId ?? null, profile?.user_id);
      if (_title) setResolvedBookTitle(_title);
      const __draft = await loadBuilderDraft(authorId, "BA-12", bookId ?? null);
      if (__draft.content) {
        const wasLegacy = isLegacyMembership(__draft.content);
        const normalised = normaliseMembership(__draft.content);
        setContent(normalised);
        setPriceOverride(Number(normalised?.tiers?.[0]?.price ?? 27));
        { const _saved = (__draft.content as any)?._currentStep; setStep(__draft.isLive ? (3) : (typeof _saved === "number" ? _saved : Math.max(__draft.currentStep, 2))); }
        if (wasLegacy) {
          void autosaveBuilderDraft({ authorId, nodeId: "BA-12", nodeName: "Memberships", content: { ...(normalised), _currentStep: (__draft.currentStep ?? 2) }, currentStep: __draft.currentStep ?? 2, bookId: bookId ?? null });
        }
      }
          setHydrated(true);
})();
  }, [authorId, isAuthReady]);

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
      const { data, error: fnErr } = await supabase.functions.invoke("generate-ba12-membership", { body: { author_id: authorId, book_id: bookId ?? null } });
      if (fnErr || !data?.success) throw new Error(data?.error || fnErr?.message || "Generation failed");
      const normalised = normaliseMembership(data.content || {});
      setContent(normalised); setPriceOverride(Number(normalised.tiers?.[0]?.price ?? 27)); setStep(2);
      void autosaveBuilderDraft({ authorId: authorId!, nodeId: "BA-12", nodeName: "Memberships", content: { ...(normalised), _currentStep: 2 }, currentStep: 2, bookId: bookId ?? null });
    } catch (e: any) { setError(e.message); setStep(0); }
  };

  const handlePublish = async () => {
    setError(null);
    try {
      await publishNodeToSite(authorId!, "BA-12", authorSlug);
      setContent((prev: any) => ({ ...prev, activated: true }));
      setStep(3);
      toast.success("Your Membership is live on your site.");
    } catch (e: any) {
      setError(e.message);
      toast.error(`Publish failed: ${e.message ?? "Unknown error"}`);
    }
  };

  if (isAuthReady && authorId && !hydrated) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-background">

        <p className="text-muted-foreground">Loading…</p>

      </div>

    );

  }

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  const displayBookTitle = (detectedBookTitle && detectedBookTitle !== "your book") ? detectedBookTitle : resolvedBookTitle;
  const isIntroReady = Boolean(authorName && authorName !== "there" && displayBookTitle);
  const noBookFound = !isBookLoading && !hasBook && !resolvedBookTitle && !detectedBookTitle;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-4 py-3"><div className="max-w-3xl mx-auto flex items-center gap-3"><div className="flex-1"><h1 className="text-lg font-semibold">Memberships</h1></div></div></div>
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-2"><div className="flex items-center gap-1">{STEPS.map((label, i) => (<div key={label} className="flex items-center gap-1 flex-1"><div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-muted text-muted-foreground"}`}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</div><span className="text-xs text-muted-foreground hidden sm:inline truncate">{label}</span>{i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}</div>))}</div></div>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard><h2 className="text-xl font-bold mb-3">Let's build your Membership Community</h2>
            {noBookFound ? (
              <>
                <p className="text-muted-foreground mb-4">Hi {authorName}! Before I design your membership, I need to know about your book. Please complete your book profile first.</p>
                <Button onClick={() => navigate(`/my-books?returnTo=${encodeURIComponent(`/node-builder/BA-12${bookId ? `?bookId=${bookId}` : ""}`)}`)}>Complete Book Profile</Button>
              </>
            ) : !isIntroReady ? (
              <p className="text-muted-foreground mb-4">Loading your book details…</p>
            ) : (
              <><p className="text-muted-foreground mb-4">Hi {authorName}! A membership community gives you recurring monthly income from your most engaged readers. I'll design a membership programme based on '{displayBookTitle}' — with tiers, benefits, and a content calendar. Ready?</p><div className="relative z-20"><Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}><Sparkles className="h-4 w-4 mr-2" /> Design My Membership</Button></div></>
            )}
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}
        {step === 1 && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{GEN_MSGS[msgIndex]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /><p className="text-xs text-muted-foreground">Abby usually takes 20–40 seconds</p></div></AbbyCard>}
        {step === 2 && content && (
          <div className="space-y-4">
            <AbbyCard><p className="text-muted-foreground">{content.abby_summary}</p></AbbyCard>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-3 h-auto">
                <TabsTrigger value="overview" className="text-xs py-2"><Crown className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Overview</TabsTrigger>
                <TabsTrigger value="tiers" className="text-xs py-2"><Users className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Tiers</TabsTrigger>
                <TabsTrigger value="calendar" className="text-xs py-2"><CalendarDays className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Calendar</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card><CardContent className="pt-6 space-y-3">
                  <h3 className="text-xl font-bold">{content.membership_title}</h3>
                  {content.tagline && <p className="text-sm font-semibold text-primary italic">"{content.tagline}"</p>}
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Who It's For</p><p className="text-sm">{content.who_its_for}</p></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Transformation Promise</p><p className="text-sm">{content.transformation_promise}</p></div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="tiers" className="space-y-4 mt-4">
                {content.tiers?.map((t: any, i: number) => (
                  <Card key={i}><CardContent className="pt-6 space-y-2">
                    <h4 className="font-bold">{t.name} — ${t.price}/mo</h4>
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                    <ul className="space-y-1">{t.benefits?.map((b: string, j: number) => <li key={j} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />{b}</li>)}</ul>
                  </CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="calendar" className="space-y-4 mt-4">
                {(() => {
                  const asText = (v: unknown): string =>
                    typeof v === "string"
                      ? v
                      : v == null
                      ? ""
                      : (() => { try { return JSON.stringify(v, null, 2); } catch { return String(v); } })();
                  const calendarText = asText(content.content_calendar);
                  const newsletterText = asText(content.monthly_newsletter_template).trim();
                  const emails = Array.isArray(content.welcome_emails) ? content.welcome_emails : [];
                  return (
                    <>
                      <Card><CardContent className="pt-6 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Monthly Rhythm</p>
                        <p className="text-sm whitespace-pre-line">{calendarText || "Content calendar details will appear here."}</p>
                      </CardContent></Card>
                      {newsletterText && (
                        <Card><CardContent className="pt-6 space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground">Monthly Newsletter Template</p>
                          <p className="text-sm whitespace-pre-line">{newsletterText}</p>
                        </CardContent></Card>
                      )}
                      {emails.length > 0 && (
                        <Card><CardContent className="pt-6 space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground">Welcome Sequence</p>
                          <ul className="space-y-3">
                            {emails.map((e: any, i: number) => {
                              const subject = asText(e?.subject).trim();
                              const body = asText(e?.body).trim();
                              const day = e?.day;
                              return (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <Mail className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                  <div className="min-w-0">
                                    <p className="font-semibold">{day != null ? `Day ${day}` : `Email ${i + 1}`}{subject ? ` — ${subject}` : ""}</p>
                                    {body && <p className="text-muted-foreground whitespace-pre-line">{body}</p>}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </CardContent></Card>
                      )}
                    </>
                  );
                })()}
              </TabsContent>
            </Tabs>
            <ExportPackageCard
              content={content}
              nodeName="Membership"
              bookTitle={(detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : resolvedBookTitle) || "Authors-Bureau"}
              authorName={authorName}
              guidance="Export your full membership package — tiers, benefits, content calendar. Upload to Circle, Mighty Networks, Kajabi, or any community platform."
            />
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => toast.info("Manual editing coming soon.")}>Edit</Button>
              <Button className="flex-1" size="lg" onClick={handlePublish}>Publish to My Site<ArrowRight className="h-4 w-4 ml-2" /></Button>
            </div>
          </div>
        )}
        {step === 3 && !content?.activated && <AbbyCard><div className="space-y-4"><p className="text-muted-foreground font-medium animate-pulse">{ACT_MSGS[msgIndex % ACT_MSGS.length]}</p><Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" /><p className="text-xs text-muted-foreground">Abby usually takes 20–40 seconds</p></div></AbbyCard>}
        {step === 3 && content?.activated && (
          <>
            <PublishSuccessScreen nodeId="BA-12" authorName={authorName} penNameSlug={authorSlug} />
            <BANodeDownloadCard content={content} nodeName="Membership" bookTitle={(detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : resolvedBookTitle) || "Authors-Bureau"} authorName={authorName} guidance="Your membership package is ready. Download it and upload it to Teachable, Kajabi, Thinkific, or any platform of your choice to start earning recurring revenue from your community." />
          </>
        )}
      </div>
    </div>
  );
}

function AbbyCard({ children }: { children: React.ReactNode }) {
  return <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-6"><div className="flex gap-3"><div className="shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"><Sparkles className="h-5 w-5 text-primary" /></div><div className="flex-1 min-w-0">{children}</div></div></CardContent></Card>;
}
