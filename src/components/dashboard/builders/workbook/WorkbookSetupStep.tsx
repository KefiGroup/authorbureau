import { ExternalLink, BookOpen, ArrowRight, Sparkles, Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import StepInstructions from "../shared/StepInstructions";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";
import ProductDistinctionCard from "../shared/ProductDistinctionCard";
import type { WorkbookStepProps } from "./types";

const PUBLISHNOW_WRITING_URL = "https://publishnow.io/#/writing";

export default function WorkbookSetupStep({ bookTitle }: WorkbookStepProps) {
  return (
    <div className="space-y-6">
      <StepInstructions
        items={[
          { label: "Go to PublishNow.io", description: "Open your Creative Studio where your manuscript is stored." },
          { label: "Select Your Book", description: "Find your book and click on it to open the workbook creation tools." },
          { label: "Build Your Workbook", description: "Use the guided builder to turn your chapters into interactive workbook pages." },
          { label: "Export & Download", description: "Download your completed workbook as a print-ready PDF." },
        ]}
      />

      <ProductDistinctionCard highlight="workbook" />

      {/* ─── ABBY GUIDANCE ──────────────────────────────────── */}
      <AbbyRecommendationCard>
        <div className="space-y-3">
          <p className="text-sm text-foreground leading-relaxed">
            Your workbook for <strong>{bookTitle}</strong> is built on <strong>PublishNow.io</strong> — where your manuscript lives. 
            The workbook builder there will walk you through transforming your chapters into exercises, reflection prompts, and action worksheets.
          </p>
          <p className="text-xs text-muted-foreground">
            Once complete, you can download and distribute it through Authors Bureau as a lead magnet, companion product, or standalone offering.
          </p>
        </div>
      </AbbyRecommendationCard>

      {/* ─── STEP-BY-STEP GUIDE ────────────────────────────── */}
      <Card className="p-6 border-border bg-card">
        <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-secondary" />
          How to Build Your Workbook
        </h3>

        <div className="space-y-4">
          {[
            {
              step: 1,
              title: "Open Your Creative Studio",
              description: "Click the button below to go to PublishNow.io. Your manuscript and all your creations are there.",
            },
            {
              step: 2,
              title: "Find Your Book",
              description: `Locate "${bookTitle}" in your manuscripts list and click on it.`,
            },
            {
              step: 3,
              title: "Create a New Workbook",
              description: "Use the workbook builder to transform your chapters into interactive exercises, reflections, and worksheets. The AI tools will help you generate content from your manuscript.",
            },
            {
              step: 4,
              title: "Customize & Export",
              description: "Choose your design template, set your page count, and export the finished workbook as a print-ready PDF. You can then upload it here to sell or distribute as a lead magnet.",
            },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-secondary text-secondary-foreground text-xs font-bold shrink-0 mt-0.5">
                {item.step}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2 font-semibold"
            onClick={() => window.open(PUBLISHNOW_WRITING_URL, "_blank")}
          >
            <ExternalLink className="h-4 w-4" />
            Open PublishNow Creative Studio
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* ─── WHAT HAPPENS AFTER ────────────────────────────── */}
      <Card className="p-5 border-secondary/20 bg-secondary/5">
        <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-secondary" />
          After You've Built Your Workbook
        </h4>
        <div className="space-y-2">
          {[
            "Your completed workbook PDF can be uploaded to Authors Bureau for distribution",
            "Set it as a free lead magnet, companion product, or standalone offering",
            "Abby will help you price, market, and connect it to your business plan",
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
