import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore - npm specifier
import PptxGenJS from "https://esm.sh/pptxgenjs@3.12.0";
// @ts-ignore - npm specifier (PNG QR generator that works in Deno)
import { qrPng } from "https://esm.sh/qr-image@3.2.0?bundle";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ------------------------------------------------------------------ */
/*  Palette + typography (Midnight Executive)                          */
/* ------------------------------------------------------------------ */
const C = {
  navy: "1E2761",
  ice: "CADCFC",
  coral: "F96167",
  ink: "1A1A2E",
  paper: "FFFFFF",
  muted: "5C6685",
};
const FONT_HEAD = "Calibri";
const FONT_BODY = "Calibri";

/* ------------------------------------------------------------------ */
/*  Backwards-compat normaliser                                        */
/* ------------------------------------------------------------------ */
type Slide = {
  n: number;
  layout?: string;
  eyebrow?: string;
  headline?: string;
  subhead?: string;
  bullets?: string[];
  steps?: string[];
  stat?: { value?: string; label?: string };
  columns?: { left?: { h?: string; body?: string }; right?: { h?: string; body?: string } };
  chips?: { label?: string; name?: string }[];
  case?: { challenge?: string; move?: string; result?: string };
  speaker_notes?: string;
  // legacy
  title?: string;
  body?: string;
};

function normaliseSlide(s: any, idx: number): Slide {
  if (s?.layout) return { ...s, n: s.n ?? idx + 1 };
  // Legacy {n, title, body, speaker_notes} → render as section
  return {
    n: s?.n ?? idx + 1,
    layout: idx === 0 ? "title" : "section",
    eyebrow: idx === 0 ? "WORKSHOP" : "",
    headline: s?.title ?? "",
    subhead: s?.body ?? "",
    speaker_notes: s?.speaker_notes ?? "",
  };
}

/* ------------------------------------------------------------------ */
/*  QR generator → returns base64 PNG data URI or null                 */
/* ------------------------------------------------------------------ */
async function makeQrDataUri(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    // qr-image returns a Node-style stream; we ask for buffer instead via the PNG sync helper
    const buf = qrPng(url, { type: "png", margin: 2, size: 12 }) as Uint8Array;
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    return `data:image/png;base64,${b64}`;
  } catch (e) {
    console.warn("[export-bp09-slides] QR generation failed:", e);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Per-layout renderers                                               */
/*  Slide is 13.33 x 7.5 inches (LAYOUT_WIDE)                          */
/* ------------------------------------------------------------------ */

type RenderCtx = {
  slide: any;
  s: Slide;
  total: number;
  penName: string;
  bookTitle: string;
  qrDataUri: string | null;
};

const W = 13.33;
const H = 7.5;

function addFooter(ctx: RenderCtx, dark = false) {
  const { slide, s, total, penName } = ctx;
  const color = dark ? C.ice : C.muted;
  const num = String(s.n).padStart(2, "0");
  const totalStr = String(total).padStart(2, "0");
  slide.addText(`${num} / ${totalStr}   ·   ${penName}`, {
    x: 0.6, y: 7.05, w: 8, h: 0.3,
    fontFace: FONT_BODY, fontSize: 9, color, italic: true,
  });
}

function addAccentBar(slide: any, x: number, y: number, h: number) {
  slide.addShape("rect", { x, y, w: 0.08, h, fill: { color: C.coral }, line: { color: C.coral } });
}

function addEyebrow(slide: any, text: string, x: number, y: number, color = C.coral) {
  if (!text) return;
  slide.addText(text.toUpperCase(), {
    x, y, w: 8, h: 0.3,
    fontFace: FONT_HEAD, fontSize: 11, bold: true, color, charSpacing: 4,
  });
}

function renderTitle(ctx: RenderCtx) {
  const { slide, s } = ctx;
  slide.background = { color: C.navy };
  // Coral accent bar ABOVE the eyebrow (does not collide with wrapping headline)
  slide.addShape("rect", { x: 0.8, y: 2.4, w: 1.2, h: 0.08, fill: { color: C.coral }, line: { color: C.coral } });
  if (s.eyebrow) {
    slide.addText(s.eyebrow.toUpperCase(), {
      x: 0.8, y: 2.6, w: 11, h: 0.4,
      fontFace: FONT_HEAD, fontSize: 13, bold: true, color: C.ice, charSpacing: 6,
    });
  }
  slide.addText(s.headline || ctx.bookTitle, {
    x: 0.8, y: 3.1, w: 11.7, h: 2.2,
    fontFace: FONT_HEAD, fontSize: 40, bold: true, color: C.paper, valign: "top",
  });
  if (s.subhead) {
    slide.addText(s.subhead, {
      x: 0.8, y: 5.4, w: 11.5, h: 0.6,
      fontFace: FONT_BODY, fontSize: 20, color: C.ice,
    });
  }
  slide.addText(`${ctx.penName}   ·   ${ctx.bookTitle}`, {
    x: 0.8, y: 6.7, w: 11, h: 0.4,
    fontFace: FONT_BODY, fontSize: 11, color: C.ice, italic: true,
  });
}

function renderStat(ctx: RenderCtx) {
  const { slide, s } = ctx;
  slide.background = { color: C.paper };
  addAccentBar(slide, 0.6, 1.2, 5.0);
  addEyebrow(slide, s.eyebrow || "", 0.85, 1.2);
  // Big stat (left)
  slide.addText(s.stat?.value || "—", {
    x: 0.85, y: 1.8, w: 6.0, h: 2.6,
    fontFace: FONT_HEAD, fontSize: 110, bold: true, color: C.coral, valign: "middle",
  });
  slide.addText(s.stat?.label || "", {
    x: 0.85, y: 4.5, w: 6.0, h: 1.2,
    fontFace: FONT_BODY, fontSize: 16, color: C.navy, bold: true,
  });
  // Right column — headline + subhead
  slide.addText(s.headline || "", {
    x: 7.4, y: 2.0, w: 5.4, h: 2.2,
    fontFace: FONT_HEAD, fontSize: 26, bold: true, color: C.ink, valign: "top",
  });
  if (s.subhead) {
    slide.addText(s.subhead, {
      x: 7.4, y: 4.3, w: 5.4, h: 1.5,
      fontFace: FONT_BODY, fontSize: 16, color: C.muted,
    });
  }
  addFooter(ctx);
}

function renderTwoColumn(ctx: RenderCtx) {
  const { slide, s } = ctx;
  slide.background = { color: C.paper };
  addAccentBar(slide, 0.6, 0.8, 0.6);
  addEyebrow(slide, s.eyebrow || "", 0.85, 0.85);
  slide.addText(s.headline || "", {
    x: 0.85, y: 1.25, w: 11.6, h: 1.1,
    fontFace: FONT_HEAD, fontSize: 30, bold: true, color: C.ink,
  });
  // Left card
  slide.addShape("rect", { x: 0.6, y: 2.7, w: 6.0, h: 4.0, fill: { color: C.ice }, line: { color: C.ice } });
  slide.addShape("rect", { x: 0.6, y: 2.7, w: 6.0, h: 0.12, fill: { color: C.coral }, line: { color: C.coral } });
  slide.addText(s.columns?.left?.h || "", {
    x: 0.85, y: 2.95, w: 5.5, h: 0.5,
    fontFace: FONT_HEAD, fontSize: 18, bold: true, color: C.navy,
  });
  slide.addText(s.columns?.left?.body || "", {
    x: 0.85, y: 3.55, w: 5.5, h: 3.0,
    fontFace: FONT_BODY, fontSize: 16, color: C.ink, valign: "top",
  });
  // Right card
  slide.addShape("rect", { x: 6.85, y: 2.7, w: 6.0, h: 4.0, fill: { color: C.navy }, line: { color: C.navy } });
  slide.addShape("rect", { x: 6.85, y: 2.7, w: 6.0, h: 0.12, fill: { color: C.coral }, line: { color: C.coral } });
  slide.addText(s.columns?.right?.h || "", {
    x: 7.1, y: 2.95, w: 5.5, h: 0.5,
    fontFace: FONT_HEAD, fontSize: 18, bold: true, color: C.ice,
  });
  slide.addText(s.columns?.right?.body || "", {
    x: 7.1, y: 3.55, w: 5.5, h: 3.0,
    fontFace: FONT_BODY, fontSize: 16, color: C.paper, valign: "top",
  });
  addFooter(ctx);
}

function renderBullets(ctx: RenderCtx) {
  const { slide, s } = ctx;
  slide.background = { color: C.paper };
  addAccentBar(slide, 0.6, 0.8, 0.6);
  addEyebrow(slide, s.eyebrow || "", 0.85, 0.85);
  slide.addText(s.headline || "", {
    x: 0.85, y: 1.25, w: 11.6, h: 1.1,
    fontFace: FONT_HEAD, fontSize: 30, bold: true, color: C.ink,
  });
  const bullets = (s.bullets || []).slice(0, 4);
  const startY = 3.0;
  const rowH = 1.0;
  bullets.forEach((b, i) => {
    const y = startY + i * rowH;
    // Number circle
    slide.addShape("ellipse", { x: 0.85, y: y, w: 0.55, h: 0.55, fill: { color: C.navy }, line: { color: C.navy } });
    slide.addText(String(i + 1), {
      x: 0.85, y: y, w: 0.55, h: 0.55,
      fontFace: FONT_HEAD, fontSize: 16, bold: true, color: C.paper, align: "center", valign: "middle",
    });
    slide.addText(b, {
      x: 1.65, y: y - 0.05, w: 11.0, h: 0.7,
      fontFace: FONT_BODY, fontSize: 18, color: C.ink, valign: "middle",
    });
  });
  addFooter(ctx);
}

function renderFrameworkGrid(ctx: RenderCtx) {
  const { slide, s } = ctx;
  slide.background = { color: C.paper };
  addAccentBar(slide, 0.6, 0.8, 0.6);
  addEyebrow(slide, s.eyebrow || "THE METHOD", 0.85, 0.85);
  slide.addText(s.headline || "", {
    x: 0.85, y: 1.25, w: 11.6, h: 0.9,
    fontFace: FONT_HEAD, fontSize: 28, bold: true, color: C.ink,
  });
  if (s.subhead) {
    slide.addText(s.subhead, {
      x: 0.85, y: 2.15, w: 11.6, h: 0.5,
      fontFace: FONT_BODY, fontSize: 15, color: C.muted, italic: true,
    });
  }
  const chips = (s.chips || []).slice(0, 9);
  if (chips.length === 0) { addFooter(ctx); return; }
  const cols = chips.length <= 4 ? chips.length : Math.ceil(chips.length / 2);
  const rows = chips.length <= 4 ? 1 : 2;
  const gridX = 0.85, gridY = 3.0;
  const gridW = 11.6, gridH = 3.6;
  const gap = 0.2;
  const cellW = (gridW - gap * (cols - 1)) / cols;
  const cellH = (gridH - gap * (rows - 1)) / rows;
  chips.forEach((chip, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = gridX + c * (cellW + gap);
    const y = gridY + r * (cellH + gap);
    slide.addShape("roundRect", {
      x, y, w: cellW, h: cellH,
      fill: { color: C.navy }, line: { color: C.navy }, rectRadius: 0.1,
    });
    slide.addText(chip.label || "", {
      x, y: y + 0.15, w: cellW, h: 0.7,
      fontFace: FONT_HEAD, fontSize: 30, bold: true, color: C.coral, align: "center",
    });
    slide.addText(chip.name || "", {
      x: x + 0.15, y: y + 0.95, w: cellW - 0.3, h: cellH - 1.05,
      fontFace: FONT_BODY, fontSize: 12, color: C.ice, align: "center", valign: "top",
    });
  });
  addFooter(ctx);
}

function renderFramework(ctx: RenderCtx) {
  const { slide, s } = ctx;
  slide.background = { color: C.paper };
  // Navy left bar
  slide.addShape("rect", { x: 0, y: 0, w: 4.2, h: H, fill: { color: C.navy }, line: { color: C.navy } });
  slide.addShape("rect", { x: 4.2, y: 0, w: 0.08, h: H, fill: { color: C.coral }, line: { color: C.coral } });
  // Eyebrow + step number on left
  slide.addText(s.eyebrow || "", {
    x: 0.5, y: 1.0, w: 3.5, h: 0.5,
    fontFace: FONT_HEAD, fontSize: 12, bold: true, color: C.ice, charSpacing: 4,
  });
  slide.addText(String(s.n).padStart(2, "0"), {
    x: 0.5, y: 1.6, w: 3.5, h: 1.6,
    fontFace: FONT_HEAD, fontSize: 96, bold: true, color: C.coral,
  });
  slide.addText(`Slide ${s.n} of ${ctx.total}`, {
    x: 0.5, y: 6.7, w: 3.5, h: 0.4,
    fontFace: FONT_BODY, fontSize: 10, color: C.ice, italic: true,
  });
  // Headline + bullets on right
  slide.addText(s.headline || "", {
    x: 4.7, y: 1.0, w: 8.2, h: 1.5,
    fontFace: FONT_HEAD, fontSize: 28, bold: true, color: C.ink,
  });
  const bullets = (s.bullets || []).slice(0, 4);
  const startY = 2.8;
  const rowH = (H - startY - 0.8) / Math.max(bullets.length, 1);
  bullets.forEach((b, i) => {
    const y = startY + i * rowH;
    slide.addShape("ellipse", { x: 4.7, y: y + 0.1, w: 0.25, h: 0.25, fill: { color: C.coral }, line: { color: C.coral } });
    slide.addText(b, {
      x: 5.1, y: y, w: 7.7, h: rowH - 0.1,
      fontFace: FONT_BODY, fontSize: 16, color: C.ink, valign: "top",
    });
  });
  // Footer (right side, on white)
  slide.addText(`${ctx.penName}   ·   ${ctx.bookTitle}`, {
    x: 4.7, y: 7.05, w: 8, h: 0.3,
    fontFace: FONT_BODY, fontSize: 9, color: C.muted, italic: true,
  });
}

function renderCaseStudy(ctx: RenderCtx) {
  const { slide, s } = ctx;
  slide.background = { color: C.paper };
  addAccentBar(slide, 0.6, 0.8, 0.6);
  addEyebrow(slide, s.eyebrow || "CASE STUDY", 0.85, 0.85);
  slide.addText(s.headline || "", {
    x: 0.85, y: 1.25, w: 11.6, h: 0.9,
    fontFace: FONT_HEAD, fontSize: 26, bold: true, color: C.ink,
  });
  const rows = [
    { label: "THE CHALLENGE", text: s.case?.challenge || "", bg: C.ice, fg: C.navy, labelColor: C.coral },
    { label: "THE MOVE", text: s.case?.move || "", bg: C.paper, fg: C.ink, border: true, labelColor: C.coral },
    { label: "THE RESULT", text: s.case?.result || "", bg: C.navy, fg: C.paper, labelColor: C.coral },
  ];
  const startY = 2.5;
  const rowH = 1.35;
  rows.forEach((r, i) => {
    const y = startY + i * (rowH + 0.12);
    slide.addShape("rect", {
      x: 0.6, y, w: 12.13, h: rowH,
      fill: { color: r.bg },
      line: r.border ? { color: C.ice, width: 1 } : { color: r.bg },
    });
    if (i === 2) {
      slide.addShape("rect", { x: 0.6, y, w: 0.12, h: rowH, fill: { color: C.coral }, line: { color: C.coral } });
    }
    // Label stacked ABOVE body (not side-by-side) so wrapping body never overlaps it
    slide.addText(r.label, {
      x: 0.95, y: y + 0.12, w: 11.0, h: 0.3,
      fontFace: FONT_HEAD, fontSize: 10, bold: true, color: r.labelColor, charSpacing: 3,
    });
    slide.addText(r.text, {
      x: 0.95, y: y + 0.45, w: 11.0, h: rowH - 0.5,
      fontFace: FONT_BODY, fontSize: 14, color: r.fg, valign: "top",
    });
  });
  addFooter(ctx);
}

function renderExercise(ctx: RenderCtx) {
  const { slide, s } = ctx;
  slide.background = { color: C.paper };
  addAccentBar(slide, 0.6, 0.8, 0.6);
  addEyebrow(slide, s.eyebrow || "LIVE EXERCISE", 0.85, 0.85);
  slide.addText(s.headline || "", {
    x: 0.85, y: 1.25, w: 11.6, h: 1.1,
    fontFace: FONT_HEAD, fontSize: 30, bold: true, color: C.ink,
  });
  if (s.subhead) {
    slide.addText(s.subhead, {
      x: 0.85, y: 2.4, w: 11.6, h: 0.5,
      fontFace: FONT_BODY, fontSize: 15, color: C.muted, italic: true,
    });
  }
  const steps = (s.steps || []).slice(0, 4);
  const startY = 3.2;
  const rowH = 1.05;
  steps.forEach((step, i) => {
    const y = startY + i * rowH;
    slide.addShape("ellipse", { x: 0.85, y: y, w: 0.7, h: 0.7, fill: { color: C.coral }, line: { color: C.coral } });
    slide.addText(String(i + 1), {
      x: 0.85, y: y, w: 0.7, h: 0.7,
      fontFace: FONT_HEAD, fontSize: 22, bold: true, color: C.paper, align: "center", valign: "middle",
    });
    slide.addText(step, {
      x: 1.8, y: y - 0.05, w: 10.8, h: 0.85,
      fontFace: FONT_BODY, fontSize: 18, color: C.ink, valign: "middle",
    });
  });
  addFooter(ctx);
}

function renderOffer(ctx: RenderCtx) {
  const { slide, s } = ctx;
  slide.background = { color: C.paper };
  // Navy left panel with book mockup
  slide.addShape("rect", { x: 0, y: 0, w: 5.0, h: H, fill: { color: C.navy }, line: { color: C.navy } });
  slide.addShape("rect", { x: 5.0, y: 0, w: 0.08, h: H, fill: { color: C.coral }, line: { color: C.coral } });
  // Book mockup rectangle
  slide.addShape("rect", {
    x: 1.4, y: 1.6, w: 2.2, h: 3.3,
    fill: { color: C.ice }, line: { color: C.coral, width: 2 },
  });
  slide.addText(ctx.bookTitle, {
    x: 1.5, y: 2.4, w: 2.0, h: 1.6,
    fontFace: FONT_HEAD, fontSize: 13, bold: true, color: C.navy, align: "center",
  });
  slide.addText(`by ${ctx.penName}`, {
    x: 1.5, y: 4.2, w: 2.0, h: 0.4,
    fontFace: FONT_BODY, fontSize: 10, color: C.navy, italic: true, align: "center",
  });
  slide.addText("AT THE BACK OF THE ROOM", {
    x: 0.5, y: 5.4, w: 4.0, h: 0.3,
    fontFace: FONT_HEAD, fontSize: 10, bold: true, color: C.ice, charSpacing: 4, align: "center",
  });
  // Right column
  addEyebrow(slide, s.eyebrow || "TAKE IT WITH YOU", 5.5, 1.0);
  slide.addText(s.headline || "", {
    x: 5.5, y: 1.4, w: 7.4, h: 1.4,
    fontFace: FONT_HEAD, fontSize: 30, bold: true, color: C.ink,
  });
  const bullets = (s.bullets || []).slice(0, 4);
  const startY = 3.2;
  bullets.forEach((b, i) => {
    const y = startY + i * 0.65;
    slide.addText("✓", {
      x: 5.5, y, w: 0.4, h: 0.5,
      fontFace: FONT_HEAD, fontSize: 20, bold: true, color: C.coral,
    });
    slide.addText(b, {
      x: 5.95, y, w: 6.95, h: 0.5,
      fontFace: FONT_BODY, fontSize: 16, color: C.ink, valign: "middle",
    });
  });
  addFooter(ctx);
}

function renderQR(ctx: RenderCtx) {
  const { slide, s, qrDataUri } = ctx;
  slide.background = { color: C.paper };
  addAccentBar(slide, 0.6, 0.8, 0.6);
  addEyebrow(slide, s.eyebrow || "SCAN TO CONTINUE", 0.85, 0.85);
  slide.addText(s.headline || "", {
    x: 0.85, y: 1.25, w: 11.6, h: 1.1,
    fontFace: FONT_HEAD, fontSize: 30, bold: true, color: C.ink,
  });
  // QR placeholder (left)
  const qrX = 0.85, qrY = 2.7, qrSize = 4.0;
  slide.addShape("rect", {
    x: qrX, y: qrY, w: qrSize, h: qrSize,
    fill: { color: C.paper }, line: { color: C.navy, width: 2 },
  });
  if (qrDataUri) {
    slide.addImage({ data: qrDataUri, x: qrX + 0.2, y: qrY + 0.2, w: qrSize - 0.4, h: qrSize - 0.4 });
  } else {
    slide.addText("Visit the back of the room", {
      x: qrX, y: qrY + qrSize / 2 - 0.3, w: qrSize, h: 0.6,
      fontFace: FONT_HEAD, fontSize: 16, bold: true, color: C.navy, align: "center",
    });
  }
  // Bonus list (right)
  slide.addText("YOU'LL GET", {
    x: 5.5, y: 2.7, w: 7.4, h: 0.4,
    fontFace: FONT_HEAD, fontSize: 12, bold: true, color: C.coral, charSpacing: 4,
  });
  const bullets = (s.bullets || []).slice(0, 5);
  bullets.forEach((b, i) => {
    const y = 3.3 + i * 0.7;
    slide.addShape("ellipse", { x: 5.5, y: y + 0.15, w: 0.2, h: 0.2, fill: { color: C.coral }, line: { color: C.coral } });
    slide.addText(b, {
      x: 5.85, y: y, w: 7.0, h: 0.6,
      fontFace: FONT_BODY, fontSize: 16, color: C.ink, valign: "middle",
    });
  });
  addFooter(ctx);
}

function renderThanks(ctx: RenderCtx) {
  const { slide, s } = ctx;
  slide.background = { color: C.navy };
  slide.addShape("rect", { x: 5.7, y: 3.6, w: 1.9, h: 0.08, fill: { color: C.coral }, line: { color: C.coral } });
  slide.addText(s.eyebrow || "THANK YOU", {
    x: 0.6, y: 2.3, w: 12.13, h: 0.5,
    fontFace: FONT_HEAD, fontSize: 14, bold: true, color: C.coral, charSpacing: 6, align: "center",
  });
  slide.addText(s.headline || "Connect with me", {
    x: 0.6, y: 2.8, w: 12.13, h: 1.0,
    fontFace: FONT_HEAD, fontSize: 44, bold: true, color: C.paper, align: "center",
  });
  if (s.subhead) {
    slide.addText(s.subhead, {
      x: 0.6, y: 4.0, w: 12.13, h: 0.6,
      fontFace: FONT_BODY, fontSize: 18, color: C.ice, align: "center",
    });
  }
  // Coral CTA strip
  slide.addShape("rect", { x: 0, y: 6.4, w: W, h: 0.6, fill: { color: C.coral }, line: { color: C.coral } });
  slide.addText(`${ctx.penName}   ·   ${ctx.bookTitle}`, {
    x: 0, y: 6.4, w: W, h: 0.6,
    fontFace: FONT_HEAD, fontSize: 14, bold: true, color: C.paper, align: "center", valign: "middle",
  });
}

function renderSection(ctx: RenderCtx) {
  // Generic fallback layout (also used for legacy decks)
  const { slide, s } = ctx;
  slide.background = { color: C.paper };
  // Navy left third
  slide.addShape("rect", { x: 0, y: 0, w: 4.2, h: H, fill: { color: C.navy }, line: { color: C.navy } });
  slide.addShape("rect", { x: 4.2, y: 0, w: 0.08, h: H, fill: { color: C.coral }, line: { color: C.coral } });
  slide.addText(s.eyebrow || `SLIDE ${s.n}`, {
    x: 0.5, y: 1.0, w: 3.5, h: 0.5,
    fontFace: FONT_HEAD, fontSize: 12, bold: true, color: C.ice, charSpacing: 4,
  });
  slide.addText(String(s.n).padStart(2, "0"), {
    x: 0.5, y: 1.6, w: 3.5, h: 1.6,
    fontFace: FONT_HEAD, fontSize: 96, bold: true, color: C.coral,
  });
  slide.addText(ctx.bookTitle, {
    x: 0.5, y: 6.7, w: 3.5, h: 0.4,
    fontFace: FONT_BODY, fontSize: 10, color: C.ice, italic: true,
  });
  // Right
  slide.addText(s.headline || s.title || "", {
    x: 4.7, y: 1.2, w: 8.2, h: 1.6,
    fontFace: FONT_HEAD, fontSize: 32, bold: true, color: C.ink,
  });
  if (s.subhead || s.body) {
    slide.addText(s.subhead || s.body || "", {
      x: 4.7, y: 3.0, w: 8.2, h: 3.5,
      fontFace: FONT_BODY, fontSize: 18, color: C.ink, valign: "top",
    });
  }
  slide.addText(`${ctx.penName}`, {
    x: 4.7, y: 7.05, w: 8, h: 0.3,
    fontFace: FONT_BODY, fontSize: 9, color: C.muted, italic: true,
  });
}

function renderSlide(ctx: RenderCtx) {
  switch (ctx.s.layout) {
    case "title": return renderTitle(ctx);
    case "stat": return renderStat(ctx);
    case "two_column": return renderTwoColumn(ctx);
    case "bullets": return renderBullets(ctx);
    case "framework_grid": return renderFrameworkGrid(ctx);
    case "framework": return renderFramework(ctx);
    case "case_study": return renderCaseStudy(ctx);
    case "exercise": return renderExercise(ctx);
    case "offer": return renderOffer(ctx);
    case "qr": return renderQR(ctx);
    case "thanks": return renderThanks(ctx);
    default: return renderSection(ctx);
  }
}

/* ------------------------------------------------------------------ */
/*  Handler                                                            */
/* ------------------------------------------------------------------ */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { author_id, book_id, deck } = await req.json();
    if (!author_id || !deck) throw new Error("author_id and deck are required");
    if (deck !== "workshop" && deck !== "corporate_lunch") throw new Error("deck must be 'workshop' or 'corporate_lunch'");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: author } = await supabase.from("author_profiles").select("pen_name").eq("id", author_id).single();
    let nodeQuery = supabase.from("author_nodes").select("content_json").eq("author_id", author_id).eq("node_id", "BP-09");
    if (book_id) nodeQuery = nodeQuery.eq("book_id", book_id);
    const { data: node } = await nodeQuery.maybeSingle();
    if (!node?.content_json) throw new Error("BP-09 toolkit not found for this book");

    const content = node.content_json as any;
    const rawSlides = content?.[deck]?.slides || [];
    if (!rawSlides.length) throw new Error(`No ${deck} slides found. Generate the toolkit first.`);

    const penName = author?.pen_name || "Author";
    const kitTitle = content?.kit_title || "Book Sales kit";
    const buyUrl: string = String(content?.amazon_url || content?.bookstore_url || "").trim();

    // Generate QR once if a URL exists
    const qrDataUri = await makeQrDataUri(buyUrl);

    const slides: Slide[] = rawSlides.map((s: any, i: number) => normaliseSlide(s, i));

    const pptx = new PptxGenJS();
    pptx.author = penName;
    pptx.title = kitTitle;
    pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5

    for (let idx = 0; idx < slides.length; idx++) {
      const s = slides[idx];
      const slide = pptx.addSlide();
      const ctx: RenderCtx = {
        slide, s, total: slides.length, penName,
        bookTitle: kitTitle.replace(/\s*[—-]\s*Book Sales kit.*$/i, "").trim() || kitTitle,
        qrDataUri,
      };
      try {
        renderSlide(ctx);
      } catch (e) {
        console.error(`[export-bp09-slides] slide ${s.n} render failed, falling back:`, e);
        renderSection(ctx);
      }
      if (s.speaker_notes) slide.addNotes(String(s.speaker_notes));
    }

    const base64 = await pptx.write({ outputType: "base64" }) as string;
    const safeName = penName.replace(/\s+/g, "_");
    const filename = `${safeName}_${deck}_deck.pptx`;

    return new Response(JSON.stringify({ success: true, filename, base64 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("export-bp09-slides error:", errMessage);
    return new Response(JSON.stringify({ success: false, error: errMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
