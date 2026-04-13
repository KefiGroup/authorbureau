import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  stepData: Record<string, any>;
  setStepData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onMarkEdited: (stepId: string) => void;
  stepId: string;
}

const LABELS = ["Identity", "Outcome", "Curiosity"];

function extractHeadlines(content: string): string[] {
  if (!content) return [];
  const headlines: string[] = [];

  // Try structured "Option N:" format inside HEADLINE OPTIONS section
  const headlineSection = content.match(/##?\s*HEADLINE\s+OPTIONS[\s\S]*?(?=\n##?\s|$)/i);
  if (headlineSection) {
    const optionMatches = headlineSection[0].matchAll(/Option\s+\d[^:]*:\s*\n+(.+)/gi);
    for (const m of optionMatches) {
      const line = m[1].trim().replace(/^\*+|\*+$/g, "").trim();
      if (line) headlines.push(line);
    }
    if (headlines.length >= 2) return headlines.slice(0, 3);
  }

  // Fallback: detect consecutive ALL-CAPS or title-case sections with quiz/assessment keywords
  const sections = content.split(/\n(?=##?\s)/);
  const variantKeywords = /quiz|finder|compass|assessment|checker|test|starter/i;
  const candidates: string[] = [];

  for (const sec of sections) {
    const titleMatch = sec.match(/^##?\s+(.+)/);
    if (!titleMatch) continue;
    const title = titleMatch[1].trim();
    if (title.length < 100 && variantKeywords.test(title)) {
      candidates.push(title);
    }
  }

  if (candidates.length >= 2) return candidates.slice(0, 3);

  return headlines;
}

export default function HeadlinePickerStep({ stepData, setStepData, onMarkEdited, stepId }: Props) {
  const headlines = extractHeadlines(stepData.leadMagnetContent || "");
  const [selected, setSelected] = useState<number>(
    typeof stepData.leadMagnetSelectedHeadline === "number"
      ? stepData.leadMagnetSelectedHeadline
      : -1
  );

  const handleSelect = (idx: number) => {
    setSelected(idx);
    setStepData(prev => ({
      ...prev,
      leadMagnetSelectedHeadline: idx,
      leadMagnetChosenHeadline: headlines[idx],
    }));
    onMarkEdited(stepId);
  };

  if (headlines.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No headline options found. Please go back to Step 2 and generate content first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Abby tip */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Pick the headline that best speaks to your reader's identity or desired outcome. Each angle works — choose the one that feels most <em>you</em>.
        </p>
      </div>

      <h3 className="font-heading text-lg font-semibold">Choose Your Headline</h3>
      <p className="text-sm text-muted-foreground">Select one of the three headline options Abby generated.</p>

      <div className="grid gap-4">
        {headlines.map((headline, idx) => (
          <Card
            key={idx}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selected === idx
                ? "ring-2 ring-primary border-primary bg-primary/5"
                : "hover:border-primary/40"
            )}
            onClick={() => handleSelect(idx)}
          >
            <CardContent className="flex items-start gap-4 p-5">
              <div className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                selected === idx
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {selected === idx ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {LABELS[idx] || `Option ${idx + 1}`}
                </span>
                <p className="mt-1 font-heading text-base font-semibold leading-snug">{headline}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selected >= 0 && (
        <div className="flex items-center gap-2 pt-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="text-sm text-emerald-600 font-medium">
            Headline saved — continue to the next step.
          </span>
        </div>
      )}
    </div>
  );
}
