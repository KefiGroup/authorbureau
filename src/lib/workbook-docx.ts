import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  BorderStyle,
  ShadingType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Footer,
  PageNumber,
  LevelFormat,
} from "docx";
import { normalizeOutcome } from "./workbook-pdf";

/**
 * Workbook DOCX renderer.
 *
 * Mirrors the print PDF (cover, welcome, TOC, numbered sections with ruled
 * response lines, action plan, back cover) so authors can edit in Word and
 * re-upload the result. A hidden marker section ("ABBY-WORKBOOK-DATA") is
 * appended so we can round-trip structured edits back into content_json.
 */

interface WorkbookSection {
  number?: number;
  title?: string;
  description?: string;
  exercises?: string[];
  outcome?: string;
}

export interface ToolkitItem {
  name: string;
  type?: "canvas" | "planner" | "tracker" | "playbook" | "story" | "vision" | "worksheet";
  purpose?: string;
  linked_section?: number;
}

export interface WorkbookContent {
  workbook_title?: string;
  workbook_subtitle?: string;
  tagline?: string;
  transformation_promise?: string;
  who_its_for?: string;
  what_youll_get?: Array<string | ToolkitItem>;
  sections?: WorkbookSection[];
  [key: string]: unknown;
}

function inferToolkitType(name: string): NonNullable<ToolkitItem["type"]> {
  const n = name.toLowerCase();
  if (/(canvas|map|matrix)/.test(n)) return "canvas";
  if (/(planner|90[- ]?day|roadmap|calendar|schedule)/.test(n)) return "planner";
  if (/(tracker|dashboard|metric|log)/.test(n)) return "tracker";
  if (/(playbook|protocol|sop|response)/.test(n)) return "playbook";
  if (/(story|narrative|outline|script)/.test(n)) return "story";
  if (/(vision|futurecast|future|north[- ]?star|12[- ]?month)/.test(n)) return "vision";
  return "worksheet";
}

function normalizeToolkit(items: Array<string | ToolkitItem> | undefined): ToolkitItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((it) => {
      if (typeof it === "string") return { name: it, type: inferToolkitType(it) };
      if (it && typeof it === "object" && it.name) return { ...it, type: it.type || inferToolkitType(it.name) };
      return null;
    })
    .filter(Boolean) as ToolkitItem[];
}

export interface WorkbookDocxOptions {
  content: WorkbookContent;
  bookTitle: string;
  authorName?: string;
}

const NAVY = "141E3C";
const MUTED = "6B7280";

function safeFilename(name: string): string {
  return (name || "Workbook")
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80) || "Workbook";
}

function p(
  text: string,
  opts: { bold?: boolean; size?: number; color?: string; italic?: boolean; align?: typeof AlignmentType[keyof typeof AlignmentType]; spacingAfter?: number; spacingBefore?: number } = {},
): Paragraph {
  return new Paragraph({
    alignment: opts.align,
    spacing: { before: opts.spacingBefore ?? 0, after: opts.spacingAfter ?? 120 },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italic,
        size: opts.size ?? 22, // 11pt
        color: opts.color,
        font: "Helvetica",
      }),
    ],
  });
}

function heading(text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel], color = NAVY): Paragraph {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 180 },
    children: [new TextRun({ text, bold: true, color, font: "Helvetica" })],
  });
}

function ruledLine(): Paragraph {
  return new Paragraph({
    spacing: { before: 0, after: 280 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "C8C8C8", space: 1 },
    },
    children: [new TextRun({ text: "" })],
  });
}

function calloutBox(label: string, body: string): Table {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: "F5F7FC", type: ShadingType.CLEAR, color: "auto" },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "D2D7E1" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "D2D7E1" },
              left: { style: BorderStyle.SINGLE, size: 4, color: "D2D7E1" },
              right: { style: BorderStyle.SINGLE, size: 4, color: "D2D7E1" },
            },
            margins: { top: 160, bottom: 160, left: 200, right: 200 },
            children: [
              p(label, { bold: true, size: 20, color: MUTED, spacingAfter: 60 }),
              p(body, { size: 22 }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ---- Toolkit templates (DOCX) -----------------------------------------------

function gridTable(rows: string[][], headerRow?: string[]): Table {
  const colCount = (headerRow || rows[0]).length;
  const colW = Math.floor(9360 / colCount);
  const cellBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: "B4B4B4" },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: "B4B4B4" },
    left: { style: BorderStyle.SINGLE, size: 4, color: "B4B4B4" },
    right: { style: BorderStyle.SINGLE, size: 4, color: "B4B4B4" },
  };
  const trs: TableRow[] = [];
  if (headerRow) {
    trs.push(
      new TableRow({
        children: headerRow.map((h) =>
          new TableCell({
            width: { size: colW, type: WidthType.DXA },
            shading: { fill: "F5F7FC", type: ShadingType.CLEAR, color: "auto" },
            borders: cellBorders,
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            children: [p(h, { bold: true, size: 20, color: "505050" })],
          }),
        ),
      }),
    );
  }
  for (const row of rows) {
    trs.push(
      new TableRow({
        children: row.map((cellText) =>
          new TableCell({
            width: { size: colW, type: WidthType.DXA },
            borders: cellBorders,
            margins: { top: 200, bottom: 200, left: 120, right: 120 },
            children: [p(cellText, { size: 20, color: "606060" })],
          }),
        ),
      }),
    );
  }
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: Array(colCount).fill(colW), rows: trs });
}

function renderToolkitTemplate(item: ToolkitItem): (Paragraph | Table)[] {
  const t = item.type || "worksheet";
  const out: (Paragraph | Table)[] = [];
  if (t === "canvas") {
    out.push(gridTable([["Where I am now", "Where I want to be"], ["What's in my way", "First moves this week"]]));
  } else if (t === "planner") {
    const rows: string[][] = [];
    let w = 1;
    for (let r = 0; r < 4; r++) {
      const row: string[] = [];
      for (let c = 0; c < 3; c++) row.push(`Week ${w++}\nMilestone:`);
      rows.push(row);
    }
    out.push(gridTable(rows));
  } else if (t === "tracker") {
    const headers = ["Track", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const metrics = ["Metric 1", "Metric 2", "Metric 3", "Metric 4", "Reflection / win"];
    const rows = metrics.map((m) => [m, "", "", "", "", "", "", ""]);
    out.push(gridTable(rows, headers));
  } else if (t === "playbook") {
    const headers = ["Trigger", "Response", "Recovery"];
    const rows = Array.from({ length: 5 }, () => ["", "", ""]);
    out.push(gridTable(rows, headers));
  } else if (t === "story") {
    const parts: [string, string][] = [
      ["HOOK", "Open with a moment that pulls the reader in."],
      ["HARDSHIP", "What was hard, broken, or at stake?"],
      ["HELPER", "Who or what changed your approach?"],
      ["HINGE", "The decision that turned things around."],
      ["HOPE", "What's possible now — for you and the reader."],
    ];
    for (const [label, hint] of parts) {
      out.push(p(label, { bold: true, size: 22, color: "505050", spacingBefore: 120, spacingAfter: 40 }));
      out.push(p(hint, { italic: true, size: 20, color: "808080", spacingAfter: 80 }));
      for (let i = 0; i < 3; i++) out.push(ruledLine());
    }
  } else if (t === "vision") {
    out.push(
      gridTable([
        ["Q1 — Months 1–3\n\n\n\n", "Q2 — Months 4–6\n\n\n\n"],
        ["Q3 — Months 7–9\n\n\n\n", "Q4 — Months 10–12\n\n\n\n"],
      ]),
    );
    out.push(p("Evidence I'll create along the way", { bold: true, size: 22, color: "505050", spacingBefore: 200, spacingAfter: 80 }));
    for (let i = 0; i < 4; i++) out.push(ruledLine());
  } else {
    for (let i = 0; i < 12; i++) out.push(ruledLine());
  }
  return out;
}

/**
 * Build the workbook DOCX as a Blob without triggering a browser download.
 * Used by the publish flow (Sprint 55) to upload the file to library-assets
 * storage before stamping the uniform `library_asset` record.
 */
export async function buildWorkbookDocxBlob({ content, bookTitle, authorName }: WorkbookDocxOptions): Promise<Blob> {
  const sections = Array.isArray(content.sections) ? content.sections : [];
  const children: (Paragraph | Table)[] = [];

  // ---- Cover ----
  children.push(p("A COMPANION WORKBOOK", { bold: true, size: 22, color: NAVY, spacingAfter: 80 }));
  children.push(p(`Based on "${bookTitle}"`, { size: 20, color: MUTED, spacingAfter: 480 }));
  children.push(
    new Paragraph({
      spacing: { before: 0, after: 240 },
      children: [new TextRun({ text: content.workbook_title || "Workbook", bold: true, size: 56, color: NAVY, font: "Helvetica" })],
    }),
  );
  if (content.workbook_subtitle) {
    children.push(p(content.workbook_subtitle, { size: 28, color: "505050", spacingAfter: 200 }));
  }
  if (content.tagline) {
    children.push(p(`"${content.tagline}"`, { italic: true, size: 24, color: "707070", spacingAfter: 480 }));
  }
  children.push(p(`By ${authorName || "the Author"}`, { bold: true, size: 24, color: NAVY, spacingAfter: 80 }));
  children.push(p("Powered by Authors Bureau", { size: 18, color: MUTED }));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ---- Welcome ----
  children.push(heading("Welcome", HeadingLevel.HEADING_1));
  if (content.transformation_promise) {
    children.push(p("Your Transformation", { bold: true, size: 24, color: "505050", spacingAfter: 60 }));
    children.push(p(content.transformation_promise, { spacingAfter: 240 }));
  }
  if (content.who_its_for) {
    children.push(p("Who This Workbook Is For", { bold: true, size: 24, color: "505050", spacingAfter: 60 }));
    children.push(p(content.who_its_for, { spacingAfter: 240 }));
  }
  children.push(p("How To Use This Workbook", { bold: true, size: 24, color: "505050", spacingAfter: 60 }));
  children.push(
    p(
      "Work through one section at a time. Read the prompts, then write your responses on the ruled lines provided. There are no wrong answers — the goal is reflection and action. Set aside 20–30 minutes for each section.",
      { spacingAfter: 200 },
    ),
  );
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ---- TOC ----
  if (sections.length) {
    children.push(heading("Contents", HeadingLevel.HEADING_1));
    sections.forEach((s, i) => {
      const num = s.number ?? i + 1;
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: `${num}.  `, bold: true, size: 24, font: "Helvetica" }),
            new TextRun({ text: s.title || "Section", size: 24, font: "Helvetica" }),
          ],
        }),
      );
    });
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // ---- Sections ----
  sections.forEach((s, i) => {
    const num = s.number ?? i + 1;
    children.push(p(`SECTION ${num}`, { bold: true, size: 20, color: MUTED, spacingAfter: 80 }));
    children.push(heading(s.title || "Section", HeadingLevel.HEADING_1));
    if (s.description) children.push(p(s.description, { color: "404040", spacingAfter: 240 }));

    if (s.exercises && s.exercises.length) {
      children.push(p("Exercises", { bold: true, size: 24, color: "505050", spacingAfter: 120 }));
      s.exercises.forEach((ex, j) => {
        children.push(
          new Paragraph({
            spacing: { before: 120, after: 160 },
            children: [
              new TextRun({ text: `${j + 1}. `, bold: true, size: 22, font: "Helvetica" }),
              new TextRun({ text: ex, size: 22, font: "Helvetica" }),
            ],
          }),
        );
        // 6 ruled response lines
        for (let k = 0; k < 6; k++) children.push(ruledLine());
      });
    }

    if (s.outcome) {
      children.push(calloutBox("After this section, you can:", normalizeOutcome(s.outcome)));
    }
    children.push(new Paragraph({ children: [new PageBreak()] }));
  });

  // ---- Toolkit (deliverables pack) ----
  const toolkit = normalizeToolkit(content.what_youll_get);
  if (toolkit.length) {
    children.push(heading("Your Toolkit", HeadingLevel.HEADING_1));
    children.push(
      p(
        "These templates are yours to keep. Each one corresponds to a section in this workbook — fill them in by hand or on screen, then revisit them whenever you need to reset.",
        { color: "404040", spacingAfter: 200 },
      ),
    );
    for (const it of toolkit) {
      children.push(
        new Paragraph({
          numbering: { reference: "workbook-bullets", level: 0 },
          spacing: { after: 80 },
          children: [
            new TextRun({ text: it.name, bold: true, size: 22, font: "Helvetica" }),
            ...(it.purpose ? [new TextRun({ text: ` — ${it.purpose}`, size: 22, color: "606060", font: "Helvetica" })] : []),
          ],
        }),
      );
    }
    children.push(new Paragraph({ children: [new PageBreak()] }));

    for (const it of toolkit) {
      children.push(p("TOOLKIT", { bold: true, size: 20, color: MUTED, spacingAfter: 80 }));
      children.push(heading(it.name, HeadingLevel.HEADING_1));
      if (it.purpose) children.push(p(it.purpose, { color: "404040", spacingAfter: 200 }));
      children.push(...renderToolkitTemplate(it));
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  // ---- Action plan ----
  children.push(heading("Your Action Plan", HeadingLevel.HEADING_1));
  if (toolkit.length) {
    children.push(p("What You'll Walk Away With", { bold: true, size: 24, color: "505050", spacingAfter: 80 }));
    for (const item of toolkit) {
      children.push(
        new Paragraph({
          numbering: { reference: "workbook-bullets", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: item.name, size: 22, font: "Helvetica" })],
        }),
      );
    }
  }
  children.push(p("30-Day Commitment Grid", { bold: true, size: 24, color: "505050", spacingBefore: 240, spacingAfter: 80 }));
  children.push(p("Tick a box for each day you take action on what you learned.", { size: 20, color: "606060", spacingAfter: 200 }));

  // 5 cols x 6 rows = 30 day cells
  const cellWidth = Math.floor(9360 / 5);
  const gridRows: TableRow[] = [];
  let dayNum = 1;
  for (let r = 0; r < 6; r++) {
    const rowCells: TableCell[] = [];
    for (let c = 0; c < 5; c++) {
      rowCells.push(
        new TableCell({
          width: { size: cellWidth, type: WidthType.DXA },
          margins: { top: 160, bottom: 160, left: 120, right: 120 },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: "B4B4B4" },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: "B4B4B4" },
            left: { style: BorderStyle.SINGLE, size: 4, color: "B4B4B4" },
            right: { style: BorderStyle.SINGLE, size: 4, color: "B4B4B4" },
          },
          children: [
            new Paragraph({ children: [new TextRun({ text: `☐ Day ${dayNum}`, bold: true, size: 20, color: "606060", font: "Helvetica" })] }),
          ],
        }),
      );
      dayNum++;
    }
    gridRows.push(new TableRow({ children: rowCells }));
  }
  children.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [cellWidth, cellWidth, cellWidth, cellWidth, cellWidth],
      rows: gridRows,
    }),
  );

  // ---- Back cover ----
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(heading("Keep going.", HeadingLevel.HEADING_1));
  children.push(p("Thank you for completing this workbook.", { bold: true, size: 28, color: NAVY, spacingAfter: 200 }));
  children.push(
    p(
      `If this workbook helped you, the next step is to read or revisit "${bookTitle}" — that's where the full framework lives. Share your wins with ${authorName || "the author"} on social — your story may inspire the next reader.`,
      { spacingAfter: 320 },
    ),
  );
  children.push(p("Powered by Authors Bureau", { size: 20, color: MUTED, spacingAfter: 40 }));
  children.push(p("authorsbureau.com", { size: 18, color: MUTED }));

  // ---- Hidden round-trip marker (so re-upload can patch content_json) ----
  // Tiny, near-invisible footer text only — never displayed prominently.
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(p("— Source data (do not edit) —", { size: 14, color: "BBBBBB", italic: true, spacingAfter: 60 }));
  const encoded = encodeWorkbookData(content);
  // Split the encoded payload into chunks so Word doesn't choke on a single long run.
  const chunkSize = 90;
  for (let i = 0; i < encoded.length; i += chunkSize) {
    children.push(
      new Paragraph({
        spacing: { after: 0 },
        children: [new TextRun({ text: encoded.slice(i, i + chunkSize), size: 12, color: "CCCCCC", font: "Courier New" })],
      }),
    );
  }

  const doc = new Document({
    creator: authorName || "Authors Bureau",
    title: content.workbook_title || "Workbook",
    styles: {
      default: { document: { run: { font: "Helvetica", size: 22 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 44, bold: true, color: NAVY, font: "Helvetica" },
          paragraph: { spacing: { before: 240, after: 180 }, outlineLevel: 0 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "workbook-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `${content.workbook_title || "Workbook"} — `, size: 18, color: MUTED, font: "Helvetica" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: MUTED, font: "Helvetica" }),
                  new TextRun({ text: " / ", size: 18, color: MUTED, font: "Helvetica" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: MUTED, font: "Helvetica" }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export async function downloadWorkbookDocx(opts: WorkbookDocxOptions): Promise<void> {
  const blob = await buildWorkbookDocxBlob(opts);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFilename(opts.bookTitle)}-${safeFilename(opts.content.workbook_title || "Workbook")}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- Round-trip encoding ----------------------------------------------------

const MARKER_PREFIX = "ABBY-WORKBOOK-DATA::";

function encodeWorkbookData(content: WorkbookContent): string {
  // base64-encoded JSON of the editable fields only (keeps file small + private fields intact).
  const editable = {
    workbook_title: content.workbook_title,
    workbook_subtitle: content.workbook_subtitle,
    tagline: content.tagline,
    transformation_promise: content.transformation_promise,
    who_its_for: content.who_its_for,
    what_youll_get: content.what_youll_get,
    sections: content.sections,
  };
  const json = JSON.stringify(editable);
  // Browser-safe base64 of UTF-8.
  const utf8 = unescape(encodeURIComponent(json));
  return MARKER_PREFIX + btoa(utf8);
}

export function tryDecodeWorkbookData(text: string): Partial<WorkbookContent> | null {
  const idx = text.indexOf(MARKER_PREFIX);
  if (idx === -1) return null;
  // Encoded payload may have whitespace from Word — strip non base64 chars.
  const payload = text.slice(idx + MARKER_PREFIX.length).replace(/[^A-Za-z0-9+/=]/g, "");
  if (!payload) return null;
  try {
    const utf8 = atob(payload);
    const json = decodeURIComponent(escape(utf8));
    return JSON.parse(json) as Partial<WorkbookContent>;
  } catch {
    return null;
  }
}
