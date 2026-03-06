import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Platform-specific dimensions and style guidance
const PLATFORM_SPECS: Record<string, { width: number; height: number; label: string }> = {
  instagram: { width: 1080, height: 1350, label: "Instagram (4:5)" },
  linkedin: { width: 1200, height: 627, label: "LinkedIn (1.91:1)" },
  facebook: { width: 1200, height: 630, label: "Facebook (1.91:1)" },
  x: { width: 1200, height: 675, label: "X/Twitter (16:9)" },
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

    const { platform, imagePrompt, bookTitle, bookCoverUrl, caption } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const spec = PLATFORM_SPECS[platform] || PLATFORM_SPECS.instagram;

    // Build a detailed prompt for the image generation model
    const prompt = `Create a professional, visually striking social media graphic for ${spec.label}.

DESIGN BRIEF:
- This is a social media post graphic for promoting the book "${bookTitle}"
- Visual concept: ${imagePrompt || "A modern, eye-catching design with bold typography"}
- The graphic should look like a professionally designed social media post
- Use bold, readable typography if including any text
- Modern color palette with high contrast
- Clean, professional layout suitable for ${platform}
- Do NOT include any actual text/words in the image - just create a compelling visual/illustration
- The style should be polished, editorial quality — not AI-looking
- Aspect ratio must be exactly ${spec.width}x${spec.height} pixels

${bookCoverUrl ? `The book cover is available but DO NOT try to reproduce it — instead create an original illustration inspired by the book's themes.` : ""}

Make it scroll-stopping and visually compelling for ${platform}.`;

    // Build request - include book cover as reference if available
    const messageContent: any[] = [{ type: "text", text: prompt }];
    
    if (bookCoverUrl) {
      messageContent.push({
        type: "image_url",
        image_url: { url: bookCoverUrl }
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: messageContent,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI image error:", response.status, t);
      return new Response(JSON.stringify({ error: "Image generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "No image generated" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Extract base64 data and upload to storage
    const base64Match = imageUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!base64Match) {
      return new Response(JSON.stringify({ error: "Invalid image format" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const imageFormat = base64Match[1];
    const base64Data = base64Match[2];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const fileName = `${user.id}/${crypto.randomUUID()}.${imageFormat}`;
    
    // Use service role to upload
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    
    const { error: uploadError } = await serviceClient.storage
      .from("social-media-graphics")
      .upload(fileName, binaryData, {
        contentType: `image/${imageFormat}`,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to save image" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: publicUrlData } = serviceClient.storage
      .from("social-media-graphics")
      .getPublicUrl(fileName);

    return new Response(JSON.stringify({ 
      imageUrl: publicUrlData.publicUrl,
      platform,
      dimensions: `${spec.width}x${spec.height}`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("generate-social-graphic error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
