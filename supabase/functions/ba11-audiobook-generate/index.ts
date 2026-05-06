// BA-11 Audiobook chapter generation.
// Uses the canonical shared resolver (_shared/resolve-user.ts) so both Cloud
// and shared-backend tokens authenticate consistently. Renders one chapter
// via ElevenLabs TTS, uploads to the audiobook-audio storage bucket, and
// returns a permanent public URL.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveUser } from "../_shared/resolve-user.ts";

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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)) as unknown as number[],
    );
  }
  return btoa(binary);
}

Deno.serve(async (req: Request) => {
  console.log("[ba11-audiobook-generate] request started", { method: req.method });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  console.log("[ba11-audiobook-generate] auth header present:", !!authHeader);

  // Use the canonical shared resolver — supports Cloud + shared-backend tokens.
  const user = await resolveUser(authHeader);
  console.log("[ba11-audiobook-generate] resolved:", user);

  if (!user.id && !user.email) {
    return json(401, {
      error: "AUTH_RESTORING: Your session is still restoring. Please wait a moment and click Try Again.",
    });
  }

  let body: {
    voiceId?: string;
    chapterText?: string;
    chapterIndex?: number;
    bookId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const { voiceId, chapterText, chapterIndex, bookId } = body;
  console.log("[ba11-audiobook-generate] params:", {
    voiceId,
    chapterIndex,
    bookId,
    textLen: chapterText?.length || 0,
    user: user.id ?? user.email,
  });

  if (!voiceId || typeof voiceId !== "string") {
    return json(400, { error: "MISSING_VOICE: Pick a narrator voice before generating chapter audio." });
  }
  if (!chapterText || typeof chapterText !== "string" || chapterText.trim().length === 0) {
    return json(400, { error: "MISSING_TEXT: This chapter is empty. Add chapter text before generating audio." });
  }

  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) {
    console.error("[ba11-audiobook-generate] ELEVENLABS_API_KEY missing");
    return json(500, { error: "TTS_NOT_CONFIGURED: Audio service is not configured. Please contact support." });
  }

  // ElevenLabs caps single requests around 5000 chars; keep a safety margin.
  const MAX_CHARS = 4500;
  const text = chapterText.length > MAX_CHARS ? chapterText.slice(0, MAX_CHARS) : chapterText;
  if (chapterText.length > MAX_CHARS) {
    console.log("[ba11-audiobook-generate] truncated chapter from", chapterText.length, "to", MAX_CHARS);
  }

  try {
    const startedAt = Date.now();
    const ttsRes = await fetch(
      // 192 kbps — closest ElevenLabs preset to ACX/Audible spec (192 kbps CBR).
      // Still stereo + 44.1 kHz; author converts to mono in Audacity per ACX-UPLOAD-GUIDE.txt in the export pack.
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_192`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      },
    );
    const elapsed = Date.now() - startedAt;
    console.log("[ba11-audiobook-generate] elevenlabs status", ttsRes.status, "in", elapsed, "ms");

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      console.error("[ba11-audiobook-generate] elevenlabs error", ttsRes.status, errText);
      return json(502, {
        error: `TTS_UPSTREAM: ElevenLabs returned ${ttsRes.status}. Please wait a moment and click Try Again.`,
        details: errText.slice(0, 500),
      });
    }

    const buf = new Uint8Array(await ttsRes.arrayBuffer());
    const audioBase64 = bytesToBase64(buf);
    console.log("[ba11-audiobook-generate] success, bytes:", buf.length);

    // Upload MP3 to audiobook-audio bucket so the publish step can package it.
    let audioUrl = "";
    let audioUrlError = "";
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceKey && bookId && user.id) {
        const admin = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const idx = typeof chapterIndex === "number" ? chapterIndex : 0;
        const padded = String(idx).padStart(3, "0");
        const path = `${user.id}/${bookId}/chapter-${padded}.mp3`;
        const { error: upErr } = await admin.storage
          .from("audiobook-audio")
          .upload(path, buf, { contentType: "audio/mpeg", upsert: true });
        if (upErr) {
          console.error("[ba11-audiobook-generate] storage upload failed:", upErr.message);
          audioUrlError = `STORAGE_FAILED: ${upErr.message}`;
        } else {
          const { data: pub } = admin.storage.from("audiobook-audio").getPublicUrl(path);
          audioUrl = pub.publicUrl;
          console.log("[ba11-audiobook-generate] uploaded to", path);
        }
      } else if (!bookId) {
        audioUrlError = "MISSING_BOOK: bookId missing from request — please reload the page.";
      } else if (!user.id) {
        audioUrlError = "AUTH_RESTORING: Your session could not be reconciled to upload audio.";
      }
    } catch (storageErr) {
      const m = storageErr instanceof Error ? storageErr.message : String(storageErr);
      console.error("[ba11-audiobook-generate] storage exception:", m);
      audioUrlError = `STORAGE_EXCEPTION: ${m}`;
    }

    if (!audioUrl) {
      // Surface storage failure as the primary error so the UI can show a real message
      // instead of a generic snag. Still return audioBase64 so the user can preview.
      return json(200, {
        audioBase64,
        audioUrl: "",
        error: audioUrlError || "STORAGE_FAILED: Audio rendered but could not be saved.",
        format: "mp3",
        bytes: buf.length,
        chapterIndex,
      });
    }

    return new Response(JSON.stringify({
      audioBase64,
      audioUrl,
      format: "mp3",
      bytes: buf.length,
      chapterIndex,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[ba11-audiobook-generate] exception", msg);
    return json(500, { error: msg });
  }
});
