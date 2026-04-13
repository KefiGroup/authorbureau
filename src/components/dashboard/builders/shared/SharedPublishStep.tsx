import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check, Monitor, Smartphone, Download, Rocket, TrendingUp, Sparkles,
  ArrowRight, Settings, BarChart3, Copy, ExternalLink, AlertTriangle, Info,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";

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
  exportKeys?: string[];
  onNavigate?: (section: string) => void;
}

export default function SharedPublishStep({
  builderLabel, checklist, revenue, previewContent,
  stepData, setStepData, onMarkEdited, stepId, bookTitle,
  publishFn, userId, exportKeys, onNavigate,
}: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Derive persisted status from stepData
  const savedStatus = stepData.publishStatus as string | undefined;
  const savedLiveUrl = stepData.publishLiveUrl as string | undefined;
  const isLive = savedStatus === "live";
  const isPendingGhl = savedStatus === "published_pending_ghl";

  const checks = checklist.map(c => ({ label: c.label, done: c.check(stepData) }));
  const allReady = checks.every(c => c.done);
  const proj = revenue.calculate(stepData);

  // Determine button label
  const getButtonLabel = () => {
    if (publishing) return "Publishing…";
    if (isLive) return "Update Live Funnel";
    if (isPendingGhl) return "Retry Publish";
    return `Publish to Marketing Hub`;
  };

  const handlePublish = async () => {
    setPublishing(true);
    setPublishError(null);
    try {
      let result: PublishResult | undefined;
      if (publishFn) {
        const r = await publishFn(stepData, userId);
        if (r) result = r;
      }
      onMarkEdited(stepId);
      const status = result?.status || "live";
      const liveUrl = result?.liveUrl || undefined;

      // Persist status into stepData so it survives across sessions
      setStepData(prev => ({
        ...prev,
        published: status === "live",
        publishedAt: new Date().toISOString(),
        publishStatus: status,
        publishLiveUrl: liveUrl || prev.publishLiveUrl,
        publishMessage: result?.message,
      }));

      if (status === "published_pending_ghl") {
        toast({ title: `${builderLabel} saved ✅`, description: "Content saved — connect your Marketing Hub to go live." });
      } else {
        toast({ title: `${builderLabel} is live! 🎉` });
      }
    } catch (err: any) {
      const msg = err?.message || "Publish failed. Please try again.";
      setPublishError(msg);
      toast({ title: "Publish failed", description: msg, variant: "destructive" });
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

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied" });
  };

  return (
    <div className="space-y-6">
      {/* How publishing works */}
      <Card className="p-4 border-primary/10 bg-primary/5">
        <div className="flex gap-3">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">How publishing works</p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs">
              <li>Click <strong>Publish to Marketing Hub</strong> to save and deploy your {builderLabel.toLowerCase()}</li>
              <li>If the Marketing Hub is connected, your opt-in page goes live instantly</li>
              <li>If not yet connected, your content is saved — go to <strong>Connected Accounts</strong> to connect, then Re-deploy</li>
              <li>Once live, go to the <strong>Marketing Hub</strong> to distribute across social media</li>
            </ol>
          </div>
        </div>
      </Card>

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

      {/* Persistent status panel */}
      {(isLive || isPendingGhl) && (
        <Card className={`p-5 ${isLive ? "border-accent/20 bg-gradient-to-br from-accent/5 to-transparent" : "border-orange-400/20 bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-950/20"}`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isLive ? "bg-accent/10" : "bg-orange-100 dark:bg-orange-900/30"}`}>
              {isLive ? <Check className="h-5 w-5 text-accent" /> : <AlertTriangle className="h-5 w-5 text-orange-500" />}
            </div>
            <div className="flex-1">
              {isLive ? (
                <>
                  <p className="text-sm font-semibold text-accent mb-1">Your {builderLabel.toLowerCase()} is live! 🎉</p>
                  {savedLiveUrl && (
                    <div className="flex items-center gap-2 mb-3">
                      <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[300px]">{savedLiveUrl}</code>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyUrl(savedLiveUrl)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                        <a href={savedLiveUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                      </Button>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mb-3">
                    Distribute it across social media from the Marketing Hub to start driving traffic.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => onNavigate ? onNavigate("marketing-hub") : navigate("/dashboard?section=marketing-hub")}>
                    <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Go to Marketing Hub <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-1">Content saved — not live yet</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your {builderLabel.toLowerCase()} is saved and ready. To go live:
                  </p>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 mb-3">
                    <li>Go to <strong>Connected Accounts</strong> and click <strong>Connect Now</strong></li>
                    <li>Once connected, click <strong>Re-deploy</strong> next to your {builderLabel.toLowerCase()}</li>
                  </ol>
                  <Button size="sm" variant="outline" onClick={() => navigate("/account-settings?tab=connections")}>
                    <Settings className="h-3.5 w-3.5 mr-1.5" /> Go to Connected Accounts <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Publish error */}
      {publishError && (
        <Card className="p-4 border-destructive/20 bg-destructive/5">
          <p className="text-sm text-destructive">{publishError}</p>
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
            <><Sparkles className="h-4 w-4 mr-2 animate-spin" /> Publishing…</>
          ) : isLive ? (
            <><Check className="h-4 w-4 mr-2" /> Update Live Funnel</>
          ) : isPendingGhl ? (
            <><Rocket className="h-4 w-4 mr-2" /> Retry Publish</>
          ) : (
            <><Rocket className="h-4 w-4 mr-2" /> Publish to Marketing Hub</>
          )}
        </Button>
      </div>
    </div>
  );
}
