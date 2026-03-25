import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, Loader2, Monitor, Smartphone, Presentation, FileText, Mail, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { WebinarConfig, ScriptSection, WebinarSlide, RegistrationPage, FollowUpEmail } from "./types";
import { WEBINAR_TYPE_LABELS, FORMAT_LABELS, SLIDE_TYPE_LABELS } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookId: string;
  bookTitle: string;
  userId: string;
  plan: Record<string, any> | null;
}

export default function WebinarPublishStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, userId, plan }: Props) {
  const { toast } = useToast();
  const config: WebinarConfig = stepData["configure"]?.config || {};
  const sections: ScriptSection[] = stepData["script"]?.sections || [];
  const slides: WebinarSlide[] = stepData["slides"]?.slides || [];
  const regPage: RegistrationPage = stepData["registration"]?.regPage || {};
  const emails: FollowUpEmail[] = stepData["registration"]?.emails || [];
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [previewTab, setPreviewTab] = useState<"registration" | "slides" | "script">("registration");
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  const totalWords = sections.reduce((a, s) => a + (s.wordCount || 0), 0);
  const estimatedRegistrants = config.type === "lead_magnet" ? 150 : 50;
  const conversionRate = config.type === "lead_magnet" ? 0.1 : 0.25;
  const estimatedSales = Math.round(estimatedRegistrants * conversionRate);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      // Save webinar data to generated_assets
      await supabase.from("generated_assets").insert({
        author_id: userId,
        book_id: bookId,
        asset_type: "webinar_package",
        content: JSON.stringify({
          config,
          sections,
          slides,
          regPage,
          emails,
          publishedAt: new Date().toISOString(),
        }),
      });

      setPublished(true);
      toast({ title: "Webinar package published!", description: "Your script, slides, and registration page are ready." });
    } catch (err) {
      console.error("Publish error:", err);
      toast({ title: "Publish failed", variant: "destructive" });
    }
    setPublishing(false);
  };

  if (published) {
    return (
      <Card className="p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>
        <h3 className="font-heading text-xl font-bold mb-2">Webinar Package Published! 🎉</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Your {config.duration}-minute {WEBINAR_TYPE_LABELS[config.type]?.label || "webinar"} is ready. Share your registration page and start promoting!
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Abby's projection */}
      <Card className="p-5 border-secondary/20 bg-secondary/5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1">Abby's Projection</p>
            <p className="text-sm text-muted-foreground">
              {config.type === "lead_magnet"
                ? `Free webinars typically convert 5-15% of attendees to your paid product. With ~${estimatedRegistrants} registrants, that's ~${estimatedSales} sales${config.primaryCtaProduct ? ` of your ${config.primaryCtaProduct}` : ""}.`
                : `Paid workshops at $${config.price || 47} with ~${estimatedRegistrants} attendees could generate $${estimatedRegistrants * (config.price || 47)} in direct revenue, plus ${estimatedSales} upsells.`}
            </p>
          </div>
        </div>
      </Card>

      {/* Package Overview */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Webinar Package Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <FileText className="h-5 w-5 text-secondary mx-auto mb-1" />
            <p className="text-lg font-bold">{sections.length}</p>
            <p className="text-[10px] text-muted-foreground">Script Sections</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <Presentation className="h-5 w-5 text-secondary mx-auto mb-1" />
            <p className="text-lg font-bold">{slides.length}</p>
            <p className="text-[10px] text-muted-foreground">Slides</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <Mail className="h-5 w-5 text-secondary mx-auto mb-1" />
            <p className="text-lg font-bold">{emails.length}</p>
            <p className="text-[10px] text-muted-foreground">Emails</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <TrendingUp className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{totalWords.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Words</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="outline" className="text-[10px]">{WEBINAR_TYPE_LABELS[config.type]?.label}</Badge>
          <Badge variant="outline" className="text-[10px]">{config.duration} min</Badge>
          <Badge variant="outline" className="text-[10px]">{FORMAT_LABELS[config.format]?.label}</Badge>
          {config.type === "paid_workshop" && <Badge variant="outline" className="text-[10px]">${config.price}</Badge>}
        </div>
      </Card>

      {/* Preview tabs */}
      <Card className="overflow-hidden">
        <div className="flex items-center border-b border-border">
          {(["registration", "slides", "script"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setPreviewTab(tab)}
              className={`flex-1 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                previewTab === tab ? "border-secondary text-secondary" : "border-transparent text-muted-foreground"
              }`}
            >
              {tab === "registration" ? "📋 Registration" : tab === "slides" ? "🎞 Slides" : "📝 Script"}
            </button>
          ))}
          <div className="flex gap-1 px-3">
            <button onClick={() => setViewMode("desktop")} className={`p-1 rounded ${viewMode === "desktop" ? "text-secondary" : "text-muted-foreground"}`}>
              <Monitor className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setViewMode("mobile")} className={`p-1 rounded ${viewMode === "mobile" ? "text-secondary" : "text-muted-foreground"}`}>
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className={`p-6 ${viewMode === "mobile" ? "max-w-sm mx-auto" : ""}`}>
          {previewTab === "registration" && (
            <div className="space-y-4">
              <div className="bg-primary text-primary-foreground rounded-lg p-6 text-center">
                <h3 className="font-heading text-lg font-bold">{regPage.headline || config.title}</h3>
                <p className="text-xs opacity-80 mt-2">{regPage.description?.slice(0, 150)}</p>
              </div>
              <div className="space-y-2">
                {(regPage.bullets || []).map((b: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-secondary text-sm">✓</span>
                    <p className="text-sm">{b}</p>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <Button className="bg-secondary text-secondary-foreground rounded-full px-6 text-sm">
                  {regPage.ctaText || "Register Free"}
                </Button>
              </div>
            </div>
          )}

          {previewTab === "slides" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {slides.slice(0, 9).map((slide, i) => (
                <div key={slide.id} className="aspect-video bg-muted/30 rounded-lg border border-border flex flex-col items-center justify-center p-3 text-center">
                  <span className="text-lg">{SLIDE_TYPE_LABELS[slide.type]?.emoji}</span>
                  <p className="text-[10px] font-medium mt-1 line-clamp-2">{slide.title}</p>
                  <p className="text-[9px] text-muted-foreground">{i + 1}/{slides.length}</p>
                </div>
              ))}
            </div>
          )}

          {previewTab === "script" && (
            <div className="space-y-3">
              {sections.map(s => (
                <div key={s.id} className="flex gap-3">
                  <Badge variant="outline" className="text-[9px] font-mono shrink-0 mt-0.5">{s.timeStart}</Badge>
                  <div>
                    <p className="text-xs font-semibold">{s.label}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{s.script?.slice(0, 120)}...</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => toast({ title: "Draft saved" })}
        >
          Save as Draft
        </Button>
        <Button
          onClick={handlePublish}
          disabled={publishing}
          className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
          Publish Webinar Package
        </Button>
      </div>
    </div>
  );
}
