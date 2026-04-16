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

  // Quiz data ref for passing to handleSubmit
  const [quizData, setQuizData] = useState<{ quiz_stage?: string; quiz_score?: number; quiz_answers?: any[] } | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<boolean> => {
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
        },
      });

      if (res.error) throw res.error;
      setSubmitted(true);
      toast({ title: "Success!", description: res.data?.message || "Thank you!" });
      setSubmitting(false);
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
      {/* Generic fallback for other nodes */}
      {!["BP-02", "BP-04", "BP-05", "BP-06", "BP-07", "BP-08", "BP-09"].includes(resolvedNodeId!) && (
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
  onSubmit: (e: React.FormEvent) => Promise<boolean>;
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
    // Set quiz data for the parent handleSubmit to include
    const quizStageSlug = (tierName || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setQuizData({
      quiz_stage: quizStageSlug,
      quiz_score: scorePercent,
      quiz_answers: answerDetails,
    });
    // Small delay to let state propagate
    await new Promise(r => setTimeout(r, 50));
    const success = await onSubmit(e);
    if (success) {
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

  // ── STAGE: GATE (after quiz, before results) ──
  if (stage === "gate") {
    return (
      <div className="min-h-[80vh] py-12 px-4 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${accentColor}10 0%, ${bgColor} 100%)` }}>
        <div className="max-w-md mx-auto">
          <Card className="p-8 shadow-xl border-2" style={{ background: v.cardBg, borderColor: `${accentColor}40` }}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl" style={{ background: `${accentColor}15` }}>
                🎉
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: v.headingText, fontFamily: hFont }}>
                Quiz Complete!
              </h2>
              <p className="text-base" style={{ color: v.mutedText }}>
                Enter your name and email to unlock your personalised results and recommendations.
              </p>
            </div>
            <form onSubmit={handleGateSubmit} className="space-y-3">
              <Input placeholder="Your first name" value={firstName} onChange={e => setFirstName(e.target.value)} required className="h-12 text-base" />
              <Input type="email" placeholder="Your best email" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 text-base" />
              <Button type="submit" className="w-full rounded-full h-12 text-base font-bold shadow-lg hover:shadow-xl transition-all" style={{ background: accentColor, color: "#fff" }} disabled={submitting}>
                {submitting ? "Unlocking..." : "Show Me My Results!"}
              </Button>
            </form>
            <p className="text-[11px] mt-4 text-center" style={{ color: v.mutedText }}>{privacyNote}</p>
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

      {/* Lead capture */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3" style={{ color: v.headingText, fontFamily: hFont }}>Stay Connected</h2>
          <p className="text-sm mb-6" style={{ color: v.mutedText }}>Get updates on new books, resources, and events.</p>
          {!submitted ? (
            <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
              <Input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required className="flex-1" />
              <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="flex-1" />
              <Button type="submit" style={{ background: v.accent, color: v.accentText }} disabled={submitting}>
                {submitting ? "..." : "Subscribe"}
              </Button>
            </form>
          ) : (
            <p className="text-sm font-medium" style={{ color: v.accent }}>✓ You're subscribed!</p>
          )}
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
              {hasStripeUrl ? (
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
            {hasStripe && (
              <Button className="flex-1 rounded-full" variant="outline" asChild>
                <a href={stripeUrl} target="_blank" rel="noopener noreferrer">
                  Buy Direct <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
            {!hasAmazon && !hasStripe && (
              <Button className="flex-1 rounded-full" disabled>Available Soon</Button>
            )}
          </div>
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

/* ═══ HELPERS ═══ */
function getActionType(nodeId: string): "optin" | "purchase" | "enquiry" | "application" {
  const optinNodes = ["BP-02", "BP-05", "BA-16"];
  const enquiryNodes = ["YR-21", "YR-22", "YR-28"];
  const applicationNodes = ["YR-20", "YR-23", "BA-13"];
  if (optinNodes.includes(nodeId)) return "optin";
  if (enquiryNodes.includes(nodeId)) return "enquiry";
  if (applicationNodes.includes(nodeId)) return "application";
  return "purchase";
}
