import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore - npm specifier
import PptxGenJS from "https://esm.sh/pptxgenjs@3.12.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { author_id, deck } = await req.json();
    if (!author_id || !deck) throw new Error("author_id and deck are required");
    if (deck !== "workshop" && deck !== "corporate_lunch") throw new Error("deck must be 'workshop' or 'corporate_lunch'");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: author } = await supabase.from("author_profiles").select("pen_name").eq("id", author_id).single();
    const { data: node } = await supabase.from("author_nodes").select("content_json").eq("author_id", author_id).eq("node_id", "BP-09").single();
    if (!node?.content_json) throw new Error("BP-09 toolkit not found");

    const content = node.content_json as any;
    const slides = content?.[deck]?.slides || [];
    if (!slides.length) throw new Error(`No ${deck} slides found. Generate the toolkit first.`);

    const penName = author?.pen_name || "Author";
    const kitTitle = content?.kit_title || "Book Sales kit";
    const buyUrl: string = String(content?.amazon_url || content?.bookstore_url || "").trim();

    const pptx = new PptxGenJS();
    pptx.author = penName;
    pptx.title = kitTitle;
    pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5

    const accent = "1E2761";
    const accentLight = "CADCFC";
    const ink = "1A1A2E";

    for (let idx = 0; idx < slides.length; idx++) {
      const s = slides[idx];
      const isLast = idx === slides.length - 1;
      const slide = pptx.addSlide();
      slide.background = { color: "FFFFFF" };

      // Top accent bar
      slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.35, fill: { color: accent } });

      // Title
      slide.addText(String(s.title || ""), {
        x: 0.6, y: 0.7, w: 12.1, h: 1.0,
        fontFace: "Calibri", fontSize: 32, bold: true, color: ink,
      });

      // Body — append the buy URL on the final slide so audiences can act
      const bodyText = isLast && buyUrl
        ? `${String(s.body || "")}\n\nGet the book: ${buyUrl}`
        : String(s.body || "");
      slide.addText(bodyText, {
        x: 0.6, y: 1.9, w: 12.1, h: 4.8,
        fontFace: "Calibri", fontSize: 20, color: ink, valign: "top",
      });

      // Footer
      slide.addShape("rect", { x: 0, y: 7.15, w: 13.33, h: 0.35, fill: { color: accentLight } });
      const footerText = buyUrl
        ? `${penName} — ${kitTitle}   ·   Slide ${s.n}   ·   ${buyUrl}`
        : `${penName} — ${kitTitle}   ·   Slide ${s.n}`;
      slide.addText(footerText, {
        x: 0.6, y: 7.18, w: 12.1, h: 0.3,
        fontFace: "Calibri", fontSize: 10, color: accent, italic: true,
      });

      // Speaker notes
      if (s.speaker_notes) slide.addNotes(String(s.speaker_notes));
    }

    // pptxgenjs returns a Promise<string> with base64 when writeType is base64
    const base64 = await pptx.write({ outputType: "base64" }) as string;
    const filename = `${penName.replace(/\s+/g, "_")}_${deck}_deck.pptx`;

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
