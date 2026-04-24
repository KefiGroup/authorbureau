import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { builderBackTarget, resolveActiveBookId } from "@/lib/book-nav";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, Calendar, Hash, ChevronDown, ChevronUp, Megaphone, Copy, Download, MapPin, ExternalLink, PencilLine, Share2 } from "lucide-react";
import BuilderIntroBlock, { BP_INTRO_SPECS, BackToReviewLink } from "@/components/dashboard/builders/shared/BuilderIntroBlock";
import BuilderHeader from "@/components/dashboard/builders/shared/BuilderHeader";
import UnifiedStepper from "@/components/dashboard/builders/shared/UnifiedStepper";
import { categoryStyles } from "@/components/dashboard/builders/shared/BuilderTheme";
import NodeHowItWorks from "@/components/dashboard/builders/shared/NodeHowItWorks";
import JSZip from "jszip";
import { toAbbyError } from "@/lib/abby-error";
import SocialGraphicCard from "./SocialGraphicCard";
import PostEditorSheet from "./PostEditorSheet";
import {
  PLATFORM_DIMENSIONS,
  PLATFORM_TAB_LABELS,
  extractPullQuote,
  renderSocialGraphic,
  type SocialPlatform,
} from "./socialGraphic";
import BookProfileQuickForm from "@/components/dashboard/builders/shared/BookProfileQuickForm";
import { fetchWithTimeout, getActiveToken } from "@/lib/get-active-token";
import {
  PLATFORMS,
  PLATFORM_LABELS,
  flattenPosts,
  computeScheduleDates,
  type Frequency,
} from "@/components/dashboard/builders/social-media/socialKitHelpers";
import AnalyseBookGate from "@/components/dashboard/builders/_shared/AnalyseBookGate";

const STEPS = ["Introduction", "Generating", "Review", "Activate"];

const GENERATING_MESSAGES = [
  "Step 1 of 3 — Writing your LinkedIn posts...",
  "Step 2 of 3 — Writing Instagram + Facebook posts...",
  "Step 3 of 3 — Writing Twitter/X posts and outreach templates...",
  "Almost done — packaging your starter kit...",
];

const ACTIVATING_MESSAGES = [
  "Saving your kit to your account...",
  "Building your Social Calendar...",
  "Almost ready...",
];

function hasUsableSocialKit(value: any) {
  return !!value && (
    (Array.isArray(value.posts) && value.posts.length > 0) ||
    (Array.isArray(value.outreach_kit) && value.outreach_kit.length > 0) ||
    value.source === "BP-02"
  );
}

interface Props {
  authorId: string | null;
  bookId?: string | null;
}

async function fetchBp03NodeState(body: Record<string, unknown>) {
  const token = await getActiveToken();
  if (!token) throw new Error("Your session has expired. Please sign in again.");

  const response = await fetchWithTimeout(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bp03-node-state`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
  );

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "We couldn't save your social media kit.");
  }
  return result;
}

/**
 * Persist the flattened kit into the social_posts table so it shows up in the
 * Social Calendar with status='ready' and a deterministic schedule.
 */
async function persistSocialPostsToCalendar(authorId: string, content: any, startDate: Date, frequency: Frequency) {
  const flat = flattenPosts(content);
  if (flat.length === 0) return { saved: 0 };

  // Schedule dates by post.day so all 4 platform posts on the same day share a date
  const uniqueDays = Array.from(new Set(flat.map(p => p.day))).sort((a, b) => a - b);
  const dayDates = computeScheduleDates(startDate, uniqueDays.length, frequency);
  const dayToDate = new Map<number, Date>();
  uniqueDays.forEach((d, i) => dayToDate.set(d, dayDates[i]));

  // Wipe previous BP-03 ready/draft posts for this author so re-Activate is idempotent
  await supabase
    .from("social_posts" as any)
    .delete()
    .eq("author_id", authorId)
    .eq("node_id", "BP-03")
    .in("status", ["draft", "ready"]);

  const rows = flat.map(p => {
    const date = dayToDate.get(p.day) || startDate;
    const scheduled = new Date(date);
    scheduled.setHours(9, 0, 0, 0);
    return {
      author_id: authorId,
      node_id: "BP-03",
      platform: p.platform,
      content: [p.caption, p.hashtags.length ? p.hashtags.map(h => `#${h}`).join(" ") : ""].filter(Boolean).join("\n\n"),
      scheduled_at: scheduled.toISOString(),
      status: "ready",
      post_index: p.index,
      post_type: p.post_type,
    };
  });

  // Insert in chunks of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase.from("social_posts" as any).insert(batch);
    if (error) throw error;
  }

  return { saved: rows.length };
}

export default function BP03Builder({ authorId, bookId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [authorSlug, setAuthorSlug] = useState("");
  const [contextBlocked, setContextBlocked] = useState(false);
  const [bookTitle, setBookTitle] = useState("");
  const [hasContext, setHasContext] = useState<boolean | null>(null);
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [progressLabel, setProgressLabel] = useState<string>("");
  const [isResuming, setIsResuming] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [authorPhotoUrl, setAuthorPhotoUrl] = useState<string | null>(null);
  const [bookColor, setBookColor] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasResumed = useRef(false);
  const { isReady: isAuthReady } = useAuthReady();
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading } = useAuthorBook();

  // Check which social accounts the author has connected. Re-checks every time we land on Review.
  useEffect(() => {
    if (!isAuthReady || !authorId || step !== 2) return;
    let cancelled = false;
    (async () => {
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("user_id")
        .eq("id", authorId)
        .maybeSingle();
      const userId = profile?.user_id;
      if (!userId) return;
      const { data } = await supabase
        .from("social_connections")
        .select("platform, status")
        .eq("user_id", userId)
        .eq("status", "connected");
      if (!cancelled) setConnectedPlatforms((data || []).map((r: any) => r.platform));
    })();
    return () => { cancelled = true; };
  }, [authorId, isAuthReady, step]);

  useEffect(() => {
    if (!isAuthReady || !authorId) return;
    let cancelled = false;

    const resumeBuilder = async () => {
      setIsResuming(true);
      setError(null);

      try {
        const result = await fetchBp03NodeState({ action: "load", author_id: authorId });
        if (cancelled) return;

        const profile = result.profile as { pen_name?: string; author_slug?: string } | null;
        const node = result.node as { content_json?: any; status?: string; current_step?: number } | null;
        const resolvedBookTitle = typeof result.book_title === "string" ? result.book_title : "";
        const resolvedHasContext = Boolean(result.has_context ?? resolvedBookTitle);

        setAuthorName(profile?.pen_name || "there");
        setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));
        setBookTitle(resolvedBookTitle);
        setHasContext(resolvedHasContext);

        // Fetch author photo + book color (best-effort)
        try {
          const { data: ap } = await supabase
            .from("author_profiles")
            .select("photo_url")
            .eq("id", authorId)
            .maybeSingle();
          if (!cancelled && ap?.photo_url) setAuthorPhotoUrl(ap.photo_url);
          const { data: book } = await supabase
            .from("books")
            .select("cover_image_url")
            .eq("author_id", authorId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (!cancelled && book) {
            // No brand_color column — leave null so renderer derives from title hash
            setBookColor(null);
          }
        } catch (e) {
          console.warn("[BP03] photo/book lookup failed", e);
        }

        const status = node?.status;
        const cj: any = node?.content_json || null;
        const savedStep = Number((cj as any)?._currentStep ?? node?.current_step ?? 0);
        const hasSavedKit = hasUsableSocialKit(cj);
        const hasReviewableState = hasSavedKit || status === "content_ready" || status === "live" || savedStep >= 2;

        const storedTitle = cj?.book_title;
        if (storedTitle) {
          setBookTitle((prev) => prev || storedTitle);
          setHasContext(true);
        }

        if (status === "live") {
          setContent({ ...(cj || {}), activated: true, publishStatus: status, _currentStep: 3 });
          setStep(3);
          // Look up how many posts are in the calendar so success screen is accurate
          const { count } = await supabase
            .from("social_posts" as any)
            .select("id", { count: "exact", head: true })
            .eq("author_id", authorId)
            .eq("node_id", "BP-03");
          setSavedCount(count || 0);
        } else if (status === "generating") {
          setContent(cj);
          setStep(1);
        } else if (hasReviewableState) {
          setContent({ ...(cj || {}), activated: false, publishStatus: status || "content_ready", _currentStep: Math.max(savedStep, 2) });
          setStep(2);
        } else {
          setContent(null);
          setStep(0);
        }

        hasResumed.current = true;
      } catch (resumeError) {
        if (!cancelled) {
          console.error("BP03 mount error:", resumeError);
          setContent(null);
          setStep(0);
        }
      } finally {
        if (!cancelled) setIsResuming(false);
      }
    };

    void resumeBuilder();
    return () => { cancelled = true; };
  }, [authorId, isAuthReady]);

  useEffect(() => {
    if (step === 1 || (step === 3 && !content?.activated)) {
      const msgs = step === 1 ? GENERATING_MESSAGES : ACTIVATING_MESSAGES;
      setMsgIndex(0);
      intervalRef.current = setInterval(() => {
        setMsgIndex((i) => (i + 1) % msgs.length);
      }, 3000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [step, content?.activated]);

  useEffect(() => {
    return () => {
      if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
        progressPollRef.current = null;
      }
    };
  }, []);

  const handleGenerate = async () => {
    setStep(1);
    setError(null);
    setProgressLabel("");

    progressPollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from("author_nodes")
        .select("content_json")
        .eq("author_id", authorId!)
        .eq("node_id", "BP-03")
        .maybeSingle();
      const prog = (data?.content_json as any)?.progress;
      if (prog?.label) setProgressLabel(prog.label);
    }, 2000);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-bp03-social-media", {
        body: { author_id: authorId, book_id: bookId ?? null },
      });
      if (data?.status === "context_blocked") {
        setContextBlocked(true);
        setStep(0);
        return;
      }
      if (fnErr) {
        const msg = fnErr.message || "";
        if (msg.includes("401") || msg.includes("Unauthorized")) throw new Error("Your session has expired. Please refresh the page and try again.");
        if (msg.includes("500") || msg.includes("Internal")) throw new Error("Abby is having trouble generating content right now. Please try again in a moment.");
        throw new Error(msg || "Generation failed. Please try again.");
      }
      if (!data?.success) throw new Error(data?.error || "Generation failed. Please try again.");
      setContent(data.content);
      setStep(2);
    } catch (e: any) {
      setError(e.message);
      const hasUsableKit =
        !!content &&
        ((Array.isArray(content.posts) && content.posts.length > 0) ||
          (Array.isArray(content.outreach_kit) && content.outreach_kit.length > 0));
      setStep(hasUsableKit ? 2 : 0);
    } finally {
      if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
        progressPollRef.current = null;
      }
    }
  };

  const persistNodeState = async (nextStatus: "content_ready" | "live") => {
    if (!authorId) throw new Error("Please wait for your author profile to finish loading.");
    if (!hasUsableSocialKit(content)) throw new Error("Generate your starter kit before saving it.");
    const result = await fetchBp03NodeState({
      action: "save",
      author_id: authorId,
      status: nextStatus,
      content,
    });
    return result.node;
  };

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const savedNode = await persistNodeState("content_ready");
      setContent({
        ...(savedNode.content_json as any),
        activated: false,
        publishStatus: savedNode.status,
        _currentStep: Number((savedNode.content_json as any)?._currentStep ?? savedNode.current_step ?? 2),
      });
      setStep(2);
      toast.success("Your social media kit is saved.");
    } catch (e: any) {
      console.error("Save error:", e);
      setError(e.message || "We couldn't save your social media kit.");
      toast.error("We couldn't save your social media kit.");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Activate = save kit as live + persist all posts to social_posts (status='ready')
   * with a default schedule (start tomorrow, every 3 days). NO Buffer.
   */
  const handleActivate = async () => {
    if (!authorId) return;
    setStep(3);
    setError(null);
    setIsActivating(true);
    try {
      const savedNode = await persistNodeState("live");

      // Default schedule: start tomorrow, every 3 days
      const start = new Date();
      start.setDate(start.getDate() + 1);
      const { saved } = await persistSocialPostsToCalendar(authorId, content, start, "every_3_days");
      setSavedCount(saved);

      setContent({
        ...(savedNode.content_json as any),
        activated: true,
        publishStatus: savedNode.status,
        scheduledCount: saved,
      });

      toast.success(`${saved} posts saved to your Social Calendar.`);
    } catch (e: any) {
      console.error("Activate error:", e);
      setError(e.message || "We couldn't activate your social media kit.");
      setStep(2);
    } finally {
      setIsActivating(false);
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
          nodeId="BP-03"
          title="Social Media"
          subtitle="20 branded posts + 4-week calendar + outreach kit"
          icon={Share2}
          onBack={() => navigate(builderBackTarget(bookId, "brand"))}
        />
        <UnifiedStepper
          nodeId="BP-03"
          steps={STEPS}
          current={step}
          onStepClick={(i) => {
            if (i === 0) setStep(0);
            else if (i === 2 && content) setStep(2);
          }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <NodeHowItWorks nodeId="BP-03" defaultOpen={step === 0} />
        {step === 0 && contextBlocked && (
          <AnalyseBookGate
            authorId={authorId}
            bookId={bookId ?? null}
            onAnalysed={() => { setContextBlocked(false); handleGenerate(); }}
          />
        )}
        {isResuming ? (
          <AbbyCard><p className="text-muted-foreground">Loading your saved social media kit…</p></AbbyCard>
        ) : step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's build your Social Media</h2>
            {!isBookLoading && !hasBook ? (
              <>
                <p className="text-muted-foreground mb-4">Hi {authorName}! Before I build your social media kit, I need to know about your book. Please complete your book profile first.</p>
                <Button onClick={() => navigate("/my-books?returnTo=/node-builder/BP-03")}>Complete Book Profile</Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-4">
                  I'm going to create your social media starter kit for '{detectedBookTitle || "your book"}' — 20 ready-to-post pieces across LinkedIn, Instagram, Facebook, and X, plus 3 outreach email templates. Ready?
                </p>
                <div className="mb-4">
                  <BuilderIntroBlock spec={BP_INTRO_SPECS["BP-03"]} />
                </div>
                <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate} disabled={isBookLoading}>
                  <Sparkles className="h-4 w-4 mr-2" /> Generate My Starter Kit
                </Button>
              </>
            )}
            {error && (
              <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {toAbbyError(error)}
                <Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button>
              </div>
            )}
          </AbbyCard>
        )}

        {step === 1 && (
          <AbbyCard>
            <div className="space-y-4">
              <p className="text-muted-foreground font-medium animate-pulse">
                {progressLabel || GENERATING_MESSAGES[msgIndex]}
              </p>
              <Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" />
              <p className="text-xs text-muted-foreground">3 quick steps — usually 30–60 seconds</p>
            </div>
          </AbbyCard>
        )}

        {step === 2 && content && (
          <>
            {(content as any)?.source === "BP-02" && (
              <Card className="p-4 border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-950/30">
                <div className="flex gap-3 items-start">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-teal-800 dark:text-teal-200">Pre-loaded from Lead Magnets</p>
                    <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">Abby has pre-loaded social posts from your Lead Magnet. Review and activate them below.</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Social-account connection note (manual posting model) */}
            {connectedPlatforms.length > 0 && (
              <Card className="p-3 border-border bg-muted/40">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Check className="h-3.5 w-3.5" />
                  Connected accounts saved for reference: <strong>{connectedPlatforms.join(", ")}</strong>. You'll post manually using your kit.
                </p>
              </Card>
            )}
            <ReviewStep
              content={content}
              authorName={authorName}
              bookTitle={bookTitle || detectedBookTitle || "your book"}
              authorPhotoUrl={authorPhotoUrl}
              bookColor={bookColor}
              onSave={handleSave}
              onActivate={handleActivate}
              onSavePost={async (updatedPost) => {
                const nextPosts = (content.posts || []).map((p: any) =>
                  p.day === updatedPost.day ? updatedPost : p,
                );
                const nextContent = { ...content, posts: nextPosts };
                setContent(nextContent);
                try {
                  await fetchBp03NodeState({
                    action: "save",
                    author_id: authorId,
                    status: content?.publishStatus === "live" ? "live" : "content_ready",
                    content: nextContent,
                  });
                  toast.success("Post updated.");
                } catch (e: any) {
                  toast.error(e.message || "We couldn't save your edit.");
                }
              }}
              isSaving={isSaving}
            />
          </>
        )}

        {step === 3 && !content?.activated && (
          <AbbyCard>
            <div className="space-y-4">
              <p className="text-muted-foreground font-medium animate-pulse">{ACTIVATING_MESSAGES[msgIndex % ACTIVATING_MESSAGES.length]}</p>
              <Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" />
              <p className="text-xs text-muted-foreground">Usually 5–10 seconds</p>
            </div>
          </AbbyCard>
        )}

        {step === 3 && content?.activated && (
          <SuccessScreen
            scheduledCount={savedCount || (content as any)?.scheduledCount || 0}
            authorName={authorName}
            bookTitle={bookTitle || detectedBookTitle || "your book"}
            onEditKit={() => setStep(2)}
            onDownloadZip={() => downloadKitZip(content, bookTitle, authorName, authorPhotoUrl, bookColor)}
          />
        )}
        {step === 3 && content?.activated && <BackToReviewLink onClick={() => setStep(2)} />}
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

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "bg-blue-600 text-white",
  instagram: "bg-gradient-to-br from-purple-500 to-pink-500 text-white",
  facebook: "bg-blue-500 text-white",
  twitter: "bg-foreground text-background",
};

const WEEK_LABELS: Record<number, string> = {
  1: "Week 1 — Establish the Problem",
  2: "Week 2 — Introduce the Framework",
  3: "Week 3 — Share Transformations",
  4: "Week 4 — Make the Offer",
};

function getWeek(day: number): number {
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

async function downloadKitZip(
  content: any,
  bookTitle: string,
  authorName: string,
  authorPhotoUrl?: string | null,
  bookColor?: string | null,
) {
  try {
    const zip = new JSZip();
    const safeName = bookTitle.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_") || "Social_Media_Kit";
    const folder = zip.folder(`${safeName}_Social_Media_Kit`)!;

    const platforms: SocialPlatform[] = ["instagram", "linkedin", "facebook", "twitter"];
    const socialFolder = folder.folder("social_media")!;

    // Generate 80 PNG graphics: 4 platforms × 20 posts
    for (const platform of platforms) {
      const platformFolder = socialFolder.folder(platform)!;
      for (const post of content.posts || []) {
        const pp = post[platform];
        if (!pp) continue;
        const pullQuote = extractPullQuote(pp.caption || "");
        try {
          const blob = await renderSocialGraphic({
            platform,
            authorName,
            authorPhotoUrl,
            bookColor,
            bookTitle,
            pullQuote,
          });
          const arr = await blob.arrayBuffer();
          const dayLabel = String(post.day).padStart(2, "0");
          platformFolder.file(`day_${dayLabel}.png`, arr);
        } catch (err) {
          console.warn(`[BP03 zip] graphic failed for ${platform} day ${post.day}`, err);
        }
      }
    }

    // captions.csv — day, platform, caption, hashtags, image_filename
    const csvHeader = "day,platform,caption,hashtags,image_filename";
    const csvRows: string[] = [csvHeader];
    (content.posts || []).forEach((p: any) => {
      const dayLabel = String(p.day).padStart(2, "0");
      for (const platform of platforms) {
        const pp = p[platform];
        if (!pp?.caption) continue;
        const caption = `"${(pp.caption || "").replace(/"/g, '""')}"`;
        const tags = `"${(pp.hashtags || []).map((h: string) => `#${h}`).join(" ")}"`;
        const file = `social_media/${platform}/day_${dayLabel}.png`;
        csvRows.push(`${p.day},${platform},${caption},${tags},${file}`);
      }
    });
    folder.file("captions.csv", csvRows.join("\n"));

    // Outreach
    if (content.outreach_kit?.length) {
      const outreachFolder = folder.folder("outreach_kit")!;
      for (const template of content.outreach_kit) {
        const filename = template.type.toLowerCase().replace(/[^a-z0-9]+/g, "_") + ".txt";
        outreachFolder.file(filename, `--- ${template.type} ---\nSubject: ${template.subject}\n\n${template.body}\n`);
      }
    }

    // VA-friendly README
    folder.file(
      "README.md",
      `# ${bookTitle} — Social Media Kit\n\nPrepared for ${authorName}.\n\nThis kit contains everything needed to post 20 days of content across 4 platforms.\n\n## Folder structure\n\n- \`social_media/instagram/\` — 20 square graphics (1080×1080), one per day\n- \`social_media/linkedin/\` — 20 landscape graphics (1200×628)\n- \`social_media/facebook/\` — 20 landscape graphics (1200×628)\n- \`social_media/twitter/\` — 20 widescreen graphics (1600×900)\n- \`captions.csv\` — every caption, hashtags, and matching image filename\n- \`outreach_kit/\` — 3 outreach email templates\n\n## How to post (for the VA / social manager)\n\n1. Open the folder for the platform you're posting to today.\n2. Grab the PNG named \`day_NN.png\` (NN = the day number).\n3. Open \`captions.csv\` and find the row with the same day + platform.\n4. Copy the caption and hashtags into the platform's post composer.\n5. Upload the PNG and publish.\n6. Mark the row done in your tracker.\n\n## Schedule suggestion\n\nPost one piece every 1–2 days, rotating platforms. Spread the 20 days across 4 weeks for steady cadence.\n\n— Authors Bureau\n`,
    );

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName}_Social_Media_Kit.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Social Media Kit downloaded!");
  } catch (e: any) {
    toast.error("Download failed: " + e.message);
  }
}

function ReviewStep({
  content,
  authorName,
  bookTitle,
  authorPhotoUrl,
  bookColor,
  onSave,
  onActivate,
  onSavePost,
  isSaving,
}: {
  content: any;
  authorName: string;
  bookTitle: string;
  authorPhotoUrl?: string | null;
  bookColor?: string | null;
  onSave: () => void;
  onActivate: () => void;
  onSavePost: (updatedPost: any) => Promise<void> | void;
  isSaving: boolean;
}) {
  const [downloading, setDownloading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any | null>(null);

  const handleDownloadZip = async () => {
    setDownloading(true);
    await downloadKitZip(content, bookTitle, authorName, authorPhotoUrl, bookColor);
    setDownloading(false);
  };

  const openEditor = (post: any) => {
    setEditingPost(post);
    setEditorOpen(true);
  };

  return (
    <div className="space-y-4">
      <AbbyCard>
        <p className="text-muted-foreground">
          Your complete marketing kit is ready! You have 20 social posts across 4 platforms (LinkedIn, Instagram, Facebook, X) plus 3 outreach email templates — all personalised to your book. Review everything below, then click Activate to send them to your Social Calendar.
        </p>
      </AbbyCard>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-auto">
          <TabsTrigger value="calendar" className="text-xs py-2">
            <Calendar className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Social Calendar
          </TabsTrigger>
          <TabsTrigger value="outreach" className="text-xs py-2">
            <Megaphone className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Outreach Kit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-2 mt-4">
          {[1, 2, 3, 4].map(week => {
            const weekPosts = content.posts?.filter((p: any) => getWeek(p.day) === week) || [];
            if (weekPosts.length === 0) return null;
            return (
              <div key={week} className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground mt-4">{WEEK_LABELS[week]}</h3>
                {weekPosts.map((post: any) => (
                  <PostCard
                    key={post.day}
                    post={post}
                    authorName={authorName}
                    authorPhotoUrl={authorPhotoUrl}
                    bookColor={bookColor}
                    bookTitle={bookTitle}
                    onClick={() => openEditor(post)}
                  />
                ))}
              </div>
            );
          })}
          {content.hashtag_strategy && (
            <Card className="mt-4">
              <CardContent className="pt-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2"><Hash className="h-3.5 w-3.5" /> Hashtag Strategy</h4>
                <div className="flex flex-wrap gap-1.5">
                  <Badge className="bg-primary/10 text-primary">{content.hashtag_strategy.author_hashtag}</Badge>
                  {content.hashtag_strategy.primary_hashtags?.map((h: string) => (
                    <Badge key={h} variant="secondary" className="text-xs">{h}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="outreach" className="mt-4 space-y-3">
          <AbbyCard>
            <p className="text-sm text-muted-foreground">
              These 3 templates will help you get on podcasts, in the press, and in front of book clubs. Personalised to your book — just copy, paste, and send.
            </p>
          </AbbyCard>
          {content.outreach_kit?.map((template: any, i: number) => (
            <OutreachCard key={i} template={template} />
          ))}
          {(!content.outreach_kit || content.outreach_kit.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">Outreach templates will appear here after generation.</p>
          )}
        </TabsContent>
      </Tabs>

      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">What do you want to do next?</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Button variant="outline" className="w-full" onClick={onSave} disabled={isSaving}>
              <Check className="h-4 w-4 mr-2" />{isSaving ? "Saving..." : "Save to My Account"}
            </Button>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Permanently store this exact starter kit so you can leave now and come back to it later.
            </p>
          </div>
          <div className="space-y-1.5">
            <Button variant="outline" className="w-full" onClick={handleDownloadZip} disabled={downloading}>
              <Download className="h-4 w-4 mr-2" />{downloading ? "Building ZIP…" : "Download Full Kit (.zip)"}
            </Button>
            <p className="text-xs text-muted-foreground leading-relaxed">
              ZIP with all 80 branded graphics (4 platforms × 20 posts), captions.csv & a VA-friendly README.
            </p>
          </div>
          <div className="space-y-1.5">
            <Button className="w-full" size="default" onClick={onActivate}>
              Activate <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sends all 20 posts to your Social Calendar (Marketing Hub) where you can copy, post and mark them done.
            </p>
          </div>
        </div>
        <p className="text-xs text-center text-muted-foreground pt-1 border-t border-border">
          ✓ 20 posts ready · ✓ 4 platforms · ✓ 3 outreach templates · ✓ Saved to your Social Calendar on Activate
        </p>
      </div>

      <PostEditorSheet
        open={editorOpen}
        onOpenChange={setEditorOpen}
        post={editingPost}
        authorName={authorName}
        authorPhotoUrl={authorPhotoUrl}
        bookColor={bookColor}
        bookTitle={bookTitle}
        onSave={async (updated) => {
          await onSavePost(updated);
        }}
      />
    </div>
  );
}

function PostCard({
  post,
  authorName,
  authorPhotoUrl,
  bookColor,
  bookTitle,
  onClick,
}: {
  post: any;
  authorName: string;
  authorPhotoUrl?: string | null;
  bookColor?: string | null;
  bookTitle?: string;
  onClick: () => void;
}) {
  const [platform, setPlatform] = useState<SocialPlatform>("instagram");
  const platformData = post[platform] || { caption: "", hashtags: [] };
  const pullQuote = extractPullQuote(platformData.caption || "");

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">Day {post.day}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{post.post_type}</Badge>
              {post.cta_type && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{post.cta_type}</Badge>}
            </div>
            <p className="font-medium text-sm truncate">{post.theme}</p>
          </div>
          <PencilLine className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-1 mb-2 flex-wrap">
            {(["instagram", "linkedin", "facebook", "twitter"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  platform === p ? PLATFORM_COLORS[p] : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {PLATFORM_TAB_LABELS[p]}
              </button>
            ))}
          </div>
          <div className="cursor-pointer" onClick={onClick}>
            <SocialGraphicCard
              platform={platform}
              authorName={authorName}
              authorPhotoUrl={authorPhotoUrl}
              bookColor={bookColor}
              bookTitle={bookTitle}
              pullQuote={pullQuote}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2">{platformData.caption}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function OutreachCard({ template }: { template: any }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `Subject: ${template.subject}\n\n${template.body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Template copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">{template.type}</h4>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            <Copy className="h-3.5 w-3.5 mr-1" />{copied ? "Copied!" : "Copy"}
          </Button>
        </div>
        <div>
          <span className="text-xs font-medium text-muted-foreground">Subject:</span>
          <p className="text-sm font-medium">{template.subject}</p>
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-line">{template.body}</p>
      </CardContent>
    </Card>
  );
}

/* ---- Success Screen (replaces Buffer-coupled PublishSuccessScreen) ---- */

function SuccessScreen({
  scheduledCount,
  authorName,
  bookTitle,
  onEditKit,
  onDownloadZip,
}: {
  scheduledCount: number;
  authorName: string;
  bookTitle: string;
  onEditKit: () => void;
  onDownloadZip: () => void;
}) {
  const navigate = useNavigate();
  const headline = "Your Social Media Kit is Ready 🎉";

  return (
    <div className="space-y-4">
      {/* Persistent breadcrumb banner */}
      <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-foreground">
          Your kit lives in <strong>Marketing Hub → Social Calendar</strong>. You'll post manually — copy a caption, grab the matching graphic, and publish.
        </span>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6 space-y-5">
          <div className="flex gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold mb-1">{headline}</h2>
              <p className="text-sm text-muted-foreground">
                {scheduledCount > 0
                  ? `I've prepared ${scheduledCount} posts for "${bookTitle}" — every post has a branded graphic for Instagram, LinkedIn, Facebook and X. Download the full kit, or open your Social Calendar to copy posts one at a time. Authors Bureau doesn't post for you — you (or your VA) post manually.`
                  : `I've prepared your kit for "${bookTitle}" — every post has a branded graphic for Instagram, LinkedIn, Facebook and X. Download the full kit, or open your Social Calendar to copy posts one at a time. You'll post manually using your kit.`}
              </p>
            </div>
          </div>

          {/* 3 destination cards */}
          <div className="grid sm:grid-cols-3 gap-3">
            <DestinationCard
              icon={<Calendar className="h-5 w-5" />}
              title="View Social Calendar"
              description="See, copy, and mark off all 20 posts."
              cta="Open Calendar"
              primary
              onClick={() => navigate("/dashboard?section=marketing-hub&tab=social-calendar")}
            />
            <DestinationCard
              icon={<PencilLine className="h-5 w-5" />}
              title="Edit My Kit"
              description="Tweak captions, hashtags, or rewrite a post."
              cta="Edit posts"
              onClick={onEditKit}
            />
            <DestinationCard
              icon={<Download className="h-5 w-5" />}
              title="Download Full Kit (.zip)"
              description="80 branded graphics + captions.csv + VA README."
              cta="Download .zip"
              onClick={onDownloadZip}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={() => navigate(builderBackTarget(resolveActiveBookId(), "brand"))}>
          ← Back to Book Hub
        </Button>
        <Button size="sm" onClick={() => navigate("/dashboard?section=marketing-hub&tab=social-calendar")}>
          View Social Calendar <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function DestinationCard({
  icon,
  title,
  description,
  cta,
  onClick,
  primary,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-lg border p-3 space-y-2 transition-colors ${
        primary
          ? "border-primary bg-primary/10 hover:bg-primary/15"
          : "border-border bg-background hover:border-primary/40 hover:bg-muted/30"
      }`}
    >
      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${primary ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground leading-snug">{description}</p>
      </div>
      <p className={`text-xs font-medium inline-flex items-center gap-1 ${primary ? "text-primary" : "text-foreground"}`}>
        {cta} <ArrowRight className="h-3 w-3" />
      </p>
    </button>
  );
}
