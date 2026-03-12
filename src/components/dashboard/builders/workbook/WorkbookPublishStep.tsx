import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, Download, ExternalLink, Loader2, CheckCircle2, FileText, Users, BarChart3 } from "lucide-react";
import { CONTENT_TYPE_LABELS, type WorkbookSection } from "./types";
import type { WorkbookStepProps } from "./types";
import AbbyCoachingTip from "@/components/dashboard/social-media/AbbyCoachingTip";
import StepInstructions from "../shared/StepInstructions";
import { toast } from "sonner";

export default function WorkbookPublishStep({ stepData, bookTitle }: WorkbookStepProps) {
  const sections: WorkbookSection[] = stepData.sections || [];
  const setup = stepData.setup || {};
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  const totalElements = sections.reduce((sum, s) => sum + (s.elements?.length || 0), 0);
  const isFree = setup.purpose === "lead-magnet" || parseFloat(setup.price || "0") === 0;

  const handleDownloadPdf = () => {
    toast.info("Generating PDF preview…");
    // Build simple HTML from sections
    const html = sections.map(s => `
      <h2>${s.title}</h2>
      <p>${s.intro || ""}</p>
      ${(s.elements || []).map(el => `<h3>${el.title}</h3><p>${el.content || ""}</p>`).join("")}
      <p><strong>Key Takeaway:</strong> ${s.takeaway || ""}</p>
    `).join("<hr/>");

    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("Please allow popups"); return; }
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${setup.title || "Workbook"}</title><style>@page{size:A4;margin:15mm}body{font-family:Georgia,serif;font-size:12pt;line-height:1.6;padding:40px}h2{margin-top:2em;border-bottom:1px solid #ddd;padding-bottom:4px}h3{color:#555}@media print{body{padding:0}}</style></head><body><h1>${setup.title || "Workbook"}</h1><p><em>${setup.subtitle || ""}</em></p><hr/>${html}</body></html>`);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); printWindow.close(); };
    toast.success("PDF print dialog opened!");
  };

  return (
    <div className="space-y-6">
      <StepInstructions
        summary="Final review before publishing. Check your stats, preview the sales/landing page, and publish your workbook."
        items={[
          { label: "Stats cards", description: "overview of sections, exercises, and pricing at a glance." },
          { label: "Abby's Final Review", description: "AI-generated assessment of your workbook with revenue estimates." },
          { label: "Desktop / Mobile preview", description: "toggle to see how your sales or landing page looks on different devices." },
          { label: "Download PDF Preview", description: "opens a print dialog to save your workbook as a PDF." },
          { label: "Publish Workbook", description: "makes your workbook live and available to your audience." },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <FileText className="h-5 w-5 text-secondary mx-auto mb-1.5" />
          <p className="text-lg font-bold">{sections.length}</p>
          <p className="text-[10px] text-muted-foreground">Sections</p>
        </Card>
        <Card className="p-4 text-center">
          <CheckCircle2 className="h-5 w-5 text-accent mx-auto mb-1.5" />
          <p className="text-lg font-bold">{totalElements}</p>
          <p className="text-[10px] text-muted-foreground">Exercises</p>
        </Card>
        <Card className="p-4 text-center">
          <BarChart3 className="h-5 w-5 text-primary mx-auto mb-1.5" />
          <p className="text-lg font-bold">{isFree ? "Free" : `$${setup.price}`}</p>
          <p className="text-[10px] text-muted-foreground">Pricing</p>
        </Card>
      </div>

      {/* Abby review */}
      <AbbyCoachingTip
        title="Abby's Final Review"
        expandedByDefault
        customContent={
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>Your workbook has <strong>{totalElements} exercises</strong> across <strong>{sections.length} sections</strong>.</p>
            {isFree ? (
              <p>As a <strong>lead magnet</strong>, this workbook could generate <strong>50-200 email subscribers</strong> per month with the right distribution strategy.</p>
            ) : (
              <p>At <strong>${setup.price}</strong>, with your audience size, this could generate <strong>$200-$800/month</strong> in passive revenue.</p>
            )}
            <p>Make sure your back cover CTA points to your online course or website for maximum conversion.</p>
          </div>
        }
      />

      {/* Preview toggle */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">
            {isFree ? "Landing Page Preview" : "Sales Page Preview"}
          </p>
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            <Button variant={previewMode === "desktop" ? "secondary" : "ghost"} size="sm" className="h-7 px-2" onClick={() => setPreviewMode("desktop")}>
              <Monitor className="h-3.5 w-3.5" />
            </Button>
            <Button variant={previewMode === "mobile" ? "secondary" : "ghost"} size="sm" className="h-7 px-2" onClick={() => setPreviewMode("mobile")}>
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <Card className="p-4 bg-muted/20">
          <div className={`mx-auto bg-white rounded-lg border border-border shadow-sm overflow-hidden ${previewMode === "mobile" ? "max-w-sm" : "max-w-2xl"}`}>
            <div className="p-6 text-center border-b border-border">
              <h2 className="text-lg font-bold mb-1">{setup.title || "Your Workbook"}</h2>
              <p className="text-xs text-muted-foreground mb-3">{setup.subtitle || `A companion workbook for ${bookTitle}`}</p>
              <Button size="sm">{isFree ? "Download Free" : `Get It — $${setup.price}`}</Button>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-xs font-semibold">What's Inside:</p>
              {sections.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-accent shrink-0" />
                  <span>{s.title}</span>
                </div>
              ))}
              {sections.length > 5 && <p className="text-[10px] text-muted-foreground">+ {sections.length - 5} more sections</p>}
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleDownloadPdf}>
          <Download className="h-4 w-4 mr-2" /> Download PDF Preview
        </Button>
        <Button>
          <ExternalLink className="h-4 w-4 mr-2" /> Publish Workbook
        </Button>
      </div>
    </div>
  );
}
