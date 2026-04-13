import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  stepData: Record<string, any>;
  setStepData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onMarkEdited: (stepId: string) => void;
  stepId: string;
}

const LABELS = ["Identity", "Outcome", "Curiosity"];

function normalizeSectionLine(line: string): string {
  return line
    .trim()
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\d+[\.)]\s+/, "")
    .replace(/\*\*/g, "")
    .trim();
}

function isOptionLine(line: string): boolean {
  return /^Option\s+\d+/i.test(normalizeSectionLine(line));
}

function isSectionBoundary(line: string): boolean {
  const normalized = normalizeSectionLine(line);
  if (!normalized || isOptionLine(line)) return false;

  if (/^(INTRODUCTION|MAIN CONTENT|CALL[- ]TO[- ]ACTION|AUTHOR BIO(?: BLURB)?|BIO BLURB)$/i.test(normalized)) {
    return true;
  }

  if (/^(#{1,6}\s+|\d+[\.)]\s+)/.test(line.trim())) {
    return true;
  }

  return /^[A-Z][A-Z0-9\s&/()'-]+$/.test(normalized) && normalized.length <= 60;
}

function extractOptionBlocks(lines: string[]): string[] {
  const headlines: string[] = [];
  let current: string[] = [];

  const pushCurrent = () => {
    const headline = current
      .join(" ")
      .replace(/\s+/g, " ")
      .replace(/^\*+|\*+$/g, "")
      .trim();

    if (headline) headlines.push(headline);
    current = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const normalized = normalizeSectionLine(line);
    const optionMatch = normalized.match(/^Option\s+\d+(?:\s*\([^)]*\))?\s*:?\s*(.*)$/i);

    if (optionMatch) {
      pushCurrent();
      if (optionMatch[1]) current.push(optionMatch[1]);
      continue;
    }

    if (current.length > 0 && isSectionBoundary(line)) {
      pushCurrent();
      break;
    }

    if (current.length === 0 || !trimmed) continue;
    current.push(trimmed);
  }

  pushCurrent();
  return headlines.slice(0, 3);
}

function extractHeadlines(content: string): string[] {
  if (!content) return [];
  const lines = content.replace(/\r/g, "").split("\n");

  const headlineStart = lines.findIndex(line => normalizeSectionLine(line).toUpperCase() === "HEADLINE OPTIONS");
  if (headlineStart !== -1) {
    const sectionLines: string[] = [];
    for (let i = headlineStart + 1; i < lines.length; i++) {
      if (sectionLines.length > 0 && isSectionBoundary(lines[i])) break;
      sectionLines.push(lines[i]);
    }

    const structuredHeadlines = extractOptionBlocks(sectionLines);
    if (structuredHeadlines.length >= 2) return structuredHeadlines;
  }

  const genericOptionHeadlines = extractOptionBlocks(lines);
  if (genericOptionHeadlines.length >= 2) return genericOptionHeadlines;

  // Fallback: detect headline-like section titles in plain text / numbered content
  const variantKeywords = /quiz|finder|compass|assessment|checker|test|starter/i;
  const candidates: string[] = [];

  for (const line of lines) {
    const title = normalizeSectionLine(line);
    if (title.length < 100 && variantKeywords.test(title)) {
      candidates.push(title);
    }
  }

  return Array.from(new Set(candidates)).slice(0, 3);
}

export default function HeadlinePickerStep({ stepData, setStepData, onMarkEdited, stepId }: Props) {
  const headlines = extractHeadlines(stepData.leadMagnetEdited || stepData.leadMagnetContent || "");
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
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span className="text-sm text-primary font-medium">
            Headline saved — continue to the next step.
          </span>
        </div>
      )}
    </div>
  );
}
