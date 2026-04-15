import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, Gift, FileText, ThumbsUp, Settings, Star, Copy, ExternalLink, Link2, QrCode, HelpCircle, ChevronDown, Mail, Share2, Save, Pencil, Users, BarChart3 } from "lucide-react";
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
  "Saving your lead magnet...",
  "Setting up your opt-in page...",
  "Preparing your lead capture...",
  "Almost ready...",
];

const TIER_COLORS = [
  "border-l-4 border-red-400",
  "border-l-4 border-orange-400",
  "border-l-4 border-amber-400",
  "border-l-4 border-teal-400",
  "border-l-4 border-green-400",
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
  const [isSavingDraft, setIsSavingDraft] = useState(false);
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
        const userId = profile?.user_id || authorId;
        const { data: book } = await supabase
          .from("books")
          .select("title")
          .eq("author_id", userId)
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

      const { data: node, error: nodeErr } = await supabase
        .from("author_nodes")
        .select("content_json, status, microsite_url")
        .eq("author_id", authorId)
        .eq("node_id", "BP-02")
        .maybeSingle();

      console.log("[BP02] Node load:", { authorId, nodeStatus: node?.status, hasContent: !!node?.content_json, nodeErr });

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

  const handleSaveDraft = async () => {
    if (!authorId || !content) return;
    setIsSavingDraft(true);
    try {
      const { data: existingNode } = await supabase
        .from("author_nodes")
        .select("id")
        .eq("author_id", authorId)
        .eq("node_id", "BP-02")
        .maybeSingle();

      if (existingNode) {
        await supabase.from("author_nodes").update({
          content_json: content,
          status: "content_ready",
        }).eq("id", existingNode.id);
      } else {
        await supabase.from("author_nodes").insert({
          author_id: authorId,
          node_id: "BP-02",
          node_name: "Lead Magnets",
          status: "content_ready",
          content_json: content,
        });
      }
      toast.success("Draft saved!");
    } catch (e: any) {
      toast.error("Failed to save draft: " + e.message);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setStep(3);
    setError(null);
    try {
      const { data: existingNode } = await supabase
        .from("author_nodes")
        .select("id")
        .eq("author_id", authorId!)
        .eq("node_id", "BP-02")
        .maybeSingle();

      if (existingNode) {
        await supabase.from("author_nodes").update({
          status: "live",
          content_json: content,
          activated_at: new Date().toISOString(),
        }).eq("id", existingNode.id);
      } else {
        await supabase.from("author_nodes").insert({
          author_id: authorId!,
          node_id: "BP-02",
          node_name: "Lead Magnets",
          status: "live",
          content_json: content,
          activated_at: new Date().toISOString(),
        });
      }

      // Push nurture emails to BP-04 (Email Marketing)
      if (content.nurture_sequence || content.nurture_emails) {
        const emailContent = content.nurture_sequence || content.nurture_emails;
        const { data: bp04Node } = await supabase
          .from("author_nodes")
          .select("id")
          .eq("author_id", authorId!)
          .eq("node_id", "BP-04")
          .maybeSingle();

        const bp04Payload = {
          content_json: { nurture_sequence: emailContent, source: "BP-02" },
          status: "content_ready",
          personalised_name: "Lead Magnet Nurture Sequence",
        };

        if (bp04Node) {
          await supabase.from("author_nodes").update(bp04Payload).eq("id", bp04Node.id);
        } else {
          await supabase.from("author_nodes").insert({
            author_id: authorId!,
            node_id: "BP-04",
            node_name: "Email Marketing",
            ...bp04Payload,
          });
        }
      }

      // Push social posts to BP-03 (Social Media)
      if (content.social_media_posts || content.social_posts) {
        const socialContent = content.social_media_posts || content.social_posts;
        const { data: bp03Node } = await supabase
          .from("author_nodes")
          .select("id")
          .eq("author_id", authorId!)
          .eq("node_id", "BP-03")
          .maybeSingle();

        const bp03Payload = {
          content_json: { social_posts: socialContent, quiz_insights: content.quiz_insights_for_social, source: "BP-02" },
          status: "content_ready",
          personalised_name: "Lead Magnet Social Posts",
        };

        if (bp03Node) {
          await supabase.from("author_nodes").update(bp03Payload).eq("id", bp03Node.id);
        } else {
          await supabase.from("author_nodes").insert({
            author_id: authorId!,
            node_id: "BP-03",
            node_name: "Social Media",
            ...bp03Payload,
          });
        }
      }

      const slug = authorSlug || authorName.toLowerCase().replace(/\s+/g, "-");
      const url = `${window.location.origin}/${slug}/free-gift`;
      setLiveUrl(url);
      setContent((prev: any) => ({ ...prev, activated: true }));
      toast.success("Your lead magnet is live! 🎉");
    } catch (e: any) {
      toast.error(e.message || "Something went wrong during publishing.");
      setError(e.message);
      setStep(2);
    } finally {
      setIsPublishing(false);
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

      <div className="max-w-3xl mx-auto px-4 pt-6 pb-2">
        <div className="flex items-center gap-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
                i < step ? "bg-primary text-primary-foreground"
                : i === step ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                : "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline truncate">{label}</span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's build your Lead Magnets</h2>
            {!isBookLoading && !hasBook && hasContext === false ? (
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
              <p className="text-xs text-muted-foreground">This usually takes about 1 minute</p>
            </div>
          </AbbyCard>
        )}

        {step === 2 && content && (
          <ReviewStep
            content={content}
            setContent={setContent}
            authorName={authorName}
            authorId={authorId!}
            onActivate={handlePublish}
            onSaveDraft={handleSaveDraft}
            error={error}
            isPublishing={isPublishing}
            isSavingDraft={isSavingDraft}
          />
        )}

        {step === 3 && !content?.activated && (
          <AbbyCard>
            <div className="space-y-4">
              <p className="text-muted-foreground font-medium animate-pulse">{ACTIVATING_MESSAGES[msgIndex % ACTIVATING_MESSAGES.length]}</p>
              <Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" />
            </div>
          </AbbyCard>
        )}

        {step === 3 && content?.activated && (
          <PublishSuccessStep authorName={authorName} authorId={authorId!} liveUrl={liveUrl} copied={copied} onCopy={handleCopyUrl} />
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

/* ---- Deep update helper ---- */
function deepSet(obj: any, path: (string | number)[], value: any): any {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };
  clone[head] = deepSet(clone[head] ?? (typeof rest[0] === "number" ? [] : {}), rest, value);
  return clone;
}

/* ---- Editable text component ---- */
function EditableText({
  value,
  onSave,
  className = "",
  multiline = false,
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  if (!editing) {
    return (
      <div className="group relative">
        {multiline ? (
          <p className={`whitespace-pre-wrap ${className}`}>{value || <span className="italic text-muted-foreground">Empty — click to edit</span>}</p>
        ) : (
          <span className={className}>{value || <span className="italic text-muted-foreground">Empty — click to edit</span>}</span>
        )}
        <button
          onClick={() => setEditing(true)}
          className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-muted hover:bg-muted/80"
          title="Edit"
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    );
  }

  const handleBlur = () => {
    onSave(draft);
    setEditing(false);
  };

  if (multiline) {
    return (
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        autoFocus
        className={`${className} min-h-[80px]`}
      />
    );
  }
  return (
    <Input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={handleBlur}
      autoFocus
      className={className}
    />
  );
}

function ReviewStep({
  content,
  setContent,
  authorName,
  authorId,
  onActivate,
  onSaveDraft,
  error,
  isPublishing,
  isSavingDraft,
}: {
  content: any;
  setContent: (c: any) => void;
  authorName: string;
  authorId: string;
  onActivate: () => void;
  onSaveDraft: () => void;
  error: string | null;
  isPublishing?: boolean;
  isSavingDraft?: boolean;
}) {
  const recommended = content.recommended_lead_magnet || 1;
  const [selectedMagnetIdx, setSelectedMagnetIdx] = useState<number>(
    content.selected_lead_magnet ?? (recommended - 1 >= 0 ? recommended - 1 : 0)
  );

  const selectedMagnet = content.lead_magnets?.[selectedMagnetIdx];
  const selectedType = (selectedMagnet?.type || "").toLowerCase();
  const isQuizType = selectedType.includes("quiz") || selectedType.includes("assessment");
  const isChecklistType = selectedType.includes("checklist");
  const isCheatsheetType = selectedType.includes("cheat") || selectedType.includes("sheet");

  const quizStructure = content.quiz_structure || {};
  const quizData = quizStructure.questions || content.quiz_questions || content.quiz;
  const scoringTiers = quizStructure.scoring_tiers || content.scoring_tiers || content.result_tiers;
  const quizTitle = quizStructure.quiz_title || quizStructure.title || content.quiz_title || "";
  const quizDescription = quizStructure.quiz_description || quizStructure.description || content.quiz_description || "";

  const checklistStructure = content.checklist_structure || {};
  const cheatsheetStructure = content.cheatsheet_structure || {};

  const headlineVariants = content.headline_variants || content.optin_page?.headline_variants || [];

  const updateField = useCallback((path: (string | number)[], value: any) => {
    setContent((prev: any) => deepSet(prev, path, value));
  }, [setContent]);

  const handleSelectMagnet = (idx: number) => {
    setSelectedMagnetIdx(idx);
    setContent((prev: any) => ({ ...prev, selected_lead_magnet: idx }));
  };

  const selectHeadline = (headline: string) => {
    updateField(["optin_page", "headline"], headline);
  };

  const nurureCount = (content.nurture_sequence || content.nurture_emails || []).length;
  const socialCount = (content.social_media_posts || content.social_posts || []).length;

  return (
    <div className="space-y-4">
      <AbbyCard>
        <p className="text-muted-foreground">{content.abby_summary}</p>
      </AbbyCard>

      <Tabs defaultValue="magnets" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-auto">
          <TabsTrigger value="magnets" className="text-xs py-2 data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-300">
            <Gift className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Magnets
          </TabsTrigger>
          <TabsTrigger value="content" className="text-xs py-2 data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-300">
            <HelpCircle className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Content
          </TabsTrigger>
          <TabsTrigger value="optin" className="text-xs py-2 data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-300">
            <FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Opt-In
          </TabsTrigger>
          <TabsTrigger value="thankyou" className="text-xs py-2 data-[state=active]:bg-green-500/10 data-[state=active]:text-green-700 dark:data-[state=active]:text-green-300">
            <ThumbsUp className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Thanks
          </TabsTrigger>
          <TabsTrigger value="distribution" className="text-xs py-2 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300">
            <Share2 className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Flow
          </TabsTrigger>
        </TabsList>

        {/* ---- Magnets Tab ---- */}
        <TabsContent value="magnets" className="space-y-3 mt-4">
          <p className="text-xs text-muted-foreground mb-1">Click a magnet to select it as your active lead magnet</p>
          {content.lead_magnets?.map((lm: any, lmIdx: number) => {
            const isSelected = lmIdx === selectedMagnetIdx;
            return (
              <button
                key={lm.number || lmIdx}
                onClick={() => handleSelectMagnet(lmIdx)}
                className={`w-full text-left transition-all rounded-lg ${
                  isSelected ? "ring-2 ring-teal-500 shadow-md" : "opacity-75 hover:opacity-100"
                }`}
              >
                <Card
                  className={`border-l-4 ${
                    isSelected
                      ? "border-l-teal-500 bg-teal-50/10 dark:bg-teal-950/20"
                      : lm.number === recommended
                        ? "border-l-amber-500 bg-amber-50/5"
                        : "border-l-muted-foreground/30"
                  }`}
                >
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          isSelected
                            ? "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300"
                            : "bg-muted text-muted-foreground"
                        }`}>{lm.type}</span>
                        {lm.number === recommended && (
                          <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            <Star className="h-3 w-3" /> ABBY's Top Pick
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-xs bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            <Check className="h-3 w-3" /> Selected
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{lm.pages_or_length}</span>
                    </div>
                    <EditableText
                      value={lm.title || ""}
                      onSave={(v) => updateField(["lead_magnets", lmIdx, "title"], v)}
                      className="font-semibold text-base text-foreground"
                    />
                    <EditableText
                      value={lm.description || ""}
                      onSave={(v) => updateField(["lead_magnets", lmIdx, "description"], v)}
                      className="text-sm text-muted-foreground"
                      multiline
                    />
                    <div className="bg-teal-50/50 dark:bg-teal-950/20 rounded-md p-3">
                      <p className="text-xs font-medium text-teal-700 dark:text-teal-300 mb-1">Why it works</p>
                      <EditableText
                        value={lm.why_it_works || ""}
                        onSave={(v) => updateField(["lead_magnets", lmIdx, "why_it_works"], v)}
                        className="text-xs text-teal-600 dark:text-teal-400 italic"
                        multiline
                      />
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
          {content.recommended_reason && (
            <div className="flex gap-2 mt-2 p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">{content.recommended_reason}</p>
            </div>
          )}
        </TabsContent>

        {/* ---- Content Tab (adapts to selected magnet) ---- */}
        <TabsContent value="content" className="space-y-4 mt-4">
          {isQuizType ? (
            /* Quiz / Assessment content */
            quizData && Array.isArray(quizData) && quizData.length > 0 ? (
              <>
                <Card className="border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50/50 to-transparent dark:from-teal-950/20">
                  <CardContent className="pt-5 space-y-2">
                    <EditableText
                      value={quizTitle}
                      onSave={(v) => updateField(["quiz_structure", "quiz_title"], v)}
                      className="text-lg font-bold text-foreground"
                    />
                    <EditableText
                      value={quizDescription || `Discover your ${quizTitle.replace(/quiz/i, "").trim()} profile`}
                      onSave={(v) => updateField(["quiz_structure", "quiz_description"], v)}
                      className="text-sm text-muted-foreground"
                      multiline
                    />
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wide">
                    Questions ({quizData.length})
                  </h4>
                  {quizData.map((q: any, qi: number) => (
                    <Card key={qi} className="border-l-4 border-l-teal-400">
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <span className="text-sm font-bold text-teal-600 dark:text-teal-400 shrink-0 mt-0.5">Q{qi + 1}.</span>
                          <EditableText
                            value={q.question || q.text || ""}
                            onSave={(v) => updateField(["quiz_structure", "questions", qi, q.question !== undefined ? "question" : "text"], v)}
                            className="text-sm font-semibold text-foreground"
                          />
                        </div>
                        <div className="grid gap-2 pl-6">
                          {(q.options || q.answers || []).map((opt: any, oi: number) => {
                            const optLabel = typeof opt === "string" ? opt : opt.text || opt.label || "";
                            const optKey = q.options ? "options" : "answers";
                            return (
                              <div key={oi} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                                <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center text-xs font-bold shrink-0">
                                  {String.fromCharCode(65 + oi)}
                                </span>
                                <EditableText
                                  value={optLabel}
                                  onSave={(v) => {
                                    if (typeof opt === "string") {
                                      updateField(["quiz_structure", "questions", qi, optKey, oi], v);
                                    } else {
                                      updateField(["quiz_structure", "questions", qi, optKey, oi, opt.text !== undefined ? "text" : "label"], v);
                                    }
                                  }}
                                  className="text-sm text-foreground flex-1"
                                />
                                {(typeof opt === "object" && opt.points !== undefined) && (
                                  <span className="text-xs bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full font-medium shrink-0">{opt.points} pts</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {scoringTiers && Array.isArray(scoringTiers) && scoringTiers.length > 0 && (
                  <div className="space-y-3 mt-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Scoring Tiers ({scoringTiers.length})
                    </h4>
                    {scoringTiers.map((tier: any, ti: number) => (
                      <Card key={ti} className={TIER_COLORS[ti % TIER_COLORS.length]}>
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <EditableText
                              value={tier.label || tier.name || tier.title || ""}
                              onSave={(v) => {
                                const key = tier.label !== undefined ? "label" : tier.name !== undefined ? "name" : "title";
                                updateField(["quiz_structure", "scoring_tiers", ti, key], v);
                              }}
                              className="text-sm font-bold text-foreground"
                            />
                            {(tier.min !== undefined && tier.max !== undefined) && (
                              <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground shrink-0">{tier.min}–{tier.max} pts</span>
                            )}
                          </div>
                          <EditableText
                            value={tier.description || tier.feedback || ""}
                            onSave={(v) => {
                              const key = tier.description !== undefined ? "description" : "feedback";
                              updateField(["quiz_structure", "scoring_tiers", ti, key], v);
                            }}
                            className="text-sm text-muted-foreground"
                            multiline
                          />
                          {tier.tips_from_book && Array.isArray(tier.tips_from_book) && (
                            <div className="bg-muted/30 rounded-md p-2 space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Tips from the book:</p>
                              {tier.tips_from_book.map((tip: string, tipIdx: number) => (
                                <div key={tipIdx} className="flex items-start gap-1.5">
                                  <span className="text-xs text-primary mt-0.5">•</span>
                                  <EditableText
                                    value={tip}
                                    onSave={(v) => updateField(["quiz_structure", "scoring_tiers", ti, "tips_from_book", tipIdx], v)}
                                    className="text-xs text-muted-foreground"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          {tier.product_recommendations && Array.isArray(tier.product_recommendations) && (
                            <div className="bg-primary/5 rounded-md p-2 space-y-1">
                              <p className="text-xs font-medium text-primary">Recommended products:</p>
                              {tier.product_recommendations.map((pr: any, prIdx: number) => (
                                <div key={prIdx} className="flex items-start gap-1.5">
                                  <span className="text-xs text-primary mt-0.5">→</span>
                                  <span className="text-xs text-muted-foreground">
                                    <strong>{pr.type}:</strong> {pr.title} — {pr.reason}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No quiz content was generated for this lead magnet set.</p>
              </div>
            )
          ) : (
            /* Checklist / Cheat Sheet / other non-quiz content preview */
            selectedMagnet ? (
              <div className="space-y-4">
                <Card className="border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50/50 to-transparent dark:from-teal-950/20">
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded font-medium">{selectedMagnet.type}</span>
                      <span className="text-xs text-muted-foreground">{selectedMagnet.pages_or_length}</span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{selectedMagnet.title}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedMagnet.description}</p>
                  </CardContent>
                </Card>

                <Card className="border-teal-200/50 dark:border-teal-800/50">
                  <CardContent className="pt-5 space-y-3">
                    <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-300">Why This Format Works</h4>
                    <p className="text-sm text-muted-foreground italic whitespace-pre-wrap">{selectedMagnet.why_it_works}</p>
                  </CardContent>
                </Card>

                <div className="flex gap-2 p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg">
                  <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    The full {selectedMagnet.type?.toLowerCase()} content will be generated and formatted when you publish. The opt-in page and thank-you page are ready to preview in the other tabs.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Select a magnet from the Magnets tab to preview its content.</p>
              </div>
            )
          )}
        </TabsContent>

        {/* ---- Opt-In Tab ---- */}
        <TabsContent value="optin" className="mt-4 space-y-4">
          {/* Headline Variant Selector */}
          {headlineVariants.length > 0 && (
            <Card className="border-indigo-200 dark:border-indigo-800">
              <CardContent className="pt-5 space-y-3">
                <h4 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Choose Your Headline</h4>
                <p className="text-xs text-muted-foreground mb-2">Click a variant to set it as your opt-in page headline</p>
                {headlineVariants.map((v: any, i: number) => {
                  const headlineText = v.headline || v.text || "";
                  const isSelected = content.optin_page?.headline === headlineText;
                  return (
                    <button
                      key={i}
                      onClick={() => selectHeadline(headlineText)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-400/30"
                          : "border-border hover:border-indigo-300 dark:hover:border-indigo-600 bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isSelected
                            ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {v.type || v.style}
                        </span>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                            <Check className="h-3 w-3" /> Selected
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground mt-1">{headlineText}</p>
                      {(v.why || v.reasoning) && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{v.why || v.reasoning}</p>
                      )}
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Opt-in Preview */}
          <Card className="overflow-hidden border-indigo-200 dark:border-indigo-800">
            <div className="bg-gradient-to-br from-indigo-500/10 to-teal-500/10 p-6 space-y-4 border-b border-border">
              <EditableText
                value={content.optin_page?.headline || selectedMagnet?.title || ""}
                onSave={(v) => updateField(["optin_page", "headline"], v)}
                className="text-xl font-bold text-center text-foreground"
              />
              <EditableText
                value={content.optin_page?.subheadline || ""}
                onSave={(v) => updateField(["optin_page", "subheadline"], v)}
                className="text-sm text-center text-muted-foreground"
              />
              <div className="max-w-sm mx-auto space-y-2">
                {content.optin_page?.bullet_points?.map((bp: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
                    <EditableText
                      value={bp}
                      onSave={(v) => updateField(["optin_page", "bullet_points", i], v)}
                      className="text-sm text-foreground"
                    />
                  </div>
                ))}
              </div>
              <div className="text-center">
                <div className="inline-block bg-primary text-primary-foreground rounded-lg px-6 py-3">
                  <EditableText
                    value={content.optin_page?.cta_button_text || "Get It Free"}
                    onSave={(v) => updateField(["optin_page", "cta_button_text"], v)}
                    className="text-sm font-semibold"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">{content.optin_page?.privacy_note}</p>
            </div>
          </Card>
        </TabsContent>

        {/* ---- Thanks Tab ---- */}
        <TabsContent value="thankyou" className="mt-4 space-y-4">
          <Card className="overflow-hidden border-green-200 dark:border-green-800">
            <div className="bg-gradient-to-br from-green-500/10 to-teal-500/10 p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto">
                <Check className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <EditableText
                value={content.thankyou_page?.headline || ""}
                onSave={(v) => updateField(["thankyou_page", "headline"], v)}
                className="text-xl font-bold text-foreground"
              />
              <EditableText
                value={content.thankyou_page?.message || ""}
                onSave={(v) => updateField(["thankyou_page", "message"], v)}
                className="text-sm text-muted-foreground"
                multiline
              />
              <div className="bg-green-50/50 dark:bg-green-950/20 rounded-lg p-4 max-w-sm mx-auto">
                <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">What's next</p>
                <EditableText
                  value={content.thankyou_page?.next_step || ""}
                  onSave={(v) => updateField(["thankyou_page", "next_step"], v)}
                  className="text-sm text-green-600 dark:text-green-400"
                />
              </div>
            </div>
          </Card>

          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="pt-5 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2">Result Introduction</h4>
                <EditableText
                  value={content.thankyou_page?.result_intro || ""}
                  onSave={(v) => updateField(["thankyou_page", "result_intro"], v)}
                  className="text-sm text-muted-foreground"
                  multiline
                />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2">Book CTA</h4>
                <EditableText
                  value={content.thankyou_page?.book_cta || ""}
                  onSave={(v) => updateField(["thankyou_page", "book_cta"], v)}
                  className="text-sm text-muted-foreground"
                  multiline
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Distribution Tab ---- */}
        <TabsContent value="distribution" className="mt-4 space-y-4">
          <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/30 to-transparent dark:from-amber-950/10">
            <CardContent className="pt-5 space-y-4">
              <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Distribution Plan
              </h4>
              <p className="text-xs text-muted-foreground">
                When you publish, ABBY will automatically set up the following for you:
              </p>

              <div className="space-y-3">
                {/* Lead Capture */}
                <div className="flex items-start gap-3 p-3 bg-teal-50/50 dark:bg-teal-950/20 rounded-lg border border-teal-200/50 dark:border-teal-800/50">
                  <Users className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">Lead Capture → CRM</p>
                    <p className="text-xs text-muted-foreground">Subscribers who opt in are automatically added to your Contacts for follow-up.</p>
                  </div>
                </div>

                {/* Email Nurture */}
                {nurureCount > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200/50 dark:border-indigo-800/50">
                    <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                        {nurureCount} Nurture Emails → Email Marketing (BP-04)
                      </p>
                      <p className="text-xs text-muted-foreground">Your email sequence will be pushed to Email Marketing on publish, ready for activation.</p>
                    </div>
                  </div>
                )}

                {/* Social Posts */}
                {socialCount > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                    <Share2 className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                        {socialCount} Social Posts → Social Media (BP-03)
                      </p>
                      <p className="text-xs text-muted-foreground">Ready-to-post captions for Instagram, LinkedIn, Facebook and X will be pushed to Social Media on publish.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Marketing Strategy */}
              {content.marketing_strategy && (
                <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Best Marketing Channel</p>
                  <p className="text-sm font-semibold text-foreground">{content.marketing_strategy.primary_platform}</p>
                  <p className="text-xs text-muted-foreground mt-1">{content.marketing_strategy.primary_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-center text-xs text-muted-foreground">
            <p>Lead magnet name: <strong>{content.funnel_name}</strong></p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={onSaveDraft} disabled={isSavingDraft}>
          <Save className="h-4 w-4 mr-2" />
          {isSavingDraft ? "Saving..." : "Save Draft"}
        </Button>
        <Button className="flex-1" size="lg" onClick={() => onActivate()} disabled={isPublishing}>
          {isPublishing ? (
            <><Sparkles className="h-4 w-4 mr-2 animate-spin" /> Publishing...</>
          ) : (
            <>Activate & Go Live <ArrowRight className="h-4 w-4 ml-2" /></>
          )}
        </Button>
      </div>
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center">{error}</div>
      )}
      <p className="text-xs text-center text-muted-foreground">
        Your opt-in page, contact tags, email nurture, and social posts will be set up automatically.
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
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from("author_subscribers")
        .select("id", { count: "exact", head: true })
        .eq("author_id", authorId);
      setSubscriberCount(count ?? 0);
    })();
  }, [authorId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center py-6">
        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mb-4 animate-in zoom-in duration-500">
          <Check className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold mb-1 text-red-600 dark:text-red-400">Your Lead Magnet is LIVE! 🎉</h2>
        <p className="text-sm text-muted-foreground">Congratulations, {authorName}!</p>
      </div>

      {liveUrl && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Your live opt-in link</h3>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
            <span className="text-sm text-foreground font-mono truncate flex-1">{liveUrl}</span>
            <Button size="sm" variant="ghost" onClick={onCopy}>
              <Copy className="h-3.5 w-3.5 mr-1" />{copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href={liveUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
            </Button>
          </div>
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => setShowQR(!showQR)} className="w-full">
              <QrCode className="h-3.5 w-3.5 mr-2" />{showQR ? "Hide QR Code" : "Show QR Code"}
            </Button>
            {showQR && (
              <div className="flex justify-center mt-4 p-4 bg-white rounded-lg">
                <QRCodeSVG value={liveUrl} size={200} level="M" />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Next steps with downstream node links */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card
          className="p-4 border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-950/30 cursor-pointer hover:ring-1 hover:ring-teal-400/40 transition-all"
          onClick={() => navigate("/dashboard?section=crm")}
        >
          <Users className="h-6 w-6 text-teal-600 dark:text-teal-400 mb-2" />
          <p className="text-sm font-semibold text-teal-800 dark:text-teal-200">View Your Leads</p>
          <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
            {subscriberCount !== null ? `${subscriberCount} subscriber${subscriberCount !== 1 ? "s" : ""}` : "Loading..."}
          </p>
        </Card>
        <Card
          className="p-4 border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30 cursor-pointer hover:ring-1 hover:ring-indigo-400/40 transition-all"
          onClick={() => navigate("/dashboard?section=brand-products&node=BP-04")}
        >
          <Mail className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mb-2" />
          <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Email Nurture</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Activate your nurture sequence</p>
        </Card>
        <Card
          className="p-4 border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/30 cursor-pointer hover:ring-1 hover:ring-purple-400/40 transition-all"
          onClick={() => navigate("/dashboard?section=brand-products&node=BP-03")}
        >
          <Share2 className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-2" />
          <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">Social Media</p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Distribute across platforms</p>
        </Card>
      </div>

      <Card className="p-4 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
        <div className="flex gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">Abby says</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Your lead magnet is live! Your nurture emails and social posts have been pushed to their respective nodes — activate them to start driving traffic and converting readers into customers.
            </p>
          </div>
        </div>
      </Card>

      <SocialDistributionPack authorId={authorId} content={socialPack} onContentLoaded={setSocialPack} />

      <div className="flex flex-col sm:flex-row gap-3">
        <Button className="flex-1" size="lg" onClick={() => navigate("/dashboard?section=marketing-hub&highlight=lead-magnets")}>
          Activate My Marketing Campaign <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      <div className="text-center">
        <Button variant="link" className="text-sm text-muted-foreground" onClick={() => navigate("/brand-products")}>Go back to Brand Products</Button>
      </div>
    </div>
  );
}
