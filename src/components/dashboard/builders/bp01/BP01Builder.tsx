import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, Mail, Eye, Zap } from "lucide-react";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";


const STEPS = ["Introduction", "Generating", "Review", "Publish"];

const GENERATING_MESSAGES = [
  "Reading your book and understanding your audience...",
  "Crafting your welcome email sequence...",
  "Writing your lead magnet offer...",
  "Building your first broadcast campaign...",
  "Personalising everything to your readers...",
];

const ACTIVATING_MESSAGES = [
  "Setting up your email list...",
  "Loading your welcome sequence...",
  "Connecting your lead magnet form...",
  "Everything is coming together...",
];

interface Props {
  authorId: string | null;
}

export default function BP01Builder({ authorId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [authorSlug, setAuthorSlug] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [hasContext, setHasContext] = useState<boolean | null>(null);
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [leadMagnetUrl, setLeadMagnetUrl] = useState<string | null>(null);
  const [leadMagnetTitle, setLeadMagnetTitle] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading } = useAuthorBook();

  // Load author info
  useEffect(() => {
    if (!authorId) return;
    (async () => {
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("pen_name, author_slug, user_id")
        .eq("id", authorId)
        .single();
      setAuthorName(profile?.pen_name || "there");
      setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));

      // Check author_context first
      const { data: ctx } = await supabase
        .from("author_context")
        .select("book_title")
        .eq("author_id", authorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (ctx?.book_title) {
        setBookTitle(ctx.book_title);
        setHasContext(true);
      } else {
        // Fallback: check books table (uses user_id since books.author_id = auth.users.id)
        const { data: book } = await supabase
          .from("books")
          .select("title")
          .eq("author_id", profile?.user_id || authorId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (book?.title) {
          setBookTitle(book.title);
          setHasContext(true);
        } else {
          setHasContext(false);
        }
      }

      // Fetch BP-02 lead magnet URL
      const { data: bp02Node } = await supabase
        .from("author_nodes")
        .select("microsite_url, content_json")
        .eq("author_id", authorId)
        .eq("node_id", "BP-02")
        .maybeSingle();
      if (bp02Node?.microsite_url) {
        setLeadMagnetUrl(bp02Node.microsite_url);
      }
      if (bp02Node?.content_json) {
        const bp02Content = bp02Node.content_json as any;
        const title = bp02Content?.lead_magnets?.[0]?.title || bp02Content?.funnel_name || null;
        if (title) setLeadMagnetTitle(title);
      }

      // Check if content already generated
      const { data: node } = await supabase
        .from("author_nodes")
        .select("content_json, status")
        .eq("author_id", authorId)
        .eq("node_id", "BP-01")
        .maybeSingle();

      if (node?.content_json && (node.status === "content_ready" || node.status === "live")) {
        setContent(node.content_json);
        setStep(node.status === "live" ? 3 : 2);
      }
    })();
  }, [authorId]);

  // Cycling messages for generating / activating
  useEffect(() => {
    if (step === 1 || (step === 3 && !content?.activated)) {
      const msgs = step === 1 ? GENERATING_MESSAGES : ACTIVATING_MESSAGES;
      setMsgIndex(0);
      intervalRef.current = setInterval(() => {
        setMsgIndex((i) => (i + 1) % msgs.length);
      }, 3000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [step]);

  const handleGenerate = async () => {
    setStep(1);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-bp01-email-marketing", {
        body: { author_id: authorId },
      });
      if (fnErr || !data?.success) {
        throw new Error(data?.error || fnErr?.message || "Generation failed");
      }
      setContent(data.content);
      setStep(2);
    } catch (e: any) {
      setError(e.message);
      setStep(0);
    }
  };

  const handlePublish = async () => {
    const prevStep = step;
    setStep(3);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("deploy-bp01-to-ghl", {
        body: { author_id: authorId, content_payload: content },
      });
      if (fnErr) throw new Error(fnErr.message || "Activation failed");
      const status = data?.status || "live";
      setContent((prev: any) => ({
        ...prev,
        activated: true,
        publishStatus: status,
      }));
      if (status === "published_pending_ghl") {
        toast.success("Email Marketing saved ✅", { description: "Content saved — connect your Marketing Hub to go live." });
      } else {
        toast.success("Email Marketing is live! 🎉");
      }
    } catch (e: any) {
      console.error("Activation error (non-blocking):", e.message);
      setContent((prev: any) => ({ ...prev, activated: true, publishStatus: "published_pending_ghl" }));
      toast.success("Content saved ✅", { description: "Connect your Marketing Hub to go live." });
    }
  };

  if (!authorId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Please set up your author profile first.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/brand-products")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Email Marketing</h1>
            
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-2">
        <div className="flex items-center gap-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-1">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
                  i < step ? "bg-primary text-primary-foreground"
                  : i === step ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                  : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline truncate">{label}</span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* STEP 0: Introduction */}
        {step === 0 && (
          <>
            <AbbyCard>
              <h2 className="text-xl font-bold mb-3">Let's build your Email Marketing</h2>
              {!isBookLoading && hasContext !== null && !hasBook && !hasContext ? (
                <>
                  <p className="text-muted-foreground mb-4">
                    Hi {authorName}! Before I can build your email marketing, I need to know about your book. Please complete your book profile first.
                  </p>
                  <Button onClick={() => navigate("/my-books?returnTo=/node-builder/BP-01")}>Complete Book Profile</Button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground mb-4">
                    Hi {authorName}! Email marketing is the single most powerful revenue tool for authors.
                    I'm going to create a complete email marketing system for '{bookTitle || detectedBookTitle || "your book"}' — including
                    your welcome sequence, your list-building strategy, and your first campaign. This will run
                    automatically in the background. Ready to see what I've prepared for you?
                  </p>
                  <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}>
                    <Sparkles className="h-4 w-4 mr-2" /> Generate My Email Marketing
                  </Button>
                </>
              )}
              {error && (
                <div className="mt-4 p-3 rounded-md bg-[hsl(var(--primary))]/10 text-primary text-sm">
                  ABBY is taking a moment — please try again in a few seconds.
                  <Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>
                    Try Again
                  </Button>
                </div>
              )}
            </AbbyCard>
          </>
        )}

        {/* STEP 1: Generating */}
        {step === 1 && (
          <AbbyCard>
            <div className="space-y-4">
              <p className="text-muted-foreground font-medium animate-pulse">
                {GENERATING_MESSAGES[msgIndex]}
              </p>
              <Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" />
              <p className="text-xs text-muted-foreground">This usually takes 15–30 seconds</p>
            </div>
          </AbbyCard>
        )}

        {/* STEP 2: Review — Visual Funnel */}
        {step === 2 && content && (
          <ReviewStep
            content={content}
            authorName={authorName}
            leadMagnetUrl={leadMagnetUrl}
            leadMagnetTitle={leadMagnetTitle}
            onActivate={handlePublish}
          />
        )}

        {/* STEP 3: Activation / Success */}
        {step === 3 && !content?.activated && (
          <AbbyCard>
            <div className="space-y-4">
              <p className="text-muted-foreground font-medium animate-pulse">
                {ACTIVATING_MESSAGES[msgIndex % ACTIVATING_MESSAGES.length]}
              </p>
              <Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" />
            </div>
          </AbbyCard>
        )}

        {step === 3 && content?.activated && (
          <PublishSuccessScreen
              nodeId="BP-01"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
        )}
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

function AbbyCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---- Funnel Node Definitions ---- */

interface FunnelNode {
  id: string;
  label: string;
  timing: string;
  crmStage: string;
  type: "optin" | "email" | "broadcast";
  emailIndex?: number; // index into welcome_sequence
}

function buildFunnelNodes(content: any): FunnelNode[] {
  const nodes: FunnelNode[] = [];

  // Opt-in node
  nodes.push({
    id: "optin",
    label: "Opt-in Page",
    timing: "Entry",
    crmStage: "New Lead",
    type: "optin",
  });

  // Welcome sequence emails
  const sequence = content.welcome_sequence || [];
  sequence.forEach((email: any, idx: number) => {
    const day = email.send_delay_days ?? idx;
    nodes.push({
      id: `email-${idx}`,
      label: day === 0 ? "Welcome" : `Day ${day}`,
      timing: day === 0 ? "Instant" : `Day ${day}`,
      crmStage: getCrmStage(day, idx, sequence.length),
      type: "email",
      emailIndex: idx,
    });
  });

  // Broadcast
  nodes.push({
    id: "broadcast",
    label: "Broadcast",
    timing: "Ongoing",
    crmStage: "Customer",
    type: "broadcast",
  });

  return nodes;
}

function getCrmStage(day: number, idx: number, total: number): string {
  if (day === 0 || idx === 0) return "Engaged";
  if (idx >= total - 1) return "Hot";
  if (day >= 7 || idx >= Math.floor(total * 0.6)) return "Warm";
  return "Engaged";
}

function getNodeEmail(content: any, node: FunnelNode) {
  if (node.type === "email" && node.emailIndex !== undefined) {
    return content.welcome_sequence?.[node.emailIndex];
  }
  if (node.type === "broadcast") {
    return content.first_broadcast;
  }
  if (node.type === "optin") {
    return {
      subject: content.lead_magnet_offer?.title || "Your Free Resource",
      preview_text: content.lead_magnet_offer?.description || "",
      body: content.lead_magnet_offer?.description || "",
      cta_text: content.lead_magnet_offer?.cta_text,
    };
  }
  return null;
}

function replacePlaceholders(text: string | undefined, leadMagnetUrl: string | null, leadMagnetTitle: string | null = null): string {
  if (!text) return "";
  const urlReplacement = leadMagnetUrl
    ? leadMagnetUrl
    : "Your quiz link will be inserted automatically when BP-02 is built.";
  const titleReplacement = leadMagnetTitle || "Your Free Resource";
  return text
    .replace(/\[Lead Magnet URL\]/gi, urlReplacement)
    .replace(/\[Link to Lead Magnet\]/gi, urlReplacement)
    .replace(/\[Lead_Magnet_URL\]/gi, urlReplacement)
    .replace(/\[LEAD MAGNET TITLE\]/gi, titleReplacement)
    .replace(/\[Lead Magnet Title\]/gi, titleReplacement)
    .replace(/\[LEAD_MAGNET_TITLE\]/gi, titleReplacement);
}

/* ---- ReviewStep: Visual Funnel ---- */

function ReviewStep({
  content,
  authorName,
  leadMagnetUrl,
  leadMagnetTitle,
  onActivate,
}: {
  content: any;
  authorName: string;
  leadMagnetUrl: string | null;
  leadMagnetTitle: string | null;
  onActivate: () => void;
}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [readerPreviewOpen, setReaderPreviewOpen] = useState(false);

  const funnelNodes = buildFunnelNodes(content);
  const selectedNode = funnelNodes.find((n) => n.id === selectedNodeId) || null;
  const selectedEmail = selectedNode ? getNodeEmail(content, selectedNode) : null;

  return (
    <div className="space-y-6">
      {/* Abby summary */}
      <AbbyCard>
        <p className="text-muted-foreground">{content.abby_summary}</p>
      </AbbyCard>

      {/* Section 1: Funnel Flow Map */}
      <Card>
        <CardContent className="pt-6 pb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Your Email Funnel
          </h3>
          <div className="overflow-x-auto pb-2">
            <div className="flex items-start gap-0 min-w-max">
              {funnelNodes.map((node, idx) => (
                <div key={node.id} className="flex items-start">
                  {/* Node */}
                  <button
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg transition-all min-w-[90px] hover:bg-accent/50 ${
                      selectedNodeId === node.id ? "bg-accent ring-1 ring-primary/30" : ""
                    }`}
                  >
                    {/* Pill */}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        node.type === "optin" ? "bg-primary" : "bg-emerald-500"
                      }`} />
                      <span className="text-xs font-semibold whitespace-nowrap">{node.label}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{node.timing}</span>
                    {/* CRM Stage */}
                    <span className="text-[10px] font-medium text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {node.crmStage}
                    </span>
                  </button>
                  {/* Arrow connector */}
                  {idx < funnelNodes.length - 1 && (
                    <div className="flex items-center self-center mt-1">
                      <div className="w-4 h-px bg-border" />
                      <ArrowRight className="h-3 w-3 text-muted-foreground -ml-1" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Click any step to preview the email content →
          </p>
        </CardContent>
      </Card>

      {/* Section 3: Campaign Activation Bar */}
      <Card className="border-primary/20">
        <CardContent className="pt-5 pb-5 space-y-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Campaign: </span>
              <span className="font-medium">{content.campaign_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Email list: </span>
              <span className="font-medium">{content.list_name}</span>
            </div>
          </div>
          <Button
            className="w-full bg-[hsl(43,74%,49%)] hover:bg-[hsl(43,74%,42%)] text-white font-semibold"
            size="lg"
            onClick={onActivate}
          >
            <Zap className="h-4 w-4 mr-2" />
            Activate My Email Campaign →
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Sent via Authors Bureau — no external email platform needed.
          </p>
        </CardContent>
      </Card>

      {/* Section 2: Email Preview Sheet */}
      <Sheet open={!!selectedNodeId} onOpenChange={(open) => { if (!open) setSelectedNodeId(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {selectedNode?.label}
            </SheetTitle>
          </SheetHeader>

          {selectedEmail && (
            <div className="mt-6 space-y-5">
              {/* Status & CRM trigger */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">Draft</Badge>
                {selectedNode && (
                  <span className="text-xs text-muted-foreground">
                    When clicked → moves reader to <span className="font-semibold text-primary">{selectedNode.crmStage}</span>
                  </span>
                )}
              </div>

              {/* Subject */}
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Subject</span>
                <p className="text-lg font-bold mt-0.5">
                  {replacePlaceholders(selectedEmail.subject, leadMagnetUrl)}
                </p>
              </div>

              {/* Preview text */}
              {selectedEmail.preview_text && (
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Preview text</span>
                  <p className="text-sm italic text-muted-foreground mt-0.5">
                    {replacePlaceholders(selectedEmail.preview_text, leadMagnetUrl)}
                  </p>
                </div>
              )}

              {/* CTA for opt-in */}
              {selectedNode?.type === "optin" && selectedEmail.cta_text && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Button:</span>
                  <span className="text-sm font-medium bg-primary/10 px-3 py-1 rounded-full">
                    {selectedEmail.cta_text}
                  </span>
                </div>
              )}

              {/* Email body card */}
              {selectedEmail.body && (
                <Card className="bg-card">
                  <CardContent className="pt-4">
                    <p className="text-sm whitespace-pre-line leading-relaxed">
                      {replacePlaceholders(selectedEmail.body, leadMagnetUrl)}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Preview as Reader */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setReaderPreviewOpen(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview as Reader
              </Button>
            </div>
          )}

          {/* Reader Preview Dialog */}
          <Dialog open={readerPreviewOpen} onOpenChange={setReaderPreviewOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Inbox Preview</DialogTitle>
              </DialogHeader>
              {selectedEmail && (
                <div className="space-y-3">
                  {/* Mock inbox header */}
                  <div className="border border-border rounded-lg p-4 bg-card">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{authorName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {replacePlaceholders(selectedEmail.subject, leadMagnetUrl)}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">now</span>
                    </div>
                    <div className="border-t border-border pt-3">
                      <p className="text-sm whitespace-pre-line leading-relaxed">
                        {replacePlaceholders(selectedEmail.body, leadMagnetUrl)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </SheetContent>
      </Sheet>
    </div>
  );
}
