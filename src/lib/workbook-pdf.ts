import jsPDF from "jspdf";

/**
 * Workbook-specific PDF renderer for BP-06.
 *
 * Produces a print-ready, fillable companion workbook with:
 *   - Branded cover page
 *   - Welcome / how-to-use page
 *   - Table of contents
 *   - One page-group per section with numbered exercises and ruled response lines
 *   - 30-day commitment grid + action plan
 *   - Back cover
 *
 * Uses jsPDF (already a project dependency).
 */

interface WorkbookSection {
  number?: number;
  title?: string;
  description?: string;
  exercises?: string[];
  outcome?: string;
}

interface WorkbookContent {
  workbook_title?: string;
  workbook_subtitle?: string;
  tagline?: string;
  page_count?: string;
  format?: string;
  transformation_promise?: string;
  who_its_for?: string;
  what_youll_get?: string[];
  sections?: WorkbookSection[];
}

/**
 * Estimate the rendered page count of the workbook PDF based on the actual
 * layout in this renderer (cover + welcome + TOC + 2 pages/section + action plan + back cover).
 * Stays within ±1 page of the real output and updates with section count.
 */
/**
 * Strip leading subject+modal phrases ("You will", "You can", "Readers will", etc.)
 * from an outcome string so it reads naturally after the label
 * "After this section, you can:". Lowercases the first letter of the resulting
 * verb (but leaves acronyms / proper nouns alone).
 */
export function normalizeOutcome(raw?: string): string {
  if (!raw) return "";
  let s = raw.trim();
  s = s.replace(
    /^(you(['']| wi)?(ll)?|you can|you['']ll be able to|readers (will|can)|the reader (will|can)|by the end[^,]*,\s*you (will|can))\s+/i,
    "",
  );
  if (s.length > 1 && /^[A-Z][a-z]/.test(s)) s = s[0].toLowerCase() + s.slice(1);
  return s;
}

export function estimateWorkbookPageCount(content: WorkbookContent | null | undefined): number {
  const sections = Array.isArray(content?.sections) ? content!.sections!.length : 0;
  // Cover (1) + Welcome (1) + TOC (1 if any sections) + sections * 2 + Action plan (1) + Back cover (1)
  return 1 + 1 + (sections ? 1 : 0) + sections * 2 + 1 + 1;
}

export interface WorkbookPdfOptions {
  content: WorkbookContent;
  bookTitle: string;
  authorName?: string;
}

const PAGE = { width: 612, height: 792 }; // US Letter, points
const MARGIN = 72; // 1 inch
const MAX_W = PAGE.width - MARGIN * 2;
const LINE_GAP = 22; // ruled response line spacing
const RULE_COLOR: [number, number, number] = [200, 200, 200];

function safeFilename(name: string): string {
  return (name || "Workbook")
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80) || "Workbook";
}

function addFooter(doc: jsPDF, pageNum: number, total: number, label: string) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(140);
  doc.text(label, MARGIN, PAGE.height - 36);
  doc.text(`${pageNum} / ${total}`, PAGE.width - MARGIN, PAGE.height - 36, { align: "right" });
  doc.setTextColor(0);
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE.height - MARGIN - 24) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function writeText(
  doc: jsPDF,
  text: string,
  y: number,
  opts: { size?: number; bold?: boolean; color?: number; gap?: number } = {},
): number {
  const size = opts.size ?? 11;
  doc.setFont("helvetica", opts.bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(opts.color ?? 30);
  const lines = doc.splitTextToSize(text, MAX_W);
  for (const ln of lines) {
    y = ensureSpace(doc, y, size * 1.3);
    doc.text(ln, MARGIN, y);
    y += size * 1.3;
  }
  return y + (opts.gap ?? 4);
}

function drawRuledLines(doc: jsPDF, y: number, count: number): number {
  doc.setDrawColor(...RULE_COLOR);
  doc.setLineWidth(0.5);
  for (let i = 0; i < count; i++) {
    y = ensureSpace(doc, y, LINE_GAP);
    doc.line(MARGIN, y, PAGE.width - MARGIN, y);
    y += LINE_GAP;
  }
  doc.setDrawColor(0);
  return y + 6;
}

function drawCalloutBox(doc: jsPDF, y: number, label: string, body: string): number {
  const padding = 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const labelLines = doc.splitTextToSize(label, MAX_W - padding * 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const bodyLines = doc.splitTextToSize(body, MAX_W - padding * 2);
  const boxH = padding * 2 + labelLines.length * 13 + bodyLines.length * 14 + 4;
  y = ensureSpace(doc, y, boxH + 8);
  doc.setFillColor(245, 247, 252);
  doc.setDrawColor(210, 215, 225);
  doc.roundedRect(MARGIN, y, MAX_W, boxH, 6, 6, "FD");
  let cy = y + padding + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(80);
  for (const ln of labelLines) {
    doc.text(ln, MARGIN + padding, cy);
    cy += 13;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(30);
  for (const ln of bodyLines) {
    doc.text(ln, MARGIN + padding, cy);
    cy += 14;
  }
  return y + boxH + 12;
}

function renderCover(doc: jsPDF, content: WorkbookContent, bookTitle: string, authorName?: string) {
  // Brand band
  doc.setFillColor(20, 30, 60);
  doc.rect(0, 0, PAGE.width, 140, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("A COMPANION WORKBOOK", MARGIN, 80);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Based on "${bookTitle}"`, MARGIN, 100);

  // Title block
  doc.setTextColor(20, 30, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  const titleLines = doc.splitTextToSize(content.workbook_title || "Workbook", MAX_W);
  let y = 240;
  for (const ln of titleLines) {
    doc.text(ln, MARGIN, y);
    y += 40;
  }

  if (content.workbook_subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    doc.setTextColor(80);
    const subLines = doc.splitTextToSize(content.workbook_subtitle, MAX_W);
    for (const ln of subLines) {
      doc.text(ln, MARGIN, y);
      y += 22;
    }
  }

  if (content.tagline) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(13);
    doc.setTextColor(110);
    y += 16;
    const tagLines = doc.splitTextToSize(`"${content.tagline}"`, MAX_W);
    for (const ln of tagLines) {
      doc.text(ln, MARGIN, y);
      y += 18;
    }
  }

  // Byline
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 30, 60);
  doc.text(`By ${authorName || "the Author"}`, MARGIN, PAGE.height - 130);

  // Footer band
  doc.setFillColor(20, 30, 60);
  doc.rect(0, PAGE.height - 80, PAGE.width, 80, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Powered by Authors Bureau", MARGIN, PAGE.height - 40);
  doc.setTextColor(0);
}

function renderWelcomePage(doc: jsPDF, content: WorkbookContent) {
  doc.addPage();
  let y = MARGIN;
  y = writeText(doc, "Welcome", y, { size: 26, bold: true, color: 20, gap: 14 });
  if (content.transformation_promise) {
    y = writeText(doc, "Your Transformation", y, { size: 13, bold: true, color: 80, gap: 4 });
    y = writeText(doc, content.transformation_promise, y, { size: 12, gap: 18 });
  }
  if (content.who_its_for) {
    y = writeText(doc, "Who This Workbook Is For", y, { size: 13, bold: true, color: 80, gap: 4 });
    y = writeText(doc, content.who_its_for, y, { size: 12, gap: 18 });
  }
  y = writeText(doc, "How To Use This Workbook", y, { size: 13, bold: true, color: 80, gap: 4 });
  y = writeText(
    doc,
    "Work through one section at a time. Read the prompts, then write your responses on the ruled lines provided. There are no wrong answers — the goal is reflection and action. Set aside 20–30 minutes for each section.",
    y,
    { size: 12, gap: 8 },
  );
}

function renderTOC(doc: jsPDF, sections: WorkbookSection[]) {
  doc.addPage();
  let y = MARGIN;
  y = writeText(doc, "Contents", y, { size: 26, bold: true, color: 20, gap: 18 });
  sections.forEach((s, i) => {
    y = ensureSpace(doc, y, 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30);
    const num = s.number ?? i + 1;
    doc.text(`${num}.`, MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(s.title || "Section", MARGIN + 28, y);
    y += 22;
  });
}

function renderSection(doc: jsPDF, s: WorkbookSection, idx: number) {
  doc.addPage();
  let y = MARGIN;
  const num = s.number ?? idx + 1;
  // Section number badge
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(120);
  doc.text(`SECTION ${num}`, MARGIN, y);
  y += 22;
  y = writeText(doc, s.title || "Section", y, { size: 22, bold: true, color: 20, gap: 12 });
  if (s.description) {
    y = writeText(doc, s.description, y, { size: 12, color: 60, gap: 14 });
  }

  if (s.exercises && s.exercises.length) {
    y = writeText(doc, "Exercises", y, { size: 13, bold: true, color: 80, gap: 8 });
    s.exercises.forEach((ex, i) => {
      y = ensureSpace(doc, y, 60);
      y = writeText(doc, `${i + 1}. ${ex}`, y, { size: 12, gap: 8 });
      y = drawRuledLines(doc, y, 6);
    });
  }

  if (s.outcome) {
    y = drawCalloutBox(doc, y, "After this section, you can:", normalizeOutcome(s.outcome));
  }
}

function renderActionPlan(doc: jsPDF, content: WorkbookContent) {
  doc.addPage();
  let y = MARGIN;
  y = writeText(doc, "Your Action Plan", y, { size: 26, bold: true, color: 20, gap: 14 });

  if (content.what_youll_get && content.what_youll_get.length) {
    y = writeText(doc, "What You'll Walk Away With", y, { size: 13, bold: true, color: 80, gap: 6 });
    for (const item of content.what_youll_get) {
      y = writeText(doc, `•  ${item}`, y, { size: 12, gap: 4 });
    }
    y += 12;
  }

  y = writeText(doc, "30-Day Commitment Grid", y, { size: 13, bold: true, color: 80, gap: 6 });
  y = writeText(doc, "Tick a box for each day you take action on what you learned.", y, { size: 11, color: 90, gap: 12 });

  // 5 cols x 6 rows = 30 cells
  const cols = 5;
  const rows = 6;
  const cellSize = (MAX_W - (cols - 1) * 8) / cols;
  y = ensureSpace(doc, y, rows * (cellSize + 8) + 10);
  doc.setDrawColor(180);
  doc.setLineWidth(0.8);
  let dayNum = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = MARGIN + c * (cellSize + 8);
      const cy = y + r * (cellSize + 8);
      doc.roundedRect(x, cy, cellSize, cellSize, 4, 4, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Day ${dayNum}`, x + 6, cy + 14);
      dayNum++;
    }
  }
  doc.setDrawColor(0);
  doc.setTextColor(0);
}

function renderBackCover(doc: jsPDF, bookTitle: string, authorName?: string) {
  doc.addPage();
  // Top band
  doc.setFillColor(20, 30, 60);
  doc.rect(0, 0, PAGE.width, 100, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Keep going.", MARGIN, 60);

  doc.setTextColor(30);
  let y = 180;
  y = writeText(doc, "Thank you for completing this workbook.", y, { size: 16, bold: true, color: 20, gap: 14 });
  y = writeText(
    doc,
    `If this workbook helped you, the next step is to read or revisit "${bookTitle}" — that's where the full framework lives. Share your wins with ${authorName || "the author"} on social — your story may inspire the next reader.`,
    y,
    { size: 12, gap: 20 },
  );

  // Bottom band
  doc.setFillColor(20, 30, 60);
  doc.rect(0, PAGE.height - 90, PAGE.width, 90, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Powered by Authors Bureau", MARGIN, PAGE.height - 50);
  doc.setFontSize(9);
  doc.text("authorsbureau.com", MARGIN, PAGE.height - 32);
  doc.setTextColor(0);
}

export function downloadWorkbookPdf({ content, bookTitle, authorName }: WorkbookPdfOptions): void {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const sections = Array.isArray(content.sections) ? content.sections : [];

  renderCover(doc, content, bookTitle, authorName);
  renderWelcomePage(doc, content);
  if (sections.length) renderTOC(doc, sections);
  sections.forEach((s, i) => renderSection(doc, s, i));
  renderActionPlan(doc, content);
  renderBackCover(doc, bookTitle, authorName);

  // Add footers (skip cover page and back cover, both have their own brand bands)
  const total = doc.getNumberOfPages();
  const label = `${content.workbook_title || "Workbook"} — ${authorName || ""}`.trim();
  for (let p = 2; p < total; p++) {
    doc.setPage(p);
    addFooter(doc, p, total, label);
  }

  const filename = `${safeFilename(bookTitle)}-${safeFilename(content.workbook_title || "Workbook")}.pdf`;
  doc.save(filename);
}
