import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResp(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Resolve user from token – tries Cloud then shared backend */
async function resolveUser(
  adminClient: ReturnType<typeof createClient>,
  token: string
): Promise<{ userId: string; userEmail: string | null } | null> {
  const { data: { user: cloudUser } } = await adminClient.auth.getUser(token);
  if (cloudUser) {
    return { userId: cloudUser.id, userEmail: cloudUser.email ?? null };
  }

  const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
  const { data: { user: sharedUser } } = await sharedClient.auth.getUser(token);
  if (!sharedUser) return null;

  let userId = sharedUser.id;
  const userEmail = sharedUser.email ?? null;

  if (sharedUser.email) {
    const { data: { users } } = await adminClient.auth.admin.listUsers();
    const localMatch = users?.find(
      (u: any) => u.email?.toLowerCase() === sharedUser.email?.toLowerCase()
    );
    if (localMatch) userId = localMatch.id;
  }

  return { userId, userEmail };
}

/** Verify book ownership and return book + authorId */
type VerifiedBook = { id: string; title?: string | null; author_id: string };

async function verifyBookAccess(
  adminClient: ReturnType<typeof createClient>,
  bookId: string,
  userId: string,
  userEmail: string | null
): Promise<VerifiedBook | null> {
  const { data: bookById } = await adminClient
    .from("books").select("id, title, author_id")
    .eq("id", bookId).eq("author_id", userId).maybeSingle();
  if (bookById?.id && bookById?.author_id) return bookById as VerifiedBook;

  if (userEmail) {
    const { data: bookByEmail } = await adminClient
      .from("books").select("id, title, author_id")
      .eq("id", bookId).eq("owner_email", userEmail).maybeSingle();
    if (bookByEmail?.id && bookByEmail?.author_id) return bookByEmail as VerifiedBook;
  }
  return null;
}

/** Strip HTML tags from XHTML content */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse EPUB (ZIP of XHTML) and extract text natively */
async function parseEpubText(fileData: Blob): Promise<string> {
  const arrayBuffer = await fileData.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Find container.xml to get rootfile path
  const containerFile = zip.file("META-INF/container.xml");
  if (!containerFile) throw new Error("Invalid EPUB: missing container.xml");
  const containerXml = await containerFile.async("string");

  // Extract rootfile path (content.opf)
  const rootfileMatch = containerXml.match(/full-path="([^"]+)"/);
  if (!rootfileMatch) throw new Error("Invalid EPUB: no rootfile path");
  const opfPath = rootfileMatch[1];
  const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";

  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error("Invalid EPUB: missing OPF file");
  const opfXml = await opfFile.async("string");

  // Extract manifest items (id -> href mapping)
  const manifest = new Map<string, string>();
  const manifestRegex = /<item\s+[^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*(?:media-type="([^"]+)")?[^>]*\/?>/g;
  let m;
  while ((m = manifestRegex.exec(opfXml)) !== null) {
    manifest.set(m[1], m[2]);
  }

  // Extract spine itemrefs (ordered reading sequence)
  const spineIds: string[] = [];
  const spineRegex = /<itemref\s+[^>]*idref="([^"]+)"[^>]*\/?>/g;
  while ((m = spineRegex.exec(opfXml)) !== null) {
    spineIds.push(m[1]);
  }

  // Read chapters in spine order
  const chapters: string[] = [];
  for (const id of spineIds) {
    const href = manifest.get(id);
    if (!href) continue;

    const filePath = opfDir + decodeURIComponent(href);
    const chapterFile = zip.file(filePath);
    if (!chapterFile) continue;

    const xhtml = await chapterFile.async("string");
    const text = stripHtml(xhtml);
    if (text.length > 10) chapters.push(text);
  }

  // Fallback: if spine didn't yield much, try all xhtml/html files
  if (chapters.join("").length < 200) {
    const allFiles = Object.keys(zip.files).filter(f =>
      f.endsWith(".xhtml") || f.endsWith(".html") || f.endsWith(".htm")
    ).sort();
    for (const f of allFiles) {
      const content = await zip.file(f)!.async("string");
      const text = stripHtml(content);
      if (text.length > 10) chapters.push(text);
    }
  }

  return chapters.join("\n\n");
}

/** Upsert source_material in generated_assets */
async function upsertSourceMaterial(
  adminClient: ReturnType<typeof createClient>,
  bookId: string,
  authorId: string,
  text: string
) {
  const { data: existing } = await adminClient
    .from("generated_assets").select("id")
    .eq("book_id", bookId).eq("author_id", authorId)
    .eq("asset_type", "source_material").maybeSingle();

  if (existing) {
    await adminClient.from("generated_assets")
      .update({ content: text, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await adminClient.from("generated_assets").insert({
      book_id: bookId, author_id: authorId,
      asset_type: "source_material", content: text,
    });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Auth
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const resolved = await resolveUser(adminClient, token);
    if (!resolved) return jsonResp({ error: "Unauthorized" }, 401);

    const { userId, userEmail } = resolved;
    console.log("[parse-manuscript] Resolved userId:", userId, "email:", userEmail);

    const contentType = req.headers.get("content-type") || "";

    // ─── JSON actions: check / remove / upload-text ───
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { action, bookId } = body;

      if (action === "check") {
        if (!bookId) return jsonResp({ error: "bookId required" }, 400);
        const book = await verifyBookAccess(adminClient, bookId, userId, userEmail);
        if (!book) return jsonResp({ exists: false });

        const { data } = await adminClient
          .from("generated_assets").select("id, content")
          .eq("book_id", bookId).eq("author_id", book.author_id)
          .eq("asset_type", "source_material").maybeSingle();

        return jsonResp({
          exists: !!data,
          characterCount: data?.content?.length || 0,
        });
      }

      if (action === "remove") {
        if (!bookId) return jsonResp({ error: "bookId required" }, 400);
        const book = await verifyBookAccess(adminClient, bookId, userId, userEmail);
        if (!book) return jsonResp({ error: "Book not found or access denied" }, 403);

        await adminClient
          .from("generated_assets").delete()
          .eq("book_id", bookId).eq("author_id", book.author_id)
          .eq("asset_type", "source_material");

        const { data: files } = await adminClient.storage
          .from("manuscripts").list(`${book.author_id}/${bookId}`);
        if (files && files.length > 0) {
          await adminClient.storage.from("manuscripts")
            .remove(files.map((f: any) => `${book.author_id}/${bookId}/${f.name}`));
        }

        return jsonResp({ success: true });
      }

      // ─── batch-status: check manuscript + analysis status for multiple books ───
      if (action === "batch-status") {
        const { bookIds } = body;
        if (!bookIds || !Array.isArray(bookIds) || bookIds.length === 0) {
          return jsonResp({ error: "bookIds array required" }, 400);
        }

        const { data: assets } = await adminClient
          .from("generated_assets")
          .select("book_id, asset_type, content")
          .in("book_id", bookIds)
          .in("asset_type", ["source_material", "business_plan"]);

        const manuscripts: string[] = [];
        const analyzed: string[] = [];
        const summaries: Record<string, any> = {};

        (assets || []).forEach((a: any) => {
          if (a.asset_type === "source_material" && !manuscripts.includes(a.book_id)) {
            manuscripts.push(a.book_id);
          }
          if (a.asset_type === "business_plan" && !analyzed.includes(a.book_id)) {
            analyzed.push(a.book_id);
            try {
              summaries[a.book_id] = JSON.parse(a.content);
            } catch {
              // Plan is stored as markdown text — extract summary data from it
              const content = a.content || "";
              const products: Array<{ name: string; node: string; price: string }> = [];
              // Match numbered product lines like "1) **Product Name**" or "1. **Product Name**"
              const productMatches = content.matchAll(/\d+[.)]\s*\*\*([^*]+)\*\*/g);
              for (const m of productMatches) {
                const name = m[1].trim();
                // Skip section headers and non-product lines
                if (name.length > 100 || /section|estimated|projected|goal/i.test(name)) continue;
                // Try to find a price nearby
                const afterMatch = content.slice((m.index || 0), (m.index || 0) + 300);
                const priceMatch = afterMatch.match(/\$([0-9,.]+)/);
                products.push({ name, node: name.toLowerCase(), price: priceMatch ? `$${priceMatch[1]}` : "Free" });
              }
              // Extract revenue range
              const revenueMatch = content.match(/\$([0-9,]+)\s*[-–—]\s*\$([0-9,]+)\s*\/?\s*(?:mo|month)/i);
              summaries[a.book_id] = {
                products,
                annual_projection_low: revenueMatch ? `$${revenueMatch[1]}` : undefined,
                annual_projection_high: revenueMatch ? `$${revenueMatch[2]}` : undefined,
              };
            }
          }
        });

        return jsonResp({ manuscripts, analyzed, summaries });
      }

      // ─── upload-text — accepts pre-extracted text from client ───
      if (action === "upload-text") {
        const { text, fileName } = body;
        if (!bookId || !text) return jsonResp({ error: "bookId and text are required" }, 400);

        const book = await verifyBookAccess(adminClient, bookId, userId, userEmail);
        if (!book) return jsonResp({ error: "Book not found or access denied" }, 403);

        if (text.trim().length < 50) {
          return jsonResp({ error: "Text too short — could not extract enough content." }, 400);
        }

        console.log("[parse-manuscript] upload-text: storing", text.length, "chars for book", bookId);
        await upsertSourceMaterial(adminClient, bookId, book.author_id, text);

        return jsonResp({
          success: true,
          characterCount: text.length,
          preview: text.slice(0, 300) + "...",
        });
      }

      return jsonResp({ error: "Unknown action" }, 400);
    }

    // ─── FormData mode: EPUB file upload with native parsing ───
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const bookId = formData.get("bookId") as string | null;
      const fileName = (formData.get("fileName") as string) || file?.name || "manuscript";

      if (!file || !bookId) return jsonResp({ error: "file and bookId are required" }, 400);

      const book = await verifyBookAccess(adminClient, bookId, userId, userEmail);
      if (!book) return jsonResp({ error: "Book not found or access denied" }, 403);

      const authorId = book.author_id;
      const lowerName = (fileName || "").toLowerCase();

      // Upload to storage
      const safeName = fileName.replace(/[[\]{}()|\\^$*+?#]/g, "_");
      const storagePath = `${authorId}/${bookId}/${safeName}`;
      const fileBytes = await file.arrayBuffer();

      const { error: uploadErr } = await adminClient.storage
        .from("manuscripts")
        .upload(storagePath, fileBytes, {
          upsert: true,
          contentType: file.type || "application/octet-stream",
        });

      if (uploadErr) {
        console.error("Storage upload error:", uploadErr);
        return jsonResp({ error: "Failed to upload file to storage" }, 500);
      }

      // Extract text based on format
      let extractedText = "";

      if (lowerName.endsWith(".epub")) {
        console.log("[parse-manuscript] Native EPUB parsing for", fileName);
        extractedText = await parseEpubText(file);
      } else if (lowerName.endsWith(".txt")) {
        extractedText = await file.text();
      } else {
        // Fallback: shouldn't reach here since client handles PDF/DOCX
        return jsonResp({ error: "Please use a supported format (PDF, DOCX, TXT, EPUB). PDF and DOCX are processed in your browser automatically." }, 400);
      }

      if (!extractedText || extractedText.trim().length < 50) {
        return jsonResp({ error: "Could not extract enough text from this file. Please try a different format." }, 400);
      }

      console.log("[parse-manuscript] Extracted", extractedText.length, "chars from", fileName);
      await upsertSourceMaterial(adminClient, bookId, authorId, extractedText);

      return jsonResp({
        success: true,
        characterCount: extractedText.length,
        preview: extractedText.slice(0, 300) + "...",
      });
    }

    return jsonResp({ error: "Unsupported content type" }, 400);
  } catch (e) {
    console.error("parse-manuscript error:", e);
    return jsonResp({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
