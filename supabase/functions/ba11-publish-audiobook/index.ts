// BA-11 Publish Audiobook — fresh endpoint, accepts shared-backend JWTs.
// 1) Lists chapter MP3s from audiobook-audio/{authorProfileId}/{bookId}/
// 2) Builds per-channel manifests + a downloadable ZIP submission package
// 3) Upserts audiobooks row + author_nodes row (status=live) so it shows on /:authorSlug
// 4) Sends the audiobook-distribution-ready email (non-blocking)
// 5) Returns { success, audiobookId, chapterCount, channels, zipUrl, micrositeUrl, publicAuthorPageUrl }

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import JSZip from "npm:jszip@3.10.1";
import Stripe from "npm:stripe@17.7.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function decodeJwtSub(token: string): { sub?: string; email?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const claims = JSON.parse(atob(padded));
    return { sub: claims.sub, email: claims.email };
  } catch {
    return null;
  }
}

const CHANNEL_SPECS: Record<
  string,
  { name: string; spec: string; submission_url: string; royalty: string; notes: string }
> = {
  acx: {
    name: "Audible / ACX",
    spec: "192 kbps CBR, mono, 44.1 kHz, RMS -23dB to -18dB, peak ≤ -3dB",
    submission_url: "https://www.acx.com/help/narrators/200484550",
    royalty: "25% non-exclusive / 40% exclusive",
    notes:
      "ACX requires a separate retail audio sample (1–5 min) and opening/closing credits. Re-encode with Audacity (free) before upload if needed.",
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
    notes:
      "Distributes to Audible, Spotify, Scribd, Hoopla, Storytel, libraries and 40+ retailers in one upload.",
  },
  platform: {
    name: "Authors Bureau Storefront",
    spec: "Native — no re-encode required",
    submission_url: "",
    royalty: "95% you / 5% platform fee",
    notes: "Sells directly on your author site. Buyers stream chapter-by-chapter.",
  },
};

Deno.serve(async (req: Request) => {
  console.log("[ba11-publish-audiobook] request started", { method: req.method });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { error: "Missing Authorization bearer token" });
  }
  const token = authHeader.slice(7).trim();
  const claims = decodeJwtSub(token);
  if (!claims?.sub) {
    return json(401, { error: "Could not resolve user identity from token" });
  }
  const userId = claims.sub;

  let body: {
    bookId?: string;
    narratorCredit?: string;
    previewChapterIndex?: number;
    description?: string;
    coverImageUrl?: string;
    retailPriceUsd?: number;
    channels?: string[];
    mode?: "publish" | "package_only";
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const {
    bookId,
    narratorCredit = "",
    previewChapterIndex = 0,
    description = "",
    coverImageUrl = "",
    retailPriceUsd = 14.99,
    channels = ["platform", "acx"],
    mode = "publish",
  } = body;

  if (!bookId) {
    return json(400, { error: "bookId is required" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: "Server misconfiguration: SUPABASE env missing" });
  }
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Resolve author_profile from JWT sub
  const { data: profile, error: profErr } = await admin
    .from("author_profiles")
    .select("id, user_id, pen_name, author_slug")
    .eq("user_id", userId)
    .maybeSingle();
  if (profErr || !profile) {
    console.error("[ba11-publish-audiobook] profile lookup failed:", profErr?.message);
    return json(403, { error: "Author profile not found for this user" });
  }
  const authorProfileId = profile.id;
  const authorSlug =
    profile.author_slug || (profile.pen_name || "").toLowerCase().replace(/\s+/g, "-");

  // Fetch book (best-effort, only used for metadata)
  const { data: book } = await admin
    .from("books")
    .select("id, title, author_name, description, cover_image_url")
    .eq("id", bookId)
    .maybeSingle();

  const bookTitle = book?.title || "Audiobook";

  // List MP3 files
  const folderPath = `${authorProfileId}/${bookId}`;
  const { data: files, error: listErr } = await admin.storage
    .from("audiobook-audio")
    .list(folderPath, { limit: 200 });
  if (listErr) {
    console.error("[ba11-publish-audiobook] list failed:", listErr.message);
    return json(500, { error: `Storage list failed: ${listErr.message}` });
  }
  const audioFiles = (files || [])
    .filter((f) => f.name.endsWith(".mp3") && f.name.startsWith("chapter-"))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (audioFiles.length === 0) {
    return json(400, {
      error:
        "No chapter audio found yet. Generate audio for at least one chapter before publishing.",
    });
  }
  console.log("[ba11-publish-audiobook] found", audioFiles.length, "chapters");

  const chapters = audioFiles.map((f, i) => {
    const { data: pub } = admin.storage
      .from("audiobook-audio")
      .getPublicUrl(`${folderPath}/${f.name}`);
    return { index: i, filename: f.name, audio_url: pub.publicUrl };
  });

  const baseManifest = {
    source_platform: "authorsbureau",
    book_title: bookTitle,
    author_name: book?.author_name || profile.pen_name || "",
    description: (description || book?.description || "").slice(0, 4000),
    narrator_credit: narratorCredit.slice(0, 200),
    preview_chapter_index: previewChapterIndex,
    cover_image_url: coverImageUrl || book?.cover_image_url || "",
    retail_price_usd: retailPriceUsd,
    chapter_count: chapters.length,
    chapters,
    submitted_at: new Date().toISOString(),
  };

  const channelPackages = channels
    .filter((c) => CHANNEL_SPECS[c])
    .map((c) => ({
      channel: c,
      ...CHANNEL_SPECS[c],
      manifest: { ...baseManifest, channel: c, format_spec: CHANNEL_SPECS[c].spec },
    }));

  // Build ZIP
  let zipUrl = "";
  try {
    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify({ base: baseManifest, channels: channelPackages }, null, 2));
    const readme = [
      `Submission Package — ${bookTitle}`,
      "=".repeat(40),
      "",
      `Chapters: ${chapters.length}`,
      `Channels: ${channelPackages.map((c) => c.name).join(", ")}`,
      "",
      "RE-ENCODE NOTE",
      "-".repeat(40),
      "ACX and some other platforms require 192 kbps mono 44.1 kHz with",
      "specific RMS/peak levels. The included MP3s are 128 kbps stereo from",
      "ElevenLabs and may need re-encoding. Use Audacity (free) or Descript:",
      "  https://www.audacityteam.org",
      "  https://www.descript.com",
      "",
      "PER-CHANNEL UPLOAD STEPS",
      "-".repeat(40),
      ...channelPackages.flatMap((c) => [
        `[${c.name}]`,
        `  Spec: ${c.spec}`,
        `  Royalty: ${c.royalty}`,
        c.submission_url ? `  Submit: ${c.submission_url}` : "  Submit: (Authors Bureau native — no submission required)",
        `  Notes: ${c.notes}`,
        "",
      ]),
    ].join("\n");
    zip.file("README.txt", readme);

    // Fetch each chapter MP3 and add to zip
    const audioFolder = zip.folder("chapters");
    for (const ch of chapters) {
      try {
        const res = await fetch(ch.audio_url);
        if (res.ok) {
          const ab = new Uint8Array(await res.arrayBuffer());
          audioFolder?.file(ch.filename, ab);
        } else {
          console.warn("[ba11-publish-audiobook] skipping chapter, fetch", res.status, ch.filename);
        }
      } catch (e) {
        console.warn("[ba11-publish-audiobook] chapter fetch failed", ch.filename, e);
      }
    }

    const zipBytes = await zip.generateAsync({ type: "uint8array" });
    const zipPath = `${folderPath}/submission-package.zip`;
    const { error: zipUpErr } = await admin.storage
      .from("audiobook-audio")
      .upload(zipPath, zipBytes, { contentType: "application/zip", upsert: true });
    if (zipUpErr) {
      console.error("[ba11-publish-audiobook] zip upload failed:", zipUpErr.message);
    } else {
      const { data: pub } = admin.storage.from("audiobook-audio").getPublicUrl(zipPath);
      zipUrl = pub.publicUrl;
      console.log("[ba11-publish-audiobook] zip uploaded", zipPath, zipBytes.length, "bytes");
    }
  } catch (zipEx) {
    console.error("[ba11-publish-audiobook] zip build exception:", zipEx);
  }

  // package_only mode — return zip without flipping live state
  if (mode === "package_only") {
    return json(200, {
      success: true,
      mode: "package_only",
      chapterCount: chapters.length,
      channels: channelPackages,
      zipUrl,
    });
  }

  // Upsert audiobooks row
  const samplePreviewUrl =
    chapters[previewChapterIndex]?.audio_url || chapters[0]?.audio_url || null;
  const { data: existingAb } = await admin
    .from("audiobooks")
    .select("id")
    .eq("book_id", bookId)
    .eq("author_id", authorProfileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const audiobookRow = {
    distribution_status: "ready_for_submission",
    narrator_credit: narratorCredit.slice(0, 200),
    preview_chapter_index: previewChapterIndex,
    distribution_manifest: { base: baseManifest, channels: channelPackages, zip_url: zipUrl },
    distributed_at: new Date().toISOString(),
    status: "published",
    price: retailPriceUsd,
    currency: "USD",
    audio_url: samplePreviewUrl,
  };
  let audiobookId = existingAb?.id;
  if (audiobookId) {
    await admin.from("audiobooks").update(audiobookRow as never).eq("id", audiobookId);
  } else {
    const { data: inserted } = await admin
      .from("audiobooks")
      .insert({
        book_id: bookId,
        author_id: authorProfileId,
        title: bookTitle,
        ...audiobookRow,
      } as never)
      .select("id")
      .single();
    audiobookId = inserted?.id;
  }

  // Upsert author_nodes row
  const micrositeUrl = authorSlug ? `/${authorSlug}/audiobook` : null;
  const publicAuthorPageUrl = authorSlug ? `/${authorSlug}` : null;
  await admin.from("author_nodes").upsert(
    {
      author_id: authorProfileId,
      node_id: "BA-11",
      node_name: "Audiobook",
      status: "live",
      delivery_type: "digital_audio",
      delivery_url: samplePreviewUrl,
      microsite_url: micrositeUrl,
      price_usd: retailPriceUsd,
      currency: "USD",
      activated_at: new Date().toISOString(),
      content_json: {
        audiobook_id: audiobookId,
        book_title: bookTitle,
        chapter_count: chapters.length,
        preview_url: samplePreviewUrl,
        chapter_urls: chapters.map((c) => c.audio_url),
        channels: channelPackages.map((c) => c.channel),
        zip_url: zipUrl,
      },
    } as never,
    { onConflict: "author_id,node_id" },
  );
  console.log("[ba11-publish-audiobook] author_nodes row upserted, status=live");

  // Email (non-blocking)
  try {
    const recipientEmail = claims.email;
    if (recipientEmail) {
      const idempotencyKey = `audiobook-distribute-${audiobookId}-${Date.now()}`;
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "audiobook-distribution-ready",
          recipientEmail,
          idempotencyKey,
          templateData: {
            authorName: profile.pen_name || book?.author_name || "there",
            bookTitle,
            chapterCount: chapters.length,
            channels: channelPackages.map((c) => ({
              name: c.name,
              spec: c.spec,
              submission_url: c.submission_url,
              royalty: c.royalty,
              notes: c.notes,
            })),
            chapterUrls: chapters.map((c) => ({ filename: c.filename, url: c.audio_url })),
            zipUrl,
            reencodeNote:
              "ACX and some other platforms require 192 kbps mono 44.1 kHz. Use Audacity (free) or Descript to re-encode if needed.",
          },
        },
      });
    }
  } catch (e) {
    console.warn("[ba11-publish-audiobook] email send failed (non-blocking)", e);
  }

  return json(200, {
    success: true,
    audiobookId,
    chapterCount: chapters.length,
    channels: channelPackages,
    zipUrl,
    micrositeUrl,
    publicAuthorPageUrl,
  });
});
