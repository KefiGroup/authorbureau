/**
 * BP-03 viral carousel + cheat-sheet renderer (client-side canvas, deterministic).
 * Slides are 1080x1350 (4:5) — the highest-reach size for Instagram carousels
 * and LinkedIn document (PDF) posts.
 *
 * Slide structure: Hook -> Why it matters -> 3-4 key points -> Summary checklist -> CTA.
 */
import { colorFromString, getInitials, loadImage } from "./socialGraphic";

export const SLIDE_W = 1080;
export const SLIDE_H = 1350;

export type SlideKind = "hook" | "problem" | "point" | "summary" | "cta";
export interface Slide { kind: SlideKind; kicker: string; title: string; body?: string; items?: string[]; index?: number }

export interface CarouselArgs {
  theme: string;
  caption: string;
  postType?: string | null;
  cta?: string | null;
  authorName: string;
  authorPhotoUrl?: string | null;
  bookTitle?: string;
  bookColor?: string | null;
}

const SANS = `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif`;
const SERIF = `Georgia, "Times New Roman", serif`;

function clean(s: string) {
  return s.replace(/https?:\/\/\S+/g, "").replace(/[#@][\w-]+/g, "")
    .replace(/[\u2014\u2013]/g, ", ").replace(/\s+/g, " ").trim();
}
function sentences(text: string): string[] {
  return clean(text).split(/(?<=[.!?])\s+/).map((s) => s.trim())
    .filter((s) => s.length > 18 && s.length < 260);
}
function shorten(s: string, max: number) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "") + "…";
}
function headline(s: string) {
  // First clause as a punchy headline.
  const c = s.split(/[,;:]/)[0].replace(/[.!?]$/, "").trim();
  return shorten(c.length > 12 ? c : s, 70);
}

/** Build the slide outline from saved post content only — no AI, no invented facts. */
export function buildSlides(args: CarouselArgs): Slide[] {
  const sents = sentences(args.caption);
  const hookText = clean(args.theme || "") || (sents[0] ? headline(sents[0]) : "Your story matters");
  const rest = sents.slice(args.theme ? 0 : 1);
  const problem = rest[0];
  const points = rest.slice(problem ? 1 : 0, (problem ? 1 : 0) + 4);
  while (points.length < 3 && rest.length > points.length + 1) points.push(rest[points.length + 1]);

  const slides: Slide[] = [{ kind: "hook", kicker: (args.postType || "Insight").toUpperCase(), title: hookText }];
  if (problem) slides.push({ kind: "problem", kicker: "WHY IT MATTERS", title: headline(problem), body: shorten(problem, 220) });
  points.forEach((p, i) => slides.push({ kind: "point", kicker: `STEP ${i + 1}`, index: i + 1, title: headline(p), body: shorten(p, 220) }));
  const items = (points.length ? points : [problem || hookText]).map((p) => headline(p));
  slides.push({ kind: "summary", kicker: "SAVE THIS", title: "The quick recap", items });
  const cta = clean(args.cta || "").split(/[.!?]/)[0].trim();
  slides.push({
    kind: "cta", kicker: "YOUR NEXT STEP",
    title: cta && cta.length <= 60 ? cta : "Follow for more like this",
    body: args.bookTitle ? `From ${args.bookTitle}` : undefined,
  });
  return slides;
}

function hex(h?: string | null) { return h && /^#?[0-9a-f]{6}$/i.test(h) ? (h.startsWith("#") ? h : "#" + h) : null; }
function rgb(h: string) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function mix(h: string, t: number, a: number) {
  return "#" + rgb(h).map((v) => Math.round(v + (t - v) * a).toString(16).padStart(2, "0")).join("");
}
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const out: string[] = []; let cur = "";
  for (const w of text.split(/\s+/)) {
    const t = cur ? cur + " " + w : w;
    if (ctx.measureText(t).width <= maxW) cur = t; else { if (cur) out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  return out;
}
function fit(ctx: CanvasRenderingContext2D, text: string, font: (s: number) => string, maxW: number, maxH: number, start: number, min: number, lh: number) {
  let s = start, lines: string[] = [];
  for (; s >= min; s -= 2) { ctx.font = font(s); lines = wrap(ctx, text, maxW); if (lines.length * s * lh <= maxH) break; }
  return { s, lines, lh: s * lh };
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function portrait(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const r = Math.max(w / img.width, h / img.height), sw = w / r, sh = h / r;
  ctx.drawImage(img, (img.width - sw) / 2, Math.max(0, (img.height - sh) * 0.08), sw, sh, x, y, w, h);
}

export async function renderSlide(args: CarouselArgs, slides: Slide[], i: number): Promise<HTMLCanvasElement> {
  const slide = slides[i];
  const W = SLIDE_W, H = SLIDE_H, P = 90;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  const brand = hex(args.bookColor) || colorFromString(args.bookTitle || args.authorName);
  const deep = mix(brand, 12, 0.8), accent = mix(brand, 255, 0.18);
  const light = slide.kind === "point" || slide.kind === "summary";
  const ink = light ? deep : "#ffffff";
  const sub = light ? "rgba(15,23,42,0.68)" : "rgba(255,255,255,0.8)";
  const photo = args.authorPhotoUrl ? await loadImage(args.authorPhotoUrl) : null;

  // Background
  if (light) { ctx.fillStyle = mix(brand, 250, 0.95); ctx.fillRect(0, 0, W, H); }
  else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, mix(brand, 12, 0.62)); g.addColorStop(1, deep);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.35; ctx.fillStyle = brand;
    ctx.beginPath(); ctx.arc(W * 0.95, H * 0.05, 520, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Grid lines texture
  ctx.strokeStyle = light ? "rgba(15,23,42,0.05)" : "rgba(255,255,255,0.05)"; ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 90) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }

  // Progress bar (swipe cue)
  const segW = (W - P * 2 - (slides.length - 1) * 10) / slides.length;
  slides.forEach((_, k) => {
    ctx.fillStyle = k <= i ? (light ? brand : accent) : (light ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.2)");
    rr(ctx, P + k * (segW + 10), 50, segW, 8, 4); ctx.fill();
  });

  ctx.textBaseline = "top"; ctx.textAlign = "left";
  // Kicker pill
  let y = 120;
  ctx.font = `800 30px ${SANS}`;
  const kw = ctx.measureText(slide.kicker).width + 48;
  ctx.fillStyle = light ? brand : accent; rr(ctx, P, y, kw, 58, 29); ctx.fill();
  ctx.fillStyle = light ? "#ffffff" : deep; ctx.fillText(slide.kicker, P + 24, y + 14);
  y += 110;

  const cw = W - P * 2;
  const footTop = H - 200;

  if (slide.kind === "hook") {
    if (photo) {
      const ph = 420, pw = 340, px = W - P - pw, py = H - 200 - ph - 30;
      ctx.save(); rr(ctx, px, py, pw, ph, 28); ctx.clip(); portrait(ctx, photo, px, py, pw, ph); ctx.restore();
      ctx.strokeStyle = accent; ctx.lineWidth = 6; rr(ctx, px, py, pw, ph, 28); ctx.stroke();
    }
    const f = fit(ctx, slide.title, (s) => `800 ${s}px ${SANS}`, cw, photo ? 560 : 760, 112, 56, 1.08);
    ctx.fillStyle = ink; f.lines.forEach((l, k) => ctx.fillText(l, P, y + k * f.lh));
    y += f.lines.length * f.lh + 40;
    ctx.fillStyle = accent; ctx.fillRect(P, y, 120, 12);
  } else if (slide.kind === "problem") {
    ctx.font = `700 360px ${SERIF}`; ctx.fillStyle = accent + "30"; ctx.fillText("\u201C", P - 20, y - 80);
    const f = fit(ctx, slide.title, (s) => `800 ${s}px ${SANS}`, cw, 380, 88, 50, 1.1);
    ctx.fillStyle = ink; f.lines.forEach((l, k) => ctx.fillText(l, P, y + 80 + k * f.lh));
    y += 80 + f.lines.length * f.lh + 50;
    if (slide.body && slide.body !== slide.title) {
      const b = fit(ctx, slide.body, (s) => `500 ${s}px ${SANS}`, cw, footTop - y - 40, 40, 28, 1.4);
      ctx.fillStyle = sub; b.lines.forEach((l, k) => ctx.fillText(l, P, y + k * b.lh));
    }
  } else if (slide.kind === "point") {
    ctx.font = `900 300px ${SANS}`; ctx.fillStyle = brand + "22"; ctx.textAlign = "right";
    ctx.fillText(String(slide.index).padStart(2, "0"), W - P + 10, 90); ctx.textAlign = "left";
    // White card
    const cy = y + 40, ch = footTop - cy - 40;
    ctx.save(); ctx.shadowColor = "rgba(15,23,42,0.15)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
    ctx.fillStyle = "#ffffff"; rr(ctx, P, cy, cw, ch, 32); ctx.fill(); ctx.restore();
    ctx.fillStyle = brand; ctx.fillRect(P, cy + 40, 14, ch - 80);
    const ix = P + 70, iw = cw - 130;
    const t = fit(ctx, slide.title, (s) => `800 ${s}px ${SANS}`, iw, ch * 0.45, 76, 44, 1.12);
    ctx.fillStyle = deep; t.lines.forEach((l, k) => ctx.fillText(l, ix, cy + 70 + k * t.lh));
    const by = cy + 70 + t.lines.length * t.lh + 40;
    if (slide.body && slide.body !== slide.title) {
      const b = fit(ctx, slide.body, (s) => `500 ${s}px ${SANS}`, iw, cy + ch - by - 50, 38, 26, 1.42);
      ctx.fillStyle = sub; b.lines.forEach((l, k) => ctx.fillText(l, ix, by + k * b.lh));
    }
  } else if (slide.kind === "summary") {
    ctx.font = `800 84px ${SANS}`; ctx.fillStyle = ink; ctx.fillText(slide.title, P, y);
    y += 140;
    const items = slide.items || [];
    const rowH = Math.min(170, (footTop - y - 20) / Math.max(1, items.length));
    items.forEach((it, k) => {
      const ry = y + k * rowH;
      ctx.fillStyle = "#ffffff"; rr(ctx, P, ry, cw, rowH - 22, 24); ctx.fill();
      ctx.fillStyle = brand; ctx.beginPath(); ctx.arc(P + 60, ry + (rowH - 22) / 2, 30, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 7; ctx.beginPath();
      const cy2 = ry + (rowH - 22) / 2;
      ctx.moveTo(P + 46, cy2); ctx.lineTo(P + 57, cy2 + 11); ctx.lineTo(P + 76, cy2 - 12); ctx.stroke();
      const f = fit(ctx, it, (s) => `700 ${s}px ${SANS}`, cw - 150, rowH - 50, 38, 24, 1.2);
      ctx.fillStyle = deep;
      const ty = cy2 - (f.lines.length * f.lh) / 2;
      f.lines.forEach((l, j) => ctx.fillText(l, P + 120, ty + j * f.lh));
    });
  } else {
    // CTA slide
    if (photo) {
      const r = 150, cx = W / 2, cy = y + 170;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      portrait(ctx, photo, cx - r, cy - r, r * 2, r * 2); ctx.restore();
      ctx.strokeStyle = accent; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      y += 380;
    }
    ctx.textAlign = "center";
    ctx.font = `700 44px ${SANS}`; ctx.fillStyle = sub; ctx.fillText(args.authorName, W / 2, y); y += 90;
    const f = fit(ctx, slide.title, (s) => `800 ${s}px ${SANS}`, cw, 300, 92, 52, 1.1);
    ctx.fillStyle = ink; f.lines.forEach((l, k) => ctx.fillText(l, W / 2, y + k * f.lh));
    y += f.lines.length * f.lh + 50;
    if (slide.body) {
      const b = fit(ctx, slide.body, (s) => `italic 500 ${s}px ${SERIF}`, cw, 120, 40, 28, 1.3);
      ctx.fillStyle = sub; b.lines.forEach((l, k) => ctx.fillText(l, W / 2, y + k * b.lh));
      y += b.lines.length * b.lh + 50;
    }
    const icons = ["Like", "Comment", "Save", "Share"];
    const gw = 200, gx = W / 2 - (gw * icons.length + 20 * (icons.length - 1)) / 2;
    ctx.font = `800 30px ${SANS}`;
    icons.forEach((t, k) => {
      const x = gx + k * (gw + 20);
      ctx.fillStyle = k === 2 ? accent : "rgba(255,255,255,0.14)"; rr(ctx, x, y, gw, 72, 36); ctx.fill();
      ctx.fillStyle = k === 2 ? deep : "#ffffff"; ctx.fillText(t, x + gw / 2, y + 20);
    });
    ctx.textAlign = "left";
  }

  // Footer: avatar + name, page + swipe cue
  const fy = H - 110;
  ctx.save(); ctx.beginPath(); ctx.arc(P + 36, fy, 36, 0, Math.PI * 2); ctx.clip();
  if (photo) portrait(ctx, photo, P, fy - 36, 72, 72);
  else { ctx.fillStyle = brand; ctx.fillRect(P, fy - 36, 72, 72); ctx.fillStyle = "#fff"; ctx.font = `800 28px ${SANS}`; ctx.textBaseline = "middle"; ctx.textAlign = "center"; ctx.fillText(getInitials(args.authorName), P + 36, fy); }
  ctx.restore();
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.font = `700 32px ${SANS}`; ctx.fillStyle = ink; ctx.fillText(args.authorName, P + 96, fy - 16);
  ctx.font = `500 24px ${SANS}`; ctx.fillStyle = sub;
  const bt = args.bookTitle ? (args.bookTitle.length > 34 ? args.bookTitle.slice(0, 33) + "…" : args.bookTitle) : "";
  ctx.fillText(bt, P + 96, fy + 20);
  ctx.textAlign = "right"; ctx.font = `800 30px ${SANS}`;
  const last = i === slides.length - 1;
  ctx.fillStyle = light ? brand : accent;
  ctx.fillText(last ? `${i + 1}/${slides.length}` : `Swipe  \u2192`, W - P, fy);
  return c;
}

/** One dense, save-worthy cheat-sheet graphic (1080x1350). */
export async function renderCheatSheet(args: CarouselArgs, slides: Slide[]): Promise<HTMLCanvasElement> {
  const W = SLIDE_W, H = SLIDE_H, P = 80;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  const brand = hex(args.bookColor) || colorFromString(args.bookTitle || args.authorName);
  const deep = mix(brand, 12, 0.8), accent = mix(brand, 255, 0.18);
  ctx.fillStyle = mix(brand, 250, 0.95); ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = deep; ctx.fillRect(0, 0, W, 360);
  ctx.textBaseline = "top"; ctx.textAlign = "left";
  ctx.font = `800 28px ${SANS}`; ctx.fillStyle = accent; ctx.fillText("CHEAT SHEET  \u00B7  SAVE FOR LATER", P, 70);
  const hook = slides[0].title;
  const f = fit(ctx, hook, (s) => `800 ${s}px ${SANS}`, W - P * 2, 200, 72, 40, 1.1);
  ctx.fillStyle = "#ffffff"; f.lines.forEach((l, k) => ctx.fillText(l, P, 130 + k * f.lh));

  const pts = slides.filter((s) => s.kind === "point" || s.kind === "problem");
  const cols = 2, gap = 30, cw = (W - P * 2 - gap) / cols, top = 410;
  const rows = Math.ceil(pts.length / cols) || 1;
  const ch = Math.min(380, (H - 200 - top - gap * (rows - 1)) / rows);
  pts.forEach((s, k) => {
    const x = P + (k % cols) * (cw + gap), y = top + Math.floor(k / cols) * (ch + gap);
    ctx.save(); ctx.shadowColor = "rgba(15,23,42,0.12)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
    ctx.fillStyle = "#ffffff"; rr(ctx, x, y, cw, ch, 24); ctx.fill(); ctx.restore();
    ctx.fillStyle = brand; rr(ctx, x + 30, y + 30, 64, 64, 18); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.font = `800 32px ${SANS}`; ctx.textAlign = "center";
    ctx.fillText(String(k + 1), x + 62, y + 46); ctx.textAlign = "left";
    const t = fit(ctx, s.title, (z) => `800 ${z}px ${SANS}`, cw - 60, 120, 34, 22, 1.15);
    ctx.fillStyle = deep; t.lines.forEach((l, j) => ctx.fillText(l, x + 30, y + 120 + j * t.lh));
    const by = y + 120 + t.lines.length * t.lh + 16;
    if (s.body && s.body !== s.title) {
      const b = fit(ctx, s.body, (z) => `500 ${z}px ${SANS}`, cw - 60, y + ch - by - 24, 24, 16, 1.35);
      ctx.fillStyle = "rgba(15,23,42,0.66)"; b.lines.forEach((l, j) => ctx.fillText(l, x + 30, by + j * b.lh));
    }
  });
  // Footer band
  ctx.fillStyle = deep; ctx.fillRect(0, H - 150, W, 150);
  ctx.textBaseline = "middle"; ctx.font = `700 32px ${SANS}`; ctx.fillStyle = "#ffffff";
  ctx.fillText(args.authorName, P, H - 92);
  ctx.font = `500 24px ${SANS}`; ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(args.bookTitle || "", P, H - 52);
  const cta = slides[slides.length - 1].title + "  \u2192";
  ctx.font = `800 28px ${SANS}`;
  const pw = ctx.measureText(cta).width + 56;
  ctx.fillStyle = accent; rr(ctx, W - P - pw, H - 112, pw, 64, 32); ctx.fill();
  ctx.fillStyle = deep; ctx.textAlign = "center"; ctx.fillText(cta, W - P - pw / 2, H - 80);
  return c;
}

function toBlob(c: HTMLCanvasElement, type = "image/png", q = 0.92) {
  return new Promise<Blob>((r) => c.toBlob((b) => r(b!), type, q));
}

export async function renderCarouselPngs(args: CarouselArgs): Promise<Blob[]> {
  const slides = buildSlides(args);
  const out: Blob[] = [];
  for (let i = 0; i < slides.length; i++) out.push(await toBlob(await renderSlide(args, slides, i)));
  return out;
}

/** LinkedIn document post: one PDF, one slide per page. */
export async function renderCarouselPdf(args: CarouselArgs): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const slides = buildSlides(args);
  const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [SLIDE_W, SLIDE_H], hotfixes: ["px_scaling"] });
  for (let i = 0; i < slides.length; i++) {
    const c = await renderSlide(args, slides, i);
    if (i > 0) pdf.addPage([SLIDE_W, SLIDE_H], "portrait");
    pdf.addImage(c.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, SLIDE_W, SLIDE_H);
  }
  return pdf.output("blob");
}

export async function renderCheatSheetPng(args: CarouselArgs): Promise<Blob> {
  return toBlob(await renderCheatSheet(args, buildSlides(args)));
}
