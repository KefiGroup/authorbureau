import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, Video, FileText, Mail, Megaphone, Star, ChevronDown, ChevronUp, Clock } from "lucide-react";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import BuilderIntroBlock, { BP_INTRO_SPECS, BackToReviewLink } from "@/components/dashboard/builders/shared/BuilderIntroBlock";
import BuilderHeader from "@/components/dashboard/builders/shared/BuilderHeader";
import UnifiedStepper from "@/components/dashboard/builders/shared/UnifiedStepper";
import NodeHowItWorks from "@/components/dashboard/builders/shared/NodeHowItWorks";
import InlineSectionCard from "@/components/dashboard/builders/shared/InlineSectionCard";
import { categoryStyles } from "@/components/dashboard/builders/shared/BuilderTheme";
import { ensureEmailSequence } from "@/lib/email-sequence-hook";
import { ensureFunnel } from "@/lib/funnel-hook";
import { toAbbyError } from "@/lib/abby-error";
import BookProfileQuickForm from "@/components/dashboard/builders/shared/BookProfileQuickForm";


const STEPS = ["Introduction", "Generating", "Review", "Publish"];

const GENERATING_MESSAGES = [
  "Studying your book's key insights and frameworks...",
  "Designing your signature webinar topics...",
  "Writing your registration page copy...",
  "Creating your follow-up email sequence...",
  "Building your webinar promotional strategy...",
];

const ACTIVATING_MESSAGES = [
  "Setting up your webinar system...",
  "Creating your registration page...",
  "Configuring your follow-up emails...",
  "Your webinar is almost ready...",
];

interface Props {
  authorId: string | null;
}

export default function BP05Builder({ authorId }: Props) {
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
        .select("content_json, status")
        .eq("author_id", authorId)
        .eq("node_id", "BP-05")
        .maybeSingle();

      if (node?.content_json && (node.status === "content_ready" || node.status === "live")) {
        setContent(node.content_json);
        setStep(node.status === "live" ? 3 : 2);
        if (node.status === "live") {
          setContent((prev: any) => ({ ...prev, activated: true }));
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
      const { data, error: fnErr } = await supabase.functions.invoke("generate-bp05-webinars", {
        body: { author_id: authorId },
      });
      if (fnErr || !data?.success) throw new Error(data?.error || fnErr?.message || "Generation failed");
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
      const { data, error: fnErr } = await supabase.functions.invoke("deploy-bp05-to-ghl", {
        body: { author_id: authorId, content_payload: content },
      });
      if (fnErr) throw new Error(fnErr.message || "Activation failed");
      const status = data?.status || "live";
      const liveUrl = data?.liveUrl;
      setContent((prev: any) => ({ ...prev, activated: true, publishStatus: status, liveUrl }));
      // Fire-and-forget: ensure email sequence + funnel exist for BP-05
      ensureEmailSequence({ authorId: authorId!, nodeId: "BP-05" });
      ensureFunnel({ authorId: authorId!, nodeId: "BP-05", funnelType: "webinar" });
      if (status === "published_pending_ghl") {
        toast.success("Webinars saved ✅", { description: "Content saved — connect your Marketing Hub to go live." });
      } else {
        toast.success("Webinars are live! 🎉");
      }
    } catch (e: any) {
      console.error("Publish error (non-blocking):", e.message);
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
      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        <BuilderHeader
          nodeId="BP-05"
          title="Webinars"
          subtitle="Webinar script + slides + promo + follow-up emails"
          icon={Video}
          onBack={() => navigate("/brand-products")}
        />
        <UnifiedStepper
          nodeId="BP-05"
          steps={STEPS}
          current={step}
          onStepClick={(i) => { if (i <= step) setStep(i); }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <NodeHowItWorks nodeId="BP-05" />
        {step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's set up your Webinars</h2>
            {!isBookLoading && hasContext === false && !hasBook ? (
              <BookProfileQuickForm
                authorId={authorId}
                authorName={authorName}
                onComplete={(t) => { setBookTitle(t); setHasContext(true); setTimeout(() => handleGenerate(), 300); }}
              />
            ) : (
              <>
                <p className="text-muted-foreground mb-4">
                  Hi {authorName}! Webinars are one of the most powerful ways to connect with your audience, establish your expertise, and sell your book and programs. I'm going to design a complete webinar system for '{bookTitle || detectedBookTitle || "your book"}' — including 3 signature webinar topics, a registration page, a follow-up email sequence, and a promotional strategy. Ready to go live?
                </p>
                <div className="mb-4">
                  <BuilderIntroBlock spec={BP_INTRO_SPECS["BP-05"]} />
                </div>
                <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}>
                  <Sparkles className="h-4 w-4 mr-2" /> Design My Webinars
                </Button>
              </>
            )}
            {error && (
              <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                I hit a snag generating your content. {toAbbyError(error)}
                <Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button>
              </div>
            )}
          </AbbyCard>
        )}

        {step === 1 && (
          <AbbyCard>
            <div className="space-y-4">
              <p className="text-muted-foreground font-medium animate-pulse">{GENERATING_MESSAGES[msgIndex]}</p>
              <Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" />
              <p className="text-xs text-muted-foreground">Abby usually takes 20–40 seconds</p>
            </div>
          </AbbyCard>
        )}

        {step === 2 && content && (
          <ReviewStep
            content={content}
            setContent={setContent}
            authorId={authorId}
            authorName={authorName}
            onActivate={handlePublish}
            onPrevious={() => setStep(0)}
          />
        )}

        {step === 3 && !content?.activated && (
          <AbbyCard>
            <div className="space-y-4">
              <p className="text-muted-foreground font-medium animate-pulse">{ACTIVATING_MESSAGES[msgIndex % ACTIVATING_MESSAGES.length]}</p>
              <Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" />
              <p className="text-xs text-muted-foreground">Abby usually takes 20–40 seconds</p>
            </div>
          </AbbyCard>
        )}

        {step === 3 && content?.activated && (
          <>
            <PublishSuccessScreen
                nodeId="BP-05"
                authorName={authorName}
                penNameSlug={authorSlug}
              />
            <BackToReviewLink onClick={() => setStep(2)} />
          </>
        )}
      </div>
    </div>
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

function ReviewStep({
  content, setContent, authorId, authorName, onActivate, onPrevious,
}: {
  content: any;
  setContent: (c: any) => void;
  authorId: string | null;
  authorName: string;
  onActivate: () => void;
  onPrevious: () => void;
}) {
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null);
  const recIdx = (content.recommended_webinar || 1) - 1;

  return (
    <div className="space-y-4">
      <AbbyCard>
        <p className="text-muted-foreground">{content.abby_summary}</p>
      </AbbyCard>

      <Tabs defaultValue="topics" className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-auto">
          <TabsTrigger value="topics" className="text-xs py-2"><Video className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Topics</TabsTrigger>
          <TabsTrigger value="registration" className="text-xs py-2"><FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Registration</TabsTrigger>
          <TabsTrigger value="emails" className="text-xs py-2"><Mail className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Emails</TabsTrigger>
          <TabsTrigger value="promotion" className="text-xs py-2"><Megaphone className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Promotion</TabsTrigger>
        </TabsList>

        {/* Webinar Topics */}
        <TabsContent value="topics" className="space-y-4 mt-4">
          {content.webinar_topics?.map((topic: any, i: number) => (
            <Card key={i} className={i === recIdx ? "border-primary/40 ring-1 ring-primary/20" : ""}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    {i === recIdx && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-1">
                        <Star className="h-3 w-3" /> ABBY's Top Pick
                      </span>
                    )}
                    <h4 className="font-bold">{topic.title}</h4>
                    <p className="text-sm text-muted-foreground">{topic.subtitle}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{topic.format}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{topic.duration_minutes}min</span>
                  </div>
                </div>
                <p className="text-sm">{topic.description}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setExpandedTopic(expandedTopic === i ? null : i)}
                >
                  {expandedTopic === i ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                  {expandedTopic === i ? "Less" : "More details"}
                </Button>
                {expandedTopic === i && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Key Teaching Points</p>
                      <ul className="space-y-1">
                        {topic.key_points?.map((p: string, j: number) => (
                          <li key={j} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />{p}</li>
                        ))}
                      </ul>
                    </div>
                    <Card className="bg-muted/30">
                      <CardContent className="pt-3 pb-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Ideal For</p>
                        <p className="text-sm">{topic.ideal_for}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="pt-3 pb-3">
                        <p className="text-xs font-semibold text-primary mb-1">Opening Hook</p>
                        <p className="text-sm italic">"{topic.hook}"</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {content.recommended_reason && (
            <AbbyCard>
              <p className="text-sm text-muted-foreground">{content.recommended_reason}</p>
            </AbbyCard>
          )}
        </TabsContent>

        {/* Registration Page */}
        <TabsContent value="registration" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="rounded-lg bg-muted/50 p-6 text-center space-y-3">
                <h2 className="text-2xl font-bold">{content.registration_page?.headline}</h2>
                <p className="text-muted-foreground">{content.registration_page?.subheadline}</p>
                <ul className="text-left max-w-md mx-auto space-y-2 pt-2">
                  {content.registration_page?.bullet_points?.map((bp: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />{bp}</li>
                  ))}
                </ul>
                <span className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary text-primary-foreground text-sm font-medium mt-3">
                  {content.registration_page?.cta_button_text || "Reserve My Spot"}
                </span>
                {content.registration_page?.urgency_note && (
                  <p className="text-xs text-destructive font-medium mt-2">{content.registration_page.urgency_note}</p>
                )}
              </div>
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Your Presenter Bio</p>
                  <p className="text-sm">{content.registration_page?.presenter_bio}</p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Follow-Up Emails */}
        <TabsContent value="emails" className="space-y-4 mt-4">
          <div className="relative pl-6">
            <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />
            {content.follow_up_emails?.map((email: any, i: number) => (
              <div key={i} className="relative mb-4 last:mb-0">
                <div className="absolute -left-3.5 top-3 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-muted px-2 py-0.5 rounded-full">
                      <Clock className="h-3 w-3" /> {email.send_time}
                    </span>
                    <p className="font-semibold text-sm">{email.subject}</p>
                    <p className="text-xs italic text-muted-foreground">{email.preview_text}</p>
                    <p className="text-sm text-muted-foreground">{email.body_summary}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Promotion Plan */}
        <TabsContent value="promotion" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold">Launch Timeline:</span>
                <span className="text-sm text-muted-foreground">{content.promotion_strategy?.launch_timeline}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Channels</p>
                <div className="flex flex-wrap gap-1.5">
                  {content.promotion_strategy?.channels?.map((ch: string, i: number) => (
                    <span key={i} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">{ch}</span>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold">Promotional Posts</p>
                {content.promotion_strategy?.promotional_posts?.map((post: any, i: number) => (
                  <Card key={i} className="bg-muted/30">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex gap-2">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">{post.day}</span>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{post.platform}</span>
                      </div>
                      <p className="text-sm">{post.caption}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="space-y-3 pt-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick edits</p>
        <InlineSectionCard
          nodeId="BP-05" authorId={authorId} content={content} setContent={setContent}
          path="registration_page.headline" label="Registration headline" type="input"
        />
        <InlineSectionCard
          nodeId="BP-05" authorId={authorId} content={content} setContent={setContent}
          path="registration_page.subheadline" label="Registration subheadline" type="textarea"
        />
        <InlineSectionCard
          nodeId="BP-05" authorId={authorId} content={content} setContent={setContent}
          path="registration_page.cta_button_text" label="CTA button text" type="input"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button variant="ghost" className="sm:w-auto" onClick={onPrevious}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <Button className="flex-1" size="lg" onClick={onActivate}>
          Publish to My Site<ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
      <p className="text-xs text-center text-muted-foreground">
        Your webinar registration page will be set up automatically. You'll be able to schedule your first live event from your dashboard.
      </p>
    </div>
  );
}

// SuccessStep replaced by NodeSuccessScreen
