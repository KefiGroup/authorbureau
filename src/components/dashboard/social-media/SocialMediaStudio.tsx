import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WIZARD_STEPS } from "./types";
import type { SocialPost, CalendarConfig, ContentFormat } from "./types";
import SetupGuideStep from "./SetupGuideStep";
import ConfigureStep from "./ConfigureStep";
import GeneratingStep from "./GeneratingStep";
import CalendarReviewStep from "./CalendarReviewStep";
import BulkEditStep from "./BulkEditStep";
import ApproveStep from "./ApproveStep";

interface Props {
  onExit: () => void;
  initialBookId?: string;
  initialBookTitle?: string;
  initialBookCoverUrl?: string | null;
}

interface SavedSocialContentRow {
  id: string;
  platform: string;
  content_type: string;
  content_text: string;
  image_prompt: string | null;
  day_number: number | null;
  scheduled_date: string | null;
  status: string;
  created_at: string;
}

/** Decode the JSON metadata stored in image_prompt column back to rich post fields */
function decodePostMeta(imagePromptField: string | null): {
  hashtags: string[];
  format: ContentFormat;
  format_notes: string;
  hook: string;
  cta: string;
  image_prompt: string;
  video_shot_list: string;
  suggested_time: string;
} {
  const defaults = {
    hashtags: [] as string[],
    format: "text_post" as ContentFormat,
    format_notes: "",
    hook: "",
    cta: "",
    image_prompt: "",
    video_shot_list: "",
    suggested_time: "09:00",
  };

  if (!imagePromptField) return defaults;

  try {
    const parsed = JSON.parse(imagePromptField);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return {
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : defaults.hashtags,
        format: parsed.format || defaults.format,
        format_notes: parsed.format_notes || defaults.format_notes,
        hook: parsed.hook || defaults.hook,
        cta: parsed.cta || defaults.cta,
        image_prompt: parsed.image_prompt || defaults.image_prompt,
        video_shot_list: parsed.video_shot_list || defaults.video_shot_list,
        suggested_time: parsed.suggested_time || defaults.suggested_time,
      };
    }
  } catch {
    // Legacy format: hashtags as comma-separated string
    if (imagePromptField.includes("#") || imagePromptField.includes(",")) {
      return {
        ...defaults,
        hashtags: imagePromptField
          .split(",")
          .map(tag => tag.trim().replace(/^#/, ""))
          .filter(Boolean),
      };
    }
  }

  return defaults;
}

export default function SocialMediaStudio({ onExit, initialBookId, initialBookTitle, initialBookCoverUrl }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<CalendarConfig>({
    bookId: initialBookId || "",
    bookTitle: initialBookTitle || "",
    bookCoverUrl: initialBookCoverUrl || null,
    bookAmazonUrl: null,
    platforms: ["linkedin", "instagram"],
    frequency: "daily",
    contentMix: { tips: 30, quotes: 20, stories: 20, promotions: 15, engagement: 15 },
    tones: ["Professional", "Inspirational"],
    duration: 30,
    topicsEmphasize: "",
    topicsAvoid: "",
  });
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loadingSavedCalendar, setLoadingSavedCalendar] = useState(true);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    if (!config.bookId) {
      setLoadingSavedCalendar(false);
      return;
    }

    const loadSavedCalendar = async () => {
      try {
        const { data: cloudSession } = await supabase.auth.getSession();
        const authorId = cloudSession?.session?.user?.id || user?.id;

        if (!authorId) {
          setLoadingSavedCalendar(false);
          return;
        }

        // Fetch book's amazon_url for the purchase link
        const { data: bookData } = await supabase
          .from("books")
          .select("amazon_url")
          .eq("id", config.bookId)
          .single();
        if (bookData?.amazon_url) {
          setConfig(prev => ({ ...prev, bookAmazonUrl: bookData.amazon_url }));
        }

        const { data, error } = await supabase
          .from("social_media_content")
          .select("id, platform, content_type, content_text, image_prompt, day_number, scheduled_date, status, created_at")
          .eq("author_id", authorId)
          .eq("book_id", config.bookId)
          .order("day_number", { ascending: true });

        if (error || !data || data.length === 0) {
          setLoadingSavedCalendar(false);
          return;
        }

        const restoredPosts: SocialPost[] = (data as SavedSocialContentRow[]).map((row, idx) => {
          const meta = decodePostMeta(row.image_prompt);
          return {
            id: row.id,
            platform: row.platform,
            caption: row.content_text,
            hashtags: meta.hashtags,
            category: (row.content_type as SocialPost["category"]) || "tips",
            format: meta.format,
            format_notes: meta.format_notes,
            hook: meta.hook,
            cta: meta.cta,
            image_prompt: meta.image_prompt,
            video_shot_list: meta.video_shot_list,
            suggested_time: meta.suggested_time,
            day_number: row.day_number || idx + 1,
            scheduled_date: row.scheduled_date || row.created_at.split("T")[0],
            status: row.status === "scheduled" ? "scheduled" : "draft",
            ai_generated: false,
            edited: false,
          };
        });

        setPosts(restoredPosts);
        setStep(5);
      } finally {
        setLoadingSavedCalendar(false);
      }
    };

    loadSavedCalendar();
  }, [config.bookId, user?.id]);

  const handleRegenerate = () => {
    setPosts([]);
    setStep(1); // Go to Configure step to let user adjust settings before regenerating
  };

  return (
    <div className="space-y-0">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onExit} className="mb-3 -ml-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Social Media
      </Button>

      {/* Progress Stepper */}
      <div className="flex items-center justify-between mb-2">
        {WIZARD_STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center flex-1">
            <div className="flex flex-col items-center text-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step
                    ? "bg-green-500 text-white"
                    : i === step
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${i === step ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div className={`h-px flex-1 mx-1 ${i < step ? "bg-green-500" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Book Context Bar — show whenever book is selected */}
      {config.bookId && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/50 border border-border/50 mb-4"
        >
          {config.bookCoverUrl ? (
            <img src={config.bookCoverUrl} alt="" className="w-8 h-10 rounded object-cover" />
          ) : (
            <div className="w-8 h-10 rounded bg-muted flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{config.bookTitle}</p>
            <p className="text-[10px] text-muted-foreground">
              {config.platforms.join(", ")} • {config.duration} days • {config.frequency}
            </p>
          </div>
          <Badge variant="outline" className="ml-auto text-[10px]">
            Source Book
          </Badge>
        </motion.div>
      )}

      {/* Step Content */}
      <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
        {loadingSavedCalendar ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading your saved calendar...
          </div>
        ) : (
          <>
            {step === 0 && (
              <SetupGuideStep
                onNext={() => setStep(1)}
                bookTitle={config.bookTitle}
                bookCoverUrl={config.bookCoverUrl}
              />
            )}
            {step === 1 && (
              <ConfigureStep config={config} onConfigChange={setConfig} onNext={() => setStep(2)} />
            )}
            {step === 2 && (
              <GeneratingStep config={config} onComplete={(p) => { setPosts(p); setStep(3); }} onBack={() => setStep(1)} />
            )}
            {step === 3 && (
              <CalendarReviewStep posts={posts} onPostsChange={setPosts} onNext={() => setStep(4)} onBack={() => setStep(2)} />
            )}
            {step === 4 && (
              <BulkEditStep posts={posts} onPostsChange={setPosts} onNext={() => setStep(5)} onBack={() => setStep(3)} />
            )}
            {step === 5 && (
              <ApproveStep
                posts={posts}
                config={config}
                onBack={() => setStep(4)}
                onDone={onExit}
                onRegenerate={handleRegenerate}
              />
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
