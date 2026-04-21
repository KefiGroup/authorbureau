import jsPDF from "jspdf";

/**
 * Universal Builder PDF exporter.
 *
 * Walks an arbitrary `content` object (the JSON returned by any BA-/YR-
 * generator edge function) and renders it as a clean, sectioned PDF that
 * the author can upload to Teachable / Kajabi / Thinkific / etc.
 *
 * Keys are humanised into headings. Arrays render as bullet lists (or
 * numbered lists when items are objects with a `number` property).
 * Internal/UI-only keys (prefixed with `_`, plus a small denylist) are
 * skipped.
 */

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
  return (name || "Export")
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80) || "Export";
}

interface RenderCtx {
  doc: jsPDF;
  y: number;
  pageHeight: number;
  margin: number;
  maxWidth: number;
}

function ensureSpace(ctx: RenderCtx, needed: number) {
  if (ctx.y + needed > ctx.pageHeight - ctx.margin) {
    ctx.doc.addPage();
    ctx.y = ctx.margin;
  }
}

function drawText(ctx: RenderCtx, text: string, opts: { size?: number; bold?: boolean; gap?: number; indent?: number } = {}) {
  const size = opts.size ?? 11;
  const indent = opts.indent ?? 0;
  ctx.doc.setFont("helvetica", opts.bold ? "bold" : "normal");
  ctx.doc.setFontSize(size);
  const lines = ctx.doc.splitTextToSize(text, ctx.maxWidth - indent);
  for (const line of lines) {
    ensureSpace(ctx, size * 0.5);
    ctx.doc.text(line, ctx.margin + indent, ctx.y);
    ctx.y += size * 0.5;
  }
  ctx.y += opts.gap ?? 2;
}

function drawHeading(ctx: RenderCtx, text: string, level: 1 | 2 | 3) {
  const sizes = { 1: 20, 2: 14, 3: 12 };
  const gaps = { 1: 6, 2: 4, 3: 3 };
  ensureSpace(ctx, sizes[level] + 4);
  if (level === 1) ctx.y += 2;
  else if (level === 2) ctx.y += 4;
  drawText(ctx, text, { size: sizes[level], bold: true, gap: gaps[level] });
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function renderValue(ctx: RenderCtx, value: unknown, indent = 0) {
  if (value === null || value === undefined || value === "") return;

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    drawText(ctx, String(value), { indent });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, idx) => {
      if (isPlainObject(item)) {
        const titleKey = ["title", "name", "subject", "headline"].find((k) => typeof item[k] === "string");
        const numberish = (item as { number?: unknown }).number;
        const prefix = typeof numberish === "number" ? `${numberish}. ` : `${idx + 1}. `;
        const headingText = titleKey ? `${prefix}${item[titleKey]}` : prefix.trim();
        drawText(ctx, headingText, { bold: true, indent, gap: 2 });
        for (const [k, v] of Object.entries(item)) {
          if (SKIP_KEYS.has(k) || k.startsWith("_")) continue;
          if (k === "number" || (titleKey && k === titleKey)) continue;
          if (v === null || v === undefined || v === "") continue;
          if (Array.isArray(v) || isPlainObject(v)) {
            drawText(ctx, `${humanize(k)}:`, { bold: true, indent: indent + 6, gap: 1 });
            renderValue(ctx, v, indent + 12);
          } else {
            drawText(ctx, `${humanize(k)}: ${String(v)}`, { indent: indent + 6 });
          }
        }
        ctx.y += 2;
      } else if (isPlainObject(item) === false) {
        drawText(ctx, `• ${String(item)}`, { indent });
      }
    });
    return;
  }

  if (isPlainObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (SKIP_KEYS.has(k) || k.startsWith("_")) continue;
      if (v === null || v === undefined || v === "") continue;
      if (Array.isArray(v) || isPlainObject(v)) {
        drawText(ctx, `${humanize(k)}:`, { bold: true, indent, gap: 1 });
        renderValue(ctx, v, indent + 6);
      } else {
        drawText(ctx, `${humanize(k)}: ${String(v)}`, { indent });
      }
    }
  }
}

export interface DownloadBuilderPackageOptions {
  /** The full `content` JSON returned by the generator */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  /** Display name for the node — appears in the title and subtitle */
  nodeName: string;
  /** Book title — used in the filename and intro line */
  bookTitle: string;
  /** Pen name, optional — appears in the byline */
  authorName?: string;
}

/**
 * Generates the PDF and triggers a browser download.
 * Filename format: `{BookTitle}-{NodeName-Slug}-Package.pdf`.
 */
export function downloadBuilderPackage({
  content,
  nodeName,
  bookTitle,
  authorName,
}: DownloadBuilderPackageOptions): void {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;

  const ctx: RenderCtx = {
    doc,
    y: margin,
    pageHeight,
    margin,
    maxWidth: pageWidth - margin * 2,
  };

  // Cover header
  drawHeading(ctx, `${nodeName} Package`, 1);
  if (bookTitle) drawText(ctx, `Based on “${bookTitle}”`, { size: 12, gap: 2 });
  if (authorName) drawText(ctx, `By ${authorName}`, { size: 11, gap: 6 });

  // Abby intro summary, if present
  if (content?.abby_summary && typeof content.abby_summary === "string") {
    drawHeading(ctx, "Overview", 2);
    drawText(ctx, content.abby_summary, { gap: 6 });
  }

  // Render each top-level key as its own section heading
  if (isPlainObject(content)) {
    for (const [key, value] of Object.entries(content)) {
      if (SKIP_KEYS.has(key) || key.startsWith("_")) continue;
      if (value === null || value === undefined || value === "") continue;

      drawHeading(ctx, humanize(key), 2);
      renderValue(ctx, value);
      ctx.y += 4;
    }
  }

  // Footer guidance
  ctx.doc.addPage();
  ctx.y = margin;
  drawHeading(ctx, "How to use this package", 2);
  drawText(
    ctx,
    `Your ${nodeName.toLowerCase()} package is ready. Upload it to Teachable, Kajabi, Thinkific, or any platform of your choice to start earning revenue from your expertise.`,
    { gap: 4 },
  );

  const filename = `${safeFilename(bookTitle || "Authors-Bureau")}-${safeFilename(nodeName)}-Package.pdf`;
  doc.save(filename);
}
