/**
 * Sprint 55 — Publish helper that uploads a node's deliverable files to the
 * `library-assets` (paid) or `library-assets-public` (free) Supabase storage
 * bucket and registers them via the `render-library-asset` edge function.
 *
 * Returns the canonical `library_asset` record so callers can stash it on
 * their content_json before invoking `save-author-node:publish`. The publish
 * endpoint will preserve any caller-written `library_asset` and only fall
 * back to its conservative `deriveLibraryAsset` synthesis if absent.
 *
 * Reference implementation: BP-06 Workbook (Sprint 55). Builders for the
 * other 27 nodes will follow the same pattern with their own primary file
 * + optional pdf/txt.
 */
import { supabase } from "@/integrations/supabase/client";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

const PAID_BUCKET = "library-assets";
const FREE_BUCKET = "library-assets-public";
const PAID_NODES = new Set([
  "BP-06", "BP-07", "BA-10", "BA-12", "BA-13", "BA-17",
  "YR-19", "YR-21", "YR-22", "YR-23", "YR-25",
]);

export interface LibraryAsset {
  kind: string;
  url: string;
  pdf_url: string | null;
  txt_url: string | null;
  title: string;
  saved_at: string;
}

interface UploadInput {
  authorId: string;
  nodeId: string;
  /** Display title for the library row — e.g. workbook_title. */
  title: string;
  /** Primary deliverable (.docx for workbook, .pptx for slides, etc.). */
  primary: { blob: Blob; filename: string; kind: string };
  /** Optional companion files for the three-format output policy. */
  pdf?: { blob: Blob; filename: string };
  /** Optional plain-text variant. If a string is provided we upload it as .txt. */
  txt?: { blob: Blob; filename: string } | { text: string; filename?: string };
  /**
   * Treat as a paid node if true (private bucket + signed URL).
   * Defaults to PAID_NODES.has(nodeId).
   */
  isPaid?: boolean;
}

async function uploadOne(
  bucket: string,
  path: string,
  blob: Blob,
  contentType: string,
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType, upsert: true });
  if (error) throw new Error(`storage upload failed (${path}): ${error.message}`);
  if (bucket === PAID_BUCKET) {
    // Long-lived signed URL — paid deliverables stay private but the author
    // (and admin) can re-download from their library tab.
    const { data, error: signErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year
    if (signErr || !data?.signedUrl) {
      throw new Error(`signed-url failed (${path}): ${signErr?.message ?? "no url"}`);
    }
    return data.signedUrl;
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Uploads the supplied files and returns the canonical library_asset record.
 * Caller is responsible for merging it onto content_json before publish.
 */
export async function uploadAndRegisterLibraryAsset(
  input: UploadInput,
): Promise<LibraryAsset> {
  const { authorId, nodeId, title, primary, pdf, txt } = input;
  const isPaid = input.isPaid ?? PAID_NODES.has(nodeId);
  const bucket = isPaid ? PAID_BUCKET : FREE_BUCKET;
  const stamp = Date.now();
  const folder = `${authorId}/${nodeId}/${stamp}`;

  const primaryUrl = await uploadOne(
    bucket,
    `${folder}/${primary.filename}`,
    primary.blob,
    blobMime(primary.filename),
  );

  let pdfUrl: string | null = null;
  if (pdf) {
    pdfUrl = await uploadOne(bucket, `${folder}/${pdf.filename}`, pdf.blob, "application/pdf");
  }

  let txtUrl: string | null = null;
  if (txt) {
    const txtBlob = "text" in txt ? new Blob([txt.text], { type: "text/plain" }) : txt.blob;
    const txtName = "text" in txt ? (txt.filename ?? "transcript.txt") : txt.filename;
    txtUrl = await uploadOne(bucket, `${folder}/${txtName}`, txtBlob, "text/plain");
  }

  // Stamp the canonical record server-side so the kind validation stays in
  // one place. If the edge call fails for any reason we still return a
  // locally-constructed asset so publish can proceed.
  const fallback: LibraryAsset = {
    kind: primary.kind,
    url: primaryUrl,
    pdf_url: pdfUrl,
    txt_url: txtUrl,
    title,
    saved_at: new Date(stamp).toISOString(),
  };

  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const token = (await getActiveToken()) ?? anonKey;
    const res = await fetchWithTimeout(
      `https://${projectId}.supabase.co/functions/v1/render-library-asset`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode: "register",
          author_id: authorId,
          node_id: nodeId,
          title,
          url: primaryUrl,
          pdf_url: pdfUrl,
          txt_url: txtUrl,
          kind: primary.kind,
        }),
      },
      30_000,
    );
    const parsed = await res.json().catch(() => null);
    if (res.ok && parsed?.library_asset) return parsed.library_asset as LibraryAsset;
    console.warn("[publish-library-asset] register fallback", { status: res.status, parsed });
  } catch (err) {
    console.warn("[publish-library-asset] register failed, using local asset", err);
  }
  return fallback;
}

function blobMime(filename: string): string {
  if (filename.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (filename.endsWith(".pptx"))
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (filename.endsWith(".pdf")) return "application/pdf";
  if (filename.endsWith(".txt")) return "text/plain";
  if (filename.endsWith(".zip")) return "application/zip";
  if (filename.endsWith(".mp3")) return "audio/mpeg";
  return "application/octet-stream";
}
