/**
 * render-library-asset — Sprint 54
 *
 * Single shared function that produces the uniform `library_asset` record
 * for any node's publish step. See:
 *   docs/02-business-rules/02-node-readiness-gates-full-spec.md
 *   mem://business/uniform-readiness-contract
 *
 * Modes:
 *   - mode = "register"  : caller has already uploaded the primary file
 *                          (and optionally pdf/txt) and just wants the
 *                          library_asset object stamped + history pushed.
 *   - mode = "txt_only"  : we generate a TXT export from `text` and upload
 *                          it; useful as a minimum-viable adoption path
 *                          for builders that don't yet emit DOCX/PDF.
 *
 * Full DOCX + PDF + PPTX rendering is out of scope for this scaffold and
 * will be filled in per-category sprint (BP, then BA, then YR).
 *
 * The function NEVER mutates author_nodes itself — callers do the upsert
 * with the returned library_asset payload. This keeps rollbacks easy and
 * preserves the existing builder publish flows.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PAID_NODES = new Set([
  "BP-06", "BP-07",
  "BA-10", "BA-12", "BA-13", "BA-17",
  "YR-19", "YR-21", "YR-22", "YR-23", "YR-25",
]);

const REQUIRED_KIND: Record<string, string> = {
  "BP-01": "email_sequence", "BP-02": "docx", "BP-03": "docx",
  "BP-04": "external_url", "BP-05": "pptx", "BP-06": "docx",
  "BP-07": "docx", "BP-08": "docx", "BP-09": "external_url",
  "BA-10": "docx", "BA-11": "audio_zip", "BA-12": "docx",
  "BA-13": "docx", "BA-14": "podcast_pack", "BA-15": "docx",
  "BA-16": "docx", "BA-17": "docx", "BA-18": "docx",
  "YR-19": "docx", "YR-20": "docx", "YR-21": "pptx",
  "YR-22": "pptx", "YR-23": "docx", "YR-24": "docx",
  "YR-25": "docx", "YR-26": "docx", "YR-27": "docx",
  "YR-28": "docx",
};

function bucketFor(nodeId: string): string {
  return PAID_NODES.has(nodeId) ? "library-assets" : "library-assets-public";
}

interface RegisterBody {
  mode: "register";
  author_id: string;
  node_id: string;
  title: string;
  url: string;            // primary file public/signed URL
  pdf_url?: string;
  txt_url?: string;
  kind?: string;          // optional override; default = REQUIRED_KIND[node_id]
}

interface TxtOnlyBody {
  mode: "txt_only";
  author_id: string;
  node_id: string;
  title: string;
  text: string;           // raw TXT body to upload as the primary file
}

type Body = RegisterBody | TxtOnlyBody;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    if (!body.author_id || !body.node_id || !body.title) {
      return json({ success: false, status: 400, message: "missing fields" }, 400);
    }
    const requiredKind = REQUIRED_KIND[body.node_id];
    if (!requiredKind) {
      return json({ success: false, status: 400, message: `unknown node ${body.node_id}` }, 400);
    }

    let asset;

    if (body.mode === "register") {
      asset = {
        kind: body.kind ?? requiredKind,
        url: body.url,
        pdf_url: body.pdf_url ?? null,
        txt_url: body.txt_url ?? null,
        title: body.title,
        saved_at: new Date().toISOString(),
      };
    } else if (body.mode === "txt_only") {
      const bucket = bucketFor(body.node_id);
      const path = `${body.author_id}/${body.node_id}/${Date.now()}.txt`;
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, new Blob([body.text], { type: "text/plain" }), {
          contentType: "text/plain",
          upsert: true,
        });
      if (upErr) return json({ success: false, status: 500, message: upErr.message }, 500);

      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const url = pub.publicUrl;

      asset = {
        kind: requiredKind,
        url,
        pdf_url: null,
        txt_url: url,
        title: body.title,
        saved_at: new Date().toISOString(),
      };
    } else {
      return json({ success: false, status: 400, message: "invalid mode" }, 400);
    }

    return json({ success: true, status: 200, message: "ok", library_asset: asset });
  } catch (e) {
    return json({ success: false, status: 500, message: String((e as Error).message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
