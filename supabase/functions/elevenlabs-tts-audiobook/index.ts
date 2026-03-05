import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, bookId, voiceKey, chapterText, chapterIndex, audiobookId } = await req.json();

    // ── Action: list-voices ──
    if (action === "list-voices") {
      const voices = Object.entries(VOICES).map(([key, v]) => ({ key, name: v.name, voiceId: v.id }));
      return new Response(JSON.stringify({ voices }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: preview-voice ── short sample
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

    // ── Action: generate-chapter ── TTS for one chapter, upload to storage
    if (action === "generate-chapter") {
      if (!bookId || !chapterText || chapterIndex === undefined) {
        throw new Error("Missing bookId, chapterText, or chapterIndex");
      }

      // Verify book ownership
      const { data: book } = await supabase
        .from("books").select("id, author_id, title").eq("id", bookId).single();
      if (!book || book.author_id !== user.id) {
        return new Response(JSON.stringify({ error: "Book not found or unauthorized" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const voice = VOICES[voiceKey || "sarah"];
      if (!voice) throw new Error("Unknown voice key");

      // Split long text into ~4500 char chunks for API limits, then stitch
      const chunks = splitText(chapterText, 4500);
      const audioBuffers: ArrayBuffer[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const previousText = i > 0 ? chunks[i - 1].slice(-200) : undefined;
        const nextText = i < chunks.length - 1 ? chunks[i + 1].slice(0, 200) : undefined;
        const buf = await generateTTS(ELEVENLABS_API_KEY, voice.id, chunks[i], previousText, nextText);
        audioBuffers.push(buf);
      }

      // Concatenate audio buffers
      const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const buf of audioBuffers) {
        combined.set(new Uint8Array(buf), offset);
        offset += buf.byteLength;
      }

      // Upload to storage
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

      // Update audiobook record with the audio URL if audiobookId provided
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
        durationEstimate: Math.round(chapterText.length / 15), // rough seconds estimate
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
    // Find a good split point (sentence end)
    let splitAt = remaining.lastIndexOf(". ", maxLen);
    if (splitAt < maxLen * 0.5) splitAt = remaining.lastIndexOf("! ", maxLen);
    if (splitAt < maxLen * 0.5) splitAt = remaining.lastIndexOf("? ", maxLen);
    if (splitAt < maxLen * 0.5) splitAt = remaining.lastIndexOf("\n", maxLen);
    if (splitAt < maxLen * 0.3) splitAt = maxLen;
    else splitAt += 2; // include the punctuation + space

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  return chunks;
}
