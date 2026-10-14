/**
 * Client-side branded social graphic renderer.
 * Deterministic — no AI, no network. Uses HTML5 Canvas.
 */

export type SocialPlatform = "instagram" | "linkedin" | "facebook" | "twitter";

export const PLATFORM_DIMENSIONS: Record<SocialPlatform, { w: number; h: number; aspect: string }> = {
  instagram: { w: 1080, h: 1080, aspect: "1 / 1" },
  linkedin: { w: 1200, h: 628, aspect: "1200 / 628" },
  facebook: { w: 1200, h: 628, aspect: "1200 / 628" },
  twitter: { w: 1600, h: 900, aspect: "16 / 9" },
};

const DEFAULT_BRAND = "#0d9488"; // teal-600

export function extractPullQuote(caption: string, max = 180): string {
  if (!caption) return "";
  // Strip leading emojis/whitespace
  const cleaned = caption.replace(/\s+/g, " ").trim();
  // First sentence — split on . ! ? followed by space or end
  const match = cleaned.match(/^(.{20,}?[.!?])(\s|$)/);
  let quote = match ? match[1] : cleaned;
  if (quote.length > max) quote = quote.slice(0, max - 1).trimEnd() + "…";
  return quote;
}

export function getInitials(name: string): string {
  if (!name) return "A";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "A";
}

/** Hex → {r,g,b}. Returns null on invalid. */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function darken(hex: string, amount = 0.25): string {
  const rgb = hexToRgb(hex) || hexToRgb(DEFAULT_BRAND)!;
  return rgbToHex({
    r: Math.max(0, Math.round(rgb.r * (1 - amount))),
    g: Math.max(0, Math.round(rgb.g * (1 - amount))),
    b: Math.max(0, Math.round(rgb.b * (1 - amount))),
  });
}

/** Stable color from string when no brand color supplied. */
export function colorFromString(seed: string): string {
  if (!seed) return DEFAULT_BRAND;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const palette = ["#0d9488", "#7c3aed", "#dc2626", "#0369a1", "#ea580c", "#059669", "#db2777", "#1d4ed8"];
  return palette[h % palette.length];
}

export function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const test = current ? current + " " + w : w;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}
export type Archetype = "Quote" | "Lesson" | "Question" | "Story" | "Framework" | "Proof";

interface RenderArgs {
  platform: SocialPlatform;
  authorName: string;
  authorPhotoUrl?: string | null;
  bookColor?: string | null;
  pullQuote: string;
  bookTitle?: string;
  /** Post archetype; picks the layout. */
  postType?: string | null;
  /** Saved per-post call to action; shown as a pill in the footer. */
  cta?: string | null;
}

/**
 * BP-03 DESIGN RULES (scroll-stopping, on-brand):
 * 1. Hook first: one idea, max ~18 words, largest element, high contrast.
 * 2. Every graphic carries a visible CTA pill (saved post CTA or archetype default).
 * 3. Faces are never cropped: portraits are cover-fit anchored to the top (head room kept).
 * 4. Layout follows archetype: Quote/Story = portrait split, Question/Lesson = bold statement,
 *    Framework/Proof = editorial card. No two archetypes look alike in a feed.
 * 5. Deep tinted background + one brand accent; no flat single-colour slabs.
 * 6. Small kicker label + byline give hierarchy; generous safe margins (7%).
 */
const SANS = `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif`;
const SERIF = `Georgia, "Times New Roman", serif`;

const KICKER: Record<Archetype, string> = {
  Quote: "WORDS TO LIVE BY", Lesson: "TODAY'S LESSON", Question: "YOUR TURN",
  Story: "A TRUE STORY", Framework: "THE FRAMEWORK", Proof: "THE RESULT",
};
const DEFAULT_CTA: Record<Archetype, string> = {
  Quote: "Save this for later", Lesson: "Follow for more lessons", Question: "Answer in the comments",
  Story: "Read the full story", Framework: "Get the free guide", Proof: "Start your journey",
};

function normArchetype(t?: string | null): Archetype {
  const k = (t || "").toLowerCase();
  const all: Archetype[] = ["Quote", "Lesson", "Question", "Story", "Framework", "Proof"];
  return all.find((a) => k.includes(a.toLowerCase())) || "Quote";
}

function shortCta(cta: string | null | undefined, a: Archetype): string {
  let c = (cta || "").replace(/https?:\/\/\S+/g, "").replace(/[#@]\S+/g, "").replace(/\s+/g, " ").trim();
  c = c.split(/[.!?\u2014\u2013]/)[0].trim();
  if (!c || c.length > 38) return DEFAULT_CTA[a];
  return c;
}

function mix(hex: string, target: number, amt: number): string {
  const rgb = hexToRgb(hex) || hexToRgb(DEFAULT_BRAND)!;
  const f = (v: number) => Math.round(v + (target - v) * amt);
  return rgbToHex({ r: f(rgb.r), g: f(rgb.g), b: f(rgb.b) });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Cover-fit, anchored near the top so heads are never cut off. */
function drawPortrait(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ratio = Math.max(w / img.width, h / img.height);
  const sw = w / ratio, sh = h / ratio;
  const sx = (img.width - sw) / 2;
  const sy = Math.max(0, (img.height - sh) * 0.08);
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, font: (s: number) => string, maxW: number, maxH: number, start: number, min: number, lh = 1.2) {
  let size = start, lines: string[] = [];
  while (size >= min) {
    ctx.font = font(size);
    lines = wrapText(ctx, text, maxW);
    if (lines.length * size * lh <= maxH) break;
    size -= 2;
  }
  return { size, lines, lh: size * lh };
}

export async function renderSocialGraphic(args: RenderArgs): Promise<Blob> {
  const { platform, authorName, authorPhotoUrl, bookColor, pullQuote, bookTitle } = args;
  const { w, h } = PLATFORM_DIMENSIONS[platform];
  const a = normArchetype(args.postType);
  const ctaText = shortCta(args.cta, a);
  const text = (pullQuote || "Your story matters.").replace(/^["\u201C]|["\u201D]$/g, "");
  const name = authorName || "Author";

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const m = Math.min(w, h);
  const pad = Math.round(m * 0.07);
  const landscape = w / h > 1.3;

  const brand = bookColor && hexToRgb(bookColor) ? bookColor : colorFromString(bookTitle || authorName);
  const accent = mix(brand, 255, 0.15);
  const deep = mix(brand, 10, 0.82);
  const card = a === "Framework" || a === "Proof";
  const ink = card ? deep : "#ffffff";
  const sub = card ? "rgba(15,23,42,0.62)" : "rgba(255,255,255,0.72)";

  // Background
  if (card) {
    ctx.fillStyle = mix(brand, 248, 0.94);
    ctx.fillRect(0, 0, w, h);
  } else {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, mix(brand, 10, 0.7));
    g.addColorStop(1, deep);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const rg = ctx.createRadialGradient(w * 0.85, h * 0.1, 0, w * 0.85, h * 0.1, m * 0.8);
    rg.addColorStop(0, brand + "66"); rg.addColorStop(1, brand + "00");
    ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
  }
  // Dot texture
  ctx.fillStyle = card ? "rgba(15,23,42,0.05)" : "rgba(255,255,255,0.05)";
  const step = Math.round(m * 0.035);
  for (let yy = step; yy < h; yy += step) for (let xx = step; xx < w; xx += step) {
    ctx.beginPath(); ctx.arc(xx, yy, m * 0.0025, 0, Math.PI * 2); ctx.fill();
  }

  const photo = authorPhotoUrl ? await loadImage(authorPhotoUrl) : null;
  const usePortrait = !!photo && (a === "Quote" || a === "Story");

  // Content box
  let cx = pad, cw = w - pad * 2;
  const footerH = Math.round(m * 0.12);
  const top = pad, bottom = h - pad - footerH;

  if (usePortrait && photo) {
    // Portrait panel: right side (landscape) or right ~42% (square)
    const pw = Math.round(landscape ? w * 0.36 : w * 0.42);
    const px = w - pw - pad * 0.6, py = pad * 0.6, ph = h - pad * 1.2 - footerH * 0.2;
    ctx.save();
    roundRect(ctx, px, py, pw, ph, m * 0.03); ctx.clip();
    drawPortrait(ctx, photo, px, py, pw, ph);
    const fade = ctx.createLinearGradient(px, py + ph * 0.6, px, py + ph);
    fade.addColorStop(0, "rgba(0,0,0,0)"); fade.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = fade; ctx.fillRect(px, py, pw, ph);
    ctx.restore();
    ctx.strokeStyle = accent; ctx.lineWidth = m * 0.006;
    roundRect(ctx, px, py, pw, ph, m * 0.03); ctx.stroke();
    cw = px - pad * 1.4 - cx;
  }

  if (card) {
    // Editorial white card
    const cy = top, chh = bottom - top;
    ctx.save();
    ctx.shadowColor = "rgba(15,23,42,0.18)"; ctx.shadowBlur = m * 0.04; ctx.shadowOffsetY = m * 0.01;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, cx, cy, cw, chh, m * 0.03); ctx.fill();
    ctx.restore();
    ctx.fillStyle = brand; ctx.fillRect(cx, cy + m * 0.03, m * 0.012, chh - m * 0.06);
    cx += pad * 0.8; cw -= pad * 1.6;
  }

  // Kicker
  let y = top + (card ? pad * 0.7 : 0);
  const kSize = Math.round(m * 0.026);
  ctx.font = `700 ${kSize}px ${SANS}`;
  ctx.textBaseline = "top"; ctx.textAlign = "left";
  const kw = ctx.measureText(KICKER[a]).width + kSize * 1.6;
  ctx.fillStyle = card ? brand : accent;
  roundRect(ctx, cx, y, kw, kSize * 2, kSize); ctx.fill();
  ctx.fillStyle = card ? "#ffffff" : deep;
  ctx.fillText(KICKER[a], cx + kSize * 0.8, y + kSize * 0.5);
  y += kSize * 2 + pad * 0.6;

  // Big accent mark
  if (a === "Question" || a === "Quote") {
    const big = Math.round(m * (a === "Question" ? 0.42 : 0.3));
    ctx.font = `800 ${big}px ${a === "Quote" ? SERIF : SANS}`;
    ctx.fillStyle = accent + "33";
    ctx.textAlign = "right";
    ctx.fillText(a === "Question" ? "?" : "\u201C", usePortrait ? cx + cw : w - pad * 0.6, a === "Question" ? h * 0.18 : y - big * 0.1);
    ctx.textAlign = "left";
  }

  // Hook
  const serif = a === "Quote" || a === "Story";
  const hookFont = (s: number) => `${serif ? "600" : "800"} ${s}px ${serif ? SERIF : SANS}`;
  const availH = bottom - y - (card ? pad * 1.6 : pad * 0.8);
  const fit = fitText(ctx, serif ? `\u201C${text}\u201D` : text, hookFont, cw, availH, Math.round(m * 0.085), Math.round(m * 0.038), serif ? 1.22 : 1.12);
  ctx.fillStyle = ink;
  fit.lines.forEach((l, i) => ctx.fillText(l, cx, y + i * fit.lh));
  y += fit.lines.length * fit.lh + pad * 0.4;

  // Accent underline + byline
  ctx.fillStyle = brand === ink ? accent : (card ? brand : accent);
  ctx.fillRect(cx, y, m * 0.08, m * 0.008);
  y += m * 0.025;
  const bSize = Math.round(m * 0.026);
  ctx.font = `600 ${bSize}px ${SANS}`; ctx.fillStyle = sub;
  const by = bookTitle ? `${name}  \u00B7  ${bookTitle}` : name;
  const byLines = wrapText(ctx, by, cw);
  if (y + bSize < bottom) ctx.fillText(byLines[0] + (byLines.length > 1 ? "\u2026" : ""), cx, y);

  // Footer: avatar + name (left), CTA pill (right)
  const fy = h - pad - footerH * 0.55;
  const av = Math.round(footerH * 0.62);
  ctx.save();
  ctx.beginPath(); ctx.arc(pad + av / 2, fy, av / 2, 0, Math.PI * 2); ctx.clip();
  if (photo) drawPortrait(ctx, photo, pad, fy - av / 2, av, av);
  else {
    ctx.fillStyle = brand; ctx.fillRect(pad, fy - av / 2, av, av);
    ctx.fillStyle = "#ffffff"; ctx.font = `700 ${Math.round(av * 0.4)}px ${SANS}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(getInitials(name), pad + av / 2, fy + 1);
  }
  ctx.restore();
  ctx.strokeStyle = card ? brand : "rgba(255,255,255,0.8)"; ctx.lineWidth = Math.max(2, av * 0.05);
  ctx.beginPath(); ctx.arc(pad + av / 2, fy, av / 2, 0, Math.PI * 2); ctx.stroke();
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  const nameFont = `700 ${Math.round(av * 0.34)}px ${SANS}`;
  ctx.font = nameFont;
  const nameEnd = pad + av + pad * 0.3 + ctx.measureText(name).width + pad * 0.4;

  let cSize = Math.round(m * 0.03);
  const label = `${ctaText}  \u2192`;
  ctx.font = `800 ${cSize}px ${SANS}`;
  while (cSize > m * 0.02 && ctx.measureText(label).width + cSize * 2 > w - pad - nameEnd) {
    cSize -= 1; ctx.font = `800 ${cSize}px ${SANS}`;
  }
  const pw2 = ctx.measureText(label).width + cSize * 2;
  if (w - pad - pw2 >= nameEnd) {
    const f = ctx.font; ctx.font = nameFont; ctx.fillStyle = card ? deep : "#ffffff";
    ctx.textAlign = "left"; ctx.fillText(name, pad + av + pad * 0.3, fy); ctx.font = f;
  }
  const ph2 = cSize * 2.3;
  const px2 = w - pad - pw2;
  ctx.fillStyle = accent;
  roundRect(ctx, px2, fy - ph2 / 2, pw2, ph2, ph2 / 2); ctx.fill();
  ctx.fillStyle = deep; ctx.textAlign = "center";
  ctx.fillText(label, px2 + pw2 / 2, fy + 1);

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/png", 0.92);
  });
}


export const PLATFORM_TAB_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  twitter: "Twitter / X",
};
