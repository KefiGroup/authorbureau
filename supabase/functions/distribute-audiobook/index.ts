import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[DISTRIBUTE-AUDIOBOOK] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    logStep("Authenticated", { userId: user.id });

    const body = await req.json();
    const { bookId, narratorCredit, previewChapterIndex, description, coverImageUrl } = body;

    if (!bookId || typeof bookId !== "string") {
      return new Response(JSON.stringify({ error: "bookId is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch book
    const { data: book, error: bookErr } = await supabase
      .from("books")
      .select("id, title, author_name, description, cover_image_url, author_id")
      .eq("id", bookId)
      .single();
    if (bookErr || !book) {
      return new Response(JSON.stringify({ error: "Book not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (book.author_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    logStep("Book loaded", { title: book.title });

    // Fetch audiobook record
    const { data: audiobook } = await supabase
      .from("audiobooks")
      .select("id")
      .eq("book_id", bookId)
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // List audio files from storage
    const folderPath = `${user.id}/${bookId}`;
    const { data: files } = await supabase.storage
      .from("audiobook-audio")
      .list(folderPath, { limit: 200 });

    const audioFiles = (files || [])
      .filter(f => f.name.endsWith(".mp3"))
      .sort((a, b) => a.name.localeCompare(b.name));

    logStep("Audio files found", { count: audioFiles.length });

    // Build manifest
    const manifest = {
      source_platform: "authorsbureau",
      book_title: book.title,
      author_name: book.author_name || "",
      description: (description || book.description || "").slice(0, 4000),
      narrator_credit: (narratorCredit || "").slice(0, 200),
      preview_chapter_index: typeof previewChapterIndex === "number" ? previewChapterIndex : 0,
      cover_image_url: coverImageUrl || book.cover_image_url || "",
      chapter_count: audioFiles.length,
      chapters: audioFiles.map((f, i) => {
        const { data: urlData } = supabase.storage
          .from("audiobook-audio")
          .getPublicUrl(`${folderPath}/${f.name}`);
        return {
          index: i,
          filename: f.name,
          audio_url: urlData.publicUrl,
        };
      }),
      submitted_at: new Date().toISOString(),
    };

    // Send to PublishNow shared backend
    const sharedKey = Deno.env.get("SHARED_BACKEND_SERVICE_ROLE_KEY");
    if (sharedKey) {
      try {
        const res = await fetch(`${SHARED_BACKEND_URL}/functions/v1/receive-audiobook-distribution`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sharedKey}`,
          },
          body: JSON.stringify(manifest),
        });
        logStep("PublishNow response", { status: res.status });
      } catch (e) {
        logStep("PublishNow send failed (non-blocking)", { error: String(e) });
      }
    } else {
      logStep("No SHARED_BACKEND_SERVICE_ROLE_KEY, skipping PublishNow send");
    }

    // Update local audiobook record
    if (audiobook?.id) {
      await supabase
        .from("audiobooks")
        .update({
          distribution_status: "distributing",
          narrator_credit: (narratorCredit || "").slice(0, 200),
          preview_chapter_index: typeof previewChapterIndex === "number" ? previewChapterIndex : 0,
          distribution_manifest: manifest,
          distributed_at: new Date().toISOString(),
          status: "distributing",
        } as any)
        .eq("id", audiobook.id);
      logStep("Audiobook record updated", { audiobookId: audiobook.id });
    } else {
      // Create a record if none exists
      await supabase.from("audiobooks").insert({
        book_id: bookId,
        author_id: user.id,
        title: book.title,
        status: "distributing",
        distribution_status: "distributing",
        narrator_credit: (narratorCredit || "").slice(0, 200),
        preview_chapter_index: typeof previewChapterIndex === "number" ? previewChapterIndex : 0,
        distribution_manifest: manifest,
        distributed_at: new Date().toISOString(),
      } as any);
      logStep("Audiobook record created");
    }

    return new Response(JSON.stringify({ success: true, chapterCount: audioFiles.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    logStep("ERROR", { message: String(error) });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
