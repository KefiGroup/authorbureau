// @ts-nocheck — Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore - npm specifier
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "https://esm.sh/docx@8.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function p(text: string, opts: any = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    ...opts,
    children: [new TextRun({ text, ...opts.run })],
  });
}

function heading(text: string, level: any) {
  return new Paragraph({
    heading: level, spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true })],
  });
}

function bullet(text: string) {
  return new Paragraph({
    bullet: { level: 0 }, spacing: { after: 60 },
    children: [new TextRun({ text })],
  });
}

function section(label: string, body: string | string[] | undefined) {
  if (!body) return [];
  const out: Paragraph[] = [
    new Paragraph({
      spacing: { before: 120, after: 60 },
      children: [new TextRun({ text: label, bold: true, color: "1E2761" })],
    }),
  ];
  if (Array.isArray(body)) {
    for (const item of body) if (item && String(item).trim()) out.push(bullet(String(item)));
  } else {
    out.push(p(String(body)));
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const token = auth.replace("Bearer ", "");
    const { data: claims } = await userClient.auth.getClaims(token);
    if (!claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;

    const { node_id, book_id, target_minutes, target_slide_count, force_regenerate } = await req.json();
    if (!node_id) throw new Error("node_id required");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await admin
      .from("author_profiles").select("id, pen_name").eq("user_id", userId).maybeSingle();
    if (!profile) throw new Error("Author profile not found");

    let q = admin.from("author_nodes")
      .select("content_json, node_name, personalised_name")
      .eq("author_id", profile.id).eq("node_id", node_id);
    if (book_id) q = q.eq("book_id", book_id);
    const { data: rows } = await q.limit(1);
    let node = rows?.[0];
    if (!node) throw new Error("Node not found.");

    // Auto-generate the speaker script on demand if it's missing.
    if (!node?.content_json?.speaker_script) {
      const genUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-speaker-script`;
      const genRes = await fetch(genUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ author_id: profile.id, book_id: book_id ?? null, node_id }),
      });
      if (!genRes.ok) {
        const txt = await genRes.text();
        throw new Error(`Speaker script generation failed: ${txt.slice(0, 200)}`);
      }
      // Re-fetch the node to get the freshly-stored speaker_script
      let q2 = admin.from("author_nodes")
        .select("content_json, node_name, personalised_name")
        .eq("author_id", profile.id).eq("node_id", node_id);
      if (book_id) q2 = q2.eq("book_id", book_id);
      const { data: rows2 } = await q2.limit(1);
      node = rows2?.[0];
      if (!node?.content_json?.speaker_script) {
        throw new Error("Speaker script could not be generated. Please try again.");
      }
    }

    const script = node.content_json.speaker_script;
    const penName = profile.pen_name || "Author";
    const deckTitle = node.personalised_name || node.node_name || node_id;
    const totalMin = script.total_runtime_minutes ?? "—";

    const children: Paragraph[] = [];

    // Cover
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 240 },
      children: [new TextRun({ text: deckTitle, bold: true, size: 48 })],
    }));
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 120 },
      children: [new TextRun({ text: `Speaker Script for ${penName}`, italics: true, size: 28 })],
    }));
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 480 },
      children: [new TextRun({ text: `Target runtime: ${totalMin} minutes`, size: 22, color: "6B6B7B" })],
    }));

    // Intro
    if (script.intro) {
      children.push(heading("Opening", HeadingLevel.HEADING_1));
      children.push(p(String(script.intro)));
    }

    // Per-slide sections
    for (const slide of script.slides || []) {
      children.push(heading(
        `Slide ${slide.slide_index} · ${slide.title || ""}`,
        HeadingLevel.HEADING_2,
      ));
      if (slide.timing_minutes) {
        children.push(new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: `⏱  ${slide.timing_minutes} minutes`, italics: true, color: "6B6B7B" })],
        }));
      }
      children.push(...section("Opening hook", slide.opening_hook));
      children.push(...section("Transition in", slide.transition_in));
      children.push(...section("Talking points", slide.talking_points));
      children.push(...section("Facilitation prompts", slide.facilitation_prompts));
      children.push(...section("Transition out", slide.transition_out));
      children.push(...section("Closing anchor", slide.closing_anchor));
    }

    // Outro
    if (script.outro) {
      children.push(heading("Closing", HeadingLevel.HEADING_1));
      children.push(p(String(script.outro)));
    }

    // Footer note
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 480 },
      children: [new TextRun({ text: `Prepared by ABBY for ${penName}`, italics: true, size: 18, color: "6B6B7B" })],
    }));

    const doc = new Document({
      creator: penName,
      title: `${deckTitle} — Speaker Script`,
      sections: [{
        properties: { page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } },
        children,
      }],
    });

    const buf = await Packer.toBuffer(doc);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const filename = `${penName.replace(/\s+/g, "_")}_${node_id}_speaker_script.docx`;

    return new Response(JSON.stringify({ success: true, filename, base64 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("export-speaker-script error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
