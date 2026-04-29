import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchWithTimeout, getActiveToken } from "@/lib/get-active-token";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Sparkles, ArrowLeft, ArrowRight, ShoppingBag, Mic, BookOpen, Briefcase, Users,
  Download, Copy, FileText, Presentation, AlertTriangle,
} from "lucide-react";
import { categoryStyles } from "../shared/BuilderTheme";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import BuilderIntroBlock, { BP_INTRO_SPECS, BackToReviewLink } from "@/components/dashboard/builders/shared/BuilderIntroBlock";
import BuilderHeader from "@/components/dashboard/builders/shared/BuilderHeader";
import UnifiedStepper from "@/components/dashboard/builders/shared/UnifiedStepper";
import NodeHowItWorks from "@/components/dashboard/builders/shared/NodeHowItWorks";
import { publishNodeToSite } from "@/lib/publish-node";
import { toAbbyError } from "@/lib/abby-error";
import { autosaveBuilderDraft, loadBuilderDraft } from "@/lib/builder-autosave";
import { startGeneration, getGeneration } from "@/lib/builder-generation-registry";

const STEPS = ["Introduction", "Generating", "Review", "Publish"];
const GEN_MSGS = [
  "Studying your book's core framework...",
  "Drafting your workshop talk + slide deck...",
  "Writing book-signing Q&A and inscription templates...",
  "Building your corporate lunch pitch + bulk proposal...",
  "Polishing scripts, bios, and objection responses...",
];
const ACT_MSGS = ["Saving your toolkit...", "Marking node ready...", "Almost there..."];

interface Props { authorId: string | null; bookId?: string | null; }

function isLegacyShape(c: any): boolean {
  if (!c) return false;
  return !!c.event_types && !c.workshop;
}

export default function BP09Builder({ authorId, bookId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [authorSlug, setAuthorSlug] = useState("");
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [downloading, setDownloading] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading } = useAuthorBook();
  const [resolvedBookTitle, setResolvedBookTitle] = useState<string>("");
  const hasResolvedBook = hasBook || Boolean(resolvedBookTitle) || Boolean(detectedBookTitle && detectedBookTitle !== "your book");

  useEffect(() => {
    if (!authorId) return;
    (async () => {
      const { data: profile } = await supabase.from("author_profiles").select("pen_name, author_slug, user_id").eq("id", authorId).single();
      setAuthorName(profile?.pen_name || "there");
      setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));
      const { data: ctx } = await supabase.from("author_context").select("book_title").eq("author_id", authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (ctx?.book_title) setResolvedBookTitle(ctx.book_title);
      else {
        const { data: book } = await supabase.from("books").select("title").eq("author_id", profile?.user_id || authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (book?.title) setResolvedBookTitle(book.title);
      }

      const inflight = getGeneration<any>(authorId, "BP-09");
      if (inflight) { setStep(1); attachToGeneration(inflight); return; }

      const draft = await loadBuilderDraft(authorId, "BP-09", bookId ?? null);
      const cj = draft.content as any;
      if (cj && Object.keys(cj).length > 0) {
        setContent(cj);
        const savedStep = Number(cj?._currentStep ?? draft.currentStep ?? (draft.isLive ? 3 : 2));
        setStep(Math.min(3, Math.max(2, savedStep)));
        if (draft.isLive) setContent((p: any) => ({ ...p, activated: true }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId]);

  useEffect(() => {
    if (step === 1 || (step === 3 && !content?.activated)) {
      const msgs = step === 1 ? GEN_MSGS : ACT_MSGS;
      setMsgIndex(0);
      intervalRef.current = setInterval(() => setMsgIndex((i) => (i + 1) % msgs.length), 3000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [step, content?.activated]);

  const runGeneration = async () => {
    let token = await getActiveToken();
    if (!token) { await supabase.auth.refreshSession().catch(() => null); token = await getActiveToken(); }
    if (!token) throw new Error("We couldn't verify your sign-in. Please refresh and try again.");
    const res = await fetchWithTimeout(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-bp09-speaking`,
      { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ author_id: authorId }) },
      180_000,
    );
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) throw new Error(data?.error || `Request failed (${res.status})`);
    const newContent = { ...(data.content || {}), _currentStep: 2 };
    if (authorId) await autosaveBuilderDraft({ authorId, nodeId: "BP-09", nodeName: "Live Audience Toolkit", content: newContent, currentStep: 2, bookId: bookId ?? null });
    return newContent;
  };

  const attachToGeneration = async (promise: Promise<any>) => {
    try { const newContent = await promise; setContent(newContent); setStep(2); }
    catch (e: any) {
      const msg = toAbbyError(e?.message || "Generation failed");
      setError(msg); setStep(0); toast.error(msg, { duration: 12000 });
    }
  };

  const handleGenerate = async () => {
    if (!authorId) return;
    setStep(1); setError(null);
    const promise = startGeneration(authorId, "BP-09", runGeneration);
    await attachToGeneration(promise);
  };

  const handlePublish = async () => {
    setStep(3); setError(null);
    try {
      if (content && authorId) {
        const merged = { ...content, _currentStep: 3 };
        await autosaveBuilderDraft({ authorId, nodeId: "BP-09", nodeName: "Live Audience Toolkit", content: merged, currentStep: 3, bookId: bookId ?? null });
        setContent(merged);
      }
      await publishNodeToSite(authorId!, "BP-09", authorSlug);
      setContent((prev: any) => ({ ...prev, activated: true }));
    } catch (e: any) {
      const msg = toAbbyError(e?.message || "Publish failed");
      setError(msg); toast.error(msg, { duration: 12000 }); setStep(2);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copied`); }
    catch { toast.error("Couldn't copy — please copy manually"); }
  };

  const downloadSlides = async (deck: "workshop" | "corporate_lunch") => {
    if (!authorId) return;
    setDownloading(`slides-${deck}`);
    try {
      const token = await getActiveToken();
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-bp09-slides`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ author_id: authorId, deck }) },
        90_000,
      );
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || "Export failed");
      // Decode base64 to blob
      const binary = atob(data.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = data.filename; a.click();
      URL.revokeObjectURL(url);
      toast.success("Slide deck downloaded");
    } catch (e: any) {
      toast.error(toAbbyError(e?.message || "Download failed"));
    } finally { setDownloading(null); }
  };

  const downloadDoc = async (document: "handout" | "bulk_proposal") => {
    if (!authorId) return;
    setDownloading(`doc-${document}`);
    try {
      const token = await getActiveToken();
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-bp09-handout`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ author_id: authorId, document }) },
        60_000,
      );
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || "Export failed");
      const blob = new Blob([data.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a"); a.href = url; a.download = data.filename; a.click();
      URL.revokeObjectURL(url);
      toast.success("Document downloaded — open in browser to print as PDF");
    } catch (e: any) {
      toast.error(toAbbyError(e?.message || "Download failed"));
    } finally { setDownloading(null); }
  };

  if (!authorId) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Please set up your author profile first.</p></div>;

  const legacy = isLegacyShape(content);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        <BuilderHeader
          nodeId="BP-09"
          title="Book Sales"
          subtitle="Live Audience Conversion Toolkit · Webinars · Workshops · Book signings · Corporate lunches"
          icon={Mic}
          onBack={() => navigate(bookId ? `/book-hub/${bookId}?tab=revenue-streams` : "/dashboard?section=my-books")}
        />
        <UnifiedStepper nodeId="BP-09" steps={STEPS} current={step} onStepClick={(i) => { if (i <= step) setStep(i); }} />
      </div>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <NodeHowItWorks nodeId="BP-09" />

        {step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's build your Live Audience Toolkit</h2>
            {!isBookLoading && !hasResolvedBook ? (
              <>
                <p className="text-muted-foreground mb-4">Hi {authorName}! Before I build your toolkit, I need to know about your book. Please complete your book profile first.</p>
                <Button onClick={() => navigate("/my-books?returnTo=/node-builder/BP-09")}>Complete Book Profile</Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-4">
                  Hi {authorName}! Most book sales at live events come down to one thing: did the author walk in with the right pitch, slides, and scripts? I'll build the complete field kit for "{(detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : resolvedBookTitle) || "your book"}" — workshop deck, signing-table scripts, corporate lunch pitch, bulk-order proposal, and your bio in 3 lengths. All downloadable. Ready?
                </p>
                <div className="mb-4"><BuilderIntroBlock spec={BP_INTRO_SPECS["BP-09"]} /></div>
                <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate} disabled={isBookLoading && !hasResolvedBook}>
                  <Sparkles className="h-4 w-4 mr-2" /> Build My Toolkit
                </Button>
              </>
            )}
            {error && <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{toAbbyError(error)}<Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button></div>}
          </AbbyCard>
        )}

        {step === 1 && (
          <AbbyCard>
            <div className="space-y-4">
              <p className="text-muted-foreground font-medium animate-pulse">{GEN_MSGS[msgIndex]}</p>
              <Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" />
              <p className="text-xs text-muted-foreground">Abby usually takes 60–120 seconds for this one — there's a lot to draft.</p>
            </div>
          </AbbyCard>
        )}

        {step === 2 && content && (
          <div className="space-y-4">
            {legacy && (
              <Card className="border-amber-500/40 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold mb-1">We've upgraded BP-09 to a Live Audience Toolkit</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        Your existing event sales kit is preserved, but the new toolkit gives you slide decks (.pptx), signing scripts, and a corporate lunch pitch. Regenerate to upgrade.
                      </p>
                      <Button size="sm" onClick={handleGenerate}><Sparkles className="h-4 w-4 mr-1.5" /> Regenerate as new toolkit</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {content.kit_title && (
              <AbbyCard>
                <h3 className="text-lg font-bold mb-1">{content.kit_title}</h3>
                {content.tagline && <p className="text-sm italic text-primary mb-2">"{content.tagline}"</p>}
                {content.abby_summary && <p className="text-sm text-muted-foreground">{content.abby_summary}</p>}
              </AbbyCard>
            )}

            <Tabs defaultValue="workshop" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="workshop" className="text-xs py-2"><Presentation className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Workshop</TabsTrigger>
                <TabsTrigger value="signing" className="text-xs py-2"><BookOpen className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Signing</TabsTrigger>
                <TabsTrigger value="corporate" className="text-xs py-2"><Briefcase className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Corporate</TabsTrigger>
                <TabsTrigger value="shared" className="text-xs py-2"><Users className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Shared</TabsTrigger>
              </TabsList>

              {/* WORKSHOP */}
              <TabsContent value="workshop" className="space-y-4 mt-4">
                <WorkshopTab
                  data={content.workshop || {}}
                  onChange={(w) => setContent({ ...content, workshop: { ...(content.workshop || {}), ...w } })}
                  onDownloadDeck={() => downloadSlides("workshop")}
                  onDownloadHandout={() => downloadDoc("handout")}
                  downloading={downloading}
                  onCopy={copyToClipboard}
                />
              </TabsContent>

              {/* SIGNING */}
              <TabsContent value="signing" className="space-y-4 mt-4">
                <SigningTab data={content.book_signing || {}} onCopy={copyToClipboard} />
              </TabsContent>

              {/* CORPORATE */}
              <TabsContent value="corporate" className="space-y-4 mt-4">
                <CorporateTab
                  data={content.corporate_lunch || {}}
                  onDownloadDeck={() => downloadSlides("corporate_lunch")}
                  onDownloadProposal={() => downloadDoc("bulk_proposal")}
                  downloading={downloading}
                  onCopy={copyToClipboard}
                />
              </TabsContent>

              {/* SHARED */}
              <TabsContent value="shared" className="space-y-4 mt-4">
                <SharedTab data={content.shared_assets || {}} onCopy={copyToClipboard} />
              </TabsContent>
            </Tabs>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="ghost" className="sm:w-auto" onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button className="flex-1" size="lg" onClick={handlePublish}>
                Mark Toolkit Ready <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">This is a private author toolkit, not a public page. You can keep editing or download anytime.</p>
          </div>
        )}

        {step === 3 && !content?.activated && (
          <AbbyCard>
            <div className="space-y-4">
              <p className="text-muted-foreground font-medium animate-pulse">{ACT_MSGS[msgIndex % ACT_MSGS.length]}</p>
              <Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" />
            </div>
          </AbbyCard>
        )}
        {step === 3 && content?.activated && (
          <>
            <PublishSuccessScreen
              nodeId="BP-09"
              authorName={authorName}
              penNameSlug={authorSlug}
              abbyMessage={`Your toolkit is saved here in your Brand Products library. Re-open BP-09 anytime to download the .pptx slide decks (workshop + corporate lunch), the printable PDF handout and bulk-order proposal, and copy the scripts, Q&A seeds, inscriptions and bios. Nothing is published publicly — this is your private field kit for live events.`}
            />
            <BackToReviewLink onClick={() => setStep(2)} />
          </>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────  WORKSHOP TAB  ────────────────────────── */
function WorkshopTab({ data, onChange, onDownloadDeck, onDownloadHandout, downloading, onCopy }: {
  data: any;
  onChange: (d: any) => void;
  onDownloadDeck: () => void;
  onDownloadHandout: () => void;
  downloading: string | null;
  onCopy: (text: string, label: string) => void;
}) {
  return (
    <>
      <Card><CardContent className="pt-6 space-y-3">
        <h4 className="font-bold flex items-center gap-2"><FileText className="h-4 w-4" /> Talk outline (60–90 min)</h4>
        <div className="space-y-2">
          {(data.talk_outline || []).map((s: any, i: number) => (
            <div key={i} className="p-3 rounded-md bg-muted/30 border border-border">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-sm">{s.section}</p>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{s.duration_min} min</span>
              </div>
              <p className="text-sm text-foreground/90">{s.content}</p>
              {s.speaker_notes && <p className="text-xs italic text-muted-foreground mt-1.5">📌 {s.speaker_notes}</p>}
            </div>
          ))}
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold">Pitch script — 3-min transition</h4>
          <Button size="sm" variant="ghost" onClick={() => onCopy(data.pitch_script || "", "Pitch script")}><Copy className="h-3.5 w-3.5 mr-1" /> Copy</Button>
        </div>
        <Textarea
          value={data.pitch_script || ""}
          onChange={(e) => onChange({ pitch_script: e.target.value })}
          rows={8}
          className="text-sm font-mono"
        />
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold flex items-center gap-2"><Presentation className="h-4 w-4" /> Slide deck ({(data.slides || []).length} slides)</h4>
          <Button size="sm" onClick={onDownloadDeck} disabled={downloading === "slides-workshop"}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {downloading === "slides-workshop" ? "Building..." : "Download .pptx"}
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(data.slides || []).map((s: any, i: number) => (
            <div key={i} className="p-2 rounded border border-border bg-muted/20 text-xs">
              <p className="font-semibold truncate">#{s.n} — {s.title}</p>
              <p className="text-muted-foreground line-clamp-2 mt-1">{s.body}</p>
            </div>
          ))}
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold">Back-of-room close</h4>
          <Button size="sm" variant="ghost" onClick={() => onCopy(data.back_of_room_close || "", "Close script")}><Copy className="h-3.5 w-3.5 mr-1" /> Copy</Button>
        </div>
        <p className="text-sm whitespace-pre-wrap p-3 bg-muted/30 rounded-md">{data.back_of_room_close}</p>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold">One-page handout</h4>
          <Button size="sm" onClick={onDownloadHandout} disabled={downloading === "doc-handout"}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {downloading === "doc-handout" ? "Building..." : "Download HTML/PDF"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{data.handout_outline}</p>
        <p className="text-xs text-muted-foreground italic">Open the file in your browser → File → Print → Save as PDF.</p>
      </CardContent></Card>
    </>
  );
}

/* ──────────────────────────  SIGNING TAB  ────────────────────────── */
function SigningTab({ data, onCopy }: { data: any; onCopy: (t: string, l: string) => void }) {
  return (
    <>
      <Card><CardContent className="pt-6 space-y-3">
        <h4 className="font-bold">Reading passages (2–3 selections)</h4>
        {(data.reading_passages || []).map((p: any, i: number) => (
          <div key={i} className="p-3 rounded-md bg-muted/30 border border-border">
            <p className="font-semibold text-sm">{p.chapter}</p>
            <p className="text-xs text-muted-foreground mt-1"><strong>Why:</strong> {p.why}</p>
            <p className="text-xs text-muted-foreground mt-1"><strong>Bridge:</strong> {p.bridge_to_next}</p>
          </div>
        ))}
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <h4 className="font-bold">Q&amp;A seed questions (8 pre-planted)</h4>
        {(data.qa_seed_questions || []).map((qa: any, i: number) => (
          <div key={i} className="p-3 rounded-md bg-muted/30 border border-border">
            <p className="font-semibold text-sm">Q{i + 1}: {qa.q}</p>
            <p className="text-sm text-foreground/90 mt-1">{qa.a}</p>
          </div>
        ))}
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold">Signing-table script</h4>
          <Button size="sm" variant="ghost" onClick={() => onCopy(data.signing_table_script || "", "Signing script")}><Copy className="h-3.5 w-3.5 mr-1" /> Copy</Button>
        </div>
        <p className="text-sm whitespace-pre-wrap p-3 bg-muted/30 rounded-md">{data.signing_table_script}</p>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <h4 className="font-bold">Inscription templates</h4>
        {(data.inscription_templates || []).map((t: any, i: number) => (
          <div key={i} className="p-3 rounded-md bg-muted/30 border border-border flex items-start gap-2">
            <div className="flex-1">
              <p className="text-xs font-semibold text-primary uppercase">For {t.for}</p>
              <p className="text-sm italic mt-1">"{t.text}"</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onCopy(t.text, "Inscription")}><Copy className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-bold">Email-capture ask</h4>
          <Button size="sm" variant="ghost" onClick={() => onCopy(data.email_capture_ask || "", "Email ask")}><Copy className="h-3.5 w-3.5 mr-1" /> Copy</Button>
        </div>
        <p className="text-sm whitespace-pre-wrap p-3 bg-muted/30 rounded-md">{data.email_capture_ask}</p>
      </CardContent></Card>
    </>
  );
}

/* ──────────────────────────  CORPORATE TAB  ────────────────────────── */
function CorporateTab({ data, onDownloadDeck, onDownloadProposal, downloading, onCopy }: {
  data: any;
  onDownloadDeck: () => void;
  onDownloadProposal: () => void;
  downloading: string | null;
  onCopy: (t: string, l: string) => void;
}) {
  const bp = data.bulk_proposal || {};
  return (
    <>
      <Card><CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold flex items-center gap-2"><Presentation className="h-4 w-4" /> Corporate pitch deck ({(data.slides || []).length} slides)</h4>
          <Button size="sm" onClick={onDownloadDeck} disabled={downloading === "slides-corporate_lunch"}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {downloading === "slides-corporate_lunch" ? "Building..." : "Download .pptx"}
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(data.slides || []).map((s: any, i: number) => (
            <div key={i} className="p-2 rounded border border-border bg-muted/20 text-xs">
              <p className="font-semibold truncate">#{s.n} — {s.title}</p>
              <p className="text-muted-foreground line-clamp-2 mt-1">{s.body}</p>
            </div>
          ))}
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <h4 className="font-bold">ROI talking points</h4>
        {(data.roi_talking_points || []).map((r: any, i: number) => (
          <div key={i} className="p-3 rounded-md bg-muted/30 border border-border">
            <p className="font-semibold text-sm text-primary">{r.metric}</p>
            <p className="text-sm text-foreground/90 mt-1">{r.framing}</p>
          </div>
        ))}
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold">Bulk-order proposal</h4>
          <Button size="sm" onClick={onDownloadProposal} disabled={downloading === "doc-bulk_proposal"}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {downloading === "doc-bulk_proposal" ? "Building..." : "Download HTML/PDF"}
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {["tier_10", "tier_50", "tier_200"].map((k) => {
            const t = bp[k] || {};
            return (
              <div key={k} className="p-3 rounded-md border border-primary/20 bg-primary/5">
                <p className="text-xs font-semibold text-muted-foreground">{t.books} books</p>
                <p className="text-2xl font-bold text-primary mt-1">${t.price_usd}</p>
                <ul className="mt-2 space-y-1">
                  {(t.includes || []).map((it: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground">• {it}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <h4 className="font-bold">Follow-up emails (HR / L&amp;D contact)</h4>
        {(data.followup_emails || []).map((e: any, i: number) => (
          <div key={i} className="p-3 rounded-md bg-muted/30 border border-border">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-primary">Day {e.day}</p>
              <Button size="sm" variant="ghost" onClick={() => onCopy(`Subject: ${e.subject}\n\n${e.body}`, "Email")}><Copy className="h-3.5 w-3.5" /></Button>
            </div>
            <p className="font-semibold text-sm">{e.subject}</p>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-1">{e.body}</p>
          </div>
        ))}
      </CardContent></Card>
    </>
  );
}

/* ──────────────────────────  SHARED TAB  ────────────────────────── */
function SharedTab({ data, onCopy }: { data: any; onCopy: (t: string, l: string) => void }) {
  const bios: Array<[string, string]> = [
    ["bio_30s", "30-second bio"],
    ["bio_60s", "60-second bio"],
    ["bio_2min", "2-minute bio"],
  ];
  return (
    <>
      {bios.map(([key, label]) => (
        <Card key={key}><CardContent className="pt-6 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold">{label}</h4>
            <Button size="sm" variant="ghost" onClick={() => onCopy(data[key] || "", label)}><Copy className="h-3.5 w-3.5 mr-1" /> Copy</Button>
          </div>
          <p className="text-sm whitespace-pre-wrap p-3 bg-muted/30 rounded-md">{data[key]}</p>
        </CardContent></Card>
      ))}

      <Card><CardContent className="pt-6 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-bold">3-line elevator pitch</h4>
          <Button size="sm" variant="ghost" onClick={() => onCopy(data.elevator_pitch || "", "Elevator pitch")}><Copy className="h-3.5 w-3.5 mr-1" /> Copy</Button>
        </div>
        <p className="text-sm italic whitespace-pre-wrap p-3 bg-primary/5 rounded-md">{data.elevator_pitch}</p>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <h4 className="font-bold">Top 5 objection responses</h4>
        {(data.objection_responses || []).map((o: any, i: number) => (
          <div key={i} className="p-3 rounded-md bg-muted/30 border border-border">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-600 uppercase">"{o.objection}"</p>
                <p className="text-sm mt-1">{o.response}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onCopy(o.response, "Response")}><Copy className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </CardContent></Card>
    </>
  );
}

function AbbyCard({ children }: { children: React.ReactNode }) {
  const s = categoryStyles.brand;
  return (
    <Card className={`${s.border} ${s.bg} ${s.glowShadow} overflow-hidden relative`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.leftStrip}`} />
      <CardContent className="pt-6 pl-7">
        <div className="flex gap-3">
          <div className={`shrink-0 w-10 h-10 rounded-full ${s.iconBg} flex items-center justify-center`}>
            <Sparkles className={`h-5 w-5 ${s.iconText}`} />
          </div>
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </CardContent>
    </Card>
  );
}
