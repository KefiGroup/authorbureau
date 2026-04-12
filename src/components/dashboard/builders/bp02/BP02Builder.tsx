import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, Gift, FileText, ThumbsUp, Settings, Star, Copy, ExternalLink, Link2, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import SocialDistributionPack from "./SocialDistributionPack";

const STEPS = ["Introduction", "Generating", "Review", "Publish"];

const GENERATING_MESSAGES = [
  "Reading your book to find the best lead magnet angles...",
  "Designing 3 irresistible free resources for your readers...",
  "Writing your opt-in page headline and copy...",
  "Creating your thank-you page message...",
  "Matching everything to your audience's biggest pain points...",
];

const ACTIVATING_MESSAGES = [
  "Creating your opt-in funnel...",
  "Setting up contact tags and custom fields...",
  "Connecting your lead capture workflow...",
  "Your funnel is almost ready...",
];

interface Props {
  authorId: string | null;
}

export default function BP02Builder({ authorId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [authorSlug, setAuthorSlug] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [hasContext, setHasContext] = useState<boolean | null>(null);
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading } = useAuthorBook();

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

      const { data: node } = await supabase
        .from("author_nodes")
        .select("content_json, status, microsite_url")
        .eq("author_id", authorId)
        .eq("node_id", "BP-02")
        .maybeSingle();

      if (node?.content_json && (node.status === "content_ready" || node.status === "live")) {
        setContent(node.content_json);
        setStep(node.status === "live" ? 3 : 2);
        if (node.status === "live") {
          setContent((prev: any) => ({ ...prev, activated: true }));
          setLiveUrl(node.microsite_url || null);
        }
      }
    })();
  }, [authorId]);

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
      const { data, error: fnErr } = await supabase.functions.invoke("generate-bp02-lead-magnets", {
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
    setStep(3);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("deploy-bp02-to-ghl", {
        body: { author_id: authorId },
      });

      // Edge function now always returns 200 — check structured status
      if (fnErr) {
        throw new Error(fnErr.message || "Publish failed");
      }

      if (!data?.success) {
        throw new Error(data?.message || data?.error || "Publish failed");
      }

      if (data.status === "published_pending_ghl") {
        // Saved but GHL not connected — show success toast, stay on review
        toast.success(data.message || "Lead magnet saved. Connect GoHighLevel in Settings to activate your live opt-in page.");
        setStep(2);
        return;
      }

      // Live path
      setLiveUrl(data.live_url || data.microsite_url || null);
      setContent((prev: any) => ({ ...prev, activated: true }));
    } catch (e: any) {
      toast.error(e.message || "Something went wrong during publishing.");
      setError(e.message);
      setStep(2);
    }
  };

  const handleCopyUrl = () => {
    if (liveUrl) {
      navigator.clipboard.writeText(liveUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
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
            <h1 className="text-lg font-semibold">Lead Magnets</h1>
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
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's build your Lead Magnets</h2>
            {!isBookLoading && !hasBook ? (
              <>
                <p className="text-muted-foreground mb-4">
                  Hi {authorName}! Before I can build your lead magnets, I need to know about your book. Please complete your book profile first.
                </p>
                <Button onClick={() => navigate("/my-books?returnTo=/node-builder/BP-02")}>Complete Book Profile</Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-4">
                  Hi {authorName}! A lead magnet is a free resource you give readers in exchange for their email address — it's how you build your list.
                  I'm going to create 3 lead magnet concepts perfectly matched to '{detectedBookTitle || "your book"}', plus a complete opt-in page that captures subscribers automatically. Ready?
                </p>
                <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}>
                  <Sparkles className="h-4 w-4 mr-2" /> Generate My Lead Magnets
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
        {step === 2 && content && <ReviewStep content={content} authorName={authorName} onActivate={handlePublish} error={error} isPublishing={step === 3} />}

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
          <PublishSuccessStep
            authorName={authorName}
            authorId={authorId!}
            liveUrl={liveUrl}
            copied={copied}
            onCopy={handleCopyUrl}
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

function ReviewStep({ content, authorName, onActivate, error, isPublishing }: { content: any; authorName: string; onActivate: () => void; error: string | null; isPublishing?: boolean }) {
  const recommended = content.recommended_lead_magnet || 1;

  return (
    <div className="space-y-4">
      <AbbyCard>
        <p className="text-muted-foreground">{content.abby_summary}</p>
      </AbbyCard>

      <Tabs defaultValue="magnets" className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-auto">
          <TabsTrigger value="magnets" className="text-xs py-2">
            <Gift className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Magnets
          </TabsTrigger>
          <TabsTrigger value="optin" className="text-xs py-2">
            <FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Opt-In
          </TabsTrigger>
          <TabsTrigger value="thankyou" className="text-xs py-2">
            <ThumbsUp className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Thanks
          </TabsTrigger>
          <TabsTrigger value="details" className="text-xs py-2">
            <Settings className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="magnets" className="space-y-3 mt-4">
          {content.lead_magnets?.map((lm: any) => (
            <Card key={lm.number} className={lm.number === recommended ? "border-primary ring-1 ring-primary/30" : ""}>
              <CardContent className="pt-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">{lm.type}</span>
                    {lm.number === recommended && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                        <Star className="h-3 w-3" /> ABBY's Top Pick
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{lm.pages_or_length}</span>
                </div>
                <h3 className="font-semibold">{lm.title}</h3>
                <p className="text-sm text-muted-foreground">{lm.description}</p>
                <p className="text-xs text-muted-foreground italic">Why it works: {lm.why_it_works}</p>
              </CardContent>
            </Card>
          ))}
          {content.recommended_reason && (
            <div className="flex gap-2 mt-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">{content.recommended_reason}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="optin" className="mt-4">
          <Card className="overflow-hidden">
            <div className="bg-primary/5 p-6 text-center border-b border-border">
              <h3 className="text-xl font-bold mb-2">{content.optin_page?.headline}</h3>
              <p className="text-sm text-muted-foreground mb-4">{content.optin_page?.subheadline}</p>
              <ul className="text-sm text-left max-w-xs mx-auto space-y-2 mb-4">
                {content.optin_page?.bullet_points?.map((bp: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{bp}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" className="w-full max-w-xs">
                {content.optin_page?.cta_button_text || "Get It Free"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">{content.optin_page?.privacy_note}</p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="thankyou" className="mt-4">
          <Card className="overflow-hidden">
            <div className="bg-primary/5 p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">{content.thankyou_page?.headline}</h3>
              <p className="text-sm text-muted-foreground mb-3">{content.thankyou_page?.message}</p>
              <p className="text-sm font-medium">{content.thankyou_page?.next_step}</p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Funnel name</span>
                <span className="text-sm font-medium">{content.funnel_name}</span>
              </div>
              {content.marketing_strategy && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Best channel</span>
                    <span className="text-sm font-medium">{content.marketing_strategy.primary_platform}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{content.marketing_strategy.primary_reason}</p>
                </>
              )}
              <p className="text-xs text-muted-foreground italic">
                Your opt-in funnel, contact tags, and lead capture workflow will be created automatically when you publish.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={() => toast.info("Manual editing coming soon. Publish now and request changes from ABBY later.")}>
          Edit
        </Button>
        <Button className="flex-1" size="lg" onClick={() => onActivate()} disabled={isPublishing}>
          {isPublishing ? (
            <><Sparkles className="h-4 w-4 mr-2 animate-spin" /> Publishing...</>
          ) : (
            <>Publish & Go Live <ArrowRight className="h-4 w-4 ml-2" /></>
          )}
        </Button>
      </div>
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center">
          {error}
        </div>
      )}
      <p className="text-xs text-center text-muted-foreground">
        Publishing creates your GHL funnel, contact tags, and lead capture workflow automatically.
      </p>
    </div>
  );
}

function PublishSuccessStep({ authorName, authorId, liveUrl, copied, onCopy }: {
  authorName: string;
  authorId: string;
  liveUrl: string | null;
  copied: boolean;
  onCopy: () => void;
}) {
  const navigate = useNavigate();
  const [showQR, setShowQR] = useState(false);
  const [socialPack, setSocialPack] = useState<any>(null);

  return (
    <div className="space-y-6">
      {/* Celebration */}
      <div className="flex flex-col items-center text-center py-6">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4 animate-in zoom-in duration-500">
          <Check className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold mb-1">Your Lead Magnet is Live! 🎉</h2>
        <p className="text-sm text-muted-foreground">Congratulations, {authorName}!</p>
      </div>

      {/* Live URL card */}
      {liveUrl && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Your live opt-in link</h3>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
            <span className="text-sm text-foreground font-mono truncate flex-1">{liveUrl}</span>
            <Button size="sm" variant="ghost" onClick={onCopy}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href={liveUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>

          {/* QR Code toggle */}
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQR(!showQR)}
              className="w-full"
            >
              <QrCode className="h-3.5 w-3.5 mr-2" />
              {showQR ? "Hide QR Code" : "Show QR Code"}
            </Button>
            {showQR && (
              <div className="flex justify-center mt-4 p-4 bg-white rounded-lg">
                <QRCodeSVG value={liveUrl} size={200} level="M" />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Abby card */}
      <Card className="p-4 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
        <div className="flex gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">Abby says</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Your lead magnet funnel is live! Share your link on social media, in your email signature, and on your website. 
              Now let me activate your marketing campaign so I can automatically promote it to every new reader who finds you.
            </p>
          </div>
        </div>
      </Card>

      {/* Social Distribution Pack */}
      <SocialDistributionPack
        authorId={authorId}
        content={socialPack}
        onContentLoaded={setSocialPack}
      />

      {/* CTAs */}
      <Button
        className="w-full"
        size="lg"
        onClick={() => navigate("/dashboard?section=marketing-hub&highlight=lead-magnets")}
      >
        Activate My Marketing Campaign <ArrowRight className="h-4 w-4 ml-2" />
      </Button>

      <div className="text-center">
        <Button variant="link" className="text-sm text-muted-foreground" onClick={() => navigate("/brand-products")}>
          Go back to Brand Products
        </Button>
      </div>
    </div>
  );
}
