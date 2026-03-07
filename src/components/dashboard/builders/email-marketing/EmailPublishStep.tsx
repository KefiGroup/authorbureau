import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Monitor, Smartphone, Mail, Send, Check, Loader2, Save, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import type { EmailSequence, EmailMarketingConfig, SequenceType } from "./types";
import { SEQUENCE_META, GOAL_LABELS } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookTitle: string;
}

export default function EmailPublishStep({ stepData, setStepData, onMarkEdited, bookTitle }: Props) {
  const { toast } = useToast();
  const sequences: Record<string, EmailSequence> = stepData.emailSequences || {};
  const config: EmailMarketingConfig = stepData.emailConfig || {};
  const [publishing, setPublishing] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewSeq, setPreviewSeq] = useState<SequenceType>(Object.keys(sequences)[0] as SequenceType || "welcome");
  const [previewEmail, setPreviewEmail] = useState(0);

  const totalEmails = Object.values(sequences).reduce((sum, s) => sum + s.emails.length, 0);
  const seqTypes = Object.keys(sequences) as SequenceType[];
  const currentSeq = sequences[previewSeq];
  const currentEmail = currentSeq?.emails[previewEmail];

  const handlePublish = async () => {
    setPublishing(true);
    setTimeout(() => {
      setStepData(prev => ({ ...prev, publishedAt: new Date().toISOString() }));
      onMarkEdited("publish");
      setPublishing(false);
      toast({ title: "Email marketing system published!", description: "Your sequences are saved and ready to activate." });
    }, 2000);
  };

  const handleTestSend = () => {
    toast({ title: "Test email sent!", description: "Check your inbox for the preview." });
  };

  return (
    <div className="space-y-6">
      {/* Projection */}
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-secondary mb-1">Abby's Revenue Projection</p>
            <p className="text-sm text-muted-foreground">
              A well-crafted welcome sequence converts 5-10% of subscribers to buyers. With consistent list building, this email system could generate significant monthly revenue on autopilot.
            </p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Sequences", value: seqTypes.length },
          { label: "Total Emails", value: totalEmails },
          { label: "Goal", value: GOAL_LABELS[config.primaryGoal]?.replace(/^.+\s/, "") || "—" },
          { label: "Lead Magnet", value: config.leadMagnet || "—" },
        ].map(stat => (
          <Card key={stat.label} className="p-3 text-center">
            <p className="text-lg font-bold">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Email preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4" /> Email Preview
          </h3>
          <div className="flex items-center gap-1 bg-muted rounded-full p-0.5">
            <button onClick={() => setViewMode("desktop")}
              className={`p-1.5 rounded-full transition-colors ${viewMode === "desktop" ? "bg-background shadow" : ""}`}>
              <Monitor className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setViewMode("mobile")}
              className={`p-1.5 rounded-full transition-colors ${viewMode === "mobile" ? "bg-background shadow" : ""}`}>
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Sequence & email selectors */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {seqTypes.map(type => (
            <button key={type} onClick={() => { setPreviewSeq(type); setPreviewEmail(0); }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                type === previewSeq ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
              }`}>
              {SEQUENCE_META[type].label}
            </button>
          ))}
        </div>
        {currentSeq && (
          <div className="flex gap-1 overflow-x-auto pb-1">
            {currentSeq.emails.map((_, i) => (
              <button key={i} onClick={() => setPreviewEmail(i)}
                className={`shrink-0 w-7 h-7 rounded-full text-[10px] font-bold transition-all ${
                  i === previewEmail ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}

        {/* Email render */}
        {currentEmail && (
          <div className={`mx-auto transition-all ${viewMode === "mobile" ? "max-w-[375px]" : "max-w-full"}`}>
            <Card className="overflow-hidden">
              <div className="p-3 border-b border-border bg-muted/30">
                <p className="text-xs font-semibold">{currentEmail.subjectOptions?.[currentEmail.selectedSubject] || "Subject"}</p>
                <p className="text-[10px] text-muted-foreground">{currentEmail.previewText}</p>
              </div>
              <div className="p-5">
                <div className="prose prose-sm max-w-none">
                  <MarkdownRenderer content={currentEmail.bodyMarkdown || ""} />
                </div>
                {currentEmail.ctaText && (
                  <div className="mt-4">
                    <Button className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 w-full sm:w-auto">
                      {currentEmail.ctaText}
                    </Button>
                  </div>
                )}
                {currentEmail.psLine && (
                  <p className="text-xs text-muted-foreground mt-4 italic">{currentEmail.psLine}</p>
                )}
              </div>
              <div className="p-2 border-t border-border bg-muted/20 text-center">
                <p className="text-[9px] text-muted-foreground">
                  Day {currentEmail.sendDay} • {currentEmail.sendTime}
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button variant="outline" onClick={handleTestSend}>
          <Send className="h-4 w-4 mr-2" /> Test Send
        </Button>
        <div className="flex-1" />
        {stepData.publishedAt ? (
          <Button disabled className="rounded-full">
            <Check className="h-4 w-4 mr-2" /> Published
          </Button>
        ) : (
          <Button onClick={handlePublish} disabled={publishing || totalEmails === 0}
            className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
            {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {publishing ? "Publishing..." : "Publish Email System"}
          </Button>
        )}
      </div>
    </div>
  );
}
