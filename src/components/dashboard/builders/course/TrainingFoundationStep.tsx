import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, BookOpen, Users, Target, Palette, FileText, Presentation } from "lucide-react";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";
import type { CourseStepProps } from "./types";

const THREE_ACT_STEPS = [
  {
    act: "ACT 1 — ANALYSE",
    color: "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    items: [
      { icon: <BookOpen className="h-3.5 w-3.5" />, label: "Manuscript Analysis", desc: "Abby reads your book to extract frameworks, mental models, and transformation arcs" },
      { icon: <Users className="h-3.5 w-3.5" />, label: "Author Profile Review", desc: "Your credentials, speaking style, and authority level shape the training design" },
      { icon: <Target className="h-3.5 w-3.5" />, label: "Market & Audience Research", desc: "Competitive pricing, target audience pain points, and learning objectives" },
    ],
  },
  {
    act: "ACT 2 — BRAND",
    color: "border-secondary/20 bg-secondary/5",
    iconColor: "text-secondary",
    badgeColor: "bg-secondary/10 text-secondary",
    items: [
      { icon: <BookOpen className="h-3.5 w-3.5" />, label: "7-Module Curriculum", desc: "Learning objectives mapped to Bloom's Taxonomy + experiential activities via Kolb's Cycle" },
      { icon: <Palette className="h-3.5 w-3.5" />, label: "Training Design & Activities", desc: "Facilitator activities, debrief questions, breakout exercises, and capstone project" },
      { icon: <FileText className="h-3.5 w-3.5" />, label: "Course Workbook", desc: "Printable workbook with activity pages, reflection prompts, and frameworks worksheets" },
      { icon: <Presentation className="h-3.5 w-3.5" />, label: "Course Slides", desc: "Professional slide deck with key concepts, activity instructions, and visual frameworks" },
    ],
  },
  {
    act: "ACT 3 — BUILD",
    color: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    items: [
      { icon: <FileText className="h-3.5 w-3.5" />, label: "Trainer's Manual", desc: "Speaking notes, activity setups, timing cues, energy management, and Zoom configuration" },
      { icon: <Target className="h-3.5 w-3.5" />, label: "Sales Page & Email Sequence", desc: "High-converting sales page + 7-email nurture sequence to launch your training" },
      { icon: <Sparkles className="h-3.5 w-3.5" />, label: "Workshop Schedule & Publish", desc: "Day-by-day timeline, preview experience, and publish to your microsite" },
    ],
  },
];

export default function TrainingFoundationStep({ onStartGeneration, builderAct }: CourseStepProps) {
  const canGenerate = builderAct === "idle" || !builderAct;

  return (
    <div className="space-y-6">
      <AbbyRecommendationCard>
        <p className="text-sm text-foreground leading-relaxed">
          Training Programs are <strong>premium facilitated workshops</strong> — you lead the transformation live or via recorded sessions over <strong>2–3 intensive days</strong>. I'll analyze your <strong>manuscript</strong>, your <strong>author profile</strong>, and <strong>market data</strong> to design a complete training program with learning objectives, experiential activities, workbook, slides, and trainer's manual. Price range: <strong>$497–$2,997</strong>.
        </p>
      </AbbyRecommendationCard>

      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-secondary" />
          How Abby Builds Your Training Program — 3 Acts
        </h3>
        <p className="text-xs text-muted-foreground">
          Click <strong>"Analyze with Abby"</strong> below and Abby will guide you through each act automatically.
        </p>
        <div className="space-y-3">
          {THREE_ACT_STEPS.map((act) => (
            <div key={act.act} className={`rounded-xl border p-3.5 ${act.color}`}>
              <Badge className={`text-[10px] font-bold mb-2 ${act.badgeColor} border-0`}>{act.act}</Badge>
              <div className="space-y-2 mt-1">
                {act.items.map((item) => (
                  <div key={item.label} className="flex items-start gap-2.5">
                    <span className={`mt-0.5 shrink-0 ${act.iconColor}`}>{item.icon}</span>
                    <div>
                      <p className="text-xs font-semibold">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {canGenerate && onStartGeneration && (
        <Card className="p-5 border-secondary/30 bg-secondary/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">Let Abby design your entire training program</p>
              <p className="text-xs text-muted-foreground">
                Abby will analyze your manuscript, author profile, and market data to design a complete 7-module facilitated training with activities, workbook, slides, and trainer's manual.
              </p>
            </div>
            <Button
              onClick={onStartGeneration}
              className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 shrink-0"
            >
              <Sparkles className="h-4 w-4 mr-2" /> Analyze with Abby
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
