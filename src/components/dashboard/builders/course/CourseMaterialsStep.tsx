import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, FileText, Award, Gift, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CourseStepProps } from "./types";

export default function CourseMaterialsStep({ stepData, setStepData, onMarkEdited, bookTitle, generationState, setGenerationState }: CourseStepProps) {
  const { toast } = useToast();
  const data = stepData.materials || {};

  const update = (field: string, value: any) => {
    setStepData(prev => ({
      ...prev,
      materials: { ...prev.materials, [field]: value },
    }));
    onMarkEdited("materials");
  };

  const handleGenerate = () => {
    setGenerationState("queued");
    setTimeout(() => setGenerationState("generating"), 2000);
    setTimeout(() => {
      update("welcomeScript", `# Welcome to ${stepData.foundation?.title || "Your Course"}!\n\nHello and welcome! I'm so excited you've decided to invest in your growth.\n\nOver the coming modules, we'll work through the core concepts from "${bookTitle}" in a structured, hands-on way.\n\n## What to Expect\n\n- **${stepData.curriculum?.modules?.length || 8} modules** with practical lessons\n- **Exercises** after each lesson to apply what you learn\n- **A companion workbook** to track your progress\n- **Quizzes** to test your understanding\n\n## How to Get the Most Out of This Course\n\n1. Set aside 30-45 minutes per lesson\n2. Complete the exercises — don't skip them!\n3. Take notes in your companion workbook\n4. Revisit challenging modules as needed\n\nLet's get started!`);
      update("certificateTitle", `Certificate of Completion: ${stepData.foundation?.title || "Course"}`);
      update("bonusSuggestions", [
        "Private community access for course students",
        "Monthly live Q&A session with the author",
        "Bonus chapter: Advanced strategies not in the book",
        `Companion workbook (link to your Workbook builder)`,
      ]);
      setGenerationState("complete");
      toast({ title: "Course materials generated!" });
    }, 4000);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Video Script */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-bold">Welcome Video Script</p>
              <p className="text-[10px] text-muted-foreground">The first thing students see</p>
            </div>
          </div>
          {!data.welcomeScript && (
            <Button size="sm" onClick={handleGenerate} className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Wand2 className="h-3.5 w-3.5 mr-1" /> Generate All Materials
            </Button>
          )}
          {data.welcomeScript && (
            <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-600">
              <Wand2 className="h-2.5 w-2.5 mr-1" /> AI Generated
            </Badge>
          )}
        </div>
        <Textarea
          value={data.welcomeScript || ""}
          onChange={(e) => update("welcomeScript", e.target.value)}
          placeholder="Welcome script — what you say or record as the course introduction..."
          rows={12}
          className="font-mono text-sm"
        />
      </Card>

      {/* Course Workbook */}
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Companion Workbook</p>
            <p className="text-[10px] text-muted-foreground">Auto-generated PDF companion — editable in the Workbook Builder</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs">
            Open Workbook Builder →
          </Button>
        </div>
      </Card>

      {/* Certificate */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-bold">Certificate of Completion</p>
            <p className="text-[10px] text-muted-foreground">Awarded when a student finishes all modules</p>
          </div>
        </div>
        <Input
          value={data.certificateTitle || ""}
          onChange={(e) => update("certificateTitle", e.target.value)}
          placeholder="Certificate title..."
          className="font-medium"
        />
        <div className="border border-dashed border-border rounded-lg p-6 text-center bg-muted/20">
          <Award className="h-8 w-8 text-secondary mx-auto mb-2" />
          <p className="text-xs font-bold uppercase tracking-wider text-secondary mb-1">Certificate of Completion</p>
          <p className="text-sm font-medium">{data.certificateTitle || "Course Title"}</p>
          <p className="text-[10px] text-muted-foreground mt-2">Awarded to [Student Name]</p>
          <p className="text-[10px] text-muted-foreground">on [Completion Date]</p>
        </div>
      </Card>

      {/* Bonus Materials */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Gift className="h-4 w-4 text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-bold">Bonus Materials Suggestions</p>
            <p className="text-[10px] text-muted-foreground">Abby's recommendations to increase perceived value</p>
          </div>
        </div>
        {(data.bonusSuggestions || []).map((bonus: string, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-secondary text-xs">🎁</span>
            <Input
              value={bonus}
              onChange={(e) => {
                const updated = [...(data.bonusSuggestions || [])];
                updated[i] = e.target.value;
                update("bonusSuggestions", updated);
              }}
              className="text-sm"
            />
          </div>
        ))}
      </Card>
    </div>
  );
}
