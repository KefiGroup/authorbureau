import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore - npm specifier
import PptxGenJS from "https://esm.sh/pptxgenjs@3.12.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * export-pro-slides
 * ───────────────────────────────────────────────
 * Universal Gamma-style slide deck exporter.
 *
 * Body:
 *   { node_id, asset_key, theme?: "editorial" | "boardroom" | "bold" }
 *
 * Reads the author's content_json for that node, looks up the slide array
 * at `asset_key` (or falls back to known slide locations), then renders a
 * themed PPTX with 6 layouts auto-selected per slide.
 */

type Theme = {
  name: string;
  bg: string;
  ink: string;
  accent: string;
  accentLight: string;
  muted: string;
  fontHead: string;
  fontBody: string;
};

const THEMES: Record<string, Theme> = {
  editorial: {
    name: "Editorial",
    bg: "FAF7F2", ink: "1A1A2E", accent: "1E2761", accentLight: "CADCFC", muted: "6B6B7B",
    fontHead: "Georgia", fontBody: "Calibri",
  },
  boardroom: {
    name: "Boardroom",
    bg: "FFFFFF", ink: "0F1A2E", accent: "0F1A2E", accentLight: "DCE3F0", muted: "5A6477",
    fontHead: "Calibri", fontBody: "Calibri",
  },
  bold: {
    name: "Bold",
    bg: "0F1A2E", ink: "FFFFFF", accent: "F5B82E", accentLight: "1F2C46", muted: "B5BCC9",
    fontHead: "Calibri", fontBody: "Calibri",
  },
};

function pluck(content: any, key: string): any {
  if (!content) return null;
  if (key === "*") return content;
  return key.split(".").reduce((acc, p) => (acc == null ? acc : acc[p]), content);
}

/** Decide which Gamma layout fits this slide. */
function pickLayout(slide: any, idx: number, _total: number): string {
  if (slide.layout_hint && /^(hero|stat|quote|divider|bullets|split)$/.test(slide.layout_hint)) {
    return slide.layout_hint;
  }
  if (idx === 0) return "hero";
  const headline = String(slide.headline || "");
  const body = String(slide.body || headline || "");
  const title = String(slide.title || "");
  if (Array.isArray(slide.bullets) && slide.bullets.length >= 3) return "bullets";
  if (body.length < 80 && /\d{2,}/.test(body)) return "stat";
  if (title.startsWith('"') || /quote|testimonial/i.test(title)) return "quote";
  if (body.length < 30 && headline.length < 30) return "divider";
  if (body.split(/\n|•|·/).filter(s => s.trim().length > 0).length >= 3) return "bullets";
  return "split";
}

/** Best on-slide body text: headline > body > first bullet. */
function bodyText(slide: any): string {
  if (slide.headline) return String(slide.headline);
  if (typeof slide.body === "string") return slide.body;
  if (Array.isArray(slide.bullets) && slide.bullets.length) return slide.bullets[0];
  return "";
}

/** Best bullet list for a slide. */
function bulletItems(slide: any): string[] {
  if (Array.isArray(slide.bullets)) {
    return slide.bullets.map((b: any) => String(b ?? "").trim()).filter(Boolean).slice(0, 6);
  }
  return String(slide.body || "").split(/\n|•|·/).map((s: string) => s.trim()).filter(Boolean).slice(0, 6);
}

function buildSlide(pptx: any, slide: any, theme: Theme, layout: string, footer: string, slideNum: number, coverImage?: string) {
  const s = pptx.addSlide();
  s.background = { color: theme.bg };

  // Top accent bar
  s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.18, fill: { color: theme.accent } });

  if (layout === "hero") {
    // Hero: full-bleed image with overlay title
    if (coverImage) {
      try {
        s.addImage({ path: coverImage, x: 0, y: 0.18, w: 13.33, h: 7.32, sizing: { type: "cover", w: 13.33, h: 7.32 } });
        // Dark overlay for text legibility
        s.addShape("rect", { x: 0, y: 4.5, w: 13.33, h: 3.0, fill: { color: "000000", transparency: 50 } });
        s.addText(String(slide.title || ""), {
          x: 0.6, y: 5.0, w: 12.1, h: 1.6,
          fontFace: theme.fontHead, fontSize: 44, bold: true, color: "FFFFFF",
        });
        if (slide.body) {
          s.addText(String(slide.body), {
            x: 0.6, y: 6.5, w: 12.1, h: 0.8,
            fontFace: theme.fontBody, fontSize: 16, color: "FFFFFF",
          });
        }
      } catch (e) {
        console.warn("Hero image failed, falling back to text-only:", e);
        renderTextOnlyTitle(s, slide, theme);
      }
    } else {
      renderTextOnlyTitle(s, slide, theme);
    }
  } else if (layout === "stat") {
    const m = String(slide.body || "").match(/(\d[\d,.\s]*%?)/);
    const stat = m ? m[1] : "★";
    const caption = String(slide.body || "").replace(stat, "").trim() || String(slide.title || "");
    s.addText(stat, {
      x: 0.6, y: 1.6, w: 12.1, h: 3.5,
      fontFace: theme.fontHead, fontSize: 160, bold: true, color: theme.accent,
      align: "center",
    });
    s.addText(caption, {
      x: 0.6, y: 5.4, w: 12.1, h: 1.5,
      fontFace: theme.fontBody, fontSize: 22, color: theme.ink, align: "center",
    });
  } else if (layout === "quote") {
    s.addText(`"${String(slide.body || slide.title || "").replace(/^"|"$/g, "")}"`, {
      x: 1.2, y: 1.8, w: 10.9, h: 4.0,
      fontFace: theme.fontHead, fontSize: 32, italic: true, color: theme.ink,
      align: "center", valign: "middle",
    });
    if (slide.attribution) {
      s.addText(`— ${slide.attribution}`, {
        x: 1.2, y: 6.0, w: 10.9, h: 0.6,
        fontFace: theme.fontBody, fontSize: 16, color: theme.muted, align: "center",
      });
    }
  } else if (layout === "divider") {
    s.background = { color: theme.accent };
    s.addText(String(slide.title || ""), {
      x: 0.6, y: 3.0, w: 12.1, h: 1.5,
      fontFace: theme.fontHead, fontSize: 48, bold: true, color: "FFFFFF", align: "center",
    });
    if (slide.body) {
      s.addText(String(slide.body), {
        x: 0.6, y: 4.5, w: 12.1, h: 1.0,
        fontFace: theme.fontBody, fontSize: 18, color: "FFFFFF", align: "center",
      });
    }
  } else if (layout === "bullets") {
    s.addText(String(slide.title || ""), {
      x: 0.6, y: 0.6, w: 12.1, h: 1.0,
      fontFace: theme.fontHead, fontSize: 28, bold: true, color: theme.ink,
    });
    const items = String(slide.body || "").split(/\n|•|·/).map((s: string) => s.trim()).filter(Boolean);
    items.slice(0, 6).forEach((item: string, i: number) => {
      const yPos = 1.9 + i * 0.85;
      s.addShape("ellipse", { x: 0.6, y: yPos + 0.1, w: 0.4, h: 0.4, fill: { color: theme.accent } });
      s.addText(String(i + 1), {
        x: 0.6, y: yPos + 0.1, w: 0.4, h: 0.4,
        fontFace: theme.fontBody, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle",
      });
      s.addText(item, {
        x: 1.3, y: yPos, w: 11.4, h: 0.7,
        fontFace: theme.fontBody, fontSize: 18, color: theme.ink, valign: "middle",
      });
    });
  } else {
    // split (default): title top, body left
    s.addText(String(slide.title || ""), {
      x: 0.6, y: 0.6, w: 12.1, h: 1.0,
      fontFace: theme.fontHead, fontSize: 30, bold: true, color: theme.ink,
    });
    s.addText(String(slide.body || ""), {
      x: 0.6, y: 1.9, w: 12.1, h: 4.8,
      fontFace: theme.fontBody, fontSize: 18, color: theme.ink, valign: "top",
    });
  }

  // Footer
  s.addShape("rect", { x: 0, y: 7.32, w: 13.33, h: 0.18, fill: { color: theme.accentLight } });
  s.addText(`${footer}   ·   ${slideNum}`, {
    x: 0.6, y: 7.18, w: 12.1, h: 0.3,
    fontFace: theme.fontBody, fontSize: 9, color: theme.muted, italic: true,
  });

  if (slide.speaker_notes) s.addNotes(String(slide.speaker_notes));
}

function renderTextOnlyTitle(s: any, slide: any, theme: Theme) {
  s.addText(String(slide.title || ""), {
    x: 0.6, y: 2.5, w: 12.1, h: 2.0,
    fontFace: theme.fontHead, fontSize: 52, bold: true, color: theme.accent, align: "center",
  });
  if (slide.body) {
    s.addText(String(slide.body), {
      x: 0.6, y: 4.6, w: 12.1, h: 1.5,
      fontFace: theme.fontBody, fontSize: 20, color: theme.ink, align: "center",
    });
  }
}

/** Look up the slides array from content_json given an asset_key. */
function findSlides(content: any, assetKey: string): any[] {
  const candidates = [
    assetKey,
    `${assetKey}.slides`,
    "slides",
    "workshop.slides",
    "corporate_lunch.slides",
    "pitch_deck.slides",
    "sponsor_deck.slides",
  ];
  for (const c of candidates) {
    const v = pluck(content, c);
    if (Array.isArray(v) && v.length > 0) return v;
    if (v && Array.isArray(v.slides)) return v.slides;
  }
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await userClient.auth.getClaims(token);
    if (!claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;

    const { node_id, asset_key = "*", theme: themeName = "editorial" } = await req.json();
    if (!node_id) throw new Error("node_id required");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await admin
      .from("author_profiles").select("id, pen_name").eq("user_id", userId).maybeSingle();
    if (!profile) throw new Error("Author profile not found");

    const { data: node } = await admin
      .from("author_nodes")
      .select("content_json, node_name, personalised_name")
      .eq("author_id", profile.id)
      .eq("node_id", node_id)
      .maybeSingle();
    if (!node?.content_json) throw new Error(`No content for node ${node_id}`);

    const slides = findSlides(node.content_json, asset_key);
    if (!slides.length) throw new Error(`No slides found at ${asset_key}`);

    const theme = THEMES[themeName] || THEMES.editorial;
    const penName = profile.pen_name || "Author";
    const deckTitle = node.personalised_name || node.node_name || "Presentation";

    // Try to fetch / generate a cover image (non-fatal if it fails)
    let coverImage: string | undefined;
    try {
      const coverRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-cover-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          author_id: profile.id, node_id, asset_key, variant: "cover",
        }),
      });
      if (coverRes.ok) {
        const j = await coverRes.json();
        if (j.url) coverImage = j.url;
      }
    } catch (e) {
      console.warn("Cover image fetch failed (non-fatal):", e);
    }

    const pptx = new PptxGenJS();
    pptx.author = penName;
    pptx.title = deckTitle;
    pptx.layout = "LAYOUT_WIDE";

    const footer = `${penName} — ${deckTitle}`;
    slides.forEach((slide: any, i: number) => {
      const layout = pickLayout(slide, i, slides.length);
      buildSlide(pptx, slide, theme, layout, footer, i + 1, i === 0 ? coverImage : undefined);
    });

    const base64 = await pptx.write({ outputType: "base64" }) as string;
    const filename = `${penName.replace(/\s+/g, "_")}_${node_id}_${themeName}.pptx`;

    return new Response(JSON.stringify({ success: true, filename, base64 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("export-pro-slides error:", errMessage);
    return new Response(JSON.stringify({ success: false, error: errMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
