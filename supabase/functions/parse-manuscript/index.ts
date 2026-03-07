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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth - resolve user with identity mapping
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    let userId: string;
    let userEmail: string | null = null;

    // Try Cloud auth first
    const { data: { user: cloudUser } } = await adminClient.auth.getUser(token);
    if (cloudUser) {
      userId = cloudUser.id;
      userEmail = cloudUser.email ?? null;
    } else {
      // Fallback: try shared backend (for SSO sessions)
      const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
      const { data: { user: sharedUser } } = await sharedClient.auth.getUser(token);
      if (!sharedUser) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = sharedUser.id;
      userEmail = sharedUser.email ?? null;

      // For shared backend users, find their Cloud user ID by email
      if (sharedUser.email) {
        const { data: { users } } = await adminClient.auth.admin.listUsers();
        const localMatch = users?.find(
          (u: any) => u.email?.toLowerCase() === sharedUser.email?.toLowerCase()
        );
        if (localMatch) userId = localMatch.id;
      }
    }

    console.log("[parse-manuscript] Resolved userId:", userId, "email:", userEmail);

    const { bookId, storagePath, fileName } = await req.json();
    if (!bookId || !storagePath) {
      return new Response(JSON.stringify({ error: "bookId and storagePath are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the book belongs to this user (check author_id OR owner_email)
    let book = null;
    const { data: bookById } = await adminClient
      .from("books")
      .select("id, title, author_id")
      .eq("id", bookId)
      .eq("author_id", userId)
      .maybeSingle();

    if (bookById) {
      book = bookById;
    } else if (userEmail) {
      const { data: bookByEmail } = await adminClient
        .from("books")
        .select("id, title, author_id")
        .eq("id", bookId)
        .eq("owner_email", userEmail)
        .maybeSingle();
      book = bookByEmail;
    }

    if (!book) {
      return new Response(JSON.stringify({ error: "Book not found or access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use the book's actual author_id for downstream operations
    const authorId = book.author_id;

    // Download file from storage
    const { data: fileData, error: downloadErr } = await adminClient.storage
      .from("manuscripts")
      .download(storagePath);

    if (downloadErr || !fileData) {
      console.error("Download error:", downloadErr);
      return new Response(JSON.stringify({ error: "Failed to download manuscript file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine file type and extract text
    const lowerName = (fileName || storagePath).toLowerCase();
    let extractedText = "";

    if (lowerName.endsWith(".txt")) {
      extractedText = await fileData.text();
    } else if (lowerName.endsWith(".pdf") || lowerName.endsWith(".docx") || lowerName.endsWith(".doc") || lowerName.endsWith(".epub")) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Fast base64 encoding using chunks (avoids O(n²) string concat)
      const CHUNK = 8192;
      const chunks: string[] = [];
      for (let i = 0; i < uint8Array.length; i += CHUNK) {
        chunks.push(String.fromCharCode(...uint8Array.subarray(i, i + CHUNK)));
      }
      const base64Content = btoa(chunks.join(""));

      // Guard: skip AI extraction for files > 15MB base64 (likely to timeout)
      if (base64Content.length > 20_000_000) {
        return new Response(JSON.stringify({ error: "File is too large for AI extraction. Please upload a smaller file or use .txt format." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("[parse-manuscript] Base64 size:", base64Content.length, "bytes");

      let mimeType = "application/octet-stream";
      if (lowerName.endsWith(".pdf")) mimeType = "application/pdf";
      else if (lowerName.endsWith(".docx")) mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      else if (lowerName.endsWith(".doc")) mimeType = "application/msword";
      else if (lowerName.endsWith(".epub")) mimeType = "application/epub+zip";

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are a document text extractor. Your ONLY job is to extract ALL text content from the uploaded document and return it exactly as written. Preserve chapter titles, headings, paragraphs, and formatting structure using markdown. Do NOT summarize, do NOT add commentary, do NOT skip any content. Extract EVERY word from cover to cover."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extract ALL text from this ${lowerName.split('.').pop()?.toUpperCase()} document. Return the complete text content preserving structure with markdown headings and paragraphs. Do not summarize or skip anything.`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Content}`
                  }
                }
              ]
            }
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("AI extraction error:", response.status, errText);
        return new Response(JSON.stringify({ error: "Failed to extract text from document. Please try a .txt file instead." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiResult = await response.json();
      extractedText = aiResult.choices?.[0]?.message?.content || "";
    } else {
      return new Response(JSON.stringify({ error: "Unsupported file format. Please upload PDF, DOCX, TXT, or EPUB." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return new Response(JSON.stringify({ error: "Could not extract enough text from this file. Please try a different format." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert the extracted text into generated_assets as source_material
    const { data: existing } = await adminClient
      .from("generated_assets")
      .select("id")
      .eq("book_id", bookId)
      .eq("author_id", authorId)
      .eq("asset_type", "source_material")
      .maybeSingle();

    if (existing) {
      await adminClient
        .from("generated_assets")
        .update({ content: extractedText, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await adminClient
        .from("generated_assets")
        .insert({
          book_id: bookId,
          author_id: authorId,
          asset_type: "source_material",
          content: extractedText,
        });
    }

    return new Response(JSON.stringify({
      success: true,
      characterCount: extractedText.length,
      preview: extractedText.slice(0, 300) + "...",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-manuscript error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
