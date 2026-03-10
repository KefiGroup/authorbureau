import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, FileText, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    title: string;
    type: string;
    bookTitle: string;
    description?: string;
  } | null;
  /** Fetches the full course content for rendering */
  fetchContent?: () => Promise<{
    setup: { title: string; description: string; duration: number; commitment: number; level: string; price?: string };
    days: Array<{
      dayNumber: number;
      weekNumber: number;
      theme: string;
      chapterRef: string;
      reading: string;
      concept: string;
      exercise: string;
      reflection: string;
      isCatchUp?: boolean;
    }>;
    authorName: string;
  } | null>;
}

function buildPrintHtml(data: NonNullable<Awaited<ReturnType<NonNullable<Props["fetchContent"]>>>>) {
  const { setup, days, authorName } = data;
  const escapedTitle = setup.title.replace(/</g, "&lt;");
  const escapedAuthor = authorName.replace(/</g, "&lt;");
  const escapedDesc = (setup.description || "").replace(/</g, "&lt;");

  const dayPages = days
    .map(
      (d) => `
    <div class="page day-page">
      <div class="day-header">
        <span class="day-badge">${d.isCatchUp ? "☕ Catch-Up Day" : `Day ${d.dayNumber}`}</span>
        <span class="week-label">Week ${d.weekNumber}</span>
      </div>
      <h2 class="day-title">${d.theme.replace(/</g, "&lt;")}</h2>
      <div class="section reading">
        <h3>📖 Today's Reading</h3>
        <p>${(d.reading || d.chapterRef).replace(/</g, "&lt;")}</p>
      </div>
      ${d.concept ? `<div class="section concept"><h3>💡 Key Concept</h3><p>${d.concept.replace(/</g, "&lt;")}</p></div>` : ""}
      <div class="section exercise">
        <h3>🏋️ Exercise</h3>
        <p>${d.exercise.replace(/</g, "&lt;")}</p>
      </div>
      <div class="section reflection">
        <h3>🪞 Reflection</h3>
        <p>${d.reflection.replace(/</g, "&lt;")}</p>
      </div>
      <div class="checkbox-row">
        <span class="checkbox"></span>
        <span>I completed Day ${d.dayNumber}</span>
      </div>
    </div>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapedTitle}</title>
<style>
  @page { size: letter; margin: 1in; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.6; }
  .page { page-break-after: always; min-height: 100vh; padding: 2rem 0; }
  .page:last-child { page-break-after: avoid; }

  /* Cover */
  .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .cover .program-badge { display: inline-block; padding: 4px 16px; border: 2px solid #6b4f8a; border-radius: 20px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #6b4f8a; margin-bottom: 24px; }
  .cover h1 { font-size: 32px; margin-bottom: 8px; }
  .cover .author { font-size: 16px; color: #666; margin-bottom: 24px; }
  .cover .desc { font-size: 14px; color: #555; max-width: 480px; margin-bottom: 32px; }
  .cover .meta { display: flex; gap: 24px; font-size: 12px; color: #888; }

  /* Day pages */
  .day-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .day-badge { display: inline-block; padding: 2px 12px; background: #f0ebf8; border-radius: 12px; font-size: 11px; font-weight: 600; color: #6b4f8a; }
  .week-label { font-size: 11px; color: #999; }
  .day-title { font-size: 22px; margin-bottom: 20px; }
  .section { margin-bottom: 20px; padding: 12px 16px; border-radius: 8px; }
  .section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; font-weight: 700; }
  .section p { font-size: 13px; color: #444; white-space: pre-line; }
  .reading { background: #f5f5f0; }
  .concept { background: #fff; }
  .exercise { background: #f0f8f4; }
  .reflection { background: #f5f0f8; }
  .checkbox-row { display: flex; align-items: center; gap: 8px; margin-top: 16px; font-size: 13px; color: #666; }
  .checkbox { width: 18px; height: 18px; border: 2px solid #ccc; border-radius: 4px; display: inline-block; }

  /* Certificate */
  .certificate { text-align: center; }
  .certificate .cert-label { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #6b4f8a; font-weight: 700; margin-bottom: 16px; }
  .certificate h2 { font-size: 24px; margin-bottom: 8px; }
  .certificate .duration { font-size: 14px; color: #888; margin-bottom: 32px; }
  .certificate .name-line { border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 12px 0; width: 200px; margin: 0 auto 16px; font-size: 13px; color: #999; }
  .certificate .date-line { font-size: 11px; color: #999; }

  /* Page numbers */
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <!-- Cover Page -->
  <div class="page cover">
    <div class="program-badge">${setup.duration}-Day Program</div>
    <h1>${escapedTitle}</h1>
    <p class="author">by ${escapedAuthor}</p>
    <p class="desc">${escapedDesc}</p>
    <div class="meta">
      <span>📅 ${setup.duration} days</span>
      <span>⏱ ${setup.commitment || 30} min/day</span>
      <span>📖 ${setup.level || "Beginner"}</span>
    </div>
  </div>

  <!-- Day Pages -->
  ${dayPages}

  <!-- Certificate Page -->
  <div class="page certificate" style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
    <div class="cert-label">Certificate of Completion</div>
    <h2>${escapedTitle}</h2>
    <p class="duration">${setup.duration}-Day Program</p>
    <div class="name-line">[Student Name]</div>
    <p class="date-line">Completed on [Date]</p>
  </div>
</body>
</html>`;
}

export default function HomeStudyExportModal({ open, onOpenChange, product, fetchContent }: Props) {
  const [loading, setLoading] = useState(false);

  const getContent = async () => {
    if (!fetchContent) return null;
    setLoading(true);
    try {
      return await fetchContent();
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    const data = await getContent();
    if (!data) return;
    const html = buildPrintHtml(data);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const handleDownload = async () => {
    const data = await getContent();
    if (!data) return;
    const html = buildPrintHtml(data);
    // Use hidden iframe + print-to-pdf guidance
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    // Small delay then trigger print (user saves as PDF)
    setTimeout(() => {
      w.print();
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-secondary" />
            Download Your Home Study Course
          </DialogTitle>
          <DialogDescription>
            {product?.title || "Course"} — choose an export format below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4 px-4"
            onClick={handleDownload}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 mr-3 animate-spin text-secondary" />
            ) : (
              <Download className="h-5 w-5 mr-3 text-secondary" />
            )}
            <div className="text-left">
              <p className="text-sm font-semibold">Download as PDF</p>
              <p className="text-xs text-muted-foreground">
                Opens a print-ready view — select "Save as PDF" in the print dialog
              </p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4 px-4"
            onClick={handlePrint}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 mr-3 animate-spin text-secondary" />
            ) : (
              <Printer className="h-5 w-5 mr-3 text-secondary" />
            )}
            <div className="text-left">
              <p className="text-sm font-semibold">Print</p>
              <p className="text-xs text-muted-foreground">
                Opens your browser's print dialog for physical copies
              </p>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
