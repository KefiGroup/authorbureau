import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WIZARD_STEPS } from "./types";
import type { SocialPost, CalendarConfig } from "./types";
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

export default function SocialMediaStudio({ onExit, initialBookId, initialBookTitle, initialBookCoverUrl }: Props) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<CalendarConfig>({
    bookId: initialBookId || "",
    bookTitle: initialBookTitle || "",
    bookCoverUrl: initialBookCoverUrl || null,
    platforms: ["linkedin", "instagram"],
    frequency: "daily",
    contentMix: { tips: 30, quotes: 20, stories: 20, promotions: 15, engagement: 15 },
    tones: ["Professional", "Inspirational"],
    duration: 30,
    topicsEmphasize: "",
    topicsAvoid: "",
  });
  const [posts, setPosts] = useState<SocialPost[]>([]);

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

      {/* Book Context Bar */}
      {config.bookId && step > 1 && (
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
          <ApproveStep posts={posts} config={config} onBack={() => setStep(4)} onDone={onExit} />
        )}
      </motion.div>
    </div>
  );
}
