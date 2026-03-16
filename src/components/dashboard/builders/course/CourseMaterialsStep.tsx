import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileText, Map, BookMarked, Sparkles, Loader2, Download, Eye, Award, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CourseStepProps } from "./types";

interface Deliverable {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultOn: boolean;
}

const DELIVERABLES: Deliverable[] = [
  {
    key: "workbook",
    label: "Course Workbook",
    description: "Printable PDF with learning objectives, activity pages, reflection prompts, and note-taking space for each module.",
    icon: <FileText className="h-5 w-5" />,
    defaultOn: true,
  },
  {
    key: "mindmap",
    label: "Framework Mindmap",
    description: "Visual mindmap of the book's core framework from Module 3 — color-coded by module for desk reference or wall poster.",
    icon: <Map className="h-5 w-5" />,
    defaultOn: true,
  },
  {
    key: "facilitator_guide",
    label: "Facilitator Guide",
    description: "Complete guide with speaking notes, activity setups, debrief scripts, common Q&A, energy management tips, and Zoom config.",
    icon: <BookMarked className="h-5 w-5" />,
    defaultOn: true,
  },
];

export default function CourseMaterialsStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, generationState, setGenerationState }: CourseStepProps) {
  const { toast } = useToast();
  const data = stepData.deliverables || {};
  const [generating, setGenerating] = useState<string | null>(null);

  const update = (field: string, value: any) => {
    setStepData(prev => ({
      ...prev,
      deliverables: { ...prev.deliverables, [field]: value },
    }));
    onMarkEdited("materials");
  };

  const isEnabled = (key: string) => data[`${key}_enabled`] !== false; // default true
  const toggleEnabled = (key: string) => update(`${key}_enabled`, !isEnabled(key));
  const getStatus = (key: string): string => data[`${key}_status`] || "not_started";

  const handleGenerate = async (key: string) => {
    setGenerating(key);
    update(`${key}_status`, "generating");
    
    // Simulate generation (in production, this calls the edge function)
    setTimeout(() => {
      update(`${key}_status`, "ready");
      setGenerating(null);
      toast({ title: `${DELIVERABLES.find(d => d.key === key)?.label} generated!` });
    }, 3000);
  };

  const modules = stepData.curriculum?.modules || [];
  const hasModules = modules.length > 0;

  return (
    <div className="space-y-6">
      {!hasModules && (
        <Card className="p-5 border-amber-300/30 bg-amber-50/50 dark:bg-amber-900/10">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Complete the <strong>Curriculum</strong> step first to generate deliverables based on your 7-module structure.
          </p>
        </Card>
      )}

      {/* Deliverable cards */}
      {DELIVERABLES.map((del) => {
        const enabled = isEnabled(del.key);
        const status = getStatus(del.key);
        const isGen = generating === del.key;

        return (
          <Card key={del.key} className={`p-5 transition-opacity ${!enabled ? "opacity-50" : ""}`}>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                enabled ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"
              }`}>
                {del.icon}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{del.label}</p>
                    <p className="text-[10px] text-muted-foreground">{del.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={enabled} onCheckedChange={() => toggleEnabled(del.key)} />
                  </div>
                </div>

                {enabled && (
                  <div className="flex items-center gap-2 pt-1">
                    {status === "not_started" && (
                      <Button
                        size="sm"
                        onClick={() => handleGenerate(del.key)}
                        disabled={!hasModules || isGen}
                        className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 text-xs"
                      >
                        {isGen ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                        Generate {del.label}
                      </Button>
                    )}
                    {status === "generating" && (
                      <Badge variant="outline" className="text-[10px] animate-pulse">
                        <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" /> Generating...
                      </Badge>
                    )}
                    {status === "ready" && (
                      <>
                        <Badge className="text-[10px] bg-accent/10 text-accent border-accent/20">
                          ✓ Ready
                        </Badge>
                        <Button variant="outline" size="sm" className="text-xs h-7">
                          <Eye className="h-3 w-3 mr-1" /> Preview
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs h-7">
                          <Download className="h-3 w-3 mr-1" /> Download
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleGenerate(del.key)} className="text-xs h-7">
                          <RotateCcw className="h-3 w-3 mr-1" /> Regenerate
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {/* Certificate */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Award className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-bold">Certificate of Completion</p>
            <p className="text-[10px] text-muted-foreground">Auto-generated when a participant completes all 7 modules</p>
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
          <p className="text-sm font-medium">{data.certificateTitle || stepData.foundation?.title || "Course Title"}</p>
          <p className="text-[10px] text-muted-foreground mt-2">Awarded to [Participant Name] · [Date]</p>
        </div>
      </Card>

      {/* Value Ladder */}
      <Card className="p-5 space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Value Ladder Position</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-400 via-violet-400 to-secondary rounded-full" style={{ width: "100%" }} />
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>📕 Workbook (Entry)</span>
          <span>📘 Home Study (Mid)</span>
          <span className="text-secondary font-semibold">🎓 Workshop (Premium)</span>
        </div>
      </Card>
    </div>
  );
}
