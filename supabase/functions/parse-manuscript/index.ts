import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
  // Try Cloud auth first
  const { data: { user: cloudUser } } = await adminClient.auth.getUser(token);
  if (cloudUser) {
    return { userId: cloudUser.id, userEmail: cloudUser.email ?? null };
  }

  // Fallback: shared backend (SSO sessions)
  const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
  const { data: { user: sharedUser } } = await sharedClient.auth.getUser(token);
  if (!sharedUser) return null;

  let userId = sharedUser.id;
  const userEmail = sharedUser.email ?? null;

  // Map shared user to local Cloud user by email
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
async function verifyBookAccess(
  adminClient: ReturnType<typeof createClient>,
  bookId: string,
  userId: string,
  userEmail: string | null
): Promise<{ id: string; author_id: string } | null> {
  const { data: bookById } = await adminClient
    .from("books").select("id, title, author_id")
    .eq("id", bookId).eq("author_id", userId).maybeSingle();
  if (bookById) return bookById;

  if (userEmail) {
    const { data: bookByEmail } = await adminClient
      .from("books").select("id, title, author_id")
      .eq("id", bookId).eq("owner_email", userEmail).maybeSingle();
    if (bookByEmail) return bookByEmail;
  }
  return null;
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

    // Determine request type: FormData (file upload) or JSON (action)
    const contentType = req.headers.get("content-type") || "";

    // ─── JSON actions: check / remove ───
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { action, bookId } = body;

      if (action === "check") {
        if (!bookId) return jsonResp({ error: "bookId required" }, 400);
        // Find book to get author_id
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

        // Clean up storage files
        const { data: files } = await adminClient.storage
          .from("manuscripts").list(`${book.author_id}/${bookId}`);
        if (files && files.length > 0) {
          await adminClient.storage.from("manuscripts")
            .remove(files.map((f: any) => `${book.author_id}/${bookId}/${f.name}`));
        }

        return jsonResp({ success: true });
      }

      // Legacy JSON mode: { bookId, storagePath, fileName }
      return await handleParse(adminClient, userId, userEmail, body.bookId, body.storagePath, body.fileName);
    }

    // ─── FormData mode: file upload ───
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const bookId = formData.get("bookId") as string | null;
      const fileName = (formData.get("fileName") as string) || file?.name || "manuscript";

      if (!file || !bookId) return jsonResp({ error: "file and bookId are required" }, 400);

      // Verify book access
      const book = await verifyBookAccess(adminClient, bookId, userId, userEmail);
      if (!book) return jsonResp({ error: "Book not found or access denied" }, 403);

      const authorId = book.author_id;

      // Upload to storage using admin client (bypasses RLS)
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

      return await handleParse(adminClient, userId, userEmail, bookId, storagePath, safeName);
    }

    return jsonResp({ error: "Unsupported content type" }, 400);
  } catch (e) {
    console.error("parse-manuscript error:", e);
    return jsonResp({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

/** Core parse logic – downloads from storage, extracts text, saves to generated_assets */
async function handleParse(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  userEmail: string | null,
  bookId: string,
  storagePath: string,
  fileName: string
) {
  if (!bookId || !storagePath) return jsonResp({ error: "bookId and storagePath are required" }, 400);

  const book = await verifyBookAccess(adminClient, bookId, userId, userEmail);
  if (!book) return jsonResp({ error: "Book not found or access denied" }, 403);
  const authorId = book.author_id;

  // Download file from storage
  const { data: fileData, error: downloadErr } = await adminClient.storage
    .from("manuscripts").download(storagePath);
  if (downloadErr || !fileData) {
    console.error("Download error:", downloadErr);
    return jsonResp({ error: "Failed to download manuscript file" }, 500);
  }

  // Extract text
  const lowerName = (fileName || storagePath).toLowerCase();
  let extractedText = "";

  if (lowerName.endsWith(".txt")) {
    extractedText = await fileData.text();
  } else if (lowerName.endsWith(".pdf") || lowerName.endsWith(".docx") || lowerName.endsWith(".doc") || lowerName.endsWith(".epub")) {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const CHUNK = 8192;
    const chunks: string[] = [];
    for (let i = 0; i < uint8Array.length; i += CHUNK) {
      chunks.push(String.fromCharCode(...uint8Array.subarray(i, i + CHUNK)));
    }
    const base64Content = btoa(chunks.join(""));

    if (base64Content.length > 20_000_000) {
      return jsonResp({ error: "File is too large for AI extraction. Please upload a smaller file or use .txt format." }, 400);
    }

    console.log("[parse-manuscript] Base64 size:", base64Content.length, "bytes");

    let mimeType = "application/octet-stream";
    if (lowerName.endsWith(".pdf")) mimeType = "application/pdf";
    else if (lowerName.endsWith(".docx")) mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    else if (lowerName.endsWith(".doc")) mimeType = "application/msword";
    else if (lowerName.endsWith(".epub")) mimeType = "application/epub+zip";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 100000,
        messages: [
          { role: "system", content: "You are a document text extractor. Your ONLY job is to extract ALL text content from the uploaded document and return it exactly as written. Preserve chapter titles, headings, paragraphs, and formatting structure using markdown. Do NOT summarize, do NOT add commentary, do NOT skip any content. Extract EVERY word from cover to cover." },
          { role: "user", content: [
            { type: "text", text: `Extract ALL text from this ${lowerName.split('.').pop()?.toUpperCase()} document. Return the complete text content preserving structure with markdown headings and paragraphs. Do not summarize or skip anything.` },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Content}` } },
          ]},
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI extraction error:", response.status, errText);
      return jsonResp({ error: "Failed to extract text from document. Please try a .txt file instead." }, 500);
    }

    const aiResult = await response.json();
    extractedText = aiResult.choices?.[0]?.message?.content || "";
  } else {
    return jsonResp({ error: "Unsupported file format. Please upload PDF, DOCX, TXT, or EPUB." }, 400);
  }

  if (!extractedText || extractedText.trim().length < 50) {
    return jsonResp({ error: "Could not extract enough text from this file. Please try a different format." }, 400);
  }

  // Upsert source_material
  const { data: existing } = await adminClient
    .from("generated_assets").select("id")
    .eq("book_id", bookId).eq("author_id", authorId)
    .eq("asset_type", "source_material").maybeSingle();

  if (existing) {
    await adminClient.from("generated_assets")
      .update({ content: extractedText, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await adminClient.from("generated_assets").insert({
      book_id: bookId, author_id: authorId,
      asset_type: "source_material", content: extractedText,
    });
  }

  return jsonResp({
    success: true,
    characterCount: extractedText.length,
    preview: extractedText.slice(0, 300) + "...",
  });
}
