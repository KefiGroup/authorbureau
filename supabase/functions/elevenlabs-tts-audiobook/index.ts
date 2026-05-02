import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";

const VOICES: Record<string, { name: string; id: string }> = {
  roger: { name: "Roger", id: "CwhRBWXzGAHq8TQ4Fs17" },
  sarah: { name: "Sarah", id: "EXAVITQu4vr4xnSDxMaL" },
  laura: { name: "Laura", id: "FGY2WhTYpPnrIDTdsKH5" },
  george: { name: "George", id: "JBFqnCBsd6RMkjVDRZzb" },
  river: { name: "River", id: "SAz9YHcvj6GT2YYXdXww" },
  alice: { name: "Alice", id: "Xb7hH8MSUJpSbSDYk0k2" },
  matilda: { name: "Matilda", id: "XrExE9yKIg1WjnnlVkGX" },
  brian: { name: "Brian", id: "nPczCjzI2devNBz1zQrb" },
  lily: { name: "Lily", id: "pFZP5JQG7iQjIQuC4Bku" },
  daniel: { name: "Daniel", id: "onwK4e9ZLuTAKqWW03F9" },
};

async function resolveUser(token: string): Promise<{ id: string; email: string }> {
  const localClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
  const { data: localUser } = await localClient.auth.getUser(token);
  if (localUser?.user?.id && localUser?.user?.email) {
    return { id: localUser.user.id, email: localUser.user.email };
  }

  const sharedKey = Deno.env.get("SHARED_BACKEND_SERVICE_ROLE_KEY");
  if (sharedKey) {
    const sharedClient = createClient(SHARED_BACKEND_URL, sharedKey, { auth: { persistSession: false } });
    const { data: sharedUser } = await sharedClient.auth.getUser(token);
    if (sharedUser?.user?.id && sharedUser?.user?.email) {
      return { id: sharedUser.user.id, email: sharedUser.user.email };
    }
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.sub && payload.email) return { id: payload.sub, email: payload.email };
  } catch { /* ignore */ }

  throw new Error("Unauthorized");
}

function ownsBook(
  book: { author_id?: string | null; owner_email?: string | null },
  user: { id: string; email: string }
): boolean {
  if (book.author_id && book.author_id === user.id) return true;
  if (book.owner_email && user.email &&
      book.owner_email.toLowerCase() === user.email.toLowerCase()) return true;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action } = body;

    // === LIST VOICES (public — static catalogue, no auth needed) ===
    // Keeps the narrator dropdown populated even before shared-backend session restoration.
    if (action === "list-voices") {
      const voices = Object.entries(VOICES).map(([key, v]) => ({ key, name: v.name, voiceId: v.id }));
      return new Response(JSON.stringify({ voices }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === PREVIEW VOICE (public — generic sample sentence, no PII) ===
    // The shared-backend auth lock can be contended on dashboard mount, leaving
    // getActiveToken() momentarily null. Since the preview only synthesises a
    // static "Hello, this is a preview…" line with no per-user data, we skip
    // the auth gate so the button works regardless of session-restoration timing.
    if (action === "preview-voice") {
      const resolvedVoiceId = body.voiceId || VOICES[body.voiceKey]?.id;
      if (!resolvedVoiceId) {
        return new Response(JSON.stringify({ error: "Missing voiceId or unknown voiceKey" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const sampleText = "Hello! This is a preview of how I would narrate your audiobook. I hope you enjoy the sound of my voice.";
      const audioBuffer = await generateTTS(ELEVENLABS_API_KEY, resolvedVoiceId, sampleText);
      const audioBase64 = base64Encode(audioBuffer);
      return new Response(JSON.stringify({ audioBase64, format: "mp3" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Everything else requires auth.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not signed in", code: "no_token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    let user: { id: string; email: string };
    try {
      user = await resolveUser(token);
    } catch (_e) {
      return new Response(JSON.stringify({ error: "Session not recognised", code: "no_token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[elevenlabs-tts-audiobook]", { action, email: user.email });

    // === PREVIEW VOICE ===
    if (action === "preview-voice") {
      const resolvedVoiceId = body.voiceId || VOICES[body.voiceKey]?.id;
      if (!resolvedVoiceId) throw new Error("Missing voiceId or unknown voiceKey");

      const sampleText = "Hello! This is a preview of how I would narrate your audiobook. I hope you enjoy the sound of my voice.";
      const audioBuffer = await generateTTS(ELEVENLABS_API_KEY, resolvedVoiceId, sampleText);
      const audioBase64 = base64Encode(audioBuffer);

      return new Response(JSON.stringify({ audioBase64, format: "mp3" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === GENERATE SINGLE CHUNK (new: one chunk at a time) ===
    if (action === "generate-chunk") {
      const { bookId, voiceKey, voiceId, chunkText, chapterIndex, chunkIndex, previousContext, nextContext } = body;
      if (!bookId || !chunkText || chapterIndex === undefined || chunkIndex === undefined) {
        throw new Error("Missing required fields for generate-chunk");
      }

      const { data: book } = await supabase
        .from("books").select("id, author_id, owner_email, title").eq("id", bookId).single();
      if (!book || !ownsBook(book, user)) {
        return new Response(JSON.stringify({ error: "Book not found or unauthorized", code: "forbidden" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resolvedVoiceId = voiceId || VOICES[voiceKey || "sarah"]?.id;
      if (!resolvedVoiceId) throw new Error("Missing voiceId or unknown voiceKey");

      console.log(`Generating chunk ${chunkIndex} for chapter ${chapterIndex} (${chunkText.length} chars)`);
      const audioBuffer = await generateTTS(ELEVENLABS_API_KEY, resolvedVoiceId, chunkText, previousContext, nextContext);

      // Upload chunk to storage
      const filePath = `${user.id}/${bookId}/chapter-${String(chapterIndex).padStart(3, "0")}-chunk-${String(chunkIndex).padStart(3, "0")}.mp3`;
      const { error: uploadError } = await supabase.storage
        .from("audiobook-audio")
        .upload(filePath, audioBuffer, {
          contentType: "audio/mpeg",
          upsert: true,
        });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: publicUrl } = supabase.storage
        .from("audiobook-audio")
        .getPublicUrl(filePath);

      return new Response(JSON.stringify({
        success: true,
        chunkIndex,
        chapterIndex,
        audioUrl: publicUrl.publicUrl,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === FINALIZE CHAPTER (combine chunk URLs) ===
    if (action === "finalize-chapter") {
      const { bookId, chapterIndex, chunkUrls, audiobookId } = body;

      // For now just return the first chunk or all chunk URLs
      // The client can play them sequentially or we store the list
      const finalUrl = chunkUrls && chunkUrls.length > 0 ? chunkUrls[0] : null;

      if (audiobookId) {
        await supabase.from("audiobooks").update({
          audio_url: finalUrl,
          status: "generated",
        }).eq("id", audiobookId).eq("author_id", user.id);
      }

      return new Response(JSON.stringify({
        success: true,
        chapterIndex,
        audioUrls: chunkUrls,
        primaryUrl: finalUrl,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === LEGACY: generate-chapter (kept for backward compat, but warns) ===
    if (action === "generate-chapter") {
      const { bookId, voiceKey, voiceId, chapterText, chapterIndex, audiobookId } = body;
      if (!bookId || !chapterText || chapterIndex === undefined) {
        throw new Error("Missing bookId, chapterText, or chapterIndex");
      }

      const { data: book } = await supabase
        .from("books").select("id, author_id, owner_email, title").eq("id", bookId).single();
      if (!book || !ownsBook(book, user)) {
        return new Response(JSON.stringify({ error: "Book not found or unauthorized", code: "forbidden" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resolvedVoiceId = voiceId || VOICES[voiceKey || "sarah"]?.id;
      if (!resolvedVoiceId) throw new Error("Missing voiceId or unknown voiceKey");

      // For legacy, just do a single TTS call with truncated text to avoid timeout
      const truncatedText = chapterText.slice(0, 4500);
      console.log(`Legacy generate-chapter: truncating ${chapterText.length} to ${truncatedText.length} chars`);
      const audioBuffer = await generateTTS(ELEVENLABS_API_KEY, resolvedVoiceId, truncatedText);

      const filePath = `${user.id}/${bookId}/chapter-${String(chapterIndex).padStart(3, "0")}.mp3`;
      const { error: uploadError } = await supabase.storage
        .from("audiobook-audio")
        .upload(filePath, audioBuffer, {
          contentType: "audio/mpeg",
          upsert: true,
        });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: publicUrl } = supabase.storage
        .from("audiobook-audio")
        .getPublicUrl(filePath);

      if (audiobookId) {
        await supabase.from("audiobooks").update({
          audio_url: publicUrl.publicUrl,
          status: "generated",
        }).eq("id", audiobookId).eq("author_id", user.id);
      }

      return new Response(JSON.stringify({
        success: true,
        chapterIndex,
        audioUrl: publicUrl.publicUrl,
        durationEstimate: Math.round(truncatedText.length / 15),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("elevenlabs-tts-audiobook error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("429") ? 429 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generateTTS(
  apiKey: string,
  voiceId: string,
  text: string,
  previousText?: string,
  nextText?: string,
): Promise<ArrayBuffer> {
  const body: Record<string, unknown> = {
    text,
    model_id: "eleven_multilingual_v2",
    voice_settings: {
      stability: 0.6,
      similarity_boost: 0.75,
      style: 0.3,
      use_speaker_boost: true,
      speed: 0.95,
    },
  };
  if (previousText) body.previous_text = previousText;
  if (nextText) body.next_text = nextText;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("ElevenLabs TTS error:", response.status, errText);
    throw new Error(`ElevenLabs TTS failed [${response.status}]: ${errText}`);
  }

  return await response.arrayBuffer();
}

function splitText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf(". ", maxLen);
    if (splitAt < maxLen * 0.5) splitAt = remaining.lastIndexOf("! ", maxLen);
    if (splitAt < maxLen * 0.5) splitAt = remaining.lastIndexOf("? ", maxLen);
    if (splitAt < maxLen * 0.5) splitAt = remaining.lastIndexOf("\n", maxLen);
    if (splitAt < maxLen * 0.3) splitAt = maxLen;
    else splitAt += 2;

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  return chunks;
}
