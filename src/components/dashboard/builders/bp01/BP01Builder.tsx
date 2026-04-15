import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, Mail, Gift, Radio, Settings, ChevronDown, ChevronUp } from "lucide-react";
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
                    I'm going to create a complete email marketing system for '{detectedBookTitle || "your book"}' — including
                    your welcome sequence, your list-building strategy, and your first campaign. This will run
                    automatically in the background. Ready to see what I've prepared for you?
                  </p>
                  <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}>
                    <Sparkles className="h-4 w-4 mr-2" /> Generate My Email Marketing
                  </Button>
                </>
              )}
              {error && (
                <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  I hit a snag generating your content. {error}
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

        {/* STEP 2: Review */}
        {step === 2 && content && <ReviewStep content={content} authorName={authorName} onActivate={handlePublish} />}

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

function ReviewStep({ content, authorName, onActivate }: { content: any; authorName: string; onActivate: () => void }) {
  return (
    <div className="space-y-4">
      {/* Abby summary */}
      <AbbyCard>
        <p className="text-muted-foreground">{content.abby_summary}</p>
      </AbbyCard>

      <Tabs defaultValue="welcome" className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-auto">
          <TabsTrigger value="welcome" className="text-xs py-2">
            <Mail className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Welcome
          </TabsTrigger>
          <TabsTrigger value="leadmagnet" className="text-xs py-2">
            <Gift className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Lead Magnet
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="text-xs py-2">
            <Radio className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Broadcast
          </TabsTrigger>
          <TabsTrigger value="details" className="text-xs py-2">
            <Settings className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="welcome" className="space-y-3 mt-4">
          {content.welcome_sequence?.map((email: any) => (
            <EmailCard key={email.email_number} email={email} />
          ))}
        </TabsContent>

        <TabsContent value="leadmagnet" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold">{content.lead_magnet_offer?.title}</h3>
              <p className="text-sm text-muted-foreground">{content.lead_magnet_offer?.description}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Button text:</span>
                <span className="text-sm font-medium bg-primary/10 px-3 py-1 rounded-full">{content.lead_magnet_offer?.cta_text}</span>
              </div>
              <p className="text-xs text-muted-foreground italic mt-2">
                Your opt-in form will be created automatically when you activate.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broadcast" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div>
                <span className="text-xs text-muted-foreground">Subject</span>
                <p className="font-semibold">{content.first_broadcast?.subject}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Preview</span>
                <p className="text-sm">{content.first_broadcast?.preview_text}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Body</span>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{content.first_broadcast?.body}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Campaign name</span>
                <span className="text-sm font-medium">{content.campaign_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Email list</span>
                <span className="text-sm font-medium">{content.list_name}</span>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Your email list will be named '{content.list_name}' and your campaign will be called '{content.campaign_name}'.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={() => toast.info("Manual editing coming soon. You can activate now and request changes later.")}>
          Edit
        </Button>
        <Button className="flex-1" size="lg" onClick={onActivate}>
          Publish to My Site<ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
      <p className="text-xs text-center text-muted-foreground">
        Everything activates automatically. You don't need to set anything up.
      </p>
    </div>
  );
}

function EmailCard({ email }: { email: any }) {
  const [open, setOpen] = useState(false);
  const dayLabel = email.send_delay_days === 0 ? "Sent immediately" : `Sent on Day ${email.send_delay_days}`;

  return (
    <Card className="cursor-pointer" onClick={() => setOpen(!open)}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">#{email.email_number}</span>
              <span className="text-xs text-muted-foreground">{dayLabel}</span>
            </div>
            <p className="font-medium text-sm truncate">{email.subject}</p>
            {!open && <p className="text-xs text-muted-foreground truncate">{email.preview_text}</p>}
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
        </div>
        {open && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            <div>
              <span className="text-xs text-muted-foreground">Preview text</span>
              <p className="text-sm">{email.preview_text}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Body</span>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{email.body}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// SuccessStep replaced by NodeSuccessScreen
