// Generate a product cover image (workbook, home-study, etc.) that visually
// emulates the parent book cover. Uses Lovable AI Gateway image edit
// (google/gemini-2.5-flash-image / Nano Banana) with the book cover as the
// reference image. Stores the resulting PNG in the `product-covers` bucket
// and writes the public URL to author_nodes.cover_image_url.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRODUCT_KIND_LABELS: Record<string, { ribbon: string; descriptor: string }> = {
  workbook: { ribbon: "COMPANION WORKBOOK", descriptor: "a companion workbook" },
  "home-study": { ribbon: "HOME STUDY COURSE", descriptor: "a home-study course pack" },
  course: { ribbon: "ONLINE COURSE", descriptor: "an online course" },
  "special-edition": { ribbon: "SPECIAL EDITION", descriptor: "a special-edition product" },
  bundle: { ribbon: "BUNDLE", descriptor: "a product bundle" },
  generic: { ribbon: "COMPANION EDITION", descriptor: "a companion product" },
};

function buildPrompt(args: {
  kind: string;
  productTitle: string;
  productSubtitle?: string;
  authorName?: string;
}): string {
  const meta = PRODUCT_KIND_LABELS[args.kind] || PRODUCT_KIND_LABELS.generic;
  return [
    `Create a print-ready 3:4 portrait cover for ${meta.descriptor} that strongly emulates the visual style of the attached book cover.`,
    `Match the same color palette, illustration mood, lighting, typography style, and overall feel as the reference book cover so the two read as a matching set.`,
    `REPLACE the title with: "${args.productTitle}".`,
    args.productSubtitle ? `Use this subtitle: "${args.productSubtitle}".` : "",
    args.authorName ? `Author byline: "${args.authorName}".` : "",
    `Add a small, elegant ribbon or badge at the top reading "${meta.ribbon}".`,
    `Keep the same hero illustration / imagery style as the book cover. Do not invent unrelated imagery.`,
    `High detail, professional book-cover quality, no JPEG artifacts, no spelling mistakes, no extra text, no UI mockups.`,
    `Output a single 3:4 portrait image only.`,
  ].filter(Boolean).join(" ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, status: 500, message: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      authorNodeId,
      productKind = "workbook",
      productTitle,
      productSubtitle,
      authorName,
      force = false,
    } = body || {};

    if (!authorNodeId || !productTitle) {
      return new Response(
        JSON.stringify({ success: false, status: 400, message: "authorNodeId and productTitle are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Load node + book cover
    const { data: node, error: nodeErr } = await admin
      .from("author_nodes")
      .select("id, author_id, book_id, cover_image_url")
      .eq("id", authorNodeId)
      .maybeSingle();

    if (nodeErr || !node) {
      return new Response(
        JSON.stringify({ success: false, status: 404, message: "author_node not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (node.cover_image_url && !force) {
      return new Response(
        JSON.stringify({ success: true, status: 200, message: "already-generated", cover_url: node.cover_image_url }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let bookCoverUrl: string | null = null;
    if (node.book_id) {
      const { data: book } = await admin
        .from("books")
        .select("cover_image_url")
        .eq("id", node.book_id)
        .maybeSingle();
      bookCoverUrl = book?.cover_image_url || null;
    }

    if (!bookCoverUrl) {
      return new Response(
        JSON.stringify({ success: false, status: 422, message: "Parent book has no cover image; cannot derive product cover" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const prompt = buildPrompt({ kind: productKind, productTitle, productSubtitle, authorName });

    // Call Lovable AI Gateway image edit (Nano Banana)
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: bookCoverUrl } },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 502;
      return new Response(
        JSON.stringify({ success: false, status, message: `AI gateway ${aiRes.status}` }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiRes.json();
    const dataUrl: string | undefined = aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      console.error("No image returned", JSON.stringify(aiData).slice(0, 500));
      return new Response(
        JSON.stringify({ success: false, status: 502, message: "AI did not return an image" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Decode base64
    const [header, b64] = dataUrl.split(",");
    const mime = header.match(/data:(.+);base64/)?.[1] || "image/png";
    const ext = mime.includes("jpeg") ? "jpg" : "png";
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    const path = `${node.author_id}/${node.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await admin.storage.from("product-covers").upload(path, bin, {
      contentType: mime,
      upsert: true,
    });
    if (upErr) {
      console.error("Storage upload failed:", upErr);
      return new Response(
        JSON.stringify({ success: false, status: 500, message: `Storage upload failed: ${upErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: pub } = admin.storage.from("product-covers").getPublicUrl(path);
    const coverUrl = pub.publicUrl;

    await admin.from("author_nodes").update({ cover_image_url: coverUrl }).eq("id", node.id);

    return new Response(
      JSON.stringify({ success: true, status: 200, message: "ok", cover_url: coverUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-product-cover error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, status: 500, message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
