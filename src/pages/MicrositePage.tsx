import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, ArrowRight, Mail, CheckCircle2, ExternalLink, Clock, BookOpen, Users, Star, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { getThemeById } from "@/lib/author-themes";
import { SLUG_TO_NODE, NODE_NAMES } from "@/lib/node-slug-map";
import { toast } from "@/hooks/use-toast";
import LeadCaptureForm from "@/components/LeadCaptureForm";
import BuyNowButton from "@/components/commerce/BuyNowButton";
import AudiobookPreviewPlayer from "@/components/microsite/AudiobookPreviewPlayer";

interface MicrositeData {
  author: any;
  node: any;
  context: any;
  book: any;
}

export default function MicrositePage() {
  const { authorSlug, bookSlug: nodeSlug } = useParams<{ authorSlug: string; bookSlug: string }>();
  const [data, setData] = useState<MicrositeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [comingSoon, setComingSoon] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Quiz data ref for passing to handleSubmit
  const [quizData, setQuizData] = useState<{ quiz_stage?: string; quiz_score?: number; quiz_answers?: any[] } | null>(null);

  const nodeId = nodeSlug ? SLUG_TO_NODE[nodeSlug] : null;
  const isDynamicSlug = nodeSlug && !nodeId; // slug not in hardcoded map — try dynamic lookup

  useEffect(() => {
    if (!authorSlug || (!nodeId && !isDynamicSlug)) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    async function fetchPage() {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        // Use node param for known slugs, slug param for dynamic/personalised slugs
        const queryParam = nodeId ? `node=${nodeId}` : `slug=${encodeURIComponent(nodeSlug!)}`;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/get-microsite-page?author=${authorSlug}&${queryParam}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (body.error === "Node not live") {
            setComingSoon(true);
          } else if (body.error === "Author not found") {
            setNotFound(true);
          } else if (body.error === "Node not found for slug") {
            setNotFound(true);
          } else {
            setNotFound(true);
          }
          setLoading(false);
          return;
        }

        setData(await res.json());
      } catch (err) {
        console.error("Microsite fetch error:", err);
        setNotFound(true);
      }
      setLoading(false);
    }

    fetchPage();
  }, [authorSlug, nodeId, nodeSlug, isDynamicSlug]);

  const nodeName = nodeId ? NODE_NAMES[nodeId] || "" : "";
  const authorName = data?.author?.pen_name || authorSlug || "";
  const bookTitle = data?.book?.title || "";
  const pageTitle = data?.node?.personalised_name || nodeName;

  useDocumentMeta({
    title: data ? `${pageTitle} by ${authorName} | Authors Bureau` : comingSoon ? "Coming Soon | Authors Bureau" : "Loading...",
    description: data ? `${pageTitle} by ${authorName}. ${data.context?.core_thesis || bookTitle}` : "",
    ogTitle: data ? `${pageTitle} by ${authorName}` : undefined,
    ogImage: data?.book?.cover_image_url || data?.author?.photo_url || undefined,
    ogUrl: `https://authorsbureau.com/${authorSlug}/${nodeSlug}`,
    canonical: `https://authorsbureau.com/${authorSlug}/${nodeSlug}`,
  });

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Author not found
  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md px-4">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Author not found</h1>
          <p className="text-gray-500 mb-6">The author page you're looking for doesn't exist or has been removed.</p>
          <Button asChild variant="outline">
            <a href="https://authorsbureau.com">Visit Authors Bureau</a>
          </Button>
        </div>
      </div>
    );
  }

  // Coming soon (node not published yet)
  if (comingSoon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md px-4">
          <Clock className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">This page is coming soon</h1>
          <p className="text-gray-500 mb-6">
            The author is preparing something great. Check back soon!
          </p>
          <Button asChild variant="outline">
            <Link to={`/${authorSlug}`}>Visit Author's Page</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Use the resolved node_id from the API response (handles both hardcoded and dynamic slugs)
  const resolvedNodeId = data.node.node_id || nodeId;

  const theme = getThemeById(data.author.theme || "classic-elegant");
  const v = theme.vars;
  const hFont = theme.headingFont;
  const bgColor = theme.colors.heroBackground;
  const content = data.node.content_json || {};


  const handleSubmit = async (e: React.FormEvent, extraData?: Record<string, any>): Promise<boolean> => {
    e.preventDefault();
    if (!email || submitting) return false;
    setSubmitting(true);

    try {
      const res = await supabase.functions.invoke("microsite-action", {
        body: {
          author_id: data.author.id,
          node_id: resolvedNodeId,
          action_type: getActionType(resolvedNodeId!),
          email,
          first_name: firstName,
          last_name: lastName,
          message: message || undefined,
          ...(quizData || {}),
          ...(extraData || {}),
        },
      });

      if (res.error) throw res.error;
      setSubmitted(true);
      toast({ title: "Success!", description: res.data?.message || "Thank you!" });
      setSubmitting(false);
      // Redirect to thank-you page for opt-in nodes (BP-02 lead magnet, etc.)
      if (resolvedNodeId === "BP-02" && authorSlug) {
        window.location.href = `/${authorSlug}/thank-you`;
      }
      return true;
    } catch (err) {
      console.error("Submit error:", err);
      toast({ title: "Something went wrong", description: "Please try again or check your internet connection.", variant: "destructive" });
      setSubmitting(false);
      return false;
    }
  };

  // Render node-specific template
  return (
    <div className="min-h-screen" style={{ background: bgColor, color: v.bodyText }}>
      {/* Clean nav - author name only */}
      <nav className="border-b px-4 py-3 flex items-center justify-between" style={{ borderColor: v.cardBorder }}>
        <Link to={`/${authorSlug}`} className="font-bold text-lg" style={{ color: v.headingText, fontFamily: hFont }}>
          {authorName}
        </Link>
        {data.book && (
          <Link to={`/${authorSlug}/${data.book.slug}`} className="text-sm hover:underline" style={{ color: v.accent }}>
            {data.book.title}
          </Link>
        )}
      </nav>

      {/* Node-specific content */}
      {resolvedNodeId === "BP-02" && <LeadMagnetPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} submitting={submitting} submitted={submitted} setQuizData={setQuizData} />}
      {resolvedNodeId === "BP-04" && <AuthorWebsitePage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} submitting={submitting} submitted={submitted} />}
      {resolvedNodeId === "BP-05" && <WebinarPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} submitting={submitting} submitted={submitted} />}
      {resolvedNodeId === "BP-06" && <SalesPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} type="workbook" />}
      {resolvedNodeId === "BP-07" && <SalesPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} type="home-study" />}
      {resolvedNodeId === "BP-08" && <SalesPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} type="special-edition" />}
      {resolvedNodeId === "BP-09" && <BookSalesPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} />}
      {resolvedNodeId === "BA-15" && <PressKitPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} />}
      {resolvedNodeId === "BA-16" && <AffiliatesPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} submitting={submitting} submitted={submitted} />}
      {resolvedNodeId === "BA-17" && <BundlesPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} />}
      {resolvedNodeId === "BA-18" && <JVPartnersPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} />}
      {resolvedNodeId === "BA-13" && <GroupCoachingPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} />}
      {resolvedNodeId === "BA-14" && <PodcastPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} submitting={submitting} submitted={submitted} />}
      {resolvedNodeId === "BA-10" && <OnlineCoursePage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} submitting={submitting} submitted={submitted} />}
      {resolvedNodeId === "YR-19" && <CoachingPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} />}
      {resolvedNodeId === "YR-20" && <BigTicketPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} />}
      {resolvedNodeId === "YR-21" && <SpeakingPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} />}
      {resolvedNodeId === "YR-22" && <CorporateTrainingPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} />}
      {resolvedNodeId === "YR-23" && <MastermindPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} />}
      {resolvedNodeId === "YR-24" && <RetreatPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} />}
      {resolvedNodeId === "YR-25" && <CertificationPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} />}
      {resolvedNodeId === "YR-26" && <ConferencePage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} />}
      {resolvedNodeId === "YR-27" && <FundraisingPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} />}
      {resolvedNodeId === "YR-28" && <SponsorsPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} />}
      {/* Generic fallback for other nodes */}
      {!["BP-02", "BP-04", "BP-05", "BP-06", "BP-07", "BP-08", "BP-09", "BA-10", "BA-13", "BA-14", "BA-15", "BA-16", "BA-17", "BA-18", "YR-19", "YR-20", "YR-21", "YR-22", "YR-23", "YR-24", "YR-25", "YR-26", "YR-27", "YR-28"].includes(resolvedNodeId!) && (
        <GenericPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} nodeId={resolvedNodeId!} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} />
      )}

      {/* Powered by footer */}
      <footer className="border-t px-4 py-6 text-center" style={{ borderColor: v.cardBorder }}>
        <p className="text-xs" style={{ color: v.mutedText }}>
          © {new Date().getFullYear()} {authorName} · Powered by{" "}
          <a href="https://authorsbureau.com" className="underline">Authors Bureau</a>
        </p>
      </footer>
    </div>
  );
}

/* ═══ SHARED PROPS ═══ */
interface PageProps {
  data: MicrositeData;
  content: any;
  v: any;
  hFont: string;
  bgColor: string;
}
interface FormPageProps extends PageProps {
  onSubmit: (e: React.FormEvent, extraData?: Record<string, any>) => Promise<boolean>;
  email: string; setEmail: (v: string) => void;
  firstName: string; setFirstName: (v: string) => void;
  submitting: boolean; submitted: boolean;
}

/* ═══ BP-02 — LEAD MAGNET ═══ */
function LeadMagnetPage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, submitting, submitted, setQuizData }: FormPageProps & { setQuizData: (d: any) => void }) {
  // New flow: landing → quiz → gate (collect email to see results) → results
  const [stage, setStage] = useState<"landing" | "quiz" | "gate" | "results">("landing");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [answerDetails, setAnswerDetails] = useState<{ question_number: number; answer_selected: string; answer_text: string }[]>([]);

  // Extract from nested content_payload structure
  const lmContent = content.leadMagnetContent || content;
  const parsedContent = typeof lmContent === "string" ? (() => { try { return JSON.parse(lmContent); } catch { return {}; } })() : lmContent;
  const optin = parsedContent?.optin_page || {};
  const quiz = parsedContent?.quiz_structure || {};
  const config = content.leadMagnetConfig || {};
  const headlineVariants = parsedContent?.headline_variants || [];
  const bestHeadline = optin.headline || headlineVariants?.[0]?.headline || parsedContent?.headline || content.headline || "";
  const subheadline = optin.subheadline || parsedContent?.subheadline || content.subheadline || "";
  const bullets = optin.bullet_points || parsedContent?.bullets || content.bullets || [];
  const ctaText = optin.cta_button_text || parsedContent?.cta_text || content.cta_text || "Start the Quiz →";
  const quizTitle = quiz.quiz_title || parsedContent?.funnel_name || "";
  const quizDesc = quiz.quiz_description || "";
  const questions: any[] = quiz.questions || [];
  const scoringTiers: any[] = quiz.scoring_tiers || [];
  const questionCount = questions.length || 8;
  const privacyNote = optin.privacy_note || "Your privacy is important to us. Your information will never be shared.";
  const accentColor = optin.color_palette?.primary || v.accent;
  const isQuiz = (config.type || "").toLowerCase().includes("quiz") || questions.length > 0;

  // Calculate score and tier (needed for gate teaser too)
  const totalScore = answers.reduce((sum, a) => sum + a, 0);
  const maxPossiblePerQ = questions.length > 0 && typeof questions[0]?.options?.[0] === "object"
    ? Math.max(...questions.flatMap((q: any) => (q.options || []).map((o: any) => o.points || 0)))
    : 3;
  const maxScore = questions.length * maxPossiblePerQ;
  const scorePercent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const getResultTier = () => {
    if (scoringTiers.length === 0) return { label: "Your Result", name: "Your Result", description: "Thank you for completing the quiz!", tips: [], tips_from_book: [] };
    for (const tier of scoringTiers) {
      if (tier.min != null && tier.max != null) {
        if (totalScore >= tier.min && totalScore <= tier.max) return tier;
      }
      if (tier.range) {
        const match = tier.range.match(/(\d+)\s*[-–]\s*(\d+)/);
        if (match) {
          const low = parseInt(match[1]);
          const high = parseInt(match[2]);
          if (totalScore >= low && totalScore <= high) return tier;
        }
      }
    }
    const tierIndex = Math.min(Math.floor((totalScore / Math.max(maxScore, 1)) * scoringTiers.length), scoringTiers.length - 1);
    return scoringTiers[tierIndex];
  };

  const resultTier = getResultTier();
  const tierName = resultTier.label || resultTier.name || "Complete";
  const tierTips: string[] = resultTier.tips_from_book || resultTier.tips || [];
  const authorName = data?.author?.pen_name || "";

  // After collecting email on gate, submit then show results
  const handleGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Build quiz data inline — don't rely on async state propagation
    const quizStageSlug = (tierName || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const quizPayload = {
      quiz_stage: quizStageSlug,
      quiz_score: scorePercent,
      quiz_answers: answerDetails,
    };
    setQuizData(quizPayload);
    const success = await onSubmit(e, quizPayload);
    if (success) {
      // BP-02: redirect to dedicated thank-you page (404 fix)
      const slug = data.author?.author_slug;
      if (slug) {
        window.location.href = `/${slug}/thank-you`;
        return;
      }
      setStage("results");
    }
  };

  const handleAnswer = (optionIndex: number) => {
    const option = questions[currentQ]?.options?.[optionIndex];
    const points = typeof option === "object" && option?.points != null ? option.points : optionIndex;
    const optLabel = typeof option === "string" ? option : option?.label || option?.text || `Option ${optionIndex + 1}`;
    const newAnswers = [...answers, points];
    setAnswers(newAnswers);
    setAnswerDetails([...answerDetails, {
      question_number: currentQ + 1,
      answer_selected: String.fromCharCode(65 + optionIndex),
      answer_text: optLabel,
    }]);
    if (currentQ + 1 < questions.length) {
      setCurrentQ(currentQ + 1);
    } else {
      setStage("gate");
    }
  };

  // (score/tier calculations moved to top of component)

  // ── STAGE: RESULTS (after email collected) ──
  if (stage === "results" && questions.length === 0) {
    return (
      <div className="min-h-[80vh] py-12 px-4 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${accentColor}10 0%, ${bgColor} 100%)` }}>
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl" style={{ background: `${accentColor}15` }}>
            🎉
          </div>
          <h1 className="text-3xl font-extrabold mb-3" style={{ color: v.headingText, fontFamily: hFont }}>
            You're In!
          </h1>
          <p className="text-lg mb-6" style={{ color: v.mutedText }}>
            Check your inbox — your free resource is on its way. Thank you, {firstName || "friend"}!
          </p>
          {data.book && (
            <Button asChild size="lg" className="rounded-full" style={{ background: accentColor, color: "#fff" }}>
              <a href={data.book.amazon_url || `/${data.author.author_slug}/${data.book.slug}`}>
                Learn More About the Book <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── STAGE: QUIZ ──
  if (stage === "quiz" && questions.length > 0) {
    const q = questions[currentQ];
    const progress = ((currentQ) / questions.length) * 100;
    return (
      <div className="min-h-[80vh] py-10 px-4" style={{ background: `linear-gradient(135deg, ${accentColor}08 0%, ${bgColor} 100%)` }}>
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold" style={{ color: v.headingText }}>Question {currentQ + 1} of {questions.length}</span>
              <span className="text-sm" style={{ color: v.mutedText }}>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: `${accentColor}20` }}>
              <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%`, background: accentColor }} />
            </div>
          </div>

          {/* Question */}
          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold leading-snug" style={{ color: v.headingText, fontFamily: hFont }}>
              {q.question || q.text}
            </h2>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {(q.options || []).map((opt: any, i: number) => {
              const optLabel = typeof opt === "string" ? opt : opt.label || opt.text || `Option ${i + 1}`;
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className="w-full text-left p-4 sm:p-5 rounded-xl border-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    background: v.cardBg,
                    borderColor: v.cardBorder,
                    color: v.bodyText,
                  }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = accentColor; (e.target as HTMLElement).style.background = `${accentColor}08`; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = v.cardBorder; (e.target as HTMLElement).style.background = v.cardBg; }}
                >
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold mr-3 shrink-0" style={{ background: `${accentColor}15`, color: accentColor }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-base">{optLabel}</span>
                </button>
              );
            })}

          </div>
        </div>
      </div>
    );
  }

  // ── STAGE: GATE (after quiz, before results — teaser + email capture) ──
  if (stage === "gate") {
    const teaserDescription = resultTier.description
      ? resultTier.description.split(".").slice(0, 1).join(".") + "."
      : "You've completed the assessment — unlock your full personalised action plan.";
    return (
      <div className="min-h-[80vh] py-12 px-4 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${accentColor}10 0%, ${bgColor} 100%)` }}>
        <div className="max-w-md mx-auto">
          <Card className="p-8 shadow-xl border-2" style={{ background: v.cardBg, borderColor: `${accentColor}40` }}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl" style={{ background: `${accentColor}15` }}>
                🎯
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: v.headingText, fontFamily: hFont }}>
                You're at: {tierName}
              </h2>
              <p className="text-sm mb-4 italic" style={{ color: v.mutedText }}>
                {teaserDescription}
              </p>
              <div className="w-full h-2 rounded-full mb-4 overflow-hidden" style={{ background: `${accentColor}15` }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${scorePercent}%`, background: accentColor }} />
              </div>
              <p className="text-base leading-relaxed" style={{ color: v.bodyText }}>
                Get your personalised action plan from {authorName || "the author"} — discover exactly what to do next based on your result.
              </p>
            </div>
            <form onSubmit={handleGateSubmit} className="space-y-3">
              <Input placeholder="Your first name" value={firstName} onChange={e => setFirstName(e.target.value)} required className="h-12 text-base" />
              <Input type="email" placeholder="Your best email" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 text-base" />
              <Button type="submit" className="w-full rounded-full h-12 text-base font-bold shadow-lg hover:shadow-xl transition-all" style={{ background: accentColor, color: "#fff" }} disabled={submitting}>
                {submitting ? "Unlocking..." : "Get My Personalised Plan →"}
              </Button>
            </form>
            <p className="text-[11px] mt-4 text-center flex items-center justify-center gap-1" style={{ color: v.mutedText }}>
              🔒 No spam. Unsubscribe anytime.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // ── STAGE: RESULTS (quiz completed + email collected) ──
  if (stage === "results") {
    return (
      <div className="min-h-[80vh] py-12 px-4" style={{ background: `linear-gradient(135deg, ${accentColor}10 0%, ${bgColor} 100%)` }}>
        <div className="max-w-2xl mx-auto">
          {/* Result header */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl" style={{ background: `${accentColor}15` }}>
              🏆
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-2" style={{ color: v.headingText, fontFamily: hFont }}>
              Your Result: {tierName}
            </h1>
            <p className="text-lg" style={{ color: v.mutedText }}>
              You scored {totalScore} out of {maxScore}
            </p>
            <p className="text-sm mt-3 p-3 rounded-lg inline-block" style={{ background: `${accentColor}10`, color: accentColor }}>
              ✉️ Your personalised plan is on its way to {email}! Check your inbox in the next few minutes.
            </p>
          </div>

          {/* Score bar */}
          <div className="mb-8 p-6 rounded-xl" style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}` }}>
            <div className="flex justify-between text-sm mb-2" style={{ color: v.mutedText }}>
              <span>Your Score</span>
              <span className="font-bold" style={{ color: accentColor }}>{scorePercent}%</span>
            </div>
            <div className="w-full h-4 rounded-full overflow-hidden" style={{ background: `${accentColor}15` }}>
              <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${scorePercent}%`, background: accentColor }} />
            </div>
          </div>

          {/* Description */}
          {resultTier.description && (
            <div className="mb-8 p-6 rounded-xl" style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}` }}>
              <p className="text-base leading-relaxed" style={{ color: v.bodyText }}>{resultTier.description}</p>
            </div>
          )}

          {/* Tips */}
          {tierTips.length > 0 && (
            <div className="mb-8 p-6 rounded-xl" style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}` }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: v.headingText, fontFamily: hFont }}>
                Personalised Recommendations
              </h3>
              <ul className="space-y-3">
                {tierTips.map((tip: string, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: accentColor }} />
                    <span style={{ color: v.bodyText }}>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Book CTA */}
          {data.book && (
            <div className="p-6 rounded-xl text-center" style={{ background: `${accentColor}10`, border: `2px solid ${accentColor}30` }}>
              <h3 className="text-lg font-bold mb-2" style={{ color: v.headingText, fontFamily: hFont }}>
                Ready for the Next Step?
              </h3>
              <p className="text-sm mb-4" style={{ color: v.mutedText }}>
                Go deeper with {data.book.title} and get the full framework.
              </p>
              {data.book.amazon_url ? (
                <a href={data.book.amazon_url} target="_blank" rel="noopener noreferrer">
                  <Button className="rounded-full px-8 h-12 text-base font-bold" style={{ background: accentColor, color: "#fff" }}>
                    Get the Book <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              ) : (
                <Button className="rounded-full px-8 h-12 text-base font-bold" style={{ background: accentColor, color: "#fff" }} asChild>
                  <Link to={`/${data.author.slug}/${data.book.slug}`}>
                    Get the Book <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          )}

          {/* Author strip */}
          <div className="mt-8 flex items-center gap-4 justify-center">
            {data.author.photo_url && (
              <img src={data.author.photo_url} alt={data.author.pen_name} className="w-12 h-12 rounded-full object-cover" />
            )}
            <p className="text-sm" style={{ color: v.mutedText }}>Created by <strong style={{ color: v.headingText }}>{data.author.pen_name}</strong></p>
          </div>
        </div>
      </div>
    );
  }

  // ── STAGE: LANDING (default — no email gate, just start quiz) ──
  return (
    <div className="min-h-[80vh]">
      {/* Hero Section */}
      <section className="py-16 sm:py-24 px-4" style={{ background: `linear-gradient(135deg, ${accentColor}15 0%, ${bgColor} 100%)` }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left: Compelling Copy */}
          <div>
            {isQuiz && (
              <span className="inline-block text-xs font-bold uppercase tracking-widest mb-4 px-3 py-1 rounded-full" style={{ background: `${accentColor}20`, color: accentColor }}>
                ⏱ {questionCount} Questions · Takes 90 Seconds
              </span>
            )}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-5" style={{ color: v.headingText, fontFamily: hFont }}>
              {bestHeadline || `Discover Where You Really Stand in Just 90 Seconds`}
            </h1>
            <p className="text-lg sm:text-xl mb-6 leading-relaxed" style={{ color: v.mutedText }}>
              {subheadline || `A free self-assessment based on ${data.book?.title || "the book"} with personalised recommendations just for you.`}
            </p>
            {bullets.length > 0 && (
              <ul className="space-y-3 mb-8">
                {bullets.map((b: string, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: accentColor }} />
                    <span className="text-base" style={{ color: v.bodyText }}>{b}</span>
                  </li>
                ))}
              </ul>
            )}

            {isQuiz && scoringTiers.length > 0 && (
              <p className="text-sm font-medium mt-6" style={{ color: v.mutedText }}>
                📊 {scoringTiers.length} result categories · Personalised tips from the book · Instant results
              </p>
            )}
          </div>

          {/* Right: Start Quiz Card (no email form) */}
          <div>
            <Card className="p-8 shadow-xl border-2" style={{ background: v.cardBg, borderColor: `${accentColor}40` }}>
              <div className="text-center">
                {isQuiz ? (
                  <>
                    <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl" style={{ background: `${accentColor}15` }}>
                      🎯
                    </div>
                    <h3 className="text-xl font-bold mb-1" style={{ color: v.headingText, fontFamily: hFont }}>
                      {quizTitle || "Start Your Free Assessment"}
                    </h3>
                    <p className="text-sm mb-6" style={{ color: v.mutedText }}>
                      {quizDesc || `Answer ${questionCount} quick questions and discover exactly where you are right now.`}
                    </p>
                    <Button
                      onClick={() => setStage("quiz")}
                      className="w-full rounded-full h-12 text-base font-bold shadow-lg hover:shadow-xl transition-all"
                      style={{ background: accentColor, color: "#fff" }}
                    >
                      {ctaText}
                    </Button>
                    <p className="text-[11px] mt-4" style={{ color: v.mutedText }}>No signup required to start · Results after completion</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold mb-1" style={{ color: v.headingText, fontFamily: hFont }}>
                      Get Your Free Copy
                    </h3>
                    <p className="text-sm mb-4" style={{ color: v.mutedText }}>Enter your details below for instant delivery.</p>
                    <form onSubmit={handleGateSubmit} className="space-y-3">
                      <Input placeholder="Your first name" value={firstName} onChange={e => setFirstName(e.target.value)} required className="h-12 text-base" />
                      <Input type="email" placeholder="Your best email" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 text-base" />
                      <Button type="submit" className="w-full rounded-full h-12 text-base font-bold shadow-lg hover:shadow-xl transition-all" style={{ background: accentColor, color: "#fff" }} disabled={submitting}>
                        {submitting ? "Sending..." : ctaText}
                      </Button>
                    </form>
                    <p className="text-[11px] mt-4" style={{ color: v.mutedText }}>{privacyNote}</p>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Author credibility strip */}
      <section className="border-t border-b py-8 px-4" style={{ borderColor: v.cardBorder, background: v.secondaryBg || `${accentColor}05` }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {data.author.photo_url && (
            <img src={data.author.photo_url} alt={data.author.pen_name} className="w-16 h-16 rounded-full object-cover shadow-md border-2" style={{ borderColor: `${accentColor}30` }} />
          )}
          <div className="text-center sm:text-left">
            <p className="text-base font-semibold" style={{ color: v.headingText }}>Created by {data.author.pen_name}</p>
            {data.author.credentials && Array.isArray(data.author.credentials) && (
              <p className="text-sm mt-0.5" style={{ color: v.mutedText }}>{(data.author.credentials as string[]).slice(0, 3).join(", ")}</p>
            )}
            {data.book?.title && (
              <p className="text-sm mt-1" style={{ color: v.mutedText }}>
                Based on the book <strong style={{ color: v.headingText }}>{data.book.title}</strong>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* How it works — quiz specific */}
      {isQuiz && (
        <section className="py-12 sm:py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-8" style={{ color: v.headingText, fontFamily: hFont }}>How It Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { icon: "📝", title: "Take the Quiz", desc: `Answer ${questionCount} quick multiple-choice questions about where you are right now.` },
                { icon: "📊", title: "Get Your Score", desc: "Discover which stage you're at with specific insights from the book." },
                { icon: "🎯", title: "Your Next Step", desc: "Receive personalised recommendations tailored to your exact situation." },
              ].map((step, i) => (
                <div key={i} className="p-6 rounded-xl" style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}` }}>
                  <div className="text-3xl mb-3">{step.icon}</div>
                  <h3 className="font-bold mb-2" style={{ color: v.headingText }}>{step.title}</h3>
                  <p className="text-sm" style={{ color: v.mutedText }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/* ═══ BP-04 — AUTHOR WEBSITE ═══ */
function AuthorWebsitePage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, submitting, submitted }: FormPageProps) {
  return (
    <div>
      {/* Hero */}
      <section className="py-16 sm:py-24 px-4" style={{ background: v.primary }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-3xl sm:text-5xl font-bold mb-4" style={{ color: v.primaryText, fontFamily: hFont }}>
              {content.headline || data.author.pen_name}
            </h1>
            <p className="text-lg mb-6" style={{ color: v.primaryText, opacity: 0.85 }}>
              {data.author.tagline || content.subheadline || data.context?.core_thesis || ""}
            </p>
            {data.book && (
              <Button className="rounded-full px-6" style={{ background: v.accent, color: v.accentText }}>
                <a href={`/${data.author.slug}/${data.book.slug}`}>
                  Discover {data.book.title} <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
          <div className="flex justify-center">
            {data.author.photo_url && (
              <img src={data.author.photo_url} alt={data.author.pen_name} className="w-48 h-48 sm:w-64 sm:h-64 rounded-2xl object-cover shadow-xl" />
            )}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-4" style={{ color: v.headingText, fontFamily: hFont }}>About {data.author.pen_name}</h2>
          <p className="text-base leading-relaxed mb-4" style={{ color: v.bodyText }}>
            {(data.author.bio_long || data.author.bio || "").replace(/<[^>]+>/g, "")}
          </p>
          {data.author.credentials && Array.isArray(data.author.credentials) && data.author.credentials.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {(data.author.credentials as string[]).map((c: string, i: number) => (
                <span key={i} className="text-xs px-3 py-1 rounded-full" style={{ background: v.secondaryBg, color: v.secondaryText }}>{c}</span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Book */}
      {data.book && (
        <section className="py-12 sm:py-16 px-4" style={{ background: v.secondaryBg }}>
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {data.book.cover_image_url && (
              <img src={data.book.cover_image_url} alt={data.book.title} className="w-full max-w-[280px] mx-auto rounded-xl shadow-lg" />
            )}
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: v.headingText, fontFamily: hFont }}>{data.book.title}</h2>
              {data.book.subtitle && <p className="text-base mb-4" style={{ color: v.mutedText }}>{data.book.subtitle}</p>}
              <p className="text-sm leading-relaxed mb-4" style={{ color: v.bodyText }}>{data.book.description}</p>
              <div className="flex gap-3">
                {data.book.amazon_url && (
                  <Button asChild style={{ background: v.accent, color: v.accentText }}>
                    <a href={data.book.amazon_url} target="_blank" rel="noopener noreferrer">Buy on Amazon</a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Lead capture (shared) */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-lg mx-auto">
          <LeadCaptureForm
            authorUserId={data.author.user_id}
            displayName={data.author.pen_name || "the author"}
            source="microsite"
            sourceDetail={data.author.author_slug || undefined}
            headline="Stay Connected"
            description="Get updates on new books, resources, and events."
            showMessage={false}
            accent={v.accent}
            accentText={v.accentText}
            primaryText={v.headingText}
            bodyText={v.mutedText}
            cardBg={v.cardBg}
            cardBorder={v.cardBorder}
          />
        </div>
      </section>

      {/* Contact */}
      {data.author.social && (
        <section className="py-8 px-4 border-t" style={{ borderColor: v.cardBorder }}>
          <div className="max-w-lg mx-auto flex justify-center gap-4">
            {data.author.social.website && <SocialLink label="Website" url={data.author.social.website} color={v.accent} />}
            {data.author.social.linkedin && <SocialLink label="LinkedIn" url={data.author.social.linkedin} color={v.accent} />}
            {data.author.social.twitter && <SocialLink label="Twitter" url={data.author.social.twitter} color={v.accent} />}
            {data.author.social.instagram && <SocialLink label="Instagram" url={data.author.social.instagram} color={v.accent} />}
            {data.author.social.youtube && <SocialLink label="YouTube" url={data.author.social.youtube} color={v.accent} />}
          </div>
        </section>
      )}
    </div>
  );
}

function SocialLink({ label, url, color }: { label: string; url: string; color: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium hover:underline" style={{ color }}>
      {label}
    </a>
  );
}

/* ═══ BP-05 — WEBINAR ═══ */
function WebinarPage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, submitting, submitted }: FormPageProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-20">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 text-sm font-medium" style={{ background: v.accent + "20", color: v.accent }}>
          <Calendar className="h-4 w-4" /> Free Live Webinar
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: v.headingText, fontFamily: hFont }}>
          {content.webinar_title || content.headline || "Free Webinar"}
        </h1>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: v.mutedText }}>
          {content.subheadline || content.description || ""}
        </p>
        {content.webinar_date ? (
          <p className="mt-4 text-sm font-medium" style={{ color: v.headingText }}>📅 {content.webinar_date}</p>
        ) : (
          <p className="mt-4 text-sm" style={{ color: v.mutedText }}>Date to be announced</p>
        )}
      </div>

      <div className="max-w-md mx-auto">
        {!submitted ? (
          <Card className="p-6" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
            <h3 className="text-lg font-semibold mb-4 text-center" style={{ color: v.headingText, fontFamily: hFont }}>
              Reserve Your Seat
            </h3>
            <form onSubmit={onSubmit} className="space-y-3">
              <Input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
              <Input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
              <Button type="submit" className="w-full rounded-full" style={{ background: v.accent, color: bgColor }} disabled={submitting}>
                {submitting ? "Registering..." : "Reserve My Seat"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="p-6 text-center" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3" style={{ color: v.accent }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: v.headingText }}>You're registered!</h3>
            <p className="text-sm" style={{ color: v.mutedText }}>Check your email for the webinar details and link.</p>
          </Card>
        )}
      </div>

      {/* Speaker info */}
      {data.author.photo_url && (
        <div className="flex items-center gap-4 max-w-md mx-auto mt-10">
          <img src={data.author.photo_url} alt={data.author.pen_name} className="w-14 h-14 rounded-full object-cover" />
          <div>
            <p className="font-semibold" style={{ color: v.headingText }}>Hosted by {data.author.pen_name}</p>
            <p className="text-sm" style={{ color: v.mutedText }}>{data.author.bio || ""}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ BP-06, BP-07, BP-08 — SALES PAGES ═══ */
function SalesPage({ data, content, v, hFont, bgColor, type }: PageProps & { type: "workbook" | "home-study" | "special-edition" }) {
  const labels = {
    "workbook": { title: "Workbook", cta: "Buy Now", icon: BookOpen },
    "home-study": { title: "Home Study Course", cta: "Enrol Now", icon: Users },
    "special-edition": { title: "Special Edition", cta: "Claim My Copy", icon: Star },
  };
  const cfg = labels[type];
  const hasStripeUrl = !!content.stripe_checkout_url || !!data.node.payment_link;
  const buyUrl = content.stripe_checkout_url || data.node.payment_link;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: v.headingText, fontFamily: hFont }}>
            {content.title || content.headline || cfg.title}
          </h1>
          {content.subtitle && <p className="text-lg mb-4" style={{ color: v.mutedText }}>{content.subtitle}</p>}
          <p className="text-base leading-relaxed mb-6" style={{ color: v.bodyText }}>
            {content.description || ""}
          </p>

          {/* Bullet points or modules list */}
          {(content.exercises || content.modules || content.bullets || content.bundle_contents) && (
            <ul className="space-y-2 mb-6">
              {(content.exercises || content.modules || content.bullets || content.bundle_contents || []).map((item: any, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: v.accent }} />
                  <span className="text-sm" style={{ color: v.bodyText }}>
                    {typeof item === "string" ? item : item.title || item.name || JSON.stringify(item)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <Card className="p-6" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
            {data.book?.cover_image_url && (
              <img src={data.book.cover_image_url} alt={data.book.title} className="w-full max-w-[200px] mx-auto rounded-lg mb-4" />
            )}
            <div className="text-center">
              {content.original_price && (
                <p className="text-sm line-through" style={{ color: v.mutedText }}>${content.original_price}</p>
              )}
              <p className="text-3xl font-bold mb-1" style={{ color: v.headingText }}>
                ${content.price || "TBA"}
              </p>
              {content.price && content.original_price && (
                <p className="text-sm font-medium mb-4" style={{ color: v.accent }}>
                  Save ${(Number(content.original_price) - Number(content.price)).toFixed(0)}
                </p>
              )}
              {data.node.id ? (
                <BuyNowButton
                  authorNodeId={data.node.id}
                  authorId={data.author?.id}
                  fallbackUrl={buyUrl}
                  label={cfg.cta}
                  className="w-full rounded-full text-base py-3"
                  style={{ background: v.accent, color: v.accentText }}
                />
              ) : hasStripeUrl ? (
                <Button className="w-full rounded-full text-base py-3" style={{ background: v.accent, color: v.accentText }} asChild>
                  <a href={buyUrl} target="_blank" rel="noopener noreferrer">
                    {cfg.cta} <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              ) : (
                <Button className="w-full rounded-full" disabled>
                  Coming Soon
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ═══ BP-09 — BOOK SALES PAGE ═══ */
function BookSalesPage({ data, content, v, hFont, bgColor }: PageProps) {
  const hasAmazon = !!content.amazon_url || !!data.book?.amazon_url;
  const hasStripe = !!content.stripe_checkout_url || !!data.node.payment_link;
  const amazonUrl = content.amazon_url || data.book?.amazon_url;
  const stripeUrl = content.stripe_checkout_url || data.node.payment_link;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div className="flex justify-center">
          {(data.book?.cover_image_url || content.cover_image_url) && (
            <img
              src={data.book?.cover_image_url || content.cover_image_url}
              alt={data.book?.title || content.title}
              className="w-full max-w-[300px] rounded-xl shadow-xl"
            />
          )}
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: v.headingText, fontFamily: hFont }}>
            {data.book?.title || content.title || "Book"}
          </h1>
          {(data.book?.subtitle || content.subtitle) && (
            <p className="text-lg mb-4" style={{ color: v.mutedText }}>{data.book?.subtitle || content.subtitle}</p>
          )}
          <p className="text-base leading-relaxed mb-6" style={{ color: v.bodyText }}>
            {content.book_description || data.book?.description || ""}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            {hasAmazon && (
              <Button className="flex-1 rounded-full" style={{ background: v.accent, color: v.accentText }} asChild>
                <a href={amazonUrl} target="_blank" rel="noopener noreferrer">
                  Buy on Amazon <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
            {data.node.id ? (
              <BuyNowButton
                authorNodeId={data.node.id}
                authorId={data.author?.id}
                fallbackUrl={stripeUrl}
                label="Buy Direct"
                className="flex-1 rounded-full"
                style={{ background: v.accent, color: v.accentText }}
              />
            ) : hasStripe ? (
              <Button className="flex-1 rounded-full" variant="outline" asChild>
                <a href={stripeUrl} target="_blank" rel="noopener noreferrer">
                  Buy Direct <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : null}
            {!hasAmazon && !data.node.id && !hasStripe && (
              <Button className="flex-1 rounded-full" disabled>Available Soon</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ PRESS KIT PAGE (BA-15) ═══ */
function PressKitPage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, lastName, setLastName, message, setMessage, submitting, submitted }: FormPageProps & { lastName: string; setLastName: (v: string) => void; message: string; setMessage: (v: string) => void }) {
  const pr = content.press_release;
  const prObj = pr && typeof pr === "object" ? pr : null;
  const prString = typeof pr === "string" ? pr : null;
  const speakerHeadline = content.speaker_headline || content.speaker_one_liner;
  const mediaKit = content.media_kit_url || data.node.delivery_url;
  const topics = Array.isArray(content.interview_topics) ? content.interview_topics : Array.isArray(content.speaking_topics) ? content.speaking_topics : [];
  const bookingMail = content.media_contact_email;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 sm:py-20 space-y-12">
      <header className="text-center space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: v.accent }}>Press & Media</p>
        <h1 className="text-3xl sm:text-5xl font-bold" style={{ color: v.headingText, fontFamily: hFont }}>
          {content.headline || `${data.author.pen_name} — Media Kit`}
        </h1>
        {speakerHeadline && <p className="text-lg max-w-2xl mx-auto" style={{ color: v.mutedText }}>{speakerHeadline}</p>}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {(prObj || prString) && (
            <Card className="p-6 space-y-3" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <h2 className="text-xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Press Release</h2>
              {prObj ? (
                <div className="space-y-3">
                  {prObj.headline && <h3 className="font-bold text-lg" style={{ color: v.headingText }}>{prObj.headline}</h3>}
                  {prObj.subheadline && <p className="italic" style={{ color: v.mutedText }}>{prObj.subheadline}</p>}
                  {prObj.body && <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: v.bodyText }}>{prObj.body}</p>}
                  {prObj.boilerplate && <p className="text-xs pt-2 border-t" style={{ color: v.mutedText, borderColor: v.cardBorder }}>{prObj.boilerplate}</p>}
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: v.bodyText }}>{prString}</p>
              )}
            </Card>
          )}

          {topics.length > 0 && (
            <Card className="p-6 space-y-3" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <h2 className="text-xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Interview Topics</h2>
              <ul className="space-y-2">
                {topics.map((t: any, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: v.accent }} />
                    <span className="text-sm" style={{ color: v.bodyText }}>{typeof t === "string" ? t : t.title || t.topic}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {mediaKit && (
            <Button asChild className="rounded-full" style={{ background: v.accent, color: v.accentText }}>
              <a href={mediaKit} target="_blank" rel="noopener noreferrer">Download Media Kit <ArrowRight className="ml-2 h-4 w-4" /></a>
            </Button>
          )}
        </div>

        <div className="md:col-span-1">
          {!submitted ? (
            <Card className="p-6" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: v.headingText, fontFamily: hFont }}>Pitch a Story</h3>
              <p className="text-xs mb-4" style={{ color: v.mutedText }}>Journalists, podcasters, producers — get in touch.</p>
              <form onSubmit={onSubmit} className="space-y-3">
                <Input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                <Input placeholder="Last name / Outlet" value={lastName} onChange={e => setLastName(e.target.value)} />
                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <textarea className="w-full border rounded-md p-2 text-sm min-h-[100px]" placeholder="Briefly: what's the story angle?" value={message} onChange={e => setMessage(e.target.value)} style={{ borderColor: v.cardBorder }} />
                <Button type="submit" className="w-full rounded-full" style={{ background: v.accent, color: bgColor }} disabled={submitting}>
                  {submitting ? "Sending..." : "Send Pitch"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
              {bookingMail && <p className="text-xs mt-3 text-center" style={{ color: v.mutedText }}>or email <a href={`mailto:${bookingMail}`} className="underline">{bookingMail}</a></p>}
            </Card>
          ) : (
            <Card className="p-6 text-center" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3" style={{ color: v.accent }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: v.headingText }}>Pitch received</h3>
              <p className="text-sm" style={{ color: v.mutedText }}>We'll be in touch shortly.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ JV PARTNERS PAGE (BA-18) ═══ */
function JVPartnersPage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, lastName, setLastName, message, setMessage, submitting, submitted }: FormPageProps & { lastName: string; setLastName: (v: string) => void; message: string; setMessage: (v: string) => void }) {
  const partners = Array.isArray(content.ideal_partners) ? content.ideal_partners : Array.isArray(content.ideal_partner_profiles) ? content.ideal_partner_profiles : [];
  const pitch = content.pitch_template;
  const pitchObj = pitch && typeof pitch === "object" ? pitch : null;
  const pitchString = typeof pitch === "string" ? pitch : null;
  const commission = content.commission_structure || content.revenue_share;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 sm:py-20 space-y-12">
      <header className="text-center space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: v.accent }}>Joint Venture Partnerships</p>
        <h1 className="text-3xl sm:text-5xl font-bold" style={{ color: v.headingText, fontFamily: hFont }}>
          {content.headline || `Partner with ${data.author.pen_name}`}
        </h1>
        {content.subheadline && <p className="text-lg max-w-2xl mx-auto" style={{ color: v.mutedText }}>{content.subheadline}</p>}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {partners.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Ideal Partners</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {partners.map((p: any, i: number) => (
                  <Card key={i} className="p-4 space-y-2" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                    <h3 className="font-semibold" style={{ color: v.headingText }}>{typeof p === "string" ? p : p.name || p.title || p.type}</h3>
                    {typeof p === "object" && p.description && <p className="text-sm" style={{ color: v.bodyText }}>{p.description}</p>}
                    {typeof p === "object" && p.audience && <p className="text-xs" style={{ color: v.mutedText }}>Audience: {p.audience}</p>}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {(pitchObj || pitchString) && (
            <Card className="p-6 space-y-3" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <h2 className="text-xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>The Pitch</h2>
              {pitchObj ? (
                <div className="space-y-3">
                  {pitchObj.subject && <p className="text-sm font-semibold" style={{ color: v.headingText }}>Subject: {pitchObj.subject}</p>}
                  {pitchObj.body && <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: v.bodyText }}>{pitchObj.body}</p>}
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: v.bodyText }}>{pitchString}</p>
              )}
            </Card>
          )}

          {commission && (
            <Card className="p-6" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <h2 className="text-xl font-semibold mb-2" style={{ color: v.headingText, fontFamily: hFont }}>Revenue Share</h2>
              <p className="text-sm whitespace-pre-wrap" style={{ color: v.bodyText }}>{typeof commission === "string" ? commission : JSON.stringify(commission, null, 2)}</p>
            </Card>
          )}
        </div>

        <div className="md:col-span-1">
          {!submitted ? (
            <Card className="p-6" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: v.headingText, fontFamily: hFont }}>Apply to Partner</h3>
              <form onSubmit={onSubmit} className="space-y-3">
                <Input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                <Input placeholder="Last name / Company" value={lastName} onChange={e => setLastName(e.target.value)} />
                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <textarea className="w-full border rounded-md p-2 text-sm min-h-[100px]" placeholder="Audience size, list, what you'd promote..." value={message} onChange={e => setMessage(e.target.value)} style={{ borderColor: v.cardBorder }} />
                <Button type="submit" className="w-full rounded-full" style={{ background: v.accent, color: bgColor }} disabled={submitting}>
                  {submitting ? "Sending..." : "Submit Application"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </Card>
          ) : (
            <Card className="p-6 text-center" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3" style={{ color: v.accent }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: v.headingText }}>Application received</h3>
              <p className="text-sm" style={{ color: v.mutedText }}>We'll review and reach out soon.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ AFFILIATES PAGE (BA-16) ═══ */
function AffiliatesPage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, submitting, submitted }: FormPageProps) {
  const tiers: any[] = content.commission_tiers ?? content.commission_structure ?? [];
  const resources = (content.affiliate_resources ?? []).map((r: any) =>
    typeof r === "string" ? { resource: r, description: "" } : r
  );
  const cookieDays = content.cookie_duration_days;
  const payoutSchedule = content.payout_schedule;
  const programmeTitle = content.programme_title || data.node.personalised_name || "Affiliate Programme";
  const tagline = content.tagline;
  const summary = content.abby_summary || content.overview;
  const headlineRates = tiers.slice(0, 2).map((t: any) => t?.commission_rate).filter(Boolean);
  const coreThesis = data.context?.core_thesis || "";
  const firstThesisSentence = coreThesis ? (coreThesis.split(/(?<=[.!?])\s+/)[0] || coreThesis) : "";

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 sm:py-20 space-y-12">
      <header className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-2 space-y-4">
          <p className="text-xs uppercase tracking-widest" style={{ color: v.accent }}>Affiliate Programme</p>
          <h1 className="text-3xl sm:text-5xl font-bold" style={{ color: v.headingText, fontFamily: hFont }}>
            {programmeTitle}
          </h1>
          {tagline && <p className="text-lg" style={{ color: v.mutedText }}>{tagline}</p>}
          {summary && <p className="text-base leading-relaxed" style={{ color: v.bodyText }}>{summary}</p>}
          {headlineRates.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {headlineRates.map((rate: string, i: number) => (
                <span key={i} className="px-3 py-1 rounded-full text-sm font-semibold border" style={{ background: v.cardBg, color: v.headingText, borderColor: v.accent }}>
                  {rate}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="md:col-span-1" id="apply-form">
          {!submitted ? (
            <Card className="p-6" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: v.headingText, fontFamily: hFont }}>Apply to Promote</h3>
              <form onSubmit={onSubmit} className="space-y-3">
                <Input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <Button type="submit" className="w-full rounded-full" style={{ background: v.accent, color: bgColor }} disabled={submitting}>
                  {submitting ? "Sending..." : "Apply"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </Card>
          ) : (
            <Card className="p-6 text-center" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3" style={{ color: v.accent }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: v.headingText }}>Application received</h3>
              <p className="text-sm" style={{ color: v.mutedText }}>We'll review and reach out with your affiliate link.</p>
            </Card>
          )}
        </div>
      </header>

      {tiers.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>What you'll earn</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {tiers.map((t: any, i: number) => (
              <Card key={i} className="p-6 space-y-3" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold" style={{ color: v.headingText }}>{t.tier || `Tier ${i + 1}`}</h3>
                  {t.commission_rate && <span className="text-xl font-bold" style={{ color: v.accent }}>{t.commission_rate}</span>}
                </div>
                {t.requirements && <p className="text-xs" style={{ color: v.mutedText }}>Requirements: {typeof t.requirements === "string" ? t.requirements : (Array.isArray(t.requirements) ? t.requirements.join(", ") : "")}</p>}
                {Array.isArray(t.benefits) && t.benefits.length > 0 && (
                  <ul className="space-y-1.5">
                    {t.benefits.map((b: string, j: number) => (
                      <li key={j} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: v.accent }} />
                        <span className="text-sm" style={{ color: v.bodyText }}>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {(cookieDays || payoutSchedule) && (
        <section className="text-center text-sm" style={{ color: v.mutedText }}>
          {cookieDays && <span>{cookieDays}-day cookie</span>}
          {cookieDays && payoutSchedule && <span> · </span>}
          {payoutSchedule && <span>{payoutSchedule}</span>}
        </section>
      )}

      {(data.book?.title || firstThesisSentence) && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>What you'll promote</h2>
          <Card className="p-6 flex flex-col sm:flex-row gap-4 items-start" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
            {data.book?.cover_image_url && (
              <img src={data.book.cover_image_url} alt={data.book.title} className="w-24 rounded shadow-md shrink-0" />
            )}
            <div className="space-y-2">
              <p className="font-semibold" style={{ color: v.headingText }}>
                {data.book?.title} {data.author?.pen_name && <span className="font-normal" style={{ color: v.mutedText }}>by {data.author.pen_name}</span>}
              </p>
              {firstThesisSentence && <p className="text-sm leading-relaxed" style={{ color: v.bodyText }}>{firstThesisSentence}</p>}
            </div>
          </Card>
        </section>
      )}

      {resources.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Your affiliate toolkit</h2>
          <Card className="p-6" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
            <ul className="space-y-3">
              {resources.map((r: any, i: number) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: v.accent }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: v.headingText }}>{r.resource}</p>
                    {r.description && <p className="text-sm" style={{ color: v.bodyText }}>{r.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <div className="text-center">
        <Button className="rounded-full px-8" style={{ background: v.accent, color: v.accentText }} asChild>
          <a href="#apply-form">Apply to Promote <ArrowRight className="ml-2 h-4 w-4" /></a>
        </Button>
      </div>
    </div>
  );
}

/* ═══ BUNDLES PAGE (BA-17) ═══ */
function BundlesPage({ data, content, v, hFont, bgColor }: PageProps) {
  const bundles: any[] = Array.isArray(content.bundles) ? content.bundles : [];
  const upsells: any[] = Array.isArray(content.upsell_sequences) ? content.upsell_sequences : [];
  const downsell = content.downsell;
  const ladderTitle = content.product_ladder_title || data.node.personalised_name || "Bundles & Offers";
  const summary = content.abby_summary;
  const paymentUrl = data.node.payment_link || content.stripe_checkout_url;
  const contactEmail = data.author?.contact_email || content.media_contact_email;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 sm:py-20 space-y-12">
      <header className="text-center space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: v.accent }}>Bundles & Offers</p>
        <h1 className="text-3xl sm:text-5xl font-bold" style={{ color: v.headingText, fontFamily: hFont }}>
          {ladderTitle}
        </h1>
        {summary && <p className="text-base max-w-2xl mx-auto" style={{ color: v.mutedText }}>{summary}</p>}
      </header>

      {bundles.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bundles.map((b: any, i: number) => (
            <Card key={i} className="p-6 flex flex-col gap-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <div className="space-y-1">
                <h3 className="text-xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>{b.bundle_name}</h3>
                {b.tagline && <p className="text-sm" style={{ color: v.mutedText }}>{b.tagline}</p>}
              </div>
              {Array.isArray(b.products_included) && b.products_included.length > 0 && (
                <ul className="space-y-1.5 flex-1">
                  {b.products_included.map((p: string, j: number) => (
                    <li key={j} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: v.accent }} />
                      <span className="text-sm" style={{ color: v.bodyText }}>{p}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: v.cardBorder }}>
                {b.individual_value_usd != null && (
                  <p className="text-sm line-through" style={{ color: v.mutedText }}>${b.individual_value_usd}</p>
                )}
                <div className="flex items-baseline gap-2">
                  {b.bundle_price_usd != null && (
                    <span className="text-3xl font-bold" style={{ color: v.headingText }}>${b.bundle_price_usd}</span>
                  )}
                  {b.savings_usd != null && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: v.accent, color: v.accentText }}>
                      Save ${b.savings_usd}
                    </span>
                  )}
                </div>
              </div>
              {paymentUrl ? (
                <Button asChild className="w-full rounded-full" style={{ background: v.accent, color: v.accentText }}>
                  <a href={paymentUrl} target="_blank" rel="noopener noreferrer">Get Bundle <ArrowRight className="ml-2 h-4 w-4" /></a>
                </Button>
              ) : contactEmail ? (
                <Button asChild variant="outline" className="w-full rounded-full">
                  <a href={`mailto:${contactEmail}?subject=${encodeURIComponent("Notify me: " + (b.bundle_name || "Bundle"))}`}>Notify Me</a>
                </Button>
              ) : (
                <Button asChild variant="outline" className="w-full rounded-full">
                  <Link to={`/${data.author.author_slug || ""}`}>Contact Author</Link>
                </Button>
              )}
            </Card>
          ))}
        </section>
      )}

      {upsells.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Upsell Sequences</h2>
          <div className="space-y-3">
            {upsells.map((u: any, i: number) => (
              <details key={i} className="group rounded-lg border p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                <summary className="cursor-pointer flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: v.headingText }}>{u.upsell_product || u.upsell_headline}</p>
                    {u.trigger && <p className="text-xs" style={{ color: v.mutedText }}>After: {u.trigger}</p>}
                  </div>
                  {u.upsell_price_usd != null && (
                    <span className="text-lg font-bold shrink-0" style={{ color: v.accent }}>${u.upsell_price_usd}</span>
                  )}
                </summary>
                <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: v.cardBorder }}>
                  {u.upsell_headline && <p className="text-sm font-semibold" style={{ color: v.headingText }}>{u.upsell_headline}</p>}
                  {u.upsell_copy && <p className="text-sm" style={{ color: v.bodyText }}>{u.upsell_copy}</p>}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {downsell && typeof downsell === "object" && (
        <section>
          <Card className="p-6 space-y-2" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: v.accent }}>Alternative Offer</p>
            <h3 className="text-lg font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>
              {downsell.downsell_product || downsell.downsell_headline}
            </h3>
            {downsell.trigger && <p className="text-xs" style={{ color: v.mutedText }}>Trigger: {downsell.trigger}</p>}
            {downsell.downsell_headline && downsell.downsell_product && (
              <p className="text-sm" style={{ color: v.bodyText }}>{downsell.downsell_headline}</p>
            )}
            {downsell.downsell_price_usd != null && (
              <p className="text-2xl font-bold" style={{ color: v.headingText }}>${downsell.downsell_price_usd}</p>
            )}
          </Card>
        </section>
      )}
    </div>
  );
}

/* ═══ BA-13 — GROUP COACHING ═══ */
function GroupCoachingPage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, lastName, setLastName, message, setMessage, submitting, submitted }: FormPageProps & { lastName: string; setLastName: (v: string) => void; message: string; setMessage: (v: string) => void }) {
  const title = (typeof content.programme_title === "string" && content.programme_title) || data.node.personalised_name || "Group Coaching Programme";
  const tagline = typeof content.tagline === "string" ? content.tagline : "";
  const transformation = typeof content.transformation_promise === "string" ? content.transformation_promise : "";
  const duration = typeof content.duration === "string" ? content.duration : "";
  const cohortSize = typeof content.cohort_size === "string" ? content.cohort_size : (typeof content.cohort_size === "number" ? `${content.cohort_size} seats` : "");
  const sessionFormat = typeof content.session_format === "string" ? content.session_format : "";
  const price = typeof content.suggested_price_usd === "number" ? content.suggested_price_usd : (typeof content.suggested_price_usd === "string" ? content.suggested_price_usd : null);
  const pricingRationale = typeof content.pricing_rationale === "string" ? content.pricing_rationale : "";
  const salesPage = typeof content.sales_page === "string" ? content.sales_page : "";

  const toLines = (val: any): string[] => {
    if (Array.isArray(val)) return val.map(x => typeof x === "string" ? x : (x?.title || x?.label || JSON.stringify(x))).filter(Boolean);
    if (typeof val === "string") return val.split(/\n+/).map(s => s.trim()).filter(Boolean);
    return [];
  };
  const whoFor = toLines(content.who_its_for);
  const whatGet = toLines(content.what_youll_get);

  const rawWeeks = Array.isArray(content.weeks) && content.weeks.length > 0 ? content.weeks : (Array.isArray(content.curriculum) ? content.curriculum : []);
  const weeks = rawWeeks.map((w: any, i: number) => ({
    number: w.week_number ?? w.week ?? i + 1,
    title: typeof w.title === "string" ? w.title : "",
    description: typeof w.description === "string" ? w.description : (typeof w.focus === "string" ? w.focus : ""),
    activities: toLines(w.activity ?? w.activities ?? w.homework),
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-2 space-y-10">
          <header className="space-y-4">
            <h1 className="text-3xl sm:text-5xl font-bold leading-tight" style={{ color: v.headingText, fontFamily: hFont }}>{title}</h1>
            {tagline && <p className="text-lg" style={{ color: v.accent }}>{tagline}</p>}
            {transformation && <p className="text-base leading-relaxed whitespace-pre-line" style={{ color: v.bodyText }}>{transformation}</p>}
          </header>

          {(duration || cohortSize || sessionFormat || price != null) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {duration && (
                <Card className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <p className="text-xs uppercase tracking-wider" style={{ color: v.mutedText }}>Duration</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: v.headingText }}>{duration}</p>
                </Card>
              )}
              {cohortSize && (
                <Card className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <p className="text-xs uppercase tracking-wider" style={{ color: v.mutedText }}>Cohort</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: v.headingText }}>{cohortSize}</p>
                </Card>
              )}
              {sessionFormat && (
                <Card className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <p className="text-xs uppercase tracking-wider" style={{ color: v.mutedText }}>Format</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: v.headingText }}>{sessionFormat}</p>
                </Card>
              )}
              {price != null && (
                <Card className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <p className="text-xs uppercase tracking-wider" style={{ color: v.mutedText }}>Investment</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: v.accent }}>{typeof price === "number" ? `$${price.toLocaleString()}` : price}</p>
                </Card>
              )}
            </div>
          )}

          {whoFor.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Who it's for</h2>
              <ul className="space-y-2">
                {whoFor.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: v.accent }} />
                    <span className="text-sm" style={{ color: v.bodyText }}>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {whatGet.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>What you'll get</h2>
              <ul className="space-y-2">
                {whatGet.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: v.accent }} />
                    <span className="text-sm" style={{ color: v.bodyText }}>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {weeks.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Curriculum</h2>
              <div className="space-y-3">
                {weeks.map((w, i) => (
                  <details key={i} className="group rounded-lg border p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                    <summary className="cursor-pointer flex items-baseline gap-3">
                      <span className="text-xs uppercase tracking-widest shrink-0" style={{ color: v.accent }}>Week {w.number}</span>
                      <span className="text-base font-semibold" style={{ color: v.headingText }}>{w.title}</span>
                    </summary>
                    {(w.description || w.activities.length > 0) && (
                      <div className="mt-3 pt-3 border-t space-y-3" style={{ borderColor: v.cardBorder }}>
                        {w.description && <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{w.description}</p>}
                        {w.activities.length > 0 && (
                          <ul className="space-y-1.5">
                            {w.activities.map((a, j) => (
                              <li key={j} className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: v.accent }} />
                                <span className="text-sm" style={{ color: v.bodyText }}>{a}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </details>
                ))}
              </div>
            </section>
          )}

          {pricingRationale && (
            <Card className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: v.mutedText }}>Why this price</p>
              <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{pricingRationale}</p>
            </Card>
          )}

          {salesPage && (
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>About this programme</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: v.bodyText }}>{salesPage}</p>
            </section>
          )}
        </div>

        <div className="md:sticky md:top-6">
          {!submitted ? (
            <Card className="p-6" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <h3 className="text-lg font-semibold mb-1" style={{ color: v.headingText, fontFamily: hFont }}>Apply Now</h3>
              <p className="text-xs mb-4" style={{ color: v.mutedText }}>Limited seats. Tell us a bit about yourself.</p>
              <form onSubmit={onSubmit} className="space-y-3">
                <Input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                <Input placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} />
                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <textarea className="w-full border rounded-md p-2 text-sm min-h-[80px]" placeholder="Why do you want to join?" value={message} onChange={e => setMessage(e.target.value)} style={{ borderColor: v.cardBorder }} />
                <Button type="submit" className="w-full rounded-full" style={{ background: v.accent, color: bgColor }} disabled={submitting}>
                  {submitting ? "Submitting..." : "Apply Now"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </Card>
          ) : (
            <Card className="p-6 text-center" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3" style={{ color: v.accent }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: v.headingText }}>Application received</h3>
              <p className="text-sm" style={{ color: v.mutedText }}>We'll review and reach out shortly.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ BA-14 — PODCAST ═══ */
function PodcastPage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, submitting, submitted }: FormPageProps) {
  const showTitle = (typeof content.podcast_title === "string" && content.podcast_title) || (typeof content.show_title === "string" && content.show_title) || data.node.personalised_name || "Podcast";
  const showSubtitle = typeof content.show_subtitle === "string" ? content.show_subtitle : "";
  const tagline = typeof content.tagline === "string" ? content.tagline : "";
  const showDescription = typeof content.show_description === "string" ? content.show_description : "";
  const episodeFormat = typeof content.episode_format === "string" ? content.episode_format : "";
  const releaseCadence = typeof content.release_cadence === "string" ? content.release_cadence : "";
  const targetListener = typeof content.target_listener === "string" ? content.target_listener : "";
  const episodeLength = typeof content.episode_length_minutes === "number" ? `${content.episode_length_minutes} min` : (typeof content.episode_length_minutes === "string" ? content.episode_length_minutes : "");

  const platforms: Array<{ label: string; url?: string }> = Array.isArray(content.distribution_platforms)
    ? content.distribution_platforms.map((p: any) => {
        if (typeof p === "string") return { label: p };
        if (p && typeof p === "object") return { label: typeof p.platform === "string" ? p.platform : (typeof p.name === "string" ? p.name : "Platform"), url: typeof p.url === "string" ? p.url : undefined };
        return { label: "Platform" };
      })
    : [];

  const richEps = Array.isArray(content.first_10_episodes) ? content.first_10_episodes : [];
  const simpleEps = Array.isArray(content.episodes) ? content.episodes : [];
  const useRich = richEps.length > 0;
  const episodes = (useRich ? richEps : simpleEps).map((e: any, i: number) => ({
    number: e.number ?? e.episode_number ?? i + 1,
    title: typeof e.title === "string" ? e.title : `Episode ${i + 1}`,
    hook: typeof e.hook === "string" ? e.hook : "",
    description: typeof e.description === "string" ? e.description : "",
    keyPoints: Array.isArray(e.key_points) ? e.key_points.filter((k: any) => typeof k === "string") : [],
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-2 space-y-10">
          <header className="flex flex-col sm:flex-row gap-6 items-start">
            {data.book?.cover_image_url ? (
              <img src={data.book.cover_image_url} alt={data.book.title} className="w-32 h-32 rounded-xl shadow-lg object-cover shrink-0" />
            ) : (
              <div className="w-32 h-32 rounded-xl shrink-0 flex items-center justify-center" style={{ background: v.cardBg, borderColor: v.cardBorder, borderWidth: 1 }}>
                <Mail className="h-10 w-10" style={{ color: v.accent }} />
              </div>
            )}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl font-bold leading-tight" style={{ color: v.headingText, fontFamily: hFont }}>{showTitle}</h1>
              {showSubtitle && <p className="text-lg italic" style={{ color: v.mutedText }}>{showSubtitle}</p>}
              {tagline && <p className="text-base" style={{ color: v.accent }}>{tagline}</p>}
            </div>
          </header>

          {showDescription && (
            <p className="text-base leading-relaxed whitespace-pre-line" style={{ color: v.bodyText }}>{showDescription}</p>
          )}

          {platforms.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm uppercase tracking-widest" style={{ color: v.mutedText }}>Where to listen</h2>
              <div className="flex flex-wrap gap-2">
                {platforms.map((p, i) => p.url ? (
                  <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium border hover:opacity-80" style={{ background: v.cardBg, borderColor: v.cardBorder, color: v.headingText }}>
                    {p.label} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span key={i} className="inline-flex items-center rounded-full px-4 py-1.5 text-sm border" style={{ background: v.cardBg, borderColor: v.cardBorder, color: v.mutedText }}>
                    Coming to {p.label}
                  </span>
                ))}
              </div>
            </section>
          )}

          {episodes.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Episodes</h2>
              <div className="space-y-3">
                {episodes.map((e, i) => (
                  <details key={i} className="group rounded-lg border p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                    <summary className="cursor-pointer flex items-baseline gap-3">
                      <span className="text-xs uppercase tracking-widest shrink-0" style={{ color: v.accent }}>Ep {e.number}</span>
                      <span className="text-base font-semibold" style={{ color: v.headingText }}>{e.title}</span>
                    </summary>
                    <div className="mt-3 pt-3 border-t space-y-3" style={{ borderColor: v.cardBorder }}>
                      {e.hook && (
                        <blockquote className="border-l-2 pl-3 italic text-sm" style={{ borderColor: v.accent, color: v.bodyText }}>{e.hook}</blockquote>
                      )}
                      {e.description && <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{e.description}</p>}
                      {e.keyPoints.length > 0 && (
                        <ul className="space-y-1.5">
                          {e.keyPoints.map((k, j) => (
                            <li key={j} className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: v.accent }} />
                              <span className="text-sm" style={{ color: v.bodyText }}>{k}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}

          {(episodeFormat || releaseCadence || targetListener || episodeLength) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {episodeFormat && (
                <Card className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <p className="text-xs uppercase tracking-wider" style={{ color: v.mutedText }}>Format</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: v.headingText }}>{episodeFormat}</p>
                </Card>
              )}
              {releaseCadence && (
                <Card className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <p className="text-xs uppercase tracking-wider" style={{ color: v.mutedText }}>Cadence</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: v.headingText }}>{releaseCadence}</p>
                </Card>
              )}
              {episodeLength && (
                <Card className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <p className="text-xs uppercase tracking-wider" style={{ color: v.mutedText }}>Length</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: v.headingText }}>{episodeLength}</p>
                </Card>
              )}
              {targetListener && (
                <Card className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <p className="text-xs uppercase tracking-wider" style={{ color: v.mutedText }}>For</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: v.headingText }}>{targetListener}</p>
                </Card>
              )}
            </div>
          )}
        </div>

        <div className="md:sticky md:top-6">
          {!submitted ? (
            <Card className="p-6" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <h3 className="text-lg font-semibold mb-1" style={{ color: v.headingText, fontFamily: hFont }}>Notify Me on Launch</h3>
              <p className="text-xs mb-4" style={{ color: v.mutedText }}>Be the first to know when episode 1 drops.</p>
              <form onSubmit={onSubmit} className="space-y-3">
                <Input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <Button type="submit" className="w-full rounded-full" style={{ background: v.accent, color: bgColor }} disabled={submitting}>
                  {submitting ? "Submitting..." : "Notify Me"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </Card>
          ) : (
            <Card className="p-6 text-center" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3" style={{ color: v.accent }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: v.headingText }}>You're on the list</h3>
              <p className="text-sm" style={{ color: v.mutedText }}>We'll let you know when episode 1 drops.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ GENERIC PAGE (BA-10 through YR-28) ═══ */
function GenericPage({ data, content, v, hFont, bgColor, nodeId, onSubmit, email, setEmail, firstName, setFirstName, lastName, setLastName, message, setMessage, submitting, submitted }: FormPageProps & { nodeId: string; lastName: string; setLastName: (v: string) => void; message: string; setMessage: (v: string) => void }) {
  const actionType = getActionType(nodeId);
  const hasPaymentLink = !!data.node.payment_link || !!content.stripe_checkout_url;
  const paymentUrl = data.node.payment_link || content.stripe_checkout_url;
  const pageTitle = data.node.personalised_name || NODE_NAMES[nodeId] || "Details";

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: v.headingText, fontFamily: hFont }}>
            {content.headline || pageTitle}
          </h1>
          {content.subheadline && <p className="text-lg" style={{ color: v.mutedText }}>{content.subheadline}</p>}
          {content.description && <p className="text-base leading-relaxed" style={{ color: v.bodyText }}>{content.description}</p>}

          {content.bullets && Array.isArray(content.bullets) && (
            <ul className="space-y-2">
              {content.bullets.map((b: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: v.accent }} />
                  <span className="text-sm" style={{ color: v.bodyText }}>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {nodeId === "BA-11" && (
            <AudiobookPreviewPlayer
              chapters={Array.isArray(content.chapters) ? content.chapters : undefined}
              chapterUrls={Array.isArray(content.chapter_urls) ? content.chapter_urls : undefined}
              previewUrl={content.preview_url || data.node.delivery_url || null}
              freeChapterCount={1}
              accent={v.accent}
              cardBg={v.cardBg}
              cardBorder={v.cardBorder}
              headingText={v.headingText}
              bodyText={v.bodyText}
              mutedText={v.mutedText}
            />
          )}

          {content.price && (
            <p className="text-2xl font-bold" style={{ color: v.headingText }}>${content.price}</p>
          )}

          {actionType === "purchase" && hasPaymentLink && (
            <Button className="rounded-full px-8 py-3" style={{ background: v.accent, color: v.accentText }} asChild>
              <a href={paymentUrl} target="_blank" rel="noopener noreferrer">
                {content.cta_text || "Get Started"} <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
          {actionType === "purchase" && !hasPaymentLink && (
            <Button className="rounded-full" disabled>Coming Soon</Button>
          )}
        </div>

        <div>
          {(actionType === "optin" || actionType === "enquiry" || actionType === "application") && !submitted ? (
            <Card className="p-6" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: v.headingText, fontFamily: hFont }}>
                {actionType === "optin" ? content.form_heading || "Get Access" : actionType === "enquiry" ? "Get in Touch" : "Apply Now"}
              </h3>
              <form onSubmit={onSubmit} className="space-y-3">
                <Input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                {(actionType === "enquiry" || actionType === "application") && (
                  <Input placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} />
                )}
                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                {actionType === "enquiry" && (
                  <textarea className="w-full border rounded-md p-2 text-sm min-h-[80px]" placeholder="Tell us about your needs..." value={message} onChange={e => setMessage(e.target.value)} style={{ borderColor: v.cardBorder }} />
                )}
                <Button type="submit" className="w-full rounded-full" style={{ background: v.accent, color: bgColor }} disabled={submitting}>
                  {submitting ? "Submitting..." : content.cta_text || "Submit"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </Card>
          ) : submitted ? (
            <Card className="p-6 text-center" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3" style={{ color: v.accent }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: v.headingText }}>Thank you!</h3>
              <p className="text-sm" style={{ color: v.mutedText }}>We'll be in touch soon.</p>
            </Card>
          ) : data.book?.cover_image_url ? (
            <img src={data.book.cover_image_url} alt={data.book.title} className="w-full max-w-[300px] mx-auto rounded-xl shadow-lg" />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ═══ BA-10 — ONLINE COURSE ═══ */
function OnlineCoursePage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, submitting, submitted }: FormPageProps) {
  const title = (typeof content.course_title === "string" && content.course_title) || data.node.personalised_name || "Online Course";
  const subtitle = typeof content.course_subtitle === "string" ? content.course_subtitle : "";
  const tagline = typeof content.tagline === "string" ? content.tagline : "";
  const transformation = typeof content.transformation_promise === "string" ? content.transformation_promise : "";
  const longDesc = typeof content.course_description_long === "string" ? content.course_description_long : "";
  const duration = typeof content.duration === "string" ? content.duration : "";
  const difficulty = typeof content.difficulty_level === "string" ? content.difficulty_level : "";
  const pedagogical = typeof content.pedagogical_approach === "string" ? content.pedagogical_approach : "";
  const salesCopy = typeof content.sales_copy === "string" ? content.sales_copy : "";
  const pricingRationale = typeof content.pricing_rationale === "string" ? content.pricing_rationale : "";
  const price = typeof content.suggested_price_usd === "number" ? content.suggested_price_usd : (typeof content.suggested_price_usd === "string" ? content.suggested_price_usd : null);
  const paymentLink = (typeof data.node.payment_link === "string" && data.node.payment_link) || (typeof (content as any).stripe_checkout_url === "string" ? (content as any).stripe_checkout_url : "");

  const toLines = (val: any): string[] => {
    if (Array.isArray(val)) return val.map(x => typeof x === "string" ? x : (x?.title || x?.label || x?.text || "")).filter(Boolean);
    if (typeof val === "string") return val.split(/\n+/).map(s => s.trim()).filter(Boolean);
    return [];
  };
  const whoFor = toLines(content.who_its_for);
  const whatGet = toLines(content.what_youll_get);

  const rawModules = Array.isArray(content.modules) ? content.modules : (Array.isArray((content as any).curriculum) ? (content as any).curriculum : []);
  const modules = rawModules.map((m: any, i: number) => ({
    number: m.module_number ?? m.number ?? i + 1,
    title: typeof m.title === "string" ? m.title : `Module ${i + 1}`,
    description: typeof m.description === "string" ? m.description : (typeof m.summary === "string" ? m.summary : ""),
    items: toLines(m.lessons ?? m.learning_outcomes ?? m.outcomes ?? m.topics),
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-2 space-y-10">
          <header className="space-y-4">
            <h1 className="text-3xl sm:text-5xl font-bold leading-tight" style={{ color: v.headingText, fontFamily: hFont }}>{title}</h1>
            {subtitle && <p className="text-xl italic" style={{ color: v.bodyText }}>{subtitle}</p>}
            {tagline && <p className="text-lg" style={{ color: v.accent }}>{tagline}</p>}
            {transformation && <p className="text-base leading-relaxed whitespace-pre-line" style={{ color: v.bodyText }}>{transformation}</p>}
          </header>

          {(duration || difficulty || modules.length > 0 || price != null) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {duration && (
                <Card className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <p className="text-xs uppercase tracking-wider" style={{ color: v.mutedText }}>Duration</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: v.headingText }}>{duration}</p>
                </Card>
              )}
              {difficulty && (
                <Card className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <p className="text-xs uppercase tracking-wider" style={{ color: v.mutedText }}>Level</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: v.headingText }}>{difficulty}</p>
                </Card>
              )}
              {modules.length > 0 && (
                <Card className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <p className="text-xs uppercase tracking-wider" style={{ color: v.mutedText }}>Modules</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: v.headingText }}>{modules.length} modules</p>
                </Card>
              )}
              {price != null && (
                <Card className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <p className="text-xs uppercase tracking-wider" style={{ color: v.mutedText }}>Investment</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: v.accent }}>{typeof price === "number" ? `$${price.toLocaleString()}` : price}</p>
                </Card>
              )}
            </div>
          )}

          {whoFor.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Who it's for</h2>
              <ul className="space-y-2">
                {whoFor.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: v.accent }} />
                    <span className="text-sm" style={{ color: v.bodyText }}>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {whatGet.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>What you'll get</h2>
              <ul className="space-y-2">
                {whatGet.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: v.accent }} />
                    <span className="text-sm" style={{ color: v.bodyText }}>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {modules.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Curriculum</h2>
              <div className="space-y-3">
                {modules.map((m, i) => (
                  <details key={i} className="group rounded-lg border p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                    <summary className="cursor-pointer flex items-baseline gap-3">
                      <span className="text-xs uppercase tracking-widest shrink-0" style={{ color: v.accent }}>Module {m.number}</span>
                      <span className="text-base font-semibold" style={{ color: v.headingText }}>{m.title}</span>
                    </summary>
                    {(m.description || m.items.length > 0) && (
                      <div className="mt-3 pt-3 border-t space-y-3" style={{ borderColor: v.cardBorder }}>
                        {m.description && <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{m.description}</p>}
                        {m.items.length > 0 && (
                          <ul className="space-y-1.5">
                            {m.items.map((a, j) => (
                              <li key={j} className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: v.accent }} />
                                <span className="text-sm" style={{ color: v.bodyText }}>{a}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </details>
                ))}
              </div>
            </section>
          )}

          {pedagogical && (
            <Card className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: v.mutedText }}>Teaching approach</p>
              <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{pedagogical}</p>
            </Card>
          )}

          {salesCopy ? (
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>About this course</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: v.bodyText }}>{salesCopy}</p>
            </section>
          ) : longDesc ? (
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>About this course</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: v.bodyText }}>{longDesc}</p>
            </section>
          ) : null}

          {pricingRationale && (
            <Card className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: v.mutedText }}>Why this price</p>
              <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{pricingRationale}</p>
            </Card>
          )}
        </div>

        <div className="md:sticky md:top-6">
          {paymentLink ? (
            <Card className="p-6" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <h3 className="text-lg font-semibold mb-1" style={{ color: v.headingText, fontFamily: hFont }}>Enroll Now</h3>
              {price != null && (
                <p className="text-3xl font-bold my-3" style={{ color: v.accent }}>{typeof price === "number" ? `$${price.toLocaleString()}` : price}</p>
              )}
              <p className="text-xs mb-4" style={{ color: v.mutedText }}>Lifetime access. Start immediately.</p>
              <a href={paymentLink} target="_blank" rel="noopener noreferrer">
                <Button className="w-full rounded-full" style={{ background: v.accent, color: bgColor }}>
                  Enroll Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </Card>
          ) : !submitted ? (
            <Card className="p-6" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <h3 className="text-lg font-semibold mb-1" style={{ color: v.headingText, fontFamily: hFont }}>Notify Me When Enrollment Opens</h3>
              <p className="text-xs mb-4" style={{ color: v.mutedText }}>Be the first to know when doors open.</p>
              <form onSubmit={onSubmit} className="space-y-3">
                <Input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <Button type="submit" className="w-full rounded-full" style={{ background: v.accent, color: bgColor }} disabled={submitting}>
                  {submitting ? "Submitting..." : "Notify Me"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </Card>
          ) : (
            <Card className="p-6 text-center" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3" style={{ color: v.accent }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: v.headingText }}>You're on the list</h3>
              <p className="text-sm" style={{ color: v.mutedText }}>We'll email you the moment enrollment opens.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ YR SHARED HELPERS ═══ */
type YRPageProps = FormPageProps & { lastName: string; setLastName: (v: string) => void; message: string; setMessage: (v: string) => void };

const yrStr = (v: any, fallback = ""): string => (typeof v === "string" && v.trim()) ? v : fallback;
const yrArr = (v: any): any[] => Array.isArray(v) ? v : [];
const yrLines = (val: any): string[] => {
  if (Array.isArray(val)) return val.map(x => typeof x === "string" ? x : (x?.title || x?.label || x?.text || x?.name || "")).filter(Boolean);
  if (typeof val === "string") return val.split(/\n+/).map(s => s.trim()).filter(Boolean);
  return [];
};
const yrInline = (v: any): string => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
};

function YRRightCard({
  actionType, paymentLink, price, ctaLabel, v, hFont, bgColor,
  onSubmit, email, setEmail, firstName, setFirstName, lastName, setLastName, message, setMessage, submitting, submitted,
  notifyHeading = "Notify Me", thankYou = "We'll be in touch soon.",
  inquiryHeading, inquiryIntro, messagePlaceholder,
  commerceNodeRowId, commerceAuthorId, commerceLabel,
  selectedOfferLabel, selectedOfferPrice,
}: {
  actionType: "purchase" | "enquiry" | "application" | "optin" | "donate";
  paymentLink?: string; price?: number | string | null; ctaLabel?: string;
  v: any; hFont: string; bgColor: string;
  onSubmit: (e: React.FormEvent, extraData?: Record<string, any>) => Promise<boolean>;
  email: string; setEmail: (v: string) => void;
  firstName: string; setFirstName: (v: string) => void;
  lastName: string; setLastName: (v: string) => void;
  message: string; setMessage: (v: string) => void;
  submitting: boolean; submitted: boolean;
  notifyHeading?: string; thankYou?: string;
  inquiryHeading?: string; inquiryIntro?: string; messagePlaceholder?: string;
  commerceNodeRowId?: string | null; commerceAuthorId?: string | null; commerceLabel?: string;
  selectedOfferLabel?: string; selectedOfferPrice?: number | string | null;
}) {
  if (submitted) {
    return (
      <Card className="p-6 text-center" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
        <CheckCircle2 className="h-12 w-12 mx-auto mb-3" style={{ color: v.accent }} />
        <h3 className="text-lg font-semibold mb-2" style={{ color: v.headingText }}>Thank you!</h3>
        <p className="text-sm" style={{ color: v.mutedText }}>{thankYou}</p>
      </Card>
    );
  }

  // Stripe checkout via BuyNowButton when a price is registered on author_nodes.
  if ((actionType === "purchase" || actionType === "donate") && commerceNodeRowId && (typeof price === "number" && price > 0)) {
    return (
      <Card className="p-6" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
        <h3 className="text-lg font-semibold mb-1" style={{ color: v.headingText, fontFamily: hFont }}>{commerceLabel || ctaLabel || "Get Started"}</h3>
        <p className="text-3xl font-bold my-3" style={{ color: v.accent }}>${Number(price).toLocaleString()}</p>
        {selectedOfferLabel && <p className="text-xs mb-3" style={{ color: v.mutedText }}>{selectedOfferLabel}</p>}
        <BuyNowButton
          authorNodeId={commerceNodeRowId}
          authorId={commerceAuthorId || undefined}
          fallbackUrl={paymentLink || null}
          label={commerceLabel || ctaLabel || "Get Started"}
          className="w-full rounded-full"
          style={{ background: v.accent, color: bgColor }}
        />
      </Card>
    );
  }

  // Static payment link fallback (legacy)
  if (actionType === "purchase" && paymentLink) {
    return (
      <Card className="p-6" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
        <h3 className="text-lg font-semibold mb-1" style={{ color: v.headingText, fontFamily: hFont }}>{ctaLabel || "Get Started"}</h3>
        {price != null && (
          <p className="text-3xl font-bold my-3" style={{ color: v.accent }}>{typeof price === "number" ? `$${price.toLocaleString()}` : price}</p>
        )}
        <a href={paymentLink} target="_blank" rel="noopener noreferrer">
          <Button className="w-full rounded-full" style={{ background: v.accent, color: bgColor }}>
            {ctaLabel || "Get Started"} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </a>
      </Card>
    );
  }

  const isApp = actionType === "application";
  const isDonate = actionType === "donate";
  const isEnq = actionType === "enquiry" || isDonate;
  const heading = inquiryHeading || (isApp ? "Apply Now" : isDonate ? "Make a Donation" : isEnq ? "Get in Touch" : notifyHeading);
  const submitLabel = ctaLabel || (isApp ? "Submit Application" : isDonate ? "Pledge Support" : isEnq ? "Send Enquiry" : "Notify Me");
  const placeholder = messagePlaceholder || (isApp ? "Why are you a fit? Tell us about you..." : isDonate ? "Share why you'd like to support…" : "Tell us what you're looking for...");

  const handleSubmit = (e: React.FormEvent) => {
    const extra: Record<string, any> = {};
    if (selectedOfferLabel) extra.selected_offer = selectedOfferLabel;
    if (selectedOfferPrice != null) extra.selected_price = selectedOfferPrice;
    return onSubmit(e, Object.keys(extra).length ? extra : undefined);
  };

  return (
    <Card className="p-6" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
      <h3 className="text-lg font-semibold mb-1" style={{ color: v.headingText, fontFamily: hFont }}>{heading}</h3>
      {inquiryIntro && <p className="text-xs mb-4" style={{ color: v.mutedText }}>{inquiryIntro}</p>}
      {selectedOfferLabel && (
        <div className="my-3 p-2 rounded-md text-xs" style={{ background: `${v.accent}15`, color: v.headingText }}>
          Interested in: <strong>{selectedOfferLabel}</strong>
          {selectedOfferPrice != null && <> — <span style={{ color: v.accent }}>{typeof selectedOfferPrice === "number" ? `$${selectedOfferPrice.toLocaleString()}` : selectedOfferPrice}</span></>}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3 mt-3">
        <Input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
        {(isApp || isEnq) && <Input placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} />}
        <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        {(isApp || isEnq) && (
          <textarea className="w-full border rounded-md p-2 text-sm min-h-[80px]" placeholder={placeholder} value={message} onChange={e => setMessage(e.target.value)} style={{ borderColor: v.cardBorder }} />
        )}
        <Button type="submit" className="w-full rounded-full" style={{ background: v.accent, color: bgColor }} disabled={submitting}>
          {submitting ? "Submitting..." : submitLabel} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
}

function YRLayout({ title, tagline, intro, children, right, v, hFont }: { title: string; tagline?: string; intro?: string; children: React.ReactNode; right: React.ReactNode; v: any; hFont: string }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-2 space-y-10">
          <header className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-bold leading-tight" style={{ color: v.headingText, fontFamily: hFont }}>{title}</h1>
            {tagline && <p className="text-lg italic" style={{ color: v.accent }}>{tagline}</p>}
            {intro && <p className="text-base leading-relaxed whitespace-pre-line" style={{ color: v.bodyText }}>{intro}</p>}
          </header>
          {children}
        </div>
        <div className="md:sticky md:top-6">{right}</div>
      </div>
    </div>
  );
}

function YRBulletSection({ heading, items, v, hFont }: { heading: string; items: string[]; v: any; hFont: string }) {
  if (!items.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>{heading}</h2>
      <ul className="space-y-2">
        {items.map((line, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: v.accent }} />
            <span className="text-sm" style={{ color: v.bodyText }}>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ═══ YR-19 — 1-ON-1 COACHING ═══ */
function CoachingPage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, lastName, setLastName, message, setMessage, submitting, submitted }: YRPageProps) {
  const title = yrStr(content.practice_title, data.node.personalised_name || NODE_NAMES["YR-19"] || "Coaching");
  const tagline = yrStr(content.tagline);
  const philosophy = yrStr(content.coaching_philosophy);
  const opening = yrStr(content.discovery_call_script?.opening);
  const packages = yrArr(content.packages);
  const paymentLink = yrStr(data.node.payment_link);

  return (
    <YRLayout title={title} tagline={tagline} intro={philosophy} v={v} hFont={hFont}
      right={<YRRightCard
        actionType="purchase"
        paymentLink={paymentLink}
        price={typeof data.node.price_usd === "number" ? data.node.price_usd : (typeof packages[0]?.price_usd === "number" ? packages[0].price_usd : null)}
        commerceNodeRowId={data.node.id}
        commerceAuthorId={data.author?.id}
        commerceLabel="Book a Discovery Call"
        ctaLabel="Book a Discovery Call"
        inquiryHeading="Book a Discovery Call"
        inquiryIntro="Tell us a little about where you are — we'll reach out within 24 hours."
        messagePlaceholder="What outcome are you working toward?"
        selectedOfferLabel={packages[0] ? yrStr(packages[0]?.name) : undefined}
        selectedOfferPrice={typeof packages[0]?.price_usd === "number" ? packages[0].price_usd : undefined}
        v={v} hFont={hFont} bgColor={bgColor} onSubmit={onSubmit}
        email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName}
        lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage}
        submitting={submitting} submitted={submitted}
      />}
    >
      {packages.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Coaching Packages</h2>
          <div className="space-y-3">
            {packages.map((p: any, i: number) => {
              const name = yrStr(p?.name, `Package ${i + 1}`);
              const desc = yrStr(p?.description);
              const duration = yrStr(p?.duration);
              const price = p?.price_usd;
              const idealFor = yrStr(p?.ideal_for);
              const outcomes = yrLines(p?.outcomes);
              return (
                <Card key={i} className="p-5" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
                    <h3 className="text-lg font-semibold" style={{ color: v.headingText }}>{name}</h3>
                    {price != null && <span className="text-xl font-bold" style={{ color: v.accent }}>{typeof price === "number" ? `$${price.toLocaleString()}` : yrInline(price)}</span>}
                  </div>
                  {duration && <p className="text-xs uppercase tracking-wider mb-2" style={{ color: v.mutedText }}>{duration}</p>}
                  {desc && <p className="text-sm mb-2 whitespace-pre-line" style={{ color: v.bodyText }}>{desc}</p>}
                  {idealFor && <p className="text-sm italic mb-2" style={{ color: v.mutedText }}><strong>Ideal for:</strong> {idealFor}</p>}
                  {outcomes.length > 0 && (
                    <ul className="space-y-1 mt-3">
                      {outcomes.map((o, j) => (
                        <li key={j} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: v.accent }} /><span className="text-sm" style={{ color: v.bodyText }}>{o}</span></li>
                      ))}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}
      {opening && (
        <Card className="p-5" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: v.mutedText }}>What to expect on a discovery call</p>
          <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{opening}</p>
        </Card>
      )}
    </YRLayout>
  );
}

/* ═══ YR-20 — BIG TICKET OFFERS ═══ */
function BigTicketPage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, lastName, setLastName, message, setMessage, submitting, submitted }: YRPageProps) {
  const title = yrStr(data.node.personalised_name, NODE_NAMES["YR-20"] || "VIP Offers");
  const summary = yrStr(content.abby_summary);
  const guide = yrStr(content.sales_conversation_guide);
  const offers = yrArr(content.offers);

  return (
    <YRLayout title={title} intro={summary} v={v} hFont={hFont}
      right={<YRRightCard
        actionType="application"
        ctaLabel="Apply for a Conversation"
        inquiryHeading="Apply for a Conversation"
        inquiryIntro="High-touch work — we accept a limited number of clients each quarter."
        messagePlaceholder="Briefly: what's the result you want, and why now?"
        selectedOfferLabel={offers[0] ? yrStr(offers[0]?.name || offers[0]?.title) : undefined}
        selectedOfferPrice={typeof offers[0]?.price_usd === "number" ? offers[0].price_usd : (typeof offers[0]?.price === "number" ? offers[0].price : undefined)}
        v={v} hFont={hFont} bgColor={bgColor} onSubmit={onSubmit}
        email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName}
        lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage}
        submitting={submitting} submitted={submitted}
      />}
    >
      {offers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>The Offers</h2>
          <div className="space-y-3">
            {offers.map((o: any, i: number) => {
              const name = yrStr(o?.name || o?.title, `Offer ${i + 1}`);
              const desc = yrStr(o?.description);
              const price = o?.price_usd ?? o?.price;
              const incl = yrLines(o?.includes ?? o?.deliverables ?? o?.outcomes);
              return (
                <Card key={i} className="p-5" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
                    <h3 className="text-lg font-semibold" style={{ color: v.headingText }}>{name}</h3>
                    {price != null && <span className="text-xl font-bold" style={{ color: v.accent }}>{typeof price === "number" ? `$${price.toLocaleString()}` : yrInline(price)}</span>}
                  </div>
                  {desc && <p className="text-sm mb-2 whitespace-pre-line" style={{ color: v.bodyText }}>{desc}</p>}
                  {incl.length > 0 && (
                    <ul className="space-y-1 mt-2">
                      {incl.map((x, j) => (<li key={j} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: v.accent }} /><span className="text-sm" style={{ color: v.bodyText }}>{x}</span></li>))}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}
      {guide && (
        <Card className="p-5" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: v.mutedText }}>How a conversation unfolds</p>
          <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{guide}</p>
        </Card>
      )}
    </YRLayout>
  );
}

/* ═══ YR-21 — KEYNOTE SPEAKING ═══ */
function SpeakingPage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, lastName, setLastName, message, setMessage, submitting, submitted }: YRPageProps) {
  const title = yrStr(content.speaker_brand, data.node.personalised_name || NODE_NAMES["YR-21"] || "Keynote Speaking");
  const tagline = yrStr(content.speaker_tagline);
  const oneSheet = yrStr(content.speaker_one_sheet);
  const talks = yrArr(content.signature_talks);
  const fees = content.fee_schedule;
  const booking = yrStr(content.booking_process);

  return (
    <YRLayout title={title} tagline={tagline} intro={oneSheet} v={v} hFont={hFont}
      right={<YRRightCard
        actionType="enquiry"
        ctaLabel="Send Speaking Inquiry"
        inquiryHeading="Book Pauline to Speak"
        inquiryIntro="Tell us about your event — date, audience, and outcome you want."
        messagePlaceholder="Event name, date, audience size, and the talk you'd like…"
        selectedOfferLabel={talks[0] ? yrStr(talks[0]?.title || talks[0]?.name) : undefined}
        v={v} hFont={hFont} bgColor={bgColor} onSubmit={onSubmit}
        email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName}
        lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage}
        submitting={submitting} submitted={submitted}
      />}
    >
      {talks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Signature Talks</h2>
          <div className="space-y-3">
            {talks.map((t: any, i: number) => {
              const name = yrStr(t?.title || t?.name, `Talk ${i + 1}`);
              const desc = yrStr(t?.description || t?.summary);
              const audience = yrStr(t?.audience || t?.ideal_for);
              const takeaways = yrLines(t?.takeaways || t?.outcomes || t?.key_points);
              return (
                <Card key={i} className="p-5" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <h3 className="text-lg font-semibold mb-1" style={{ color: v.headingText }}>{name}</h3>
                  {audience && <p className="text-xs uppercase tracking-wider mb-2" style={{ color: v.mutedText }}>For: {audience}</p>}
                  {desc && <p className="text-sm mb-2 whitespace-pre-line" style={{ color: v.bodyText }}>{desc}</p>}
                  {takeaways.length > 0 && (
                    <ul className="space-y-1 mt-2">
                      {takeaways.map((x, j) => (<li key={j} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: v.accent }} /><span className="text-sm" style={{ color: v.bodyText }}>{x}</span></li>))}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}
      {fees && (
        <Card className="p-5" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: v.mutedText }}>Fee Schedule</p>
          {typeof fees === "string" ? (
            <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{fees}</p>
          ) : Array.isArray(fees) ? (
            <ul className="space-y-1">{fees.map((f: any, i: number) => (<li key={i} className="text-sm" style={{ color: v.bodyText }}>• {yrInline(f)}</li>))}</ul>
          ) : (
            <ul className="space-y-1">{Object.entries(fees as Record<string, any>).map(([k, val]) => (<li key={k} className="text-sm" style={{ color: v.bodyText }}><strong style={{ color: v.headingText }}>{k.replace(/_/g, " ")}:</strong> {yrInline(val)}</li>))}</ul>
          )}
        </Card>
      )}
      {booking && (
        <Card className="p-5" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: v.mutedText }}>Booking Process</p>
          <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{booking}</p>
        </Card>
      )}
    </YRLayout>
  );
}

/* ═══ YR-22 — CORPORATE TRAINING ═══ */
function CorporateTrainingPage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, lastName, setLastName, message, setMessage, submitting, submitted }: YRPageProps) {
  const title = yrStr(content.programme_title, data.node.personalised_name || NODE_NAMES["YR-22"] || "Corporate Training");
  const tagline = yrStr(content.tagline);
  const summary = yrStr(content.abby_summary);
  const formats = yrArr(content.training_formats);
  const outcomes = yrLines(content.learning_outcomes);
  const outline = yrArr(content.programme_outline);
  const targets = yrLines(content.target_organisations);

  return (
    <YRLayout title={title} tagline={tagline} intro={summary} v={v} hFont={hFont}
      right={<YRRightCard
        actionType="enquiry"
        ctaLabel="Request a Training Proposal"
        inquiryHeading="Bring this Training In-House"
        inquiryIntro="Share your team's situation and we'll send a tailored proposal."
        messagePlaceholder="Organisation, team size, format (in-person / virtual), preferred dates…"
        selectedOfferLabel={formats[0] ? yrStr(formats[0]?.name || formats[0]?.title || formats[0]?.format) : undefined}
        v={v} hFont={hFont} bgColor={bgColor} onSubmit={onSubmit}
        email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName}
        lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage}
        submitting={submitting} submitted={submitted}
      />}
    >
      <YRBulletSection heading="Learning Outcomes" items={outcomes} v={v} hFont={hFont} />
      {formats.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Training Formats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {formats.map((f: any, i: number) => (
              <Card key={i} className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                <h3 className="text-base font-semibold mb-1" style={{ color: v.headingText }}>{yrStr(f?.name || f?.title || f?.format, `Format ${i + 1}`)}</h3>
                {(f?.duration || f?.length) && <p className="text-xs uppercase tracking-wider mb-2" style={{ color: v.mutedText }}>{yrStr(f?.duration || f?.length)}</p>}
                {f?.description && <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{yrStr(f?.description)}</p>}
              </Card>
            ))}
          </div>
        </section>
      )}
      {outline.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Programme Outline</h2>
          <div className="space-y-3">
            {outline.map((m: any, i: number) => {
              const mTitle = yrStr(m?.title || m?.module_title || m?.name, `Module ${i + 1}`);
              const mDesc = yrStr(m?.description || m?.summary);
              const items = yrLines(m?.learning_outcomes || m?.topics || m?.items);
              return (
                <details key={i} className="group rounded-lg border p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <summary className="cursor-pointer flex items-baseline gap-3">
                    <span className="text-xs uppercase tracking-widest shrink-0" style={{ color: v.accent }}>Module {i + 1}</span>
                    <span className="text-base font-semibold" style={{ color: v.headingText }}>{mTitle}</span>
                  </summary>
                  {(mDesc || items.length > 0) && (
                    <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: v.cardBorder }}>
                      {mDesc && <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{mDesc}</p>}
                      {items.length > 0 && (
                        <ul className="space-y-1">
                          {items.map((x, j) => (<li key={j} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: v.accent }} /><span className="text-sm" style={{ color: v.bodyText }}>{x}</span></li>))}
                        </ul>
                      )}
                    </div>
                  )}
                </details>
              );
            })}
          </div>
        </section>
      )}
      <YRBulletSection heading="Built for organisations like yours" items={targets} v={v} hFont={hFont} />
    </YRLayout>
  );
}

/* ═══ YR-23 — MASTERMIND ═══ */
function MastermindPage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, lastName, setLastName, message, setMessage, submitting, submitted }: YRPageProps) {
  const title = yrStr(content.mastermind_title, data.node.personalised_name || NODE_NAMES["YR-23"] || "Mastermind");
  const tagline = yrStr(content.tagline);
  const promise = yrStr(content.programme_promise);
  const tiers = yrArr(content.membership_tiers);
  const pillars = yrLines(content.curriculum_pillars);
  const sales = content.sales_page;
  const salesText = typeof sales === "string" ? sales : (typeof sales === "object" && sales) ? yrStr(sales.body) : "";

  return (
    <YRLayout title={title} tagline={tagline} intro={promise} v={v} hFont={hFont}
      right={<YRRightCard
        actionType="application"
        ctaLabel="Apply to the Mastermind"
        inquiryHeading="Apply for the Mastermind"
        inquiryIntro="A small, curated cohort. We review every application personally."
        messagePlaceholder="Where you are now, what you want this year, and why this room…"
        selectedOfferLabel={tiers[0] ? yrStr(tiers[0]?.name || tiers[0]?.title || tiers[0]?.tier) : undefined}
        selectedOfferPrice={typeof tiers[0]?.price_usd === "number" ? tiers[0].price_usd : (typeof tiers[0]?.price === "number" ? tiers[0].price : undefined)}
        v={v} hFont={hFont} bgColor={bgColor} onSubmit={onSubmit}
        email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName}
        lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage}
        submitting={submitting} submitted={submitted}
      />}
    >
      <YRBulletSection heading="Curriculum Pillars" items={pillars} v={v} hFont={hFont} />
      {tiers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Membership Tiers</h2>
          <div className="space-y-3">
            {tiers.map((t: any, i: number) => {
              const name = yrStr(t?.name || t?.title || t?.tier, `Tier ${i + 1}`);
              const price = t?.price_usd ?? t?.price;
              const desc = yrStr(t?.description);
              const incl = yrLines(t?.includes ?? t?.benefits ?? t?.features);
              return (
                <Card key={i} className="p-5" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
                    <h3 className="text-lg font-semibold" style={{ color: v.headingText }}>{name}</h3>
                    {price != null && <span className="text-xl font-bold" style={{ color: v.accent }}>{typeof price === "number" ? `$${price.toLocaleString()}` : yrInline(price)}</span>}
                  </div>
                  {desc && <p className="text-sm mb-2 whitespace-pre-line" style={{ color: v.bodyText }}>{desc}</p>}
                  {incl.length > 0 && (
                    <ul className="space-y-1 mt-2">
                      {incl.map((x, j) => (<li key={j} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: v.accent }} /><span className="text-sm" style={{ color: v.bodyText }}>{x}</span></li>))}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}
      {salesText && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>About this Mastermind</h2>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: v.bodyText }}>{salesText}</p>
        </section>
      )}
    </YRLayout>
  );
}

/* ═══ YR-24 — RETREAT ═══ */
function RetreatPage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, lastName, setLastName, message, setMessage, submitting, submitted }: YRPageProps) {
  const title = yrStr(content.retreat_title, data.node.personalised_name || NODE_NAMES["YR-24"] || "Retreat");
  const tagline = yrStr(content.tagline);
  const concept = yrStr(content.retreat_concept);
  const arc = yrStr(content.transformation_arc);
  const options = yrArr(content.retreat_options);
  const itinerary = yrArr(content.sample_itinerary);
  const paymentLink = yrStr(data.node.payment_link);

  return (
    <YRLayout title={title} tagline={tagline} intro={concept} v={v} hFont={hFont}
      right={<YRRightCard actionType={paymentLink ? "purchase" : "enquiry"} paymentLink={paymentLink} ctaLabel={paymentLink ? "Reserve Your Spot" : "Enquire About a Retreat"} v={v} hFont={hFont} bgColor={bgColor} onSubmit={onSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} />}
    >
      {options.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Retreat Options</h2>
          <div className="space-y-3">
            {options.map((o: any, i: number) => {
              const name = yrStr(o?.name || o?.title, `Option ${i + 1}`);
              const dur = yrStr(o?.duration || o?.length);
              const loc = yrStr(o?.location);
              const price = o?.price_usd ?? o?.price;
              const desc = yrStr(o?.description);
              const incl = yrLines(o?.includes ?? o?.features);
              return (
                <Card key={i} className="p-5" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
                    <h3 className="text-lg font-semibold" style={{ color: v.headingText }}>{name}</h3>
                    {price != null && <span className="text-xl font-bold" style={{ color: v.accent }}>{typeof price === "number" ? `$${price.toLocaleString()}` : yrInline(price)}</span>}
                  </div>
                  {(dur || loc) && <p className="text-xs uppercase tracking-wider mb-2" style={{ color: v.mutedText }}>{[dur, loc].filter(Boolean).join(" · ")}</p>}
                  {desc && <p className="text-sm mb-2 whitespace-pre-line" style={{ color: v.bodyText }}>{desc}</p>}
                  {incl.length > 0 && (
                    <ul className="space-y-1 mt-2">{incl.map((x, j) => (<li key={j} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: v.accent }} /><span className="text-sm" style={{ color: v.bodyText }}>{x}</span></li>))}</ul>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}
      {arc && (
        <Card className="p-5" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: v.mutedText }}>Transformation Arc</p>
          <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{arc}</p>
        </Card>
      )}
      {itinerary.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Sample Itinerary</h2>
          <div className="space-y-3">
            {itinerary.map((d: any, i: number) => {
              const dayLabel = yrStr(d?.day || d?.title, `Day ${i + 1}`);
              const desc = yrStr(d?.description || d?.summary);
              const items = yrLines(d?.activities || d?.items || d?.schedule);
              return (
                <Card key={i} className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <h3 className="text-base font-semibold mb-1" style={{ color: v.accent }}>{dayLabel}</h3>
                  {desc && <p className="text-sm mb-2 whitespace-pre-line" style={{ color: v.bodyText }}>{desc}</p>}
                  {items.length > 0 && <ul className="space-y-1">{items.map((x, j) => (<li key={j} className="text-sm" style={{ color: v.bodyText }}>• {x}</li>))}</ul>}
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </YRLayout>
  );
}

/* ═══ YR-25 — CERTIFICATION ═══ */
function CertificationPage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, lastName, setLastName, message, setMessage, submitting, submitted }: YRPageProps) {
  const title = yrStr(content.certification_title, data.node.personalised_name || NODE_NAMES["YR-25"] || "Certification Programme");
  const tagline = yrStr(content.tagline);
  const promise = yrStr(content.certification_promise);
  const modules = yrArr(content.modules);
  const levels = yrArr(content.certification_levels);
  const badge = content.badge_concept;
  const badgeText = typeof badge === "string" ? badge : (typeof badge === "object" && badge) ? yrStr(badge.description || badge.summary) : "";
  const structure = yrStr(content.programme_structure);
  const paymentLink = yrStr(data.node.payment_link);

  return (
    <YRLayout title={title} tagline={tagline} intro={promise} v={v} hFont={hFont}
      right={<YRRightCard actionType={paymentLink ? "purchase" : "enquiry"} paymentLink={paymentLink} ctaLabel={paymentLink ? "Enroll Now" : "Apply for Certification"} v={v} hFont={hFont} bgColor={bgColor} onSubmit={onSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} />}
    >
      {structure && (
        <Card className="p-5" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: v.mutedText }}>Programme Structure</p>
          <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{structure}</p>
        </Card>
      )}
      {modules.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Curriculum</h2>
          <div className="space-y-3">
            {modules.map((m: any, i: number) => {
              const mTitle = yrStr(m?.title || m?.name, `Module ${i + 1}`);
              const mDesc = yrStr(m?.description || m?.summary);
              const items = yrLines(m?.learning_outcomes || m?.topics || m?.items);
              return (
                <details key={i} className="group rounded-lg border p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <summary className="cursor-pointer flex items-baseline gap-3">
                    <span className="text-xs uppercase tracking-widest shrink-0" style={{ color: v.accent }}>Module {i + 1}</span>
                    <span className="text-base font-semibold" style={{ color: v.headingText }}>{mTitle}</span>
                  </summary>
                  {(mDesc || items.length > 0) && (
                    <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: v.cardBorder }}>
                      {mDesc && <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{mDesc}</p>}
                      {items.length > 0 && <ul className="space-y-1">{items.map((x, j) => (<li key={j} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: v.accent }} /><span className="text-sm" style={{ color: v.bodyText }}>{x}</span></li>))}</ul>}
                    </div>
                  )}
                </details>
              );
            })}
          </div>
        </section>
      )}
      {levels.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Certification Levels</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {levels.map((l: any, i: number) => (
              <Card key={i} className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                <h3 className="text-base font-semibold mb-1" style={{ color: v.accent }}>{yrStr(l?.name || l?.level || l?.title, `Level ${i + 1}`)}</h3>
                {l?.description && <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{yrStr(l?.description)}</p>}
                {l?.requirements && <p className="text-xs italic mt-2" style={{ color: v.mutedText }}>{yrInline(l?.requirements)}</p>}
              </Card>
            ))}
          </div>
        </section>
      )}
      {badgeText && (
        <Card className="p-5" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: v.mutedText }}>The Badge</p>
          <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{badgeText}</p>
        </Card>
      )}
    </YRLayout>
  );
}

/* ═══ YR-26 — CONFERENCE ═══ */
function ConferencePage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, lastName, setLastName, message, setMessage, submitting, submitted }: YRPageProps) {
  const title = yrStr(content.conference_title, data.node.personalised_name || NODE_NAMES["YR-26"] || "Conference");
  const tagline = yrStr(content.tagline);
  const concept = yrStr(content.conference_concept);
  const formats = yrArr(content.event_formats);
  const outline = yrArr(content.programme_outline);
  const sponsors = yrArr(content.sponsorship_packages);
  const paymentLink = yrStr(data.node.payment_link);

  return (
    <YRLayout title={title} tagline={tagline} intro={concept} v={v} hFont={hFont}
      right={<YRRightCard actionType={paymentLink ? "purchase" : "enquiry"} paymentLink={paymentLink} ctaLabel={paymentLink ? "Register Now" : "Request Conference Details"} v={v} hFont={hFont} bgColor={bgColor} onSubmit={onSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} />}
    >
      {formats.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Event Formats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {formats.map((f: any, i: number) => (
              <Card key={i} className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                <h3 className="text-base font-semibold mb-1" style={{ color: v.headingText }}>{yrStr(f?.name || f?.format || f?.title, `Format ${i + 1}`)}</h3>
                {f?.description && <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{yrStr(f?.description)}</p>}
              </Card>
            ))}
          </div>
        </section>
      )}
      {outline.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Programme</h2>
          <div className="space-y-3">
            {outline.map((d: any, i: number) => {
              const dayLabel = yrStr(d?.day || d?.title || d?.name, `Day ${i + 1}`);
              const desc = yrStr(d?.description || d?.summary);
              const items = yrLines(d?.sessions || d?.items || d?.activities);
              return (
                <Card key={i} className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <h3 className="text-base font-semibold mb-1" style={{ color: v.accent }}>{dayLabel}</h3>
                  {desc && <p className="text-sm mb-2 whitespace-pre-line" style={{ color: v.bodyText }}>{desc}</p>}
                  {items.length > 0 && <ul className="space-y-1">{items.map((x, j) => (<li key={j} className="text-sm" style={{ color: v.bodyText }}>• {x}</li>))}</ul>}
                </Card>
              );
            })}
          </div>
        </section>
      )}
      {sponsors.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Sponsorship Packages</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sponsors.map((s: any, i: number) => {
              const name = yrStr(s?.name || s?.tier || s?.title, `Package ${i + 1}`);
              const price = s?.price_usd ?? s?.price;
              const incl = yrLines(s?.benefits || s?.includes);
              return (
                <Card key={i} className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
                    <h3 className="text-base font-semibold" style={{ color: v.headingText }}>{name}</h3>
                    {price != null && <span className="text-base font-bold" style={{ color: v.accent }}>{typeof price === "number" ? `$${price.toLocaleString()}` : yrInline(price)}</span>}
                  </div>
                  {incl.length > 0 && <ul className="space-y-1 mt-2">{incl.map((x, j) => (<li key={j} className="text-sm" style={{ color: v.bodyText }}>• {x}</li>))}</ul>}
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </YRLayout>
  );
}

/* ═══ YR-27 — FUNDRAISING ═══ */
function FundraisingPage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, lastName, setLastName, message, setMessage, submitting, submitted }: YRPageProps) {
  const title = yrStr(content.campaign_title, data.node.personalised_name || NODE_NAMES["YR-27"] || "Fundraising Campaign");
  const tagline = yrStr(content.tagline);
  const impact = yrStr(content.impact_statement);
  const cause = yrStr(content.cause_alignment);
  const goal = content.campaign_goal_usd;
  const days = content.campaign_duration_days;
  const tiers = yrArr(content.donation_tiers);
  const commsPlan = yrStr(content.donor_communication_plan);
  const paymentLink = yrStr(data.node.payment_link);

  return (
    <YRLayout title={title} tagline={tagline} intro={impact} v={v} hFont={hFont}
      right={<YRRightCard actionType={paymentLink ? "purchase" : "enquiry"} paymentLink={paymentLink} ctaLabel={paymentLink ? "Donate Now" : "Support This Campaign"} v={v} hFont={hFont} bgColor={bgColor} onSubmit={onSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} />}
    >
      {(goal != null || days != null) && (
        <div className="grid grid-cols-2 gap-3">
          {goal != null && (
            <Card className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <p className="text-xs uppercase tracking-wider" style={{ color: v.mutedText }}>Goal</p>
              <p className="text-lg font-bold mt-1" style={{ color: v.accent }}>{typeof goal === "number" ? `$${goal.toLocaleString()}` : yrInline(goal)}</p>
            </Card>
          )}
          {days != null && (
            <Card className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <p className="text-xs uppercase tracking-wider" style={{ color: v.mutedText }}>Duration</p>
              <p className="text-lg font-bold mt-1" style={{ color: v.headingText }}>{typeof days === "number" ? `${days} days` : yrInline(days)}</p>
            </Card>
          )}
        </div>
      )}
      {cause && (
        <Card className="p-5" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: v.mutedText }}>The Cause</p>
          <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{cause}</p>
        </Card>
      )}
      {tiers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Donation Tiers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tiers.map((t: any, i: number) => {
              const name = yrStr(t?.name || t?.tier || t?.title, `Tier ${i + 1}`);
              const amt = t?.amount_usd ?? t?.amount ?? t?.price;
              const desc = yrStr(t?.description);
              const perks = yrLines(t?.benefits || t?.perks || t?.includes);
              return (
                <Card key={i} className="p-4" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
                    <h3 className="text-base font-semibold" style={{ color: v.headingText }}>{name}</h3>
                    {amt != null && <span className="text-base font-bold" style={{ color: v.accent }}>{typeof amt === "number" ? `$${amt.toLocaleString()}` : yrInline(amt)}</span>}
                  </div>
                  {desc && <p className="text-sm mb-2 whitespace-pre-line" style={{ color: v.bodyText }}>{desc}</p>}
                  {perks.length > 0 && <ul className="space-y-1 mt-2">{perks.map((x, j) => (<li key={j} className="text-sm" style={{ color: v.bodyText }}>• {x}</li>))}</ul>}
                </Card>
              );
            })}
          </div>
        </section>
      )}
      {commsPlan && (
        <Card className="p-5" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: v.mutedText }}>How donors stay informed</p>
          <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{commsPlan}</p>
        </Card>
      )}
    </YRLayout>
  );
}

/* ═══ YR-28 — SPONSORS / EXHIBITORS ═══ */
function SponsorsPage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, lastName, setLastName, message, setMessage, submitting, submitted }: YRPageProps) {
  const title = yrStr(content.programme_title, data.node.personalised_name || NODE_NAMES["YR-28"] || "Exhibitors & Sponsors");
  const tagline = yrStr(content.tagline);
  const summary = yrStr(content.abby_summary);
  const audience = yrStr(content.audience_profile);
  const outreach = yrStr(content.outreach_strategy);
  const packages = yrArr(content.sponsorship_packages);
  const deck = content.pitch_deck_outline;
  const deckText = typeof deck === "string" ? deck : Array.isArray(deck) ? deck.map(yrInline).join("\n") : (deck ? yrInline(deck) : "");

  return (
    <YRLayout title={title} tagline={tagline} intro={summary} v={v} hFont={hFont}
      right={<YRRightCard actionType="enquiry" v={v} hFont={hFont} bgColor={bgColor} onSubmit={onSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} ctaLabel="Become a Sponsor" />}
    >
      {audience && (
        <Card className="p-5" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: v.mutedText }}>Who You'll Reach</p>
          <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{audience}</p>
        </Card>
      )}
      {packages.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold" style={{ color: v.headingText, fontFamily: hFont }}>Sponsorship Packages</h2>
          <div className="space-y-3">
            {packages.map((p: any, i: number) => {
              const name = yrStr(p?.name || p?.tier || p?.title, `Package ${i + 1}`);
              const price = p?.price_usd ?? p?.price;
              const desc = yrStr(p?.description);
              const incl = yrLines(p?.benefits || p?.includes || p?.features);
              return (
                <Card key={i} className="p-5" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                  <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
                    <h3 className="text-lg font-semibold" style={{ color: v.headingText }}>{name}</h3>
                    {price != null && <span className="text-xl font-bold" style={{ color: v.accent }}>{typeof price === "number" ? `$${price.toLocaleString()}` : yrInline(price)}</span>}
                  </div>
                  {desc && <p className="text-sm mb-2 whitespace-pre-line" style={{ color: v.bodyText }}>{desc}</p>}
                  {incl.length > 0 && <ul className="space-y-1 mt-2">{incl.map((x, j) => (<li key={j} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: v.accent }} /><span className="text-sm" style={{ color: v.bodyText }}>{x}</span></li>))}</ul>}
                </Card>
              );
            })}
          </div>
        </section>
      )}
      {outreach && (
        <Card className="p-5" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: v.mutedText }}>How We'll Activate Your Sponsorship</p>
          <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{outreach}</p>
        </Card>
      )}
      {deckText && (
        <Card className="p-5" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: v.mutedText }}>Pitch Deck Outline</p>
          <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{deckText}</p>
        </Card>
      )}
    </YRLayout>
  );
}

/* ═══ HELPERS ═══ */
function getActionType(nodeId: string): "optin" | "purchase" | "enquiry" | "application" {
  const optinNodes = ["BP-02", "BP-05", "BA-10", "BA-14", "BA-16"];
  const enquiryNodes = ["YR-21", "YR-22", "YR-28", "BA-15", "BA-18"];
  const applicationNodes = ["YR-20", "YR-23", "BA-13"];
  if (optinNodes.includes(nodeId)) return "optin";
  if (enquiryNodes.includes(nodeId)) return "enquiry";
  if (applicationNodes.includes(nodeId)) return "application";
  return "purchase";
}
