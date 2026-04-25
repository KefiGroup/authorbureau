import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * generate-cover-image
 * ─────────────────────────────────────────────
 * Generates a branded hero/divider image via Lovable AI Gateway (Gemini 3
 * image preview), and caches it in the public `social-media-graphics`
 * bucket keyed by `{author_id}/{node_id}/{asset_key}_{variant}.png`.
 *
 * Body:
 *   { author_id, node_id, asset_key, variant?: "cover" | "divider", prompt?, force? }
 * Returns:
 *   { url: string, cached: boolean }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { author_id, node_id, asset_key, variant = "cover", prompt: customPrompt, force } = body || {};
    if (!author_id || !node_id || !asset_key) {
      return new Response(JSON.stringify({ error: "author_id, node_id, asset_key required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const path = `${author_id}/${node_id}/${asset_key}_${variant}.png`;

    // ── 1. Cache check ──
    if (!force) {
      const { data: existing } = await supabase.storage
        .from("social-media-graphics")
        .list(`${author_id}/${node_id}`, { search: `${asset_key}_${variant}.png` });
      if (existing && existing.length > 0) {
        const { data: pub } = supabase.storage.from("social-media-graphics").getPublicUrl(path);
        return new Response(JSON.stringify({ url: pub.publicUrl, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── 2. Build prompt ──
    let prompt = customPrompt;
    if (!prompt) {
      const { data: ctx } = await supabase
        .from("author_context")
        .select("book_title, core_thesis")
        .eq("author_id", author_id)
        .maybeSingle();
      const thesis = ctx?.core_thesis || "professional non-fiction";
      const title = ctx?.book_title || "presentation";
      prompt = variant === "cover"
        ? `Editorial magazine-style cover image for a presentation titled "${title}". Theme: ${thesis}. Abstract, sophisticated, cinematic lighting, deep navy and warm gold accents, no text, no people's faces. Wide 16:9 composition.`
        : `Minimal abstract section divider image. Theme: ${thesis}. Soft gradient, navy and gold, no text, no figures. Wide 16:9.`;
    }

    // ── 3. Generate via Lovable AI ──
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI image gen failed:", aiRes.status, t);
      if (aiRes.status === 429 || aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI quota exceeded. Try again later." }), {
          status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI image gen failed: ${aiRes.status}`);
    }

    const aiJson = await aiRes.json();
    const imageData = aiJson.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageData?.startsWith("data:image")) throw new Error("No image returned");

    // ── 4. Upload to bucket ──
    const base64 = imageData.split(",")[1];
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const { error: upErr } = await supabase.storage
      .from("social-media-graphics")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from("social-media-graphics").getPublicUrl(path);
    return new Response(JSON.stringify({ url: pub.publicUrl, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("generate-cover-image error:", errMessage);
    return new Response(JSON.stringify({ error: errMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
