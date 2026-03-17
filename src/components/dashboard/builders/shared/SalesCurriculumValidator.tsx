import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ArrowLeft, RefreshCw, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SalesCopyData } from "./salesCopyTypes";

interface CurriculumFacts {
  moduleCount: number;
  moduleTitles: string[];
  totalHours: number;
  hasLessons: boolean;
  hasExercises: boolean;
  hasQuizzes: boolean;
  hasResources: boolean;
  lessonCount: number;
}

interface Mismatch {
  section: string;
  claim: string;
  reality: string;
  severity: "error" | "warning";
  fix: string;
  fixAction: "edit-sales" | "go-curriculum" | "regenerate";
  locations?: string[]; // Which sales copy sections contain the flagged text
}

interface Props {
  salesCopy: SalesCopyData;
  curriculum: CurriculumFacts;
  onGoToStep?: (stepIndex: number) => void;
  onRegenerateSales?: () => void;
}

// Keywords that imply downloadable materials not in the course
const DOWNLOADABLE_KEYWORDS = [
  "downloadable", "worksheet", "checklist", "template", "printable",
  "workbook", "pdf", "guide book", "reference guide", "cheat sheet",
  "bonus", "toolkit",
];

const LIVE_KEYWORDS = [
  "live", "zoom", "group call", "office hours", "q&a session",
  "community access", "private group", "slack", "discord",
];

function extractModuleCountFromText(text: string): number | null {
  const match = text.match(/(\d+)\s*(?:module|lesson|chapter|section|unit)/i);
  return match ? parseInt(match[1]) : null;
}

function textContainsKeywords(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter(kw => lower.includes(kw));
}

function collectAllSalesCopyText(data: SalesCopyData): string {
  const parts: string[] = [
    data.hero.title, data.hero.tagline,
    data.problem.headline, ...data.problem.painPoints,
    ...data.transformation.before, ...data.transformation.after,
    data.introduction.paragraph,
    ...data.whatsInside.items,
    ...data.howItWorks.steps.map(s => `${s.title} ${s.description}`),
    data.author.bio, data.author.credentials,
    ...data.pricing.included,
    ...data.faq.items.map(f => `${f.q} ${f.a}`),
    data.finalCta.headline, data.finalCta.subheadline,
  ];
  return parts.filter(Boolean).join(" ");
}

export function detectMismatches(salesCopy: SalesCopyData, curriculum: CurriculumFacts): Mismatch[] {
  const mismatches: Mismatch[] = [];
  const allText = collectAllSalesCopyText(salesCopy);

  // 1. Module count mismatch in hero/pricing/whatsInside
  const textsToCheck = [
    ...salesCopy.whatsInside.items,
    ...salesCopy.pricing.included,
    salesCopy.hero.tagline,
    salesCopy.introduction.paragraph,
  ].filter(Boolean);

  for (const text of textsToCheck) {
    const claimed = extractModuleCountFromText(text);
    if (claimed && claimed !== curriculum.moduleCount) {
      mismatches.push({
        section: "Module Count",
        claim: `Sales copy mentions "${claimed} modules"`,
        reality: `Your course actually has ${curriculum.moduleCount} modules`,
        severity: "error",
        fix: "Regenerate the sales page to use the correct module count, or edit the text manually.",
        fixAction: "regenerate",
      });
      break; // Only flag once
    }
  }

  // 2. Downloadable materials promises
  const downloadableHits = textContainsKeywords(allText, DOWNLOADABLE_KEYWORDS);
  if (downloadableHits.length > 0 && !curriculum.hasResources) {
    mismatches.push({
      section: "Downloadable Materials",
      claim: `Sales copy promises: ${downloadableHits.map(k => `"${k}"`).join(", ")}`,
      reality: "Your course modules don't include downloadable resources",
      severity: "error",
      fix: "Either remove these promises from the sales copy, or go back to Lesson Content and add resources to your modules.",
      fixAction: "edit-sales",
    });
  }

  // 3. Live/community promises (online course is self-paced)
  const liveHits = textContainsKeywords(allText, LIVE_KEYWORDS);
  if (liveHits.length > 0) {
    mismatches.push({
      section: "Live Features",
      claim: `Sales copy mentions: ${liveHits.map(k => `"${k}"`).join(", ")}`,
      reality: "This is a self-paced online course — live features belong in the Training Program or Bootcamp builder",
      severity: "error",
      fix: "Remove live/community promises from the sales copy. Regenerate to get accurate self-paced copy.",
      fixAction: "regenerate",
    });
  }

  // 4. Hours mismatch
  const hourMatch = allText.match(/(\d+)\+?\s*(?:hour|hr)/i);
  if (hourMatch) {
    const claimedHours = parseInt(hourMatch[1]);
    if (curriculum.totalHours > 0 && Math.abs(claimedHours - curriculum.totalHours) > 2) {
      mismatches.push({
        section: "Duration",
        claim: `Sales copy says "${claimedHours} hours"`,
        reality: `Actual course duration is approximately ${curriculum.totalHours} hours`,
        severity: "warning",
        fix: "Regenerate the sales page or edit the duration reference to match your actual content.",
        fixAction: "regenerate",
      });
    }
  }

  // 5. Quiz/exercise promises vs reality
  const mentionsQuizzes = /quiz|assessment|test|exam/i.test(allText);
  if (mentionsQuizzes && !curriculum.hasQuizzes) {
    mismatches.push({
      section: "Quizzes",
      claim: "Sales copy promises quizzes or assessments",
      reality: "No quizzes have been added to your lessons yet",
      severity: "warning",
      fix: "Go to Lesson Content (Step 3) and add quizzes to your modules, or remove quiz references from the sales copy.",
      fixAction: "go-curriculum",
    });
  }

  const mentionsExercises = /exercise|hands-on|practice|implementation.*exercise/i.test(allText);
  if (mentionsExercises && !curriculum.hasExercises) {
    mismatches.push({
      section: "Exercises",
      claim: "Sales copy promises exercises or hands-on practice",
      reality: "No exercises have been added to your lessons yet",
      severity: "warning",
      fix: "Go to Lesson Content (Step 3) and add exercises to your modules, or adjust the sales copy.",
      fixAction: "go-curriculum",
    });
  }

  return mismatches;
}

export default function SalesCurriculumValidator({ salesCopy, curriculum, onGoToStep, onRegenerateSales }: Props) {
  const mismatches = detectMismatches(salesCopy, curriculum);

  if (mismatches.length === 0) {
    return (
      <Card className="p-3 border-accent/20 bg-accent/5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
          <p className="text-xs text-muted-foreground">
            <strong className="text-accent">Sales copy verified</strong> — all promises match your actual course content.
          </p>
        </div>
      </Card>
    );
  }

  const errorCount = mismatches.filter(m => m.severity === "error").length;
  const warningCount = mismatches.filter(m => m.severity === "warning").length;

  return (
    <Card className="p-4 border-amber-300/30 bg-amber-50/50 dark:bg-amber-900/10">
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">
            Abby found {mismatches.length} mismatch{mismatches.length > 1 ? "es" : ""} between your sales page and course content
          </p>
          <div className="flex gap-2">
            {errorCount > 0 && (
              <Badge variant="destructive" className="text-[9px]">{errorCount} must fix</Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="text-[9px] border-amber-400 text-amber-700">{warningCount} review</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 ml-7">
        {mismatches.map((m, i) => (
          <div key={i} className="border border-border rounded-lg p-3 bg-card">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge
                variant={m.severity === "error" ? "destructive" : "outline"}
                className="text-[9px]"
              >
                {m.section}
              </Badge>
            </div>
            <p className="text-xs mb-1">
              <strong className="text-destructive">Claim:</strong>{" "}
              <span className="text-muted-foreground">{m.claim}</span>
            </p>
            <p className="text-xs mb-2">
              <strong className="text-accent">Reality:</strong>{" "}
              <span className="text-muted-foreground">{m.reality}</span>
            </p>
            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <p className="text-[10px] text-muted-foreground flex-1">
                <strong>Fix:</strong> {m.fix}
              </p>
              {m.fixAction === "go-curriculum" && onGoToStep && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-6 px-2"
                  onClick={() => onGoToStep(2)}
                >
                  <ArrowLeft className="h-3 w-3 mr-1" /> Go to Step 3
                </Button>
              )}
              {m.fixAction === "regenerate" && onRegenerateSales && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-6 px-2"
                  onClick={onRegenerateSales}
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                </Button>
              )}
              {m.fixAction === "edit-sales" && onGoToStep && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-6 px-2"
                  onClick={() => onGoToStep(3)}
                >
                  <Pencil className="h-3 w-3 mr-1" /> Edit Sales Page
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
