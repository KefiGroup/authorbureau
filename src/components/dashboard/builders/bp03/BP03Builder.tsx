import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, Calendar, Hash, Clock, Settings, ChevronDown, ChevronUp, Megaphone, Copy, Download } from "lucide-react";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import JSZip from "jszip";
import { toAbbyError } from "@/lib/abby-error";
import BookProfileQuickForm from "@/components/dashboard/builders/shared/BookProfileQuickForm";

const STEPS = ["Introduction", "Generating", "Review", "Activate"];

const GENERATING_MESSAGES = [
  "Step 1 of 3 — Writing your LinkedIn posts...",
  "Step 2 of 3 — Writing Instagram + Facebook posts...",
  "Step 3 of 3 — Writing Twitter/X posts and outreach templates...",
  "Almost done — packaging your starter kit...",
];

const ACTIVATING_MESSAGES = [
  "Setting up your content calendar...",
  "Scheduling your campaigns...",
  "Your marketing kit is almost ready...",
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
}

export default function BP03Builder({ authorId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [authorSlug, setAuthorSlug] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [hasContext, setHasContext] = useState<boolean | null>(null);
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [progressLabel, setProgressLabel] = useState<string>("");
  const [isResuming, setIsResuming] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasResumed = useRef(false);
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading } = useAuthorBook();

  useEffect(() => {
    console.log("[BP-03 mount] authorId =", authorId);
    if (!authorId) {
      // Keep the loading shield up while parent resolves authorId — don't show intro prematurely
      return;
    }

    let cancelled = false;

    const resumeBuilder = async () => {
      setIsResuming(true);
      setError(null);

      try {
        const { data: profile, error: profileErr } = await supabase
          .from("author_profiles")
          .select("pen_name, author_slug, user_id")
          .eq("id", authorId)
          .single();
        if (cancelled) return;
        if (profileErr) console.error("[BP-03 resume] profile error:", profileErr);

        setAuthorName(profile?.pen_name || "there");
        setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));

        const { data: ctx } = await supabase
          .from("author_context")
          .select("book_title")
          .eq("author_id", authorId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;

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
          if (cancelled) return;

          if (book?.title) {
            setBookTitle(book.title);
            setHasContext(true);
          } else {
            setHasContext(false);
          }
        }

        const { data: node, error: nodeErr } = await supabase
          .from("author_nodes")
          .select("content_json, status, activated_at")
          .eq("author_id", authorId)
          .eq("node_id", "BP-03")
          .maybeSingle();
        if (cancelled) return;
        if (nodeErr) console.error("[BP-03 resume] node error:", nodeErr);

        const status = node?.status;
        const cj: any = node?.content_json || null;
        const hasContent = !!cj;
        const hasUsableKit = hasUsableSocialKit(cj);
        const isActivated = status === "live" || !!node?.activated_at;
        let resumedStep = 0;

        if (isActivated && hasContent) {
          setContent({ ...cj, activated: true, publishStatus: status });
          resumedStep = 3;
        } else if (hasUsableKit) {
          // Trust saved content over status — even if status is stuck on "generating"
          setContent(cj);
          resumedStep = 2;
        } else if (status === "content_ready" && hasContent) {
          setContent(cj);
          resumedStep = 2;
        } else if (status === "generating") {
          resumedStep = 1;
        }

        const storedTitle = (node?.content_json as any)?.book_title;
        if (storedTitle) {
          setBookTitle((prev) => prev || storedTitle);
          setHasContext(true);
        }

        setStep((prev) => (resumedStep > prev ? resumedStep : prev));
        hasResumed.current = true;
        console.log("[BP-03 resume] resolved", { status, hasContent, resumedStep });
      } catch (resumeError) {
        console.error("[BP-03 resume] Failed to restore builder state:", resumeError);
      } finally {
        if (!cancelled) {
          setIsResuming(false);
        }
      }
    };

    void resumeBuilder();

    return () => {
      cancelled = true;
    };
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

  // Cleanup progress poll on unmount to prevent leak if user navigates mid-generation
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

    // Poll author_nodes.content_json.progress every 2s while generating
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
        body: { author_id: authorId },
      });
      if (fnErr) {
        const msg = fnErr.message || "";
        if (msg.includes("401") || msg.includes("Unauthorized")) {
          throw new Error("Your session has expired. Please refresh the page and try again.");
        }
        if (msg.includes("500") || msg.includes("Internal")) {
          throw new Error("Abby is having trouble generating content right now. Please try again in a moment.");
        }
        throw new Error(msg || "Generation failed. Please try again.");
      }
      if (!data?.success) throw new Error(data?.error || "Generation failed. Please try again.");
      setContent(data.content);
      setStep(2);
    } catch (e: any) {
      setError(e.message);
      // If we already have a saved kit, stay on Review and surface the error there
      // Only fall back to Intro when there's truly nothing to show
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
    if (!authorId) {
      throw new Error("Please wait for your author profile to finish loading.");
    }

    if (!hasUsableSocialKit(content)) {
      throw new Error("Generate your starter kit before saving it.");
    }

    const payload = {
      status: nextStatus,
      content_json: content,
      personalised_name: content?.calendar_name || "Social Media Starter Kit",
      ...(nextStatus === "live" ? { activated_at: new Date().toISOString() } : {}),
    };

    const { data: existingNode, error: existingNodeError } = await supabase
      .from("author_nodes")
      .select("id")
      .eq("author_id", authorId)
      .eq("node_id", "BP-03")
      .maybeSingle();

    if (existingNodeError) {
      throw existingNodeError;
    }

    if (existingNode) {
      const { data: updatedNode, error: updateError } = await supabase
        .from("author_nodes")
        .update(payload)
        .eq("id", existingNode.id)
        .select("id, status, activated_at, content_json")
        .single();

      if (updateError) {
        throw updateError;
      }

      return updatedNode;
    }

    const { data: insertedNode, error: insertError } = await supabase
      .from("author_nodes")
      .insert({
        author_id: authorId,
        node_id: "BP-03",
        node_name: "Social Media",
        ...payload,
      })
      .select("id, status, activated_at, content_json")
      .single();

    if (insertError) {
      throw insertError;
    }

    return insertedNode;
  };

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);

    try {
      const savedNode = await persistNodeState("content_ready");
      setContent(savedNode.content_json);
      toast.success("Your social media kit is saved.");
    } catch (e: any) {
      console.error("Save error:", e);
      setError(e.message || "We couldn't save your social media kit.");
      toast.error("We couldn't save your social media kit.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setStep(3);
    setError(null);
    try {
      const savedNode = await persistNodeState("live");

      // Sprint 36b — schedule posts via Buffer (Social Accounts)
      let scheduledCount = 0;
      let scheduleErrorMsg: string | null = null;
      try {
        const { data: scheduleResp, error: scheduleErr } = await supabase.functions.invoke(
          "schedule-social-posts",
          { body: { author_id: authorId, node_id: "BP-03" } },
        );
        if (scheduleErr) throw scheduleErr;
        if (!scheduleResp?.success) throw new Error(scheduleResp?.error || "Couldn't schedule your posts.");
        scheduledCount = scheduleResp.scheduled || 0;
      } catch (e: any) {
        console.error("schedule-social-posts error (non-blocking):", e);
        scheduleErrorMsg = e?.message || "We couldn't reach your Social Accounts.";
      }

      const abbyMsg = scheduleErrorMsg
        ? `Your kit is saved. I couldn't schedule your posts yet — ${scheduleErrorMsg} Connect your Social Accounts in Account Settings, then come back.`
        : `Done! I've scheduled ${scheduledCount} post${scheduledCount === 1 ? "" : "s"} across your social channels. Your first post goes out tomorrow. View your Social Calendar in the Marketing Hub.`;

      setContent({
        ...(savedNode.content_json as any),
        activated: true,
        publishStatus: savedNode.status,
        scheduledCount,
        abbyMessage: abbyMsg,
      });

      if (scheduleErrorMsg) {
        toast.success("Your kit is saved.");
      } else {
        toast.success(`Scheduled ${scheduledCount} posts across your social channels 🎉`);
      }
    } catch (e: any) {
      console.error("Publish error:", e);
      setError(e.message || "We couldn't save your activation.");
      setStep(2);
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
            <h1 className="text-lg font-semibold">Social Media</h1>
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
        {isResuming ? (
          <AbbyCard>
            <p className="text-muted-foreground">Loading your saved social media kit…</p>
          </AbbyCard>
        ) : step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's build your Social Media</h2>
            {isBookLoading || hasContext === null ? (
              <p className="text-muted-foreground">Loading your book details…</p>
            ) : !hasBook && hasContext === false && !bookTitle ? (
              <BookProfileQuickForm
                authorId={authorId}
                authorName={authorName}
                onComplete={(t) => { setBookTitle(t); setHasContext(true); setTimeout(() => handleGenerate(), 300); }}
              />
            ) : (
              <>
                <p className="text-muted-foreground mb-4">
                  I'm going to create your social media starter kit for '{detectedBookTitle || bookTitle || "your book"}' — 20 ready-to-post pieces across LinkedIn, Instagram, Facebook, and X, plus 3 outreach email templates. Ready?
                </p>
                <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}>
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
            <ReviewStep
              content={content}
              authorName={authorName}
              bookTitle={bookTitle || detectedBookTitle || "your book"}
              onSave={handleSave}
              onActivate={handlePublish}
              isSaving={isSaving}
            />
          </>
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
          <PublishSuccessScreen
            nodeId="BP-03"
            authorName={authorName}
            penNameSlug={authorSlug}
            abbyMessage={content?.abbyMessage || "Your social media kit is safely saved to your account, and you can come back anytime without losing it."}
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

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "bg-blue-600 text-white",
  instagram: "bg-gradient-to-br from-purple-500 to-pink-500 text-white",
  facebook: "bg-blue-500 text-white",
  twitter: "bg-foreground text-background",
};

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "Twitter/X",
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

function ReviewStep({
  content,
  authorName,
  bookTitle,
  onSave,
  onActivate,
  isSaving,
}: {
  content: any;
  authorName: string;
  bookTitle: string;
  onSave: () => void;
  onActivate: () => void;
  isSaving: boolean;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(`${bookTitle.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")}_Marketing_Kit`)!;

      // Social media posts by platform
      const socialFolder = folder.folder("social_media")!;
      for (const platform of ["linkedin", "instagram", "facebook", "twitter"]) {
        const posts = content.posts?.map((p: any) => `--- Day ${p.day}: ${p.theme} ---\n${p[platform]?.caption || ""}\nHashtags: ${(p[platform]?.hashtags || []).map((h: string) => `#${h}`).join(" ")}\n`).join("\n");
        socialFolder.file(`${PLATFORM_LABELS[platform]?.toLowerCase().replace("/", "_") || platform}_posts.txt`, posts || "");
      }

      // Outreach kit
      if (content.outreach_kit?.length) {
        const outreachFolder = folder.folder("outreach_kit")!;
        for (const template of content.outreach_kit) {
          const filename = template.type.toLowerCase().replace(/[^a-z0-9]+/g, "_") + ".txt";
          outreachFolder.file(filename, `--- ${template.type} ---\nSubject: ${template.subject}\n\n${template.body}\n`);
        }
      }

      // README
      folder.file("README.txt", `${bookTitle} — Complete Marketing Kit\nGenerated by ABBY for ${authorName}\n\nContents:\n- social_media/ — 20 posts across 4 platforms (5 per platform)\n- outreach_kit/ — 3 outreach templates (podcast, media, review)\n\nAll content is personalised to your book.\n`);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${bookTitle.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")}_Marketing_Kit.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Marketing Kit downloaded!");
    } catch (e: any) {
      toast.error("Download failed: " + e.message);
    }
    setDownloading(false);
  };

  return (
    <div className="space-y-4">
      <AbbyCard>
        <p className="text-muted-foreground">
          Your complete marketing kit is ready! You have 20 social posts across 4 platforms (LinkedIn, Instagram, Facebook, X) plus 3 outreach email templates — all personalised to your book. Review everything below, then click Activate.
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

        {/* Social Calendar Tab */}
        <TabsContent value="calendar" className="space-y-2 mt-4">
          {/* Week grouping */}
          {[1, 2, 3, 4].map(week => {
            const weekPosts = content.posts?.filter((p: any) => getWeek(p.day) === week) || [];
            if (weekPosts.length === 0) return null;
            return (
              <div key={week} className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground mt-4">{WEEK_LABELS[week]}</h3>
                {weekPosts.map((post: any) => (
                  <PostCard key={post.day} post={post} />
                ))}
              </div>
            );
          })}
          {/* Hashtag strategy */}
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

        {/* Outreach Kit Tab */}
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

      {/* Actions */}
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
              <Download className="h-4 w-4 mr-2" />{downloading ? "Downloading..." : "Download Marketing Kit"}
            </Button>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Get a ZIP file with all 20 posts, captions, hashtags & outreach templates. Use it to post manually or hand off to your VA / social media manager.
            </p>
          </div>
          <div className="space-y-1.5">
            <Button className="w-full" size="default" onClick={onActivate}>
              Activate <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Auto-schedule all 20 posts across LinkedIn, Instagram, Facebook & X via your connected marketing account. Posts go out on the recommended days — hands-free.
            </p>
          </div>
        </div>
        <p className="text-xs text-center text-muted-foreground pt-1 border-t border-border">
          ✓ 20 posts ready across 4 platforms · ✓ 3 outreach templates · ✓ Saved to your account after generation
        </p>
      </div>
    </div>
  );
}

function PostCard({ post }: { post: any }) {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState("linkedin");
  const platformData = post[platform];

  return (
    <Card className="cursor-pointer" onClick={() => setOpen(!open)}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">Day {post.day}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{post.post_type}</Badge>
              {post.cta_type && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{post.cta_type}</Badge>}
            </div>
            <p className="font-medium text-sm truncate">{post.theme}</p>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
        </div>
        {open && (
          <div className="mt-3 pt-3 border-t border-border space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-1">
              {(["linkedin", "instagram", "facebook", "twitter"] as const).map((p) => (
                <button key={p} onClick={() => setPlatform(p)} className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${platform === p ? PLATFORM_COLORS[p] : "bg-muted text-muted-foreground"}`}>
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
            {platformData && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground whitespace-pre-line">{platformData.caption}</p>
                {platformData.hashtags?.length > 0 && (
                  <p className="text-xs text-primary">{platformData.hashtags.map((h: string) => `#${h}`).join(" ")}</p>
                )}
              </div>
            )}
          </div>
        )}
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
