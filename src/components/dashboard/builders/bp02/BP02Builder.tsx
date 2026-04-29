import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useNodeBuilderNavigate } from "@/lib/node-builder-nav";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, Gift, FileText, ThumbsUp, Settings, Star, Copy, ExternalLink, Link2, QrCode, HelpCircle, ChevronDown, Mail, Share2, Save, Pencil, Users, BarChart3, Globe } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { categoryStyles } from "../shared/BuilderTheme";
import { QRCodeSVG } from "qrcode.react";
import SocialDistributionPack from "./SocialDistributionPack";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { ensureEmailSequence } from "@/lib/email-sequence-hook";
import { ensureFunnel } from "@/lib/funnel-hook";
import { toAbbyError } from "@/lib/abby-error";
import BuilderIntroBlock, { BP_INTRO_SPECS } from "@/components/dashboard/builders/shared/BuilderIntroBlock";
import BuilderHeader from "@/components/dashboard/builders/shared/BuilderHeader";
import UnifiedStepper from "@/components/dashboard/builders/shared/UnifiedStepper";
import NodeHowItWorks from "@/components/dashboard/builders/shared/NodeHowItWorks";
import AnalyseBookGate from "@/components/dashboard/builders/_shared/AnalyseBookGate";

const STEPS = ["Introduction", "Generating", "Review", "Publish", "Live"];

const GENERATING_MESSAGES = [
  "Reading your book to find the best lead magnet angles...",
  "Designing 2 irresistible free resources for your readers...",
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
  bookId?: string | null;
}

export interface PublishChannels {
  optinPage: boolean;
  emailNurture: boolean;
  linkedin: boolean;
  instagram: boolean;
  facebook: boolean;
  x: boolean;
}

const DEFAULT_CHANNELS: PublishChannels = {
  optinPage: true,
  emailNurture: true,
  linkedin: false,
  instagram: false,
  facebook: false,
  x: false,
};

export default function BP02Builder({ authorId, bookId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(-1);
  const [authReady, setAuthReady] = useState(false);
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
  const [publishChannels, setPublishChannels] = useState<PublishChannels>({ ...DEFAULT_CHANNELS });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user: authUser, isReady: isAuthReady } = useAuthReady();
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading } = useAuthorBook();

  useEffect(() => {
    if (!isAuthReady) return; // Wait for auth session to restore
    if (!authorId) {
      setStep(0);
      return;
    }

    (async () => {
      try {
        const { data: profile, error: profileErr } = await supabase
          .from("author_profiles")
          .select("pen_name, author_slug, user_id")
          .eq("id", authorId)
          .maybeSingle();

        console.log("[BP02] Profile load:", { authorId, profile: !!profile, profileErr });

        if (profileErr) {
          console.error("[BP02] Profile query failed (RLS?):", profileErr.message);
        }

        if (profile) {
          setAuthorName(profile.pen_name || "there");
          setAuthorSlug(profile.author_slug || (profile.pen_name || "").toLowerCase().replace(/\s+/g, "-"));
        }

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
          .select("content_json, status, microsite_url, activated_at, current_step")
          .eq("author_id", authorId)
          .eq("node_id", "BP-02")
          .maybeSingle();

        console.log("[BP02] Node load:", { authorId, nodeStatus: node?.status, hasContent: !!node?.content_json, nodeErr });

        if (nodeErr) {
          console.error("[BP02] Node query failed (RLS?):", nodeErr.message);
        }

        if (node?.content_json) {
          const savedContent = node.content_json as any;
          const savedStep = Number(savedContent?._currentStep ?? node.current_step ?? 0);
          const isPublished = node.status === "live" || !!node.activated_at || !!node.microsite_url;
          const savedChannels = savedContent?.publishChannels;

          setContent(isPublished ? { ...savedContent, activated: true } : savedContent);
          if (savedChannels) setPublishChannels(savedChannels);

          if (isPublished) {
            setStep(4);
            setLiveUrl(node.microsite_url || null);
          } else {
            setStep(savedStep >= 3 ? 3 : 2);
          }
        } else {
          setStep(0);
        }
      } catch (err) {
        console.error("[BP02] Init effect error:", err);
        setStep(0);
      }
    })();
  }, [authorId, isAuthReady]);

  useEffect(() => {
    if (step === 1 || (step === 4 && !content?.activated)) {
      const msgs = step === 1 ? GENERATING_MESSAGES : ACTIVATING_MESSAGES;
      setMsgIndex(0);
      intervalRef.current = setInterval(() => {
        setMsgIndex((i) => (i + 1) % msgs.length);
      }, 3000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [step]);

  const [contextBlocked, setContextBlocked] = useState(false);
  const { bookId: hookBookId } = useAuthorBook();
  const activeBookId = bookId ?? hookBookId ?? null;

  const handleGenerate = async () => {
    setStep(1);
    setError(null);
    setContextBlocked(false);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-bp02-lead-magnets", {
        body: { author_id: authorId, book_id: activeBookId },
      });
      if (data?.status === "context_blocked") {
        setContextBlocked(true);
        setStep(0);
        return;
      }
      if (fnErr || !data?.success) {
        throw new Error(data?.error || fnErr?.message || "Generation failed");
      }
      setContent(data.content);
      setStep(2);

      // Auto-save as draft immediately after generation
      if (authorId && data.content) {
        try {
          const { data: existingNode } = await supabase
            .from("author_nodes")
            .select("id, status, activated_at, microsite_url")
            .eq("author_id", authorId)
            .eq("node_id", "BP-02")
            .maybeSingle();

          const nextStatus = existingNode?.status === "live" || !!existingNode?.activated_at || !!existingNode?.microsite_url
            ? "live" as const
            : "content_ready" as const;
          const payload = {
            content_json: { ...data.content, _currentStep: 2 },
            current_step: 2,
            status: nextStatus,
          };

          if (existingNode) {
            const { error: upErr } = await supabase.from("author_nodes").update(payload).eq("id", existingNode.id);
            if (upErr) console.error("[BP02] Auto-save update failed:", upErr);
          } else {
            const { error: insErr } = await supabase.from("author_nodes").insert({
              author_id: authorId,
              node_id: "BP-02",
              node_name: "Lead Magnets",
              ...payload,
            });
            if (insErr) console.error("[BP02] Auto-save insert failed:", insErr);
          }
          console.log("[BP02] Auto-saved draft after generation");
        } catch (saveErr) {
          console.error("[BP02] Auto-save exception:", saveErr);
        }
      }
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
        .select("id, status, activated_at, microsite_url")
        .eq("author_id", authorId)
        .eq("node_id", "BP-02")
        .maybeSingle();

      const nextStatus = existingNode?.status === "live" || !!existingNode?.activated_at || !!existingNode?.microsite_url
        ? "live" as const
        : "content_ready" as const;
      const payload = {
        content_json: { ...content, _currentStep: step },
        current_step: step,
        status: nextStatus,
      };

      if (existingNode) {
        const { error: upErr } = await supabase.from("author_nodes").update(payload).eq("id", existingNode.id);
        if (upErr) throw new Error(upErr.message);
      } else {
        const { error: insErr } = await supabase.from("author_nodes").insert({
          author_id: authorId,
          node_id: "BP-02",
          node_name: "Lead Magnets",
          ...payload,
        });
        if (insErr) throw new Error(insErr.message);
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
    setStep(4);
    setError(null);
    try {
      const slug = authorSlug || authorName.toLowerCase().replace(/\s+/g, "-");
      const fallbackMicrositeUrl = `${window.location.origin}/${slug}/free-gift`;
      const token = await getActiveToken();
      if (!token) throw new Error("Not authenticated");

      const publishResponse = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deploy-bp02-to-ghl`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            author_id: authorId,
            content_payload: { ...content, publishChannels, _currentStep: 4 },
          }),
        },
        30000,
      );

      const publishResult = await publishResponse.json().catch(() => ({}));
      if (!publishResponse.ok || !publishResult?.success) {
        throw new Error(publishResult?.message || "Failed to publish your lead magnet.");
      }

      const micrositeUrl = typeof publishResult?.microsite_url === "string"
        ? publishResult.microsite_url
        : typeof publishResult?.live_url === "string"
          ? publishResult.live_url
          : fallbackMicrositeUrl;

      // Push nurture emails to BP-04 (Email Marketing) — only if channel selected
      if (publishChannels.emailNurture && (content.nurture_sequence || content.nurture_emails)) {
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

      // Push social posts to BP-03 (Social Media) — only selected platforms
      const anySocial = publishChannels.linkedin || publishChannels.instagram || publishChannels.facebook || publishChannels.x;
      if (anySocial && (content.social_media_posts || content.social_posts)) {
        const allSocial = content.social_media_posts || content.social_posts;
        const platformMap: Record<string, keyof PublishChannels> = {
          linkedin: "linkedin",
          instagram: "instagram",
          facebook: "facebook",
          x: "x",
          twitter: "x",
        };
        const filteredSocial = Array.isArray(allSocial)
          ? allSocial.filter((post: any) => {
              const p = (post.platform || "").toLowerCase();
              const key = platformMap[p];
              return key ? publishChannels[key] : false;
            })
          : allSocial;

        const { data: bp03Node } = await supabase
          .from("author_nodes")
          .select("id")
          .eq("author_id", authorId!)
          .eq("node_id", "BP-03")
          .maybeSingle();

        const bp03Payload = {
          content_json: { social_posts: filteredSocial, quiz_insights: content.quiz_insights_for_social, source: "BP-02" },
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

      setLiveUrl(micrositeUrl);
      setContent((prev: any) => ({ ...prev, activated: true, publishChannels, _currentStep: 4 }));
      // Fire-and-forget: ensure email sequence + funnel exist for BP-02
      ensureEmailSequence({ authorId: authorId!, nodeId: "BP-02" });
      ensureFunnel({ authorId: authorId!, nodeId: "BP-02", funnelType: "lead_magnet" });

      // Also write a row to the funnels table so it appears in My Funnels.
      // Idempotent — bp02-activate-funnel will update if a row already exists.
      try {
        const lmTitle = (content?.leadMagnetContent?.optin_page?.headline)
          || (content?.optin_page?.headline)
          || (content?.headline)
          || "Free Lead Magnet";
        const lmSubheadline = (content?.leadMagnetContent?.optin_page?.subheadline)
          || (content?.optin_page?.subheadline)
          || undefined;
        supabase.functions.invoke("bp02-activate-funnel", {
          body: {
            node_id: "BP-02",
            lead_magnet_title: lmTitle,
            headline: lmTitle,
            subheadline: lmSubheadline,
          },
        }).then(({ error: bpErr }) => {
          if (bpErr) console.warn("[BP02] bp02-activate-funnel non-fatal:", bpErr.message);
        });
      } catch (e) {
        console.warn("[BP02] bp02-activate-funnel invoke threw (non-fatal):", e);
      }

      toast.success("Your lead magnet is live! 🎉");
    } catch (e: any) {
      toast.error(e.message || "Something went wrong during publishing.");
      setError(e.message);
      setStep(3);
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
      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        <BuilderHeader
          nodeId="BP-02"
          title="Lead Magnets"
          subtitle="A complete lead magnet + opt-in microsite + nurture sequence"
          icon={Gift}
        />
        {/* Back navigation handled by NodeBuilder page wrapper — preserves bookId/bookTitle. */}
        <UnifiedStepper
          nodeId="BP-02"
          steps={STEPS}
          current={Math.max(step, 0)}
          onStepClick={(i) => {
            if (i === 0) setStep(0);
            else if (i === 2 && content) setStep(2);
            else if (i === 3 && content) setStep(3);
          }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <NodeHowItWorks nodeId="BP-02" defaultOpen={step === 0} />
        {step < 0 && (
          <AbbyCard>
            <p className="text-muted-foreground">Restoring your lead magnet…</p>
          </AbbyCard>
        )}

        {step === 0 && contextBlocked && (
          <AnalyseBookGate
            authorId={authorId}
            bookId={activeBookId}
            onAnalysed={() => { setContextBlocked(false); handleGenerate(); }}
          />
        )}
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
                  I'm going to create 2 lead magnet concepts — a Quiz and a Checklist — perfectly matched to '{detectedBookTitle || bookTitle || "your book"}', plus a complete opt-in page that captures subscribers automatically. Ready?
                </p>
                <div className="mb-4">
                  <BuilderIntroBlock spec={BP_INTRO_SPECS["BP-02"]} />
                </div>
                <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}>
                  <Sparkles className="h-4 w-4 mr-2" /> Generate My Lead Magnets
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
              <p className="text-xs text-muted-foreground">Abby usually takes about 1 minute</p>
            </div>
          </AbbyCard>
        )}

        {step === 2 && content && (
          <ReviewStep
            content={content}
            setContent={setContent}
            authorName={authorName}
            authorId={authorId!}
            onNext={async () => {
              setStep(3);
              if (authorId && content) {
                const { data: n } = await supabase
                  .from("author_nodes")
                  .select("id")
                  .eq("author_id", authorId)
                  .eq("node_id", "BP-02")
                  .maybeSingle();
                if (n) {
                  await supabase.from("author_nodes").update({
                    content_json: { ...content, _currentStep: 3 },
                    current_step: 3,
                  }).eq("id", n.id);
                }
              }
            }}
            onSaveDraft={handleSaveDraft}
            error={toAbbyError(error)}
            isSavingDraft={isSavingDraft}
          />
        )}

        {step === 3 && content && (
          <PublishStep
            content={content}
            publishChannels={publishChannels}
            setPublishChannels={setPublishChannels}
            onPublish={handlePublish}
            onBack={() => setStep(2)}
            onSaveDraft={handleSaveDraft}
            isPublishing={isPublishing}
            isSavingDraft={isSavingDraft}
            error={toAbbyError(error)}
          />
        )}

        {step === 4 && !content?.activated && (
          <AbbyCard>
            <div className="space-y-4">
              <p className="text-muted-foreground font-medium animate-pulse">{ACTIVATING_MESSAGES[msgIndex % ACTIVATING_MESSAGES.length]}</p>
              <Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" />
              <p className="text-xs text-muted-foreground">Abby usually takes 20–40 seconds</p>
            </div>
          </AbbyCard>
        )}

        {step === 4 && content?.activated && (
          <PublishSuccessStep authorName={authorName} authorId={authorId!} liveUrl={liveUrl} copied={copied} onCopy={handleCopyUrl} publishChannels={publishChannels} />
        )}
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

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

/* ---- Deep update helper ---- */
function deepSet(obj: any, path: (string | number)[], value: any): any {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };
  clone[head] = deepSet(clone[head] ?? (typeof rest[0] === "number" ? [] : {}), rest, value);
  return clone;
}

/* ---- Editable text component (always-visible edit affordance) ---- */
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
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group relative w-full text-left rounded-md px-2 py-1 -mx-2 -my-1 border border-dashed border-transparent hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus:border-primary/60 focus:bg-primary/5 transition-colors"
        title="Click to edit"
      >
        {multiline ? (
          <p className={`whitespace-pre-wrap ${className}`}>
            {value || <span className="italic text-muted-foreground">Empty — click to edit</span>}
          </p>
        ) : (
          <span className={className}>
            {value || <span className="italic text-muted-foreground">Empty — click to edit</span>}
          </span>
        )}
        <Pencil className="inline-block ml-1.5 h-3 w-3 text-muted-foreground/60 align-middle" />
      </button>
    );
  }

  const commit = () => {
    if (draft !== value) onSave(draft);
    setEditing(false);
  };

  if (multiline) {
    return (
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        autoFocus
        className={`${className} min-h-[80px]`}
      />
    );
  }
  return (
    <Input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
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
  onNext,
  onSaveDraft,
  error,
  isSavingDraft,
}: {
  content: any;
  setContent: (c: any) => void;
  authorName: string;
  authorId: string;
  onNext: () => void;
  onSaveDraft: () => void;
  error: string | null;
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

  const quizStructure = content.quiz_structure || {};
  const quizData = quizStructure.questions || content.quiz_questions || content.quiz;
  const scoringTiers = quizStructure.scoring_tiers || content.scoring_tiers || content.result_tiers;
  const quizTitle = quizStructure.quiz_title || quizStructure.title || content.quiz_title || "";
  const quizDescription = quizStructure.quiz_description || quizStructure.description || content.quiz_description || "";

  const checklistStructure = content.checklist_structure || {};

  const headlineVariants = content.headline_variants || content.optin_page?.headline_variants || [];

  // Auto-save edits to author_nodes.content_json (debounced)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const persistContent = useCallback((nextContent: any) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        setSavingEdit(true);
        const { data: existingNode } = await supabase
          .from("author_nodes")
          .select("id")
          .eq("author_id", authorId)
          .eq("node_id", "BP-02")
          .maybeSingle();
        if (existingNode) {
          await supabase
            .from("author_nodes")
            .update({ content_json: nextContent })
            .eq("id", existingNode.id);
        }
        setSavedAt(Date.now());
      } catch (e) {
        console.error("[BP02] Auto-save failed:", e);
        toast.error(toAbbyError(e));
      } finally {
        setSavingEdit(false);
      }
    }, 700);
  }, [authorId]);

  const updateField = useCallback((path: (string | number)[], value: any) => {
    setContent((prev: any) => {
      const next = deepSet(prev, path, value);
      persistContent(next);
      return next;
    });
  }, [setContent, persistContent]);

  const handleSelectMagnet = (idx: number) => {
    setSelectedMagnetIdx(idx);
    setContent((prev: any) => {
      const next = { ...prev, selected_lead_magnet: idx };
      persistContent(next);
      return next;
    });
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

      {/* Always-visible editability hint */}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-foreground">
          <Pencil className="h-3.5 w-3.5 text-primary shrink-0" />
          <span><strong>Everything below is editable.</strong> Click any field — headline, question, email, social post — to refine. Edits save automatically.</span>
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {savingEdit ? "Saving…" : savedAt ? "Saved" : ""}
        </span>
      </div>

      <Tabs defaultValue="magnets" className="w-full">
        <TabsList className="w-full grid grid-cols-6 h-auto">
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
          <TabsTrigger value="share" className="text-xs py-2 data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300">
            <Share2 className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Share
          </TabsTrigger>
          <TabsTrigger value="distribution" className="text-xs py-2 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300">
            <BarChart3 className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Flow
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
            isChecklistType && checklistStructure.sections ? (
              <div className="space-y-4">
                <Card className="border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50/50 to-transparent dark:from-teal-950/20">
                  <CardContent className="pt-5 space-y-2">
                    <EditableText
                      value={checklistStructure.checklist_title || selectedMagnet?.title || ""}
                      onSave={(v) => updateField(["checklist_structure", "checklist_title"], v)}
                      className="text-lg font-bold text-foreground"
                    />
                    <EditableText
                      value={checklistStructure.checklist_description || ""}
                      onSave={(v) => updateField(["checklist_structure", "checklist_description"], v)}
                      className="text-sm text-muted-foreground"
                      multiline
                    />
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wide">
                    Sections ({checklistStructure.sections.length})
                  </h4>
                  {checklistStructure.sections.map((section: any, si: number) => (
                    <Card key={si} className="border-l-4 border-l-teal-400">
                      <CardContent className="pt-4 space-y-3">
                        <EditableText
                          value={section.section_title || ""}
                          onSave={(v) => updateField(["checklist_structure", "sections", si, "section_title"], v)}
                          className="text-sm font-bold text-foreground"
                        />
                        <div className="space-y-1.5 pl-2">
                          {(section.items || []).map((item: string, ii: number) => (
                            <div key={ii} className="flex items-start gap-2">
                              <div className="w-4 h-4 rounded border-2 border-teal-400/60 shrink-0 mt-0.5" />
                              <EditableText
                                value={item}
                                onSave={(v) => updateField(["checklist_structure", "sections", si, "items", ii], v)}
                                className="text-sm text-muted-foreground"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="bg-muted/30 rounded-md px-3 py-2">
                          <EditableText
                            value={section.interpretation || ""}
                            onSave={(v) => updateField(["checklist_structure", "sections", si, "interpretation"], v)}
                            className="text-xs text-muted-foreground italic"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {checklistStructure.scoring_key && (
                  <div className="space-y-3 mt-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Scoring Key ({checklistStructure.scoring_key.total_items} items total)
                    </h4>
                    {(checklistStructure.scoring_key.tiers || []).map((tier: any, ti: number) => (
                      <Card key={ti} className={TIER_COLORS[ti % TIER_COLORS.length]}>
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <EditableText
                              value={tier.label || ""}
                              onSave={(v) => updateField(["checklist_structure", "scoring_key", "tiers", ti, "label"], v)}
                              className="text-sm font-bold text-foreground"
                            />
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground shrink-0">{tier.min}–{tier.max} checked</span>
                          </div>
                          <EditableText
                            value={tier.description || ""}
                            onSave={(v) => updateField(["checklist_structure", "scoring_key", "tiers", ti, "description"], v)}
                            className="text-sm text-muted-foreground"
                            multiline
                          />
                          <div className="bg-primary/5 rounded-md p-2">
                            <p className="text-xs font-medium text-primary mb-1">Recommended:</p>
                            <EditableText
                              value={tier.recommendation || ""}
                              onSave={(v) => updateField(["checklist_structure", "scoring_key", "tiers", ti, "recommendation"], v)}
                              className="text-xs text-muted-foreground"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : selectedMagnet ? (
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

        {/* ---- Share Tab — Social Distribution Pack ---- */}
        <TabsContent value="share" className="mt-4 space-y-4">
          <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 p-3 text-xs text-purple-800 dark:text-purple-200">
            Copy these ready-made captions to LinkedIn, Instagram, Facebook, X or your email list to drive opt-ins to your lead magnet.
          </div>
          <SocialDistributionPack
            authorId={authorId}
            content={content?.social_pack || null}
            onContentLoaded={(socialPack) => setContent({ ...content, social_pack: socialPack })}
          />
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
        <Button className="flex-1" size="lg" onClick={onNext}>
          Next: Publish <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center">{toAbbyError(error)}</div>
      )}
    </div>
  );
}

function PublishStep({
  content,
  publishChannels,
  setPublishChannels,
  onPublish,
  onBack,
  onSaveDraft,
  isPublishing,
  isSavingDraft,
  error,
}: {
  content: any;
  publishChannels: PublishChannels;
  setPublishChannels: React.Dispatch<React.SetStateAction<PublishChannels>>;
  onPublish: () => void;
  onBack: () => void;
  onSaveDraft: () => void;
  isPublishing: boolean;
  isSavingDraft?: boolean;
  error: string | null;
}) {
  const nurureCount = (content.nurture_sequence || content.nurture_emails || []).length;
  const socialCount = (content.social_media_posts || content.social_posts || []).length;

  return (
    <div className="space-y-4">
      <AbbyCard>
        <p className="text-muted-foreground">
          Everything looks great! Choose which channels you'd like to activate, then hit Publish.
        </p>
      </AbbyCard>

      <Card className="p-5 border-primary/30 bg-primary/5">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" /> Where do you want to publish?
        </h4>
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
            <Checkbox checked={publishChannels.optinPage} disabled className="mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Opt-in Page (your microsite)</p>
              <p className="text-xs text-muted-foreground">Your live lead capture page — always included</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">CORE</span>
          </label>

          {nurureCount > 0 && (
            <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border cursor-pointer hover:bg-muted/60 transition-colors">
              <Checkbox
                checked={publishChannels.emailNurture}
                onCheckedChange={(v) => setPublishChannels(prev => ({ ...prev, emailNurture: !!v }))}
                className="mt-0.5"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-indigo-500" /> Email Nurture Sequence
                </p>
                <p className="text-xs text-muted-foreground">{nurureCount} emails pushed to Email Marketing (BP-04)</p>
              </div>
            </label>
          )}

          {socialCount > 0 && (
            <>
              <div className="pt-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">Social Media Distribution</p>
              </div>
              {[
                { key: "linkedin" as const, label: "LinkedIn", icon: "💼" },
                { key: "instagram" as const, label: "Instagram", icon: "📸" },
                { key: "facebook" as const, label: "Facebook", icon: "👥" },
                { key: "x" as const, label: "X / Twitter", icon: "𝕏" },
              ].map(({ key, label, icon }) => (
                <label key={key} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border cursor-pointer hover:bg-muted/60 transition-colors">
                  <Checkbox
                    checked={publishChannels[key]}
                    onCheckedChange={(v) => setPublishChannels(prev => ({ ...prev, [key]: !!v }))}
                  />
                  <span className="text-base">{icon}</span>
                  <p className="text-sm font-medium">{label}</p>
                </label>
              ))}
            </>
          )}
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Review
        </Button>
        <Button variant="outline" className="flex-1" onClick={onSaveDraft} disabled={isSavingDraft}>
          <Save className="h-4 w-4 mr-2" />
          {isSavingDraft ? "Saving..." : "Save Draft"}
        </Button>
        <Button className="flex-1" size="lg" onClick={onPublish} disabled={isPublishing}>
          {isPublishing ? (
            <><Sparkles className="h-4 w-4 mr-2 animate-spin" /> Publishing...</>
          ) : (
            <>Publish Selected <ArrowRight className="h-4 w-4 ml-2" /></>
          )}
        </Button>
      </div>
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center">{toAbbyError(error)}</div>
      )}
    </div>
  );
}

function PublishSuccessStep({ authorName, authorId, liveUrl, copied, onCopy, publishChannels }: {
  authorName: string;
  authorId: string;
  liveUrl: string | null;
  copied: boolean;
  onCopy: () => void;
  publishChannels: PublishChannels;
}) {
  const navigate = useNavigate();
  const [showQR, setShowQR] = useState(false);
  const [socialPack, setSocialPack] = useState<any>(null);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);

  const anySocial = publishChannels.linkedin || publishChannels.instagram || publishChannels.facebook || publishChannels.x;
  const activatedPlatforms = [
    publishChannels.linkedin && "LinkedIn",
    publishChannels.instagram && "Instagram",
    publishChannels.facebook && "Facebook",
    publishChannels.x && "X",
  ].filter(Boolean);

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

      {/* Activated Channels Summary */}
      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-500" /> Channels Activated
        </h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-emerald-500">✓</span>
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Opt-in Page</span>
          </div>
          {publishChannels.emailNurture && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-emerald-500">✓</span>
              <Mail className="h-3.5 w-3.5 text-indigo-500" />
              <span>Email Nurture → Email Marketing</span>
            </div>
          )}
          {activatedPlatforms.map(p => (
            <div key={p as string} className="flex items-center gap-2 text-sm">
              <span className="text-emerald-500">✓</span>
              <Share2 className="h-3.5 w-3.5 text-purple-500" />
              <span>{p} → Social Media</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Sequential Flow — Next Steps */}
      <Card className="p-5 border-border">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Launch Flow</span>
          <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">Step 1 of {1 + (publishChannels.emailNurture ? 1 : 0) + (anySocial ? 1 : 0)} complete</span>
        </div>
        <div className="space-y-3">
          {/* Step 1 — Lead Magnet (done) */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <Check className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Lead Magnet</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Opt-in page is live and capturing leads</p>
            </div>
          </div>

          {/* Step 2 — Email Nurture */}
          {publishChannels.emailNurture && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 cursor-pointer hover:ring-1 hover:ring-indigo-400/40 transition-all"
              onClick={() => navigate("/node-builder/BP-01")}
            >
              <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                <ArrowRight className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Email Nurture</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400">Content pushed — review and activate your nurture sequence</p>
              </div>
              <ArrowRight className="h-4 w-4 text-indigo-400 shrink-0" />
            </div>
          )}

          {/* Step 3 — Social Media */}
          {anySocial && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 cursor-pointer hover:ring-1 hover:ring-purple-400/40 transition-all"
              onClick={() => navigate("/node-builder/BP-03")}
            >
              <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center shrink-0">
                <ArrowRight className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">Social Media</p>
                <p className="text-xs text-purple-600 dark:text-purple-400">{activatedPlatforms.join(", ")} posts ready to activate</p>
              </div>
              <ArrowRight className="h-4 w-4 text-purple-400 shrink-0" />
            </div>
          )}
        </div>
      </Card>

      {/* Primary CTA — Continue to next step */}
      {publishChannels.emailNurture ? (
        <Button className="w-full" size="lg" onClick={() => navigate("/node-builder/BP-01")}>
          Continue to Email Nurture <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      ) : anySocial ? (
        <Button className="w-full" size="lg" onClick={() => navigate("/node-builder/BP-03")}>
          Continue to Social Media <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      ) : (
        <Button className="w-full" size="lg" onClick={() => navigate("/dashboard?section=marketing-hub&highlight=lead-magnets")}>
          Activate My Marketing Campaign <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}

      <Card className="p-4 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
        <div className="flex gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">Abby says</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Your lead magnet is live!{publishChannels.emailNurture ? " Your nurture emails have been pushed to Email Marketing — head there next to review and activate them." : ""}{anySocial ? ` Social posts for ${activatedPlatforms.join(", ")} are ready in Social Media.` : ""} Follow the steps above to complete your launch flow.
            </p>
          </div>
        </div>
      </Card>

      {anySocial && (
        <SocialDistributionPack authorId={authorId} content={socialPack} onContentLoaded={setSocialPack} />
      )}

    </div>
  );
}
