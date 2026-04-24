import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_SPECS: Record<string, { width: number; height: number; label: string; aspect: string }> = {
  instagram: { width: 1080, height: 1080, label: "Instagram (1:1 square)", aspect: "1:1 square" },
  instagram_story: { width: 1080, height: 1920, label: "Instagram Story (9:16)", aspect: "9:16 vertical" },
  linkedin: { width: 1200, height: 627, label: "LinkedIn landscape", aspect: "1.91:1 landscape" },
  facebook: { width: 1200, height: 630, label: "Facebook landscape", aspect: "1.91:1 landscape" },
  x: { width: 1200, height: 675, label: "X / Twitter landscape", aspect: "16:9 landscape" },
};

type TemplateId =
  | "quote_card"
  | "hero_visual"
  | "headline_block"
  | "author_spotlight"
  | "stat_highlight"
  | "book_cover_feature";

const TEMPLATE_BRIEFS: Record<TemplateId, string> = {
  quote_card:
    "QUOTE CARD layout: A clean editorial design with a large opening quote-mark glyph, the headline rendered as a prominent serif pull-quote (centered, 3-5 lines max), author attribution in small caps below, subtle author photo as a small circular avatar in the bottom-left, and a book title micro-credit in the bottom-right.",
  hero_visual:
    "HERO VISUAL layout: A premium magazine-style cover. The AI background occupies the full canvas. Apply a soft dark gradient at the bottom for legibility. Place the headline in a bold large display sans-serif on the lower third (left-aligned, max 4 lines), with a thin colored accent line above it in the brand color. Author name appears below the headline in small caps.",
  headline_block:
    "HEADLINE BLOCK layout: Split composition — the AI background on top 60%, a solid brand-color block on bottom 40% containing the headline in large bold white sans-serif. Add a small author photo (circular) and author name in the bottom-left corner of the colored block.",
  author_spotlight:
    "AUTHOR SPOTLIGHT layout: A large circular author headshot on the left (40% of canvas), and a clean cream/off-white text panel on the right with the headline in elegant serif, the author name in display sans-serif below, and the book title as a small credit at the bottom. Use the brand color as a thin border accent around the headshot.",
  stat_highlight:
    "STAT HIGHLIGHT layout: A bold massive number or short stat (extracted from the headline) rendered ultra-large in the brand color, centered. Below it, the rest of the headline in smaller dark sans-serif text. Author photo + name as small footer credit. Background is a subtle textured neutral.",
  book_cover_feature:
    "BOOK COVER FEATURE layout: The book cover image on the right (rendered with a realistic 3D book mockup — soft shadow, slight tilt). On the left, a clean text panel with the headline in display serif, author name below in small caps, and a subtle brand-color CTA button reading 'Get the book'.",
};

interface ComposeRequest {
  platform: keyof typeof PLATFORM_SPECS;
  template: TemplateId;
  headline: string;          // The text to burn in (post hook / pull quote)
  authorName: string;
  authorPhotoUrl?: string | null;
  bookTitle?: string;
  bookCoverUrl?: string | null;
  brandColor?: string;       // hex, e.g. "#D4A843"
  mood?: string;             // optional mood/style hint for background
  // If reusing an existing AI background to only re-burn-in text:
  existingBackgroundUrl?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ComposeRequest = await req.json();
    const {
      platform, template, headline, authorName,
      authorPhotoUrl, bookTitle, bookCoverUrl,
      brandColor = "#D4A843", mood, existingBackgroundUrl,
    } = body;

    if (!headline || !platform || !template) {
      return new Response(JSON.stringify({ error: "Missing required fields: headline, platform, template" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const spec = PLATFORM_SPECS[platform] || PLATFORM_SPECS.instagram;
    const brief = TEMPLATE_BRIEFS[template] || TEMPLATE_BRIEFS.quote_card;

    // Step 1 — Get a background. Either reuse the existing one (cheap re-composite)
    // or generate a fresh on-brand AI background (expensive).
    let backgroundUrl: string | null = existingBackgroundUrl ?? null;

    if (!backgroundUrl) {
      const bgPrompt = `Create a premium, abstract, on-brand background image for a social media graphic.
ASPECT: ${spec.aspect} (${spec.width}x${spec.height}px).
BRAND COLOR: ${brandColor} should appear subtly in the palette.
MOOD: ${mood || "sophisticated, premium, editorial, calm"}.
DO NOT include any text, words, letters, or typography. Pure visual texture / abstract composition only.
Style: think Apple keynote backgrounds, premium magazine spreads, soft gradients with subtle organic shapes.`;

      const bgRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: bgPrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!bgRes.ok) {
        const t = await bgRes.text();
        if (bgRes.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (bgRes.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Workspace Settings." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        console.error("Background gen error:", bgRes.status, t);
        return new Response(JSON.stringify({ error: "Background generation failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const bgData = await bgRes.json();
      backgroundUrl = bgData.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
      if (!backgroundUrl) {
        return new Response(JSON.stringify({ error: "No background image returned" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Step 2 — Compose: feed background + (optional) author photo + book cover into Nano Banana Pro
    // and instruct it to render the layout WITH crisp typography.
    const composePrompt = `You are a senior brand designer composing a final social media graphic.

CANVAS: ${spec.label} (${spec.width}x${spec.height}px).
BRAND COLOR: ${brandColor} (use as primary accent).
LAYOUT: ${brief}

HEADLINE TEXT TO RENDER (must appear EXACTLY, spelled correctly, fully visible, no truncation):
"${headline}"

AUTHOR NAME TO RENDER (must appear correctly): "${authorName}"
${bookTitle ? `BOOK TITLE TO RENDER: "${bookTitle}"` : ""}

REQUIREMENTS:
- Use the attached background image as the base/atmosphere.
- ${authorPhotoUrl ? "Use the attached author photo for the author headshot circle." : "Do not invent an author photo — use a stylish initials monogram instead."}
- ${bookCoverUrl ? "Use the attached book cover image faithfully." : "If a book cover is referenced in the layout, use a generic premium book mockup."}
- Typography MUST be crisp, perfectly legible, and professionally kerned. NO blurry, garbled, or duplicated letters.
- Color contrast must guarantee readability (use semi-opaque dark scrim if needed behind text).
- Premium magazine quality. NOT AI-looking. NOT cluttered.
- Output the final composed image at the exact aspect ratio.`;

    const messageContent: any[] = [
      { type: "text", text: composePrompt },
      { type: "image_url", image_url: { url: backgroundUrl } },
    ];
    if (authorPhotoUrl) messageContent.push({ type: "image_url", image_url: { url: authorPhotoUrl } });
    if (bookCoverUrl) messageContent.push({ type: "image_url", image_url: { url: bookCoverUrl } });

    const composeRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: messageContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!composeRes.ok) {
      const t = await composeRes.text();
      if (composeRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (composeRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      console.error("Compose error:", composeRes.status, t);
      return new Response(JSON.stringify({ error: "Composition failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const composeData = await composeRes.json();
    const finalDataUrl: string | undefined = composeData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!finalDataUrl) {
      return new Response(JSON.stringify({ error: "No composed image returned" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 3 — Upload composed image
    const m = finalDataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!m) {
      return new Response(JSON.stringify({ error: "Invalid image data URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const ext = m[1];
    const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
    const fileName = `${user.id}/composed/${crypto.randomUUID()}.${ext}`;

    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error: upErr } = await service.storage
      .from("social-media-graphics")
      .upload(fileName, bytes, { contentType: `image/${ext}`, upsert: false });
    if (upErr) {
      console.error("Upload failed:", upErr);
      return new Response(JSON.stringify({ error: "Upload failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: pub } = service.storage.from("social-media-graphics").getPublicUrl(fileName);

    // Also persist the raw background so re-composes are cheap
    let backgroundPersistedUrl = backgroundUrl;
    if (backgroundUrl?.startsWith("data:")) {
      const bm = backgroundUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (bm) {
        const bgBytes = Uint8Array.from(atob(bm[2]), c => c.charCodeAt(0));
        const bgName = `${user.id}/backgrounds/${crypto.randomUUID()}.${bm[1]}`;
        const { error: bgUpErr } = await service.storage
          .from("social-media-graphics")
          .upload(bgName, bgBytes, { contentType: `image/${bm[1]}`, upsert: false });
        if (!bgUpErr) {
          const { data: bgPub } = service.storage.from("social-media-graphics").getPublicUrl(bgName);
          backgroundPersistedUrl = bgPub.publicUrl;
        }
      }
    }

    return new Response(JSON.stringify({
      imageUrl: pub.publicUrl,
      backgroundUrl: backgroundPersistedUrl,
      platform,
      template,
      dimensions: `${spec.width}x${spec.height}`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("compose-social-post error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
