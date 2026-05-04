import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore - npm specifier
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "https://esm.sh/docx@8.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function H1(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, size: 36, color: "1E2761" })],
    spacing: { before: 240, after: 160 },
  });
}
function H2(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 28, color: "1E2761" })],
    spacing: { before: 200, after: 120 },
  });
}
function P(text: string, opts: { italic?: boolean; bold?: boolean } = {}) {
  return new Paragraph({
    children: [new TextRun({ text, italics: opts.italic, bold: opts.bold, size: 22 })],
    spacing: { after: 120 },
  });
}
function Bullet(text: string) {
  return new Paragraph({
    children: [new TextRun({ text: `• ${text}`, size: 22 })],
    indent: { left: 360 },
    spacing: { after: 80 },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { author_id } = await req.json();
    if (!author_id) throw new Error("author_id is required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: author } = await supabase.from("author_profiles").select("pen_name").eq("id", author_id).single();
    const { data: ctx } = await supabase.from("author_context").select("book_title").eq("author_id", author_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { data: node } = await supabase.from("author_nodes").select("content_json").eq("author_id", author_id).eq("node_id", "BP-08").single();
    if (!node?.content_json) throw new Error("BP-08 special editions not found");

    const content = node.content_json as any;
    const penName = author?.pen_name || "Author";
    const bookTitle = ctx?.book_title || "Your Book";

    const children: Paragraph[] = [];

    // Cover header
    children.push(H1(content?.edition_title || "Special Editions"));
    if (content?.edition_subtitle) children.push(P(content.edition_subtitle));
    children.push(P(`Book: ${bookTitle}`, { italic: true }));
    children.push(P(`Author: ${penName}`, { italic: true }));
    if (content?.tagline) children.push(P(`"${content.tagline}"`, { italic: true }));

    // Editions
    children.push(H2("Editions"));
    const editions = Array.isArray(content?.editions) ? content.editions : [];
    editions.forEach((ed: any, i: number) => {
      children.push(H2(`${ed.number ?? i + 1}. ${ed.name || "Untitled edition"}`));
      if (ed.suggested_price_usd != null) children.push(P(`Suggested price: $${ed.suggested_price_usd} USD`, { bold: true }));
      if (ed.print_specs) children.push(P(`Specs: ${ed.print_specs}`, { italic: true }));
      if (ed.description) children.push(P(ed.description));
      if (Array.isArray(ed.includes) && ed.includes.length) {
        children.push(P("Includes:", { bold: true }));
        ed.includes.forEach((it: string) => children.push(Bullet(it)));
      }
    });

    // Bundle
    if (content?.bundle_offer) {
      const b = content.bundle_offer;
      children.push(H2("Bundle Offer"));
      if (b.name) children.push(P(b.name, { bold: true }));
      if (b.suggested_price_usd != null) children.push(P(`Bundle price: $${b.suggested_price_usd} USD`, { bold: true }));
      if (b.savings_note) children.push(P(b.savings_note, { italic: true }));
      if (b.description) children.push(P(b.description));
    }

    // Who it's for + marketing angle
    if (content?.who_its_for) {
      children.push(H2("Who it's for"));
      children.push(P(content.who_its_for));
    }
    if (content?.marketing_angle) {
      children.push(H2("Marketing angle"));
      children.push(P(content.marketing_angle));
    }
    if (content?.pricing_rationale) {
      children.push(H2("Pricing rationale"));
      children.push(P(content.pricing_rationale));
    }

    // Footer note
    children.push(new Paragraph({
      children: [new TextRun({ text: "Powered by Authors Bureau", italics: true, size: 18, color: "888888" })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
    }));

    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children,
      }],
    });

    const buf = await Packer.toBuffer(doc);
    // base64
    let binary = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);

    const filename = `${penName.replace(/\s+/g, "_")}_special_editions.docx`;
    return new Response(JSON.stringify({ success: true, filename, base64 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("export-bp08-editions-docx error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
