import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { resolveAuthorId } from "../_shared/resolve-author-id.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[DISTRIBUTE-AUDIOBOOK] ${step}${d}`);
};

// Per-channel submission specs. We never re-encode (no ffmpeg in edge runtime) —
// instead we ship the raw ElevenLabs MP3s and instruct the author to re-encode
// with a free tool (Audacity / Descript) if a channel demands stricter specs.
const CHANNEL_SPECS: Record<string, { name: string; spec: string; submission_url: string; royalty: string; notes: string }> = {
  acx: {
    name: "Audible / ACX",
    spec: "192 kbps CBR, mono, 44.1 kHz, RMS -23dB to -18dB, peak ≤ -3dB",
    submission_url: "https://www.acx.com/help/narrators/200484550",
    royalty: "25% non-exclusive / 40% exclusive",
    notes: "ACX requires a separate retail audio sample (1–5 min) and opening/closing credits. Re-encode with Audacity (free) before upload if needed.",
  },
  spotify: {
    name: "Spotify for Authors",
    spec: "MP3 ≥ 128 kbps or FLAC, stereo or mono, 44.1 kHz",
    submission_url: "https://findaway.com/spotify",
    royalty: "Varies (via Findaway Voices)",
    notes: "Spotify ingests audiobooks via Findaway Voices. Sign up there and upload the package.",
  },
  apple: {
    name: "Apple Books",
    spec: "MP3 192 kbps or AAC, 44.1 kHz",
    submission_url: "https://authors.apple.com/support/4814-audiobooks",
    royalty: "30% Apple / 70% you",
    notes: "Submit via Apple Books for Authors. Cover art must be 3000×3000 px JPG/PNG.",
  },
  google: {
    name: "Google Play Books",
    spec: "MP3 ≥ 128 kbps, 44.1 kHz",
    submission_url: "https://play.google.com/books/publish/",
    royalty: "52% you / 48% Google",
    notes: "Upload via Google Play Books Partner Center. Manual web upload.",
  },
  findaway: {
    name: "Findaway Voices (40+ retailers)",
    spec: "MP3 192 kbps, 44.1 kHz, mono preferred",
    submission_url: "https://findawayvoices.com/",
    royalty: "Author-set retail price, 80% royalty",
    notes: "Distributes to Audible, Spotify, Scribd, Hoopla, Storytel, libraries and 40+ retailers in one upload.",
  },
  platform: {
    name: "Authors Bureau Storefront",
    spec: "Native — no re-encode required",
    submission_url: "",
    royalty: "92% you / 8% platform fee",
    notes: "Sells directly on your author site. Buyers stream chapter-by-chapter.",
  },
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
    const {
      bookId,
      narratorCredit,
      previewChapterIndex,
      description,
      coverImageUrl,
      retailPriceUsd,
      channels = ["platform", "acx"],
    } = body;

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
    // Resolve author_profile id (books.author_id references author_profiles.id, NOT auth.users.id)
    const { data: profile } = await supabase
      .from("author_profiles")
      .select("id, pen_name, author_slug")
      .eq("user_id", user.id)
      .maybeSingle();
    const authorProfileId = profile?.id;
    const authorId = authorProfileId; // alias used by downstream queries
    const authorSlug = profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-");

    if (!authorProfileId || book.author_id !== authorProfileId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    logStep("Book loaded", { title: book.title });

    // Fetch audiobook record
    const { data: audiobook } = await supabase
      .from("audiobooks")
      .select("id")
      .eq("book_id", bookId)
      .eq("author_id", authorId)
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

    if (audioFiles.length === 0) {
      return new Response(JSON.stringify({ error: "No audio files found. Generate chapter audio first." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    logStep("Audio files found", { count: audioFiles.length });

    // Build chapter list with public URLs (raw ElevenLabs MP3s, no re-encode)
    const chapters = audioFiles.map((f, i) => {
      const { data: urlData } = supabase.storage
        .from("audiobook-audio")
        .getPublicUrl(`${folderPath}/${f.name}`);
      return {
        index: i,
        filename: f.name,
        audio_url: urlData.publicUrl,
      };
    });

    // Build per-channel manifests
    const baseManifest = {
      source_platform: "authorsbureau",
      book_title: book.title,
      author_name: book.author_name || profile?.pen_name || "",
      description: (description || book.description || "").slice(0, 4000),
      narrator_credit: (narratorCredit || "").slice(0, 200),
      preview_chapter_index: typeof previewChapterIndex === "number" ? previewChapterIndex : 0,
      cover_image_url: coverImageUrl || book.cover_image_url || "",
      retail_price_usd: typeof retailPriceUsd === "number" ? retailPriceUsd : 14.99,
      chapter_count: chapters.length,
      chapters,
      submitted_at: new Date().toISOString(),
    };

    const channelPackages = (channels as string[])
      .filter((c) => CHANNEL_SPECS[c])
      .map((c) => ({
        channel: c,
        ...CHANNEL_SPECS[c],
        manifest: { ...baseManifest, channel: c, format_spec: CHANNEL_SPECS[c].spec },
      }));

    // Notify shared backend (PublishNow) — non-blocking
    const sharedKey = Deno.env.get("SHARED_BACKEND_SERVICE_ROLE_KEY");
    if (sharedKey) {
      try {
        const res = await fetch(`${SHARED_BACKEND_URL}/functions/v1/receive-audiobook-distribution`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${sharedKey}` },
          body: JSON.stringify({ ...baseManifest, channels: channelPackages.map((c) => c.channel) }),
        });
        logStep("PublishNow response", { status: res.status });
      } catch (e) {
        logStep("PublishNow send failed (non-blocking)", { error: String(e) });
      }
    }

    // Update / create audiobook record
    const audiobookRow = {
      distribution_status: "ready_for_submission",
      narrator_credit: (narratorCredit || "").slice(0, 200),
      preview_chapter_index: typeof previewChapterIndex === "number" ? previewChapterIndex : 0,
      distribution_manifest: { base: baseManifest, channels: channelPackages } as any,
      distributed_at: new Date().toISOString(),
      status: "published",
      price: typeof retailPriceUsd === "number" ? retailPriceUsd : 14.99,
      currency: "USD",
    };
    let audiobookId = audiobook?.id;
    if (audiobookId) {
      await supabase.from("audiobooks").update(audiobookRow as any).eq("id", audiobookId);
    } else {
      const { data: inserted } = await supabase.from("audiobooks").insert({
        book_id: bookId,
        author_id: authorId,
        title: book.title,
        ...audiobookRow,
      } as any).select("id").single();
      audiobookId = inserted?.id;
    }
    logStep("Audiobook record saved", { audiobookId });

    // Write author_nodes row so storefront/microsite picks up the audiobook as a buyable product.
    // IMPORTANT: merge with existing content_json so we never wipe the BA-11 builder's
    // `studio` payload — that's what powers refresh-to-Review instead of refresh-to-Intro.
    if (authorProfileId) {
      const micrositeUrl = authorSlug ? `/${authorSlug}/audiobook` : null;
      const samplePreviewUrl = chapters[baseManifest.preview_chapter_index]?.audio_url || chapters[0]?.audio_url || null;

      const { data: existing } = await supabase
        .from("author_nodes")
        .select("content_json")
        .eq("author_id", authorProfileId)
        .eq("node_id", "BA-11")
        .maybeSingle();
      const existingContent = (existing?.content_json ?? {}) as Record<string, any>;

      await supabase.from("author_nodes").upsert({
        author_id: authorProfileId,
        node_id: "BA-11",
        node_name: "Audiobook",
        status: "live",
        delivery_type: "digital_audio",
        delivery_url: samplePreviewUrl,
        microsite_url: micrositeUrl,
        price_usd: baseManifest.retail_price_usd,
        currency: "USD",
        activated_at: new Date().toISOString(),
        content_json: {
          ...existingContent,
          audiobook_id: audiobookId,
          book_id: bookId,
          book_title: book.title,
          chapter_count: chapters.length,
          preview_url: samplePreviewUrl,
          chapter_urls: chapters.map((c) => c.audio_url),
          chapters: chapters.map((c) => ({ index: c.index, title: `Chapter ${c.index + 1}`, audio_url: c.audio_url })),
          channels: channelPackages.map((c) => c.channel),
          narrator_credit: (narratorCredit || "").slice(0, 200),
          description: (description || book.description || "").slice(0, 4000),
          price: baseManifest.retail_price_usd,
          published_at: new Date().toISOString(),
          _currentStep: 4,
        } as any,
      } as any, { onConflict: "author_id,node_id" });
      logStep("author_nodes row upserted (studio preserved)");
    }

    // Email the author with submission packages + ACX-spec re-encode note
    try {
      const recipientEmail = user.email;
      if (recipientEmail) {
        const idempotencyKey = `audiobook-distribute-${audiobookId}-${Date.now()}`;
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "audiobook-distribution-ready",
            recipientEmail,
            idempotencyKey,
            templateData: {
              authorName: profile?.pen_name || book.author_name || "there",
              bookTitle: book.title,
              chapterCount: chapters.length,
              channels: channelPackages.map((c) => ({
                name: c.name,
                spec: c.spec,
                submission_url: c.submission_url,
                royalty: c.royalty,
                notes: c.notes,
              })),
              chapterUrls: chapters.map((c) => ({ filename: c.filename, url: c.audio_url })),
              reencodeNote:
                "ACX and some other platforms require 192 kbps mono 44.1 kHz with specific RMS/peak levels. Your raw ElevenLabs MP3s do not match these specs out of the box. Use a free tool like Audacity (https://www.audacityteam.org) or Descript (https://www.descript.com) to re-encode each chapter before upload.",
            },
          },
        });
        logStep("Distribution email sent", { recipientEmail });
      }
    } catch (e) {
      logStep("Email send failed (non-blocking)", { error: String(e) });
    }

    return new Response(
      JSON.stringify({
        success: true,
        audiobookId,
        chapterCount: chapters.length,
        channels: channelPackages,
        reencode_required: true,
        reencode_tools: ["Audacity (free) — https://www.audacityteam.org", "Descript — https://www.descript.com"],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    logStep("ERROR", { message: String(error) });
    return new Response(JSON.stringify({ success: false, error: String((error as Error)?.message || error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
