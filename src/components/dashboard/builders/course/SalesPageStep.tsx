import { Button } from "@/components/ui/button";
import { Sparkles, Wand2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { generateJSONWithAI } from "@/lib/ai-generate";
import SharedSalesCopyEditor from "../shared/SharedSalesCopyEditor";
import { DEFAULT_SALES_COPY, type SalesCopyData } from "../shared/salesCopyTypes";
import type { CourseStepProps } from "./types";

export default function SalesPageStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, generationState, setGenerationState }: CourseStepProps) {
  const { toast } = useToast();
  const salesCopyData: SalesCopyData = stepData.salesCopyData || DEFAULT_SALES_COPY;

  const updateSalesCopy = (updated: SalesCopyData) => {
    setStepData(prev => ({ ...prev, salesCopyData: updated }));
    onMarkEdited("sales-page");
  };

  const handleGenerate = async () => {
    setGenerationState("queued");
    try {
      setGenerationState("generating");

      const title = stepData.foundation?.title || "Your Course";
      const transformation = stepData.foundation?.transformation || "transform your life";
      const moduleCount = stepData.curriculum?.modules?.length || 8;
      const price = stepData.foundation?.exactPrice || stepData.foundation?.priceTier || "97";
      const authorName = stepData.foundation?.authorName || "Author";

      const result = await generateJSONWithAI<SalesCopyData>(
        `You are a sales copywriter. Generate a JSON object (NOT wrapped in another object) for an 11-section sales page.

Product: "${title}" (online course based on the book "${bookTitle}")
The course has ${moduleCount} modules and promises to help students ${transformation}.

Return ONLY this JSON structure with ALL fields populated with compelling copy:
{"hero":{"title":"${title}","tagline":"one-line tagline","ctaText":"Enroll Now"},"problem":{"headline":"Are you struggling with...","painPoints":["point1","point2","point3","point4"]},"transformation":{"before":["struggle1","struggle2","struggle3"],"after":["result1","result2","result3"]},"introduction":{"paragraph":"2-3 sentences about what this is and who it's for"},"whatsInside":{"items":["item1","item2","item3","item4","item5"]},"howItWorks":{"steps":[{"title":"Enroll","description":"desc"},{"title":"Learn","description":"desc"},{"title":"Transform","description":"desc"}]},"author":{"name":"${authorName}","bio":"2-3 sentences bio","credentials":"key credential"},"socialProof":{"testimonials":[{"name":"Name1","quote":"quote1"},{"name":"Name2","quote":"quote2"},{"name":"Name3","quote":"quote3"}]},"pricing":{"price":"${price}","comparePrice":"${Math.round(parseInt(price) * 2)}","currency":"USD","ctaText":"Enroll Now","included":["benefit1","benefit2","benefit3","benefit4"]},"faq":{"items":[{"q":"q1","a":"a1"},{"q":"q2","a":"a2"},{"q":"q3","a":"a3"},{"q":"q4","a":"a4"},{"q":"q5","a":"a5"}]},"finalCta":{"headline":"urgency headline","subheadline":"motivating line","ctaText":"Enroll Now","urgency":"limited time"}}

RULES: Generate 3 testimonials with real-sounding names. 5 FAQ items addressing objections. 4+ pricing included items. Professional author bio. Compelling benefit-driven copy. Plain text only, no markdown. Return raw JSON only.`,
        {
          bookId,
          isPremium: true,
          builderMode: true,
          builderId: "online-course",
          builderLabel: "Online Course",
          builderStep: "Sales Page",
        }
      );

      updateSalesCopy(result);
      setGenerationState("complete");
      toast({ title: "Sales page generated!" });
    } catch (err) {
      console.error(err);
      setGenerationState("error");
      toast({ title: "Generation failed", variant: "destructive" });
    }
  };

  const hasContent = salesCopyData.hero?.title && salesCopyData.hero.title !== "";

  if (!hasContent && generationState === "idle") {
    return (
      <div className="text-center py-12">
        <Sparkles className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold mb-2">Generate Sales Page Copy</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Abby will create a complete, high-converting 11-section sales page based on your course content and target audience.
        </p>
        <Button onClick={handleGenerate} className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Wand2 className="h-4 w-4 mr-2" /> Let Abby Generate Sales Page
        </Button>
      </div>
    );
  }

  if (generationState !== "idle" && generationState !== "complete" && generationState !== "error") {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-10 w-10 animate-spin text-secondary mx-auto mb-4" />
        <p className="text-sm font-medium">Abby is creating your high-converting sales page...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <SharedSalesCopyEditor
        data={salesCopyData}
        onChange={updateSalesCopy}
        productLabel="Online Course"
        onGenerateWithAbby={handleGenerate}
        generating={["generating", "queued"].includes(generationState)}
      />
    </div>
  );
}
