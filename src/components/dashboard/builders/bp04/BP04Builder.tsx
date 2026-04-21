import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, Home, User, BookOpen, Mail, Quote, ChevronDown, ChevronUp, Search, MessageSquare } from "lucide-react";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import BuilderIntroBlock, { BP_INTRO_SPECS, BackToReviewLink } from "@/components/dashboard/builders/shared/BuilderIntroBlock";
import BuilderHeader from "@/components/dashboard/builders/shared/BuilderHeader";
import UnifiedStepper from "@/components/dashboard/builders/shared/UnifiedStepper";
import NodeHowItWorks from "@/components/dashboard/builders/shared/NodeHowItWorks";
import InlineSectionCard from "@/components/dashboard/builders/shared/InlineSectionCard";
import { categoryStyles } from "@/components/dashboard/builders/shared/BuilderTheme";
import { toAbbyError } from "@/lib/abby-error";
import { ensureEmailSequence } from "@/lib/email-sequence-hook";



const STEPS = ["Introduction", "Generating", "Review", "Publish"];

const GENERATING_MESSAGES = [
  "Studying your book's themes and your author brand...",
  "Writing your homepage copy...",
  "Crafting your About the Author page...",
  "Building your book showcase page...",
  "Putting your author website together...",
];

const ACTIVATING_MESSAGES = [
  "Creating your author website...",
  "Setting up your homepage...",
  "Building your book page...",
  "Your website is almost ready...",
];

interface Props {
  authorId: string | null;
}

export default function BP04Builder({ authorId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [authorSlug, setAuthorSlug] = useState("");
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


      const { data: node } = await supabase
        .from("author_nodes")
        .select("content_json, status")
        .eq("author_id", authorId)
        .eq("node_id", "BP-04")
        .maybeSingle();

      if (node?.content_json && (node.status === "content_ready" || node.status === "live")) {
        setContent(node.content_json);
        setStep(node.status === "live" ? 3 : 2);
        if (node.status === "live") {
          setContent((prev: any) => ({ ...prev, activated: true }));
        }
      }
      // (Removed legacy auto-redirect to microsite-manager — authors must stay on
      // /node-builder/BP-04 so they can run the unified Introduction → Live flow.)
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
      const { data, error: fnErr } = await supabase.functions.invoke("generate-bp04-website", {
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
      const { data, error: fnErr } = await supabase.functions.invoke("deploy-bp04-to-ghl", {
        body: { author_id: authorId, content_payload: content },
      });
      if (fnErr) throw new Error(fnErr.message || "Activation failed");
      const status = data?.status || "live";
      const liveUrl = data?.liveUrl;
      setContent((prev: any) => ({ ...prev, activated: true, publishStatus: status, liveUrl }));
      // Fire-and-forget: ensure email sequence exists for BP-04
      ensureEmailSequence({ authorId: authorId!, nodeId: "BP-04" });
      if (status === "published_pending_ghl") {
        toast.success("Author Website saved ✅", { description: "Content saved — connect your Marketing Hub to go live." });
      } else {
        toast.success("Author Website is live! 🎉");
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
          nodeId="BP-04"
          title="Author Website"
          subtitle="Hero, about, books, testimonials + lead capture"
          icon={Home}
          onBack={() => navigate("/brand-products")}
        />
        <UnifiedStepper
          nodeId="BP-04"
          steps={STEPS}
          current={step}
          onStepClick={(i) => { if (i <= step) setStep(i); }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <NodeHowItWorks nodeId="BP-04" />
        {step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's build your Author Website</h2>
            {isBookLoading ? (
              <p className="text-muted-foreground">Checking your book profile…</p>
            ) : hasContext !== null && !hasBook && !hasContext ? (
              <>
                <p className="text-muted-foreground mb-4">Hi {authorName}! Before I build your author website, I need to know about your book. Please complete your book profile first.</p>
                <Button onClick={() => navigate("/my-books?returnTo=/node-builder/BP-04")}>Complete Book Profile</Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-4">
                  Hi {authorName}! Every author needs a professional online home — a place where readers discover you, learn about your book, and join your community. I'm going to build your complete author website for '{detectedBookTitle || "your book"}' — with a homepage, about page, book page, and contact form — all written and structured around your book and your brand. Ready?
                </p>
                <div className="mb-4">
                  <BuilderIntroBlock spec={BP_INTRO_SPECS["BP-04"]} />
                </div>
                <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate} disabled={isBookLoading}>
                  <Sparkles className="h-4 w-4 mr-2" /> Build My Website
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
                nodeId="BP-04"
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
  return (
    <div className="space-y-4">
      <AbbyCard>
        <p className="text-muted-foreground">{content.abby_summary}</p>
      </AbbyCard>

      <Tabs defaultValue="homepage" className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-auto">
          <TabsTrigger value="homepage" className="text-xs py-2"><Home className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Homepage</TabsTrigger>
          <TabsTrigger value="about" className="text-xs py-2"><User className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> About</TabsTrigger>
          <TabsTrigger value="book" className="text-xs py-2"><BookOpen className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Book</TabsTrigger>
          <TabsTrigger value="contact" className="text-xs py-2"><Mail className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Contact & SEO</TabsTrigger>
        </TabsList>

        {/* Homepage */}
        <TabsContent value="homepage" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="rounded-lg bg-muted/50 p-6 text-center space-y-3">
                <h2 className="text-2xl font-bold">{content.homepage?.hero_headline}</h2>
                <p className="text-muted-foreground">{content.homepage?.hero_subheadline}</p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                  <span className="inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium">{content.homepage?.hero_cta_primary}</span>
                  <span className="inline-flex items-center justify-center px-5 py-2.5 rounded-md border border-border text-sm font-medium">{content.homepage?.hero_cta_secondary}</span>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Card><CardContent className="pt-4"><p className="text-xs font-semibold text-muted-foreground mb-1">About Teaser</p><p className="text-sm">{content.homepage?.about_teaser}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs font-semibold text-muted-foreground mb-1">Book Teaser</p><p className="text-sm">{content.homepage?.book_teaser}</p></CardContent></Card>
              </div>
              {content.homepage?.placeholder_testimonials?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">{content.homepage?.social_proof_headline || "What Readers Are Saying"}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {content.homepage.placeholder_testimonials.map((t: any, i: number) => (
                      <Card key={i} className="bg-muted/30">
                        <CardContent className="pt-4 space-y-2">
                          <Quote className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm italic">"{t.quote}"</p>
                          <p className="text-xs font-semibold">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.title}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* About Page */}
        <TabsContent value="about" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-bold">{content.about_page?.headline}</h3>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold text-primary mb-1">Short Bio — for social profiles</p>
                  <p className="text-sm">{(content.about_page?.bio_short || "").replace(/<[^>]+>/g, "")}</p>
                </CardContent>
              </Card>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Full Bio</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{(content.about_page?.bio_long || "").replace(/<[^>]+>/g, "")}</p>
              </div>
              {content.about_page?.credentials?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Credentials</p>
                  <ul className="space-y-1">
                    {content.about_page.credentials.map((c: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Personal Note</p>
                  <p className="text-sm italic">{content.about_page?.personal_note}</p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Book Page */}
        <TabsContent value="book" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-bold">{content.book_page?.headline}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{content.book_page?.book_description}</p>
              {content.book_page?.what_youll_learn?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">What You'll Learn</p>
                  <ul className="space-y-1">
                    {content.book_page.what_youll_learn.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold text-primary mb-1">Who This Book Is For</p>
                  <p className="text-sm">{content.book_page?.who_its_for}</p>
                </CardContent>
              </Card>
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <span className="inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium">{content.book_page?.buy_cta || "Get Your Copy Now"}</span>
              </div>
              {content.book_page?.bonus_offer && (
                <Card className="bg-accent/10 border-accent/20">
                  <CardContent className="pt-4">
                    <p className="text-xs font-semibold text-accent mb-1">🎁 Bonus Offer</p>
                    <p className="text-sm">{content.book_page.bonus_offer}</p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact & SEO */}
        <TabsContent value="contact" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-bold">{content.contact_page?.headline}</h3>
              <p className="text-sm text-muted-foreground">{content.contact_page?.intro_text}</p>
              {content.contact_page?.speaking_topics?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2"><MessageSquare className="h-4 w-4 inline mr-1" /> Speaking Topics</p>
                  <ul className="space-y-1">
                    {content.contact_page.speaking_topics.map((t: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm"><ArrowRight className="h-3 w-3 text-primary shrink-0 mt-1" />{t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {content.contact_page?.media_note && (
                <Card className="bg-muted/30">
                  <CardContent className="pt-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Media & Press</p>
                    <p className="text-sm">{content.contact_page.media_note}</p>
                  </CardContent>
                </Card>
              )}
              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-1"><Search className="h-4 w-4" /> SEO Settings</p>
                <div className="grid gap-2">
                  <div><span className="text-xs text-muted-foreground">Meta Title</span><p className="text-sm font-medium">{content.seo?.meta_title}</p></div>
                  <div><span className="text-xs text-muted-foreground">Meta Description</span><p className="text-sm">{content.seo?.meta_description}</p></div>
                  <div>
                    <span className="text-xs text-muted-foreground">Keywords</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {content.seo?.keywords?.map((kw: string, i: number) => (
                        <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full">{kw}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Inline edit cards for the most-changed copy */}
      <div className="space-y-3 pt-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick edits</p>
        <InlineSectionCard
          nodeId="BP-04" authorId={authorId} content={content} setContent={setContent}
          path="homepage.hero_headline" label="Hero headline" type="input"
        />
        <InlineSectionCard
          nodeId="BP-04" authorId={authorId} content={content} setContent={setContent}
          path="homepage.hero_subheadline" label="Hero subheadline" type="textarea"
        />
        <InlineSectionCard
          nodeId="BP-04" authorId={authorId} content={content} setContent={setContent}
          path="seo.meta_title" label="SEO meta title" type="input"
        />
        <InlineSectionCard
          nodeId="BP-04" authorId={authorId} content={content} setContent={setContent}
          path="seo.meta_description" label="SEO meta description" type="textarea"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button variant="ghost" className="sm:w-auto" onClick={onPrevious}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <Button className="flex-1" size="lg" onClick={onActivate}>
          Publish My Website <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
      <p className="text-xs text-center text-muted-foreground">
        Your author website will be created automatically. You'll receive a link to your live site after activation.
      </p>
    </div>
  );
}

// SuccessStep replaced by NodeSuccessScreen
