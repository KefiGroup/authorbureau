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

interface RenderArgs {
  platform: SocialPlatform;
  authorName: string;
  authorPhotoUrl?: string | null;
  bookColor?: string | null;
  pullQuote: string;
  bookTitle?: string;
}

export async function renderSocialGraphic(args: RenderArgs): Promise<Blob> {
  const { platform, authorName, authorPhotoUrl, bookColor, pullQuote, bookTitle } = args;
  const { w, h } = PLATFORM_DIMENSIONS[platform];

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const baseColor = bookColor && hexToRgb(bookColor) ? bookColor : colorFromString(bookTitle || authorName);
  const dark = darken(baseColor, 0.35);

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, baseColor);
  grad.addColorStop(1, dark);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle decorative circle
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath();
  ctx.arc(w * 0.92, h * 0.08, Math.min(w, h) * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Layout scale
  const pad = Math.round(Math.min(w, h) * 0.07);
  const avatarSize = Math.round(Math.min(w, h) * 0.13);
  const avatarX = pad;
  const avatarY = pad;

  // Avatar (photo or initials)
  const photo = authorPhotoUrl ? await loadImage(authorPhotoUrl) : null;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (photo) {
    // cover-fit
    const ratio = Math.max(avatarSize / photo.width, avatarSize / photo.height);
    const dw = photo.width * ratio;
    const dh = photo.height * ratio;
    ctx.drawImage(
      photo,
      avatarX + (avatarSize - dw) / 2,
      avatarY + (avatarSize - dh) / 2,
      dw,
      dh,
    );
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.round(avatarSize * 0.42)}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(getInitials(authorName), avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 2);
  }
  ctx.restore();

  // Avatar ring
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = Math.max(2, avatarSize * 0.04);
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.stroke();

  // Author name (right of avatar)
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const nameSize = Math.round(avatarSize * 0.36);
  ctx.font = `600 ${nameSize}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillText(authorName || "Author", avatarX + avatarSize + pad * 0.4, avatarY + avatarSize / 2 - nameSize * 0.1);
  if (bookTitle) {
    const subSize = Math.round(nameSize * 0.55);
    ctx.font = `400 ${subSize}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.fillText(bookTitle, avatarX + avatarSize + pad * 0.4, avatarY + avatarSize / 2 + nameSize * 0.7);
  }

  // Pull quote — center-left, large
  const quoteAreaX = pad;
  const quoteAreaY = avatarY + avatarSize + pad * 1.2;
  const quoteAreaW = w - pad * 2;
  const quoteAreaH = h - quoteAreaY - pad * 1.6;

  // Decorative quote mark
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  const qSize = Math.round(Math.min(w, h) * 0.18);
  ctx.font = `700 ${qSize}px Georgia, "Times New Roman", serif`;
  ctx.textBaseline = "top";
  ctx.fillText("\u201C", quoteAreaX, quoteAreaY - qSize * 0.15);

  // Fit quote text — start large, shrink until it fits
  let fontSize = Math.round(Math.min(w, h) * 0.075);
  const minFont = Math.round(Math.min(w, h) * 0.035);
  let lines: string[] = [];
  ctx.fillStyle = "#ffffff";
  while (fontSize >= minFont) {
    ctx.font = `600 ${fontSize}px Georgia, "Times New Roman", serif`;
    lines = wrapText(ctx, pullQuote || "Your story matters.", quoteAreaW - pad * 0.5);
    const totalH = lines.length * fontSize * 1.25;
    if (totalH <= quoteAreaH - qSize * 0.3) break;
    fontSize -= 2;
  }

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "top";
  const lineH = fontSize * 1.25;
  const startY = quoteAreaY + qSize * 0.6;
  lines.forEach((line, i) => {
    ctx.fillText(line, quoteAreaX, startY + i * lineH);
  });

  // Footer marker
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  const footSize = Math.round(Math.min(w, h) * 0.022);
  ctx.font = `500 ${footSize}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "bottom";
  ctx.fillText(`— ${authorName || "Author"}`, pad, h - pad * 0.6);

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
