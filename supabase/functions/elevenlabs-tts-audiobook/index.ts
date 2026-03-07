import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://aulvkuadmrfnlsaabpfk.supabase.co";

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const user = await resolveUser(token);

    const { action, bookId, voiceKey, chapterText, chapterIndex, audiobookId } = await req.json();

    if (action === "list-voices") {
      const voices = Object.entries(VOICES).map(([key, v]) => ({ key, name: v.name, voiceId: v.id }));
      return new Response(JSON.stringify({ voices }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "preview-voice") {
      const voice = VOICES[voiceKey];
      if (!voice) throw new Error("Unknown voice key");

      const sampleText = "Hello! This is a preview of how I would narrate your audiobook. I hope you enjoy the sound of my voice.";
      const audioBuffer = await generateTTS(ELEVENLABS_API_KEY, voice.id, sampleText);
      const audioBase64 = base64Encode(audioBuffer);

      return new Response(JSON.stringify({ audioBase64, format: "mp3" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate-chapter") {
      if (!bookId || !chapterText || chapterIndex === undefined) {
        throw new Error("Missing bookId, chapterText, or chapterIndex");
      }

      const { data: book } = await supabase
        .from("books").select("id, author_id, title").eq("id", bookId).single();
      if (!book || book.author_id !== user.id) {
        return new Response(JSON.stringify({ error: "Book not found or unauthorized" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const voice = VOICES[voiceKey || "sarah"];
      if (!voice) throw new Error("Unknown voice key");

      const chunks = splitText(chapterText, 4500);
      const audioBuffers: ArrayBuffer[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const previousText = i > 0 ? chunks[i - 1].slice(-200) : undefined;
        const nextText = i < chunks.length - 1 ? chunks[i + 1].slice(0, 200) : undefined;
        const buf = await generateTTS(ELEVENLABS_API_KEY, voice.id, chunks[i], previousText, nextText);
        audioBuffers.push(buf);
      }

      const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const buf of audioBuffers) {
        combined.set(new Uint8Array(buf), offset);
        offset += buf.byteLength;
      }

      const filePath = `${user.id}/${bookId}/chapter-${String(chapterIndex).padStart(3, "0")}.mp3`;
      const { error: uploadError } = await supabase.storage
        .from("audiobook-audio")
        .upload(filePath, combined.buffer, {
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
        durationEstimate: Math.round(chapterText.length / 15),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("elevenlabs-tts-audiobook error:", e);
    const status = e instanceof Error && e.message.includes("429") ? 429 : 500;
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
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
