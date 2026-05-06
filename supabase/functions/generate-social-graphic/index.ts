import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAiGateway } from "../_shared/builder-helpers.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_SPECS: Record<string, { width: number; height: number; label: string }> = {
  instagram: { width: 1080, height: 1350, label: "Instagram (4:5)" },
  linkedin: { width: 1200, height: 627, label: "LinkedIn (1.91:1)" },
  facebook: { width: 1200, height: 630, label: "Facebook (1.91:1)" },
  x: { width: 1200, height: 675, label: "X/Twitter (16:9)" },
};

const STYLE_PRESETS: Record<string, string> = {
  minimalist: "Clean minimalist design with ample white space, simple geometric shapes, muted color palette, elegant sans-serif typography feel. Think Apple-style aesthetics.",
  editorial: "High-end editorial magazine style with dramatic lighting, rich textures, sophisticated color grading. Think Vogue or Monocle magazine spread.",
  bold: "Bold, punchy design with strong contrast, vibrant saturated colors, dynamic composition, large impactful shapes. Think Nike or Spotify campaign.",
  watercolor: "Soft artistic watercolor illustration style with gentle gradients, organic flowing shapes, hand-painted texture feel, warm inviting palette.",
  "flat-illustration": "Modern flat illustration with clean vector shapes, bright playful colors, friendly characters or icons, geometric patterns. Think Slack or Notion illustrations.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { platform, imagePrompt, bookTitle, bookCoverUrl, caption, style, count } = await req.json();
    const variationCount = Math.min(count || 1, 3);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const spec = PLATFORM_SPECS[platform] || PLATFORM_SPECS.instagram;
    const styleGuide = STYLE_PRESETS[style] || STYLE_PRESETS.minimalist;

    const buildPrompt = (variationIdx: number) => {
      const variationHints = [
        "Use a cool-toned palette with blues and teals.",
        "Use a warm-toned palette with golds, oranges, and earth tones.",
        "Use a high-contrast monochromatic palette with one accent color pop.",
      ];
      const hint = variationCount > 1 ? `\nCOLOR DIRECTION: ${variationHints[variationIdx % 3]}` : "";

      return `Create a premium, scroll-stopping social media graphic for ${spec.label}.

STYLE: ${styleGuide}

DESIGN BRIEF:
- Promoting the book "${bookTitle}"
- Visual concept: ${imagePrompt || "A compelling visual that captures the book's core message"}
- Do NOT include any text, words, letters, or typography in the image
- Create a purely visual illustration/composition
- The result must look like a professional designer created it — NOT AI-generated
- Aspect ratio: ${spec.width}x${spec.height} pixels
${hint}

${bookCoverUrl ? "An image of the book cover is attached as reference for themes/mood — do NOT reproduce it, create something original." : ""}

Make it beautiful, polished, and worthy of a premium brand's feed.`;
    };

    // Generate variations in parallel
    const generateOne = async (idx: number): Promise<string | null> => {
      const prompt = buildPrompt(idx);
      const messageContent: any[] = [{ type: "text", text: prompt }];
      if (bookCoverUrl) {
        messageContent.push({ type: "image_url", image_url: { url: bookCoverUrl } });
      }

      const response = await fetchAiGateway({
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: messageContent }],
          modalities: ["image", "text"],
        }),
      }, "generate-social-graphic");

      if (!response.ok) {
        if (response.status === 429) throw { status: 429, message: "Rate limit exceeded. Please try again shortly." };
        if (response.status === 402) throw { status: 402, message: "AI credits exhausted. Please add credits." };
        const t = await response.text();
        console.error(`AI image error (variation ${idx}):`, response.status, t);
        return null;
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl) return null;

      // Upload to storage
      const base64Match = imageUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (!base64Match) return null;

      const imageFormat = base64Match[1];
      const base64Data = base64Match[2];
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const fileName = `${user!.id}/${crypto.randomUUID()}.${imageFormat}`;

      const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { error: uploadError } = await serviceClient.storage
        .from("social-media-graphics")
        .upload(fileName, binaryData, { contentType: `image/${imageFormat}`, upsert: false });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return null;
      }

      const { data: publicUrlData } = serviceClient.storage
        .from("social-media-graphics")
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    };

    try {
      const promises = Array.from({ length: variationCount }, (_, i) => generateOne(i));
      const results = await Promise.allSettled(promises);
      const imageUrls = results
        .filter((r): r is PromiseFulfilledResult<string | null> => r.status === "fulfilled")
        .map(r => r.value)
        .filter(Boolean) as string[];

      if (imageUrls.length === 0) {
        return new Response(JSON.stringify({ error: "No images generated" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        imageUrl: imageUrls[0], // backwards compat
        imageUrls,
        platform,
        style: style || "minimalist",
        dimensions: `${spec.width}x${spec.height}`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e: any) {
      if (e.status === 429 || e.status === 402) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw e;
    }

  } catch (e) {
    console.error("generate-social-graphic error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
