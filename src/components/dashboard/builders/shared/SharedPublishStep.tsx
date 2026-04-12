import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Monitor, Smartphone, Download, Rocket, TrendingUp, Sparkles, ArrowRight, Settings, BarChart3 } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface ChecklistItem {
  label: string;
  check: (stepData: Record<string, any>) => boolean;
}

export interface RevenueProjection {
  calculate: (stepData: Record<string, any>) => { amount: number; description: string };
}

export interface PublishResult {
  status?: string;
  liveUrl?: string;
  message?: string;
}

interface Props {
  builderLabel: string;
  checklist: ChecklistItem[];
  revenue: RevenueProjection;
  previewContent: (stepData: Record<string, any>, mode: "desktop" | "mobile") => React.ReactNode;
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  stepId: string;
  bookTitle: string;
  publishFn?: (stepData: Record<string, any>, userId: string) => Promise<PublishResult | void>;
  userId: string;
  exportKeys?: string[]; // keys from stepData to include in export
  onNavigate?: (section: string) => void;
}

export default function SharedPublishStep({
  builderLabel, checklist, revenue, previewContent,
  stepData, setStepData, onMarkEdited, stepId, bookTitle,
  publishFn, userId, exportKeys, onNavigate,
}: Props) {
  const { toast } = useToast();
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);

  const checks = checklist.map(c => ({ label: c.label, done: c.check(stepData) }));
  const allReady = checks.every(c => c.done);
  const proj = revenue.calculate(stepData);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      let result: PublishResult | undefined;
      if (publishFn) {
        const r = await publishFn(stepData, userId);
        if (r) result = r;
      }
      onMarkEdited(stepId);
      const status = result?.status || "live";
      setStepData(prev => ({ ...prev, published: true, publishedAt: new Date().toISOString(), publishStatus: status }));
      setPublishResult(result || { status });

      if (status === "published_pending_ghl") {
        toast({ title: `${builderLabel} saved! ✅`, description: "Connect GoHighLevel in Settings to activate your live opt-in page." });
      } else {
        toast({ title: `${builderLabel} is live! 🎉`, description: "Head to the Marketing Hub to distribute it across social media." });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Publish failed", variant: "destructive" });
    }
    setPublishing(false);
  };

  const handleExport = () => {
    const data: Record<string, any> = {};
    for (const key of (exportKeys || Object.keys(stepData))) {
      data[key] = stepData[key];
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${builderLabel.replace(/\s+/g, "-").toLowerCase()}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 border-secondary/20 bg-gradient-to-br from-secondary/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-secondary mb-1">Abby's Revenue Projection</p>
            <p className="text-sm text-muted-foreground">
              {proj.description} — <strong className="text-foreground">${proj.amount.toLocaleString()}</strong>
            </p>
          </div>
        </div>
      </Card>

      {/* Checklist */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Publishing Checklist</h3>
        <div className="space-y-2">
          {checks.map((check, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${check.done ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"}`}>
                {check.done ? <Check className="h-3 w-3" /> : <span className="text-[9px]">{i + 1}</span>}
              </div>
              <span className={`text-sm ${check.done ? "text-foreground" : "text-muted-foreground"}`}>{check.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Preview */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Preview</h3>
          <div className="flex gap-1">
            <Button variant={previewMode === "desktop" ? "secondary" : "ghost"} size="sm" onClick={() => setPreviewMode("desktop")}>
              <Monitor className="h-3.5 w-3.5" />
            </Button>
            <Button variant={previewMode === "mobile" ? "secondary" : "ghost"} size="sm" onClick={() => setPreviewMode("mobile")}>
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className={`border rounded-xl overflow-hidden bg-background mx-auto ${previewMode === "mobile" ? "max-w-[375px]" : ""}`}>
          {previewContent(stepData, previewMode)}
        </div>
      </Card>

      {/* Post-publish Abby guidance */}
      {publishResult && (
        <Card className="p-5 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-accent mb-1">Abby's Next Step</p>
              {publishResult.status === "published_pending_ghl" ? (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your {builderLabel.toLowerCase()} content is saved and ready! Connect GoHighLevel in Settings to activate your live opt-in page and start capturing leads.
                  </p>
                  <Button size="sm" variant="outline" asChild>
                    <a href="/account-settings?tab=connections">
                      <Settings className="h-3.5 w-3.5 mr-1.5" /> Go to Settings <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </a>
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your {builderLabel.toLowerCase()} is live! 🎉 Now distribute it across social media from the Marketing Hub to start driving traffic.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => onNavigate?.("marketing-hub")}>
                    <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Go to Marketing Hub <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 justify-end">
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Export
        </Button>
        <Button
          onClick={handlePublish}
          disabled={!allReady || publishing}
          className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 px-6"
        >
          {publishing ? (
            <><Sparkles className="h-4 w-4 mr-2 animate-spin" /> Publishing...</>
          ) : stepData.published ? (
            <><Check className="h-4 w-4 mr-2" /> Update</>
          ) : (
            <><Rocket className="h-4 w-4 mr-2" /> Publish {builderLabel}</>
          )}
        </Button>
      </div>
    </div>
  );
}
