import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Mail } from "lucide-react";
import type { EmailMarketingConfig, EmailGoal, EmailTone, EmailFrequency } from "./types";
import { GOAL_LABELS, TONE_LABELS, FREQUENCY_LABELS } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookTitle: string;
  plan: any;
}

export default function EmailStrategySetupStep({ stepData, setStepData, onMarkEdited, bookTitle, plan }: Props) {
  const config: EmailMarketingConfig = stepData.emailConfig || {
    listName: `${bookTitle} Readers`,
    leadMagnet: plan?.products?.workbook?.title || "Companion Workbook",
    frequency: "weekly" as EmailFrequency,
    tone: "conversational" as EmailTone,
    primaryGoal: "nurture_sale" as EmailGoal,
  };

  const updateConfig = (partial: Partial<EmailMarketingConfig>) => {
    setStepData(prev => ({ ...prev, emailConfig: { ...config, ...partial } }));
    onMarkEdited("setup");
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-secondary mb-1">Abby's Recommendation</p>
            <p className="text-sm text-muted-foreground">
              Your workbook is the perfect lead magnet. I'll create a welcome sequence that warms subscribers up to your Online Course over 14 days, then a nurture sequence that builds authority over 6 weeks.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Email List Name</Label>
          <Input value={config.listName} onChange={e => updateConfig({ listName: e.target.value })} placeholder="My Reader List" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Lead Magnet (Opt-in Offer)</Label>
          <Input value={config.leadMagnet} onChange={e => updateConfig({ leadMagnet: e.target.value })} placeholder="Free workbook, checklist, etc." />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">Email Frequency</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.entries(FREQUENCY_LABELS) as [EmailFrequency, string][]).map(([key, label]) => (
            <button key={key} onClick={() => updateConfig({ frequency: key })}
              className={`p-3 rounded-lg border text-sm font-medium text-center transition-all ${config.frequency === key ? "border-secondary bg-secondary/10 text-secondary" : "border-border hover:border-muted-foreground/30"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">Tone</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.entries(TONE_LABELS) as [EmailTone, string][]).map(([key, label]) => (
            <button key={key} onClick={() => updateConfig({ tone: key })}
              className={`p-3 rounded-lg border text-sm font-medium text-center transition-all ${config.tone === key ? "border-secondary bg-secondary/10 text-secondary" : "border-border hover:border-muted-foreground/30"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">Primary Goal</Label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(GOAL_LABELS) as [EmailGoal, string][]).map(([key, label]) => (
            <button key={key} onClick={() => updateConfig({ primaryGoal: key })}
              className={`p-3 rounded-lg border text-sm font-medium text-center transition-all ${config.primaryGoal === key ? "border-secondary bg-secondary/10 text-secondary" : "border-border hover:border-muted-foreground/30"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-4 bg-muted/30 border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-secondary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{config.listName || "Untitled List"}</p>
            <p className="text-xs text-muted-foreground">
              Lead magnet: {config.leadMagnet} • {FREQUENCY_LABELS[config.frequency]} • {TONE_LABELS[config.tone]} • {GOAL_LABELS[config.primaryGoal]}
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">Ready</Badge>
        </div>
      </Card>
    </div>
  );
}
