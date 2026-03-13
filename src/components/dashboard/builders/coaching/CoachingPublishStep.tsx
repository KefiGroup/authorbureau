import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Eye, Smartphone, Monitor, Download, Rocket, UserCheck, DollarSign, Users, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/shared-backend";
import type { CoachingConfig } from "./types";
import { STRUCTURE_LABELS } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookTitle: string;
}

export default function CoachingPublishStep({ stepData, setStepData, onMarkEdited, bookTitle }: Props) {
  const { toast } = useToast();
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [publishing, setPublishing] = useState(false);

  const config: CoachingConfig = stepData.coachingConfig || {};
  const sessions = stepData.sessionPlans || [];
  const materials = stepData.clientMaterials || {};
  const booking = stepData.bookingConfig || {};

  const structureMeta = STRUCTURE_LABELS[config.structure || "12-week"];
  const clientsPerMonth = config.structure === "single" ? 8 : config.structure === "4-pack" ? 4 : config.structure === "8-pack" ? 3 : 2;
  const monthlyRevenue = clientsPerMonth * (config.price || 2497);

  const checks = [
    { label: "Coaching package configured", done: !!config.packageName && !!config.structure },
    { label: "Session framework created", done: sessions.length > 0 },
    { label: "Client materials generated", done: Object.keys(materials).length >= 3 },
    { label: "Sales page created", done: !!booking.salesPageCopy },
    { label: "Discovery call script ready", done: !!booking.discoveryCallScript },
  ];

  const allReady = checks.every(c => c.done);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      // Save coaching package to database
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Save as generated asset
      const content = JSON.stringify({
        config,
        sessions,
        materials,
        booking,
        publishedAt: new Date().toISOString(),
      });

      const { error } = await supabase.from("coaching_packages").upsert({
        author_id: session.user.id,
        title: config.packageName || `${bookTitle} Coaching`,
        description: config.focusArea || "",
        type: config.structure === "single" ? "1on1" : "package",
        duration_minutes: parseInt(config.sessionDuration || "60"),
        sessions_count: structureMeta?.sessions || 1,
        price: config.price || 0,
        status: "active",
      });

      if (error) throw error;

      onMarkEdited("preview");
      setStepData(prev => ({ ...prev, published: true, publishedAt: new Date().toISOString() }));
      toast({ title: "Coaching package published!", description: "It's now live on your profile." });
    } catch (err) {
      console.error(err);
      toast({ title: "Publish failed", variant: "destructive" });
    }
    setPublishing(false);
  };

  return (
    <div className="space-y-6">
      {/* Revenue Projection */}
      <Card className="p-5 border-secondary/20 bg-gradient-to-br from-secondary/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-secondary mb-1">Abby's Revenue Projection</p>
            <p className="text-sm text-muted-foreground">
              At <strong>${(config.price || 2497).toLocaleString()}</strong> per {structureMeta?.label?.toLowerCase() || "package"} with{" "}
              <strong>{clientsPerMonth} clients/month</strong>, your coaching revenue would be{" "}
              <strong className="text-foreground">${monthlyRevenue.toLocaleString()}/month</strong>.
            </p>
          </div>
        </div>
      </Card>

      {/* Readiness Checklist */}
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
          <h3 className="text-sm font-semibold">Package Preview</h3>
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
          <div className="p-6 text-center border-b border-border bg-muted/30">
            <UserCheck className="h-8 w-8 text-violet-500 mx-auto mb-3" />
            <h2 className="font-heading text-xl font-bold mb-1">{config.packageName || "Coaching Program"}</h2>
            <p className="text-sm text-muted-foreground mb-3">{config.focusArea || "Transform your life with guided coaching"}</p>
            <Badge className="bg-violet-500/10 text-violet-700 text-sm px-4 py-1">
              ${(config.price || 2497).toLocaleString()}
            </Badge>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{structureMeta?.label} • {structureMeta?.sessions} sessions</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>${Math.round((config.price || 2497) / (structureMeta?.sessions || 1))}/session</span>
            </div>
            {sessions.slice(0, 3).map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground pl-2 border-l-2 border-violet-200">
                Session {s.sessionNumber}: {s.theme}
              </div>
            ))}
            {sessions.length > 3 && (
              <p className="text-xs text-muted-foreground pl-2">+{sessions.length - 3} more sessions</p>
            )}
          </div>
        </div>
      </Card>

      {/* Export & Publish */}
      <div className="flex items-center gap-3 justify-end">
        <Button variant="outline" onClick={() => {
          const blob = new Blob([JSON.stringify({ config, sessions, materials, booking }, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `coaching-package-${config.packageName?.replace(/\s+/g, "-").toLowerCase() || "export"}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }}>
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
            <><Check className="h-4 w-4 mr-2" /> Update Package</>
          ) : (
            <><Rocket className="h-4 w-4 mr-2" /> Publish Coaching Package</>
          )}
        </Button>
      </div>
    </div>
  );
}
