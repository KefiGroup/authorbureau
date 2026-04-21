/**
 * Universal Builder Export — single source of truth for the four export formats
 * available on every BA-10…BA-18 Step 3 review screen:
 *   1. Copy to clipboard (plain text)
 *   2. Download as .txt
 *   3. Download as .docx
 *   4. Download as .pdf  (delegates to existing branded PDF exporter)
 *
 * All four formats walk the SAME `content` object via the same key-humanising
 * logic so the output is identical in structure regardless of format.
 */

import { toast } from "sonner";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import { downloadBuilderPackage } from "@/lib/builder-pdf";

const SKIP_KEYS = new Set([
  "activated",
  "course_id",
  "abby_summary",
  "_currentStep",
]);

function humanize(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function safeFilename(name: string): string {
  return (
    (name || "Export")
      .replace(/[^a-zA-Z0-9-_ ]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || "Export"
  );
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export interface ExportOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  nodeName: string;
  bookTitle: string;
  authorName?: string;
}

/* ------------------------------------------------------------------ */
/*  Generic walker — emits a sequence of "blocks" each format renders */
/* ------------------------------------------------------------------ */

type Block =
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "p"; text: string; indent?: number }
  | { kind: "kv"; key: string; value: string; indent?: number }
  | { kind: "bullet"; text: string; indent?: number }
  | { kind: "spacer" };

function walkValue(blocks: Block[], value: unknown, indent = 0): void {
  if (value === null || value === undefined || value === "") return;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    blocks.push({ kind: "p", text: String(value), indent });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, idx) => {
      if (isPlainObject(item)) {
        const titleKey = ["title", "name", "subject", "headline"].find(
          (k) => typeof item[k] === "string",
        );
        const numberish = (item as { number?: unknown }).number;
        const prefix =
          typeof numberish === "number" ? `${numberish}. ` : `${idx + 1}. `;
        const headingText = titleKey
          ? `${prefix}${item[titleKey]}`
          : prefix.trim();
        blocks.push({ kind: "h3", text: headingText });
        for (const [k, v] of Object.entries(item)) {
          if (SKIP_KEYS.has(k) || k.startsWith("_")) continue;
          if (k === "number" || (titleKey && k === titleKey)) continue;
          if (v === null || v === undefined || v === "") continue;
          if (Array.isArray(v) || isPlainObject(v)) {
            blocks.push({
              kind: "p",
              text: `${humanize(k)}:`,
              indent: indent + 1,
            });
            walkValue(blocks, v, indent + 2);
          } else {
            blocks.push({
              kind: "kv",
              key: humanize(k),
              value: String(v),
              indent: indent + 1,
            });
          }
        }
        blocks.push({ kind: "spacer" });
      } else {
        blocks.push({ kind: "bullet", text: String(item), indent });
      }
    });
    return;
  }

  if (isPlainObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (SKIP_KEYS.has(k) || k.startsWith("_")) continue;
      if (v === null || v === undefined || v === "") continue;
      if (Array.isArray(v) || isPlainObject(v)) {
        blocks.push({ kind: "p", text: `${humanize(k)}:`, indent });
        walkValue(blocks, v, indent + 1);
      } else {
        blocks.push({
          kind: "kv",
          key: humanize(k),
          value: String(v),
          indent,
        });
      }
    }
  }
}

function buildBlocks(opts: ExportOptions): Block[] {
  const { content, nodeName, bookTitle, authorName } = opts;
  const blocks: Block[] = [];
  blocks.push({ kind: "h1", text: `${nodeName} Package` });
  if (bookTitle) blocks.push({ kind: "p", text: `Based on "${bookTitle}"` });
  if (authorName) blocks.push({ kind: "p", text: `By ${authorName}` });
  blocks.push({ kind: "spacer" });

  if (content?.abby_summary && typeof content.abby_summary === "string") {
    blocks.push({ kind: "h2", text: "Overview" });
    blocks.push({ kind: "p", text: content.abby_summary });
    blocks.push({ kind: "spacer" });
  }

  if (isPlainObject(content)) {
    for (const [key, value] of Object.entries(content)) {
      if (SKIP_KEYS.has(key) || key.startsWith("_")) continue;
      if (value === null || value === undefined || value === "") continue;
      blocks.push({ kind: "h2", text: humanize(key) });
      walkValue(blocks, value);
      blocks.push({ kind: "spacer" });
    }
  }

  blocks.push({ kind: "h2", text: "How to use this package" });
  blocks.push({
    kind: "p",
    text: `Your ${nodeName.toLowerCase()} package is ready. Upload it to Teachable, Kajabi, Thinkific, or any platform of your choice to start earning revenue from your expertise.`,
  });

  return blocks;
}

/* ------------------------------------------------------------------ */
/*  Plain text                                                         */
/* ------------------------------------------------------------------ */

export function buildExportText(opts: ExportOptions): string {
  const blocks = buildBlocks(opts);
  const out: string[] = [];
  for (const b of blocks) {
    const pad = (n?: number) => "  ".repeat(n ?? 0);
    switch (b.kind) {
      case "h1":
        out.push(b.text.toUpperCase());
        out.push("=".repeat(Math.min(b.text.length, 60)));
        out.push("");
        break;
      case "h2":
        out.push("");
        out.push(b.text);
        out.push("-".repeat(Math.min(b.text.length, 60)));
        break;
      case "h3":
        out.push("");
        out.push(b.text);
        break;
      case "p":
        out.push(`${pad(b.indent)}${b.text}`);
        break;
      case "kv":
        out.push(`${pad(b.indent)}${b.key}: ${b.value}`);
        break;
      case "bullet":
        out.push(`${pad(b.indent)}• ${b.text}`);
        break;
      case "spacer":
        out.push("");
        break;
    }
  }
  return out.join("\n");
}

/* ------------------------------------------------------------------ */
/*  TXT                                                                */
/* ------------------------------------------------------------------ */

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadAsTxt(opts: ExportOptions): void {
  const text = buildExportText(opts);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const filename = `${safeFilename(opts.bookTitle || "Authors-Bureau")}-${safeFilename(opts.nodeName)}-Package.txt`;
  triggerDownload(blob, filename);
}

/* ------------------------------------------------------------------ */
/*  Clipboard                                                          */
/* ------------------------------------------------------------------ */

export async function copyToClipboard(opts: ExportOptions): Promise<void> {
  const text = buildExportText(opts);
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard", {
      description: "Paste it into Teachable, Kajabi, Notion, or any tool.",
    });
  } catch (err) {
    console.error("[builder-export] clipboard failed", err);
    toast.error("Could not copy. Try the TXT download instead.");
  }
}

/* ------------------------------------------------------------------ */
/*  DOCX                                                               */
/* ------------------------------------------------------------------ */

export async function downloadAsDocx(opts: ExportOptions): Promise<void> {
  const blocks = buildBlocks(opts);

  const paragraphs: Paragraph[] = blocks.map((b) => {
    const pad = (n?: number) => "    ".repeat(n ?? 0);
    switch (b.kind) {
      case "h1":
        return new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.LEFT,
          children: [new TextRun({ text: b.text, bold: true })],
        });
      case "h2":
        return new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: b.text, bold: true })],
        });
      case "h3":
        return new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: b.text, bold: true })],
        });
      case "p":
        return new Paragraph({
          children: [new TextRun({ text: `${pad(b.indent)}${b.text}` })],
        });
      case "kv":
        return new Paragraph({
          children: [
            new TextRun({ text: `${pad(b.indent)}${b.key}: `, bold: true }),
            new TextRun({ text: b.value }),
          ],
        });
      case "bullet":
        return new Paragraph({
          children: [new TextRun({ text: `${pad(b.indent)}• ${b.text}` })],
        });
      case "spacer":
        return new Paragraph({ children: [new TextRun({ text: "" })] });
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${safeFilename(opts.bookTitle || "Authors-Bureau")}-${safeFilename(opts.nodeName)}-Package.docx`;
  triggerDownload(blob, filename);
}

/* ------------------------------------------------------------------ */
/*  PDF (delegates to existing branded exporter)                       */
/* ------------------------------------------------------------------ */

export function downloadAsPdf(opts: ExportOptions): void {
  downloadBuilderPackage(opts);
}
