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
  liam: { name: "Liam", id: "TX3LPaxmHKxFdv7VOQHJ" },
  chris: { name: "Chris", id: "iP95p4xoKVk53GoZ742B" },
};

interface ResolvedUser { id: string; email: string; via: string }

async function resolveUser(token: string): Promise<ResolvedUser> {
  // 1) JWT decode (cheapest, most reliable)
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload?.sub && payload?.email) {
        console.log("[tts-v2] auth: jwt-decode SUCCESS", { sub: payload.sub, email: payload.email });
        return { id: payload.sub, email: payload.email, via: "jwt-decode" };
      }
      console.log("[tts-v2] auth: jwt-decode missing sub/email", { hasSub: !!payload?.sub, hasEmail: !!payload?.email });
    } else {
      console.log("[tts-v2] auth: jwt-decode FAILED — token not 3 parts");
    }
  } catch (e) {
    console.log("[tts-v2] auth: jwt-decode threw", String(e));
  }

  // 2) Local Cloud auth
  try {
    const localClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );
    const { data, error } = await localClient.auth.getUser(token);
    if (data?.user?.id && data.user.email) {
      console.log("[tts-v2] auth: local SUCCESS", { id: data.user.id });
      return { id: data.user.id, email: data.user.email, via: "local" };
    }
    console.log("[tts-v2] auth: local FAILED", { error: error?.message });
  } catch (e) {
    console.log("[tts-v2] auth: local threw", String(e));
  }

  // 3) Shared backend
  try {
    const sharedKey = Deno.env.get("SHARED_BACKEND_SERVICE_ROLE_KEY");
    if (sharedKey) {
      const sharedClient = createClient(SHARED_BACKEND_URL, sharedKey, { auth: { persistSession: false } });
      const { data, error } = await sharedClient.auth.getUser(token);
      if (data?.user?.id && data.user.email) {
        console.log("[tts-v2] auth: shared SUCCESS", { id: data.user.id });
        return { id: data.user.id, email: data.user.email, via: "shared" };
      }
      console.log("[tts-v2] auth: shared FAILED", { error: error?.message });
    } else {
      console.log("[tts-v2] auth: shared SKIPPED — no SHARED_BACKEND_SERVICE_ROLE_KEY");
    }
  } catch (e) {
    console.log("[tts-v2] auth: shared threw", String(e));
  }

  throw new Error("Unauthorized");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[tts-v2] request started", { method: req.method, url: req.url });

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    console.log("[tts-v2] authorization header present?", !!authHeader);
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized: missing Authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "").trim();

    const body = await req.json();
    const action = body?.action;
    console.log("[tts-v2] action", action);

    // Resolve user identity (required for all actions)
    let user: ResolvedUser;
    try {
      user = await resolveUser(token);
      console.log("[tts-v2] user resolved", { id: user.id, via: user.via });
    } catch (authErr) {
      console.error("[tts-v2] all auth paths failed");
      return new Response(JSON.stringify({ error: "Unauthorized: could not resolve user from token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === LIST VOICES ===
    if (action === "list-voices") {
      const voices = Object.entries(VOICES).map(([key, v]) => ({ key, name: v.name, voiceId: v.id }));
      return new Response(JSON.stringify({ voices }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === PREVIEW VOICE === (no DB ownership check — auth-only)
    if (action === "preview-voice") {
      const resolvedVoiceId = body.voiceId || VOICES[body.voiceKey]?.id;
      if (!resolvedVoiceId) throw new Error("Missing voiceId or unknown voiceKey");

      console.log("[tts-v2] preview-voice", { voiceId: resolvedVoiceId });
      const sampleText = "Hello! This is a preview of how I would narrate your audiobook. I hope you enjoy the sound of my voice.";
      const audioBuffer = await generateTTS(ELEVENLABS_API_KEY, resolvedVoiceId, sampleText);
      const audioBase64 = base64Encode(audioBuffer);

      return new Response(JSON.stringify({ audioBase64, format: "mp3" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Below: actions that need book ownership ===
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // === GENERATE SINGLE CHUNK ===
    if (action === "generate-chunk") {
      const { bookId, voiceKey, voiceId, chunkText, chapterIndex, chunkIndex, previousContext, nextContext } = body;
      if (!bookId || !chunkText || chapterIndex === undefined || chunkIndex === undefined) {
        throw new Error("Missing required fields for generate-chunk");
      }

      const { data: book } = await supabase
        .from("books").select("id, author_id, title").eq("id", bookId).single();
      if (!book || book.author_id !== user.id) {
        return new Response(JSON.stringify({ error: "Book not found or unauthorized" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resolvedVoiceId = voiceId || VOICES[voiceKey || "sarah"]?.id;
      if (!resolvedVoiceId) throw new Error("Missing voiceId or unknown voiceKey");

      console.log(`[tts-v2] generate-chunk ch${chapterIndex} #${chunkIndex} (${chunkText.length} chars)`);
      const audioBuffer = await generateTTS(ELEVENLABS_API_KEY, resolvedVoiceId, chunkText, previousContext, nextContext);

      const filePath = `${user.id}/${bookId}/chapter-${String(chapterIndex).padStart(3, "0")}-chunk-${String(chunkIndex).padStart(3, "0")}.mp3`;
      const { error: uploadError } = await supabase.storage
        .from("audiobook-audio")
        .upload(filePath, audioBuffer, { contentType: "audio/mpeg", upsert: true });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: publicUrl } = supabase.storage.from("audiobook-audio").getPublicUrl(filePath);

      return new Response(JSON.stringify({
        success: true, chunkIndex, chapterIndex, audioUrl: publicUrl.publicUrl,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === FINALIZE CHAPTER ===
    if (action === "finalize-chapter") {
      const { bookId, chapterIndex, chunkUrls, audiobookId } = body;
      const finalUrl = chunkUrls && chunkUrls.length > 0 ? chunkUrls[0] : null;

      if (audiobookId) {
        await supabase.from("audiobooks").update({
          audio_url: finalUrl, status: "generated",
        }).eq("id", audiobookId).eq("author_id", user.id);
      }

      return new Response(JSON.stringify({
        success: true, chapterIndex, audioUrls: chunkUrls, primaryUrl: finalUrl,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === LEGACY GENERATE-CHAPTER ===
    if (action === "generate-chapter") {
      const { bookId, voiceKey, voiceId, chapterText, chapterIndex, audiobookId } = body;
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

      const resolvedVoiceId = voiceId || VOICES[voiceKey || "sarah"]?.id;
      if (!resolvedVoiceId) throw new Error("Missing voiceId or unknown voiceKey");

      const truncatedText = chapterText.slice(0, 4500);
      const audioBuffer = await generateTTS(ELEVENLABS_API_KEY, resolvedVoiceId, truncatedText);

      const filePath = `${user.id}/${bookId}/chapter-${String(chapterIndex).padStart(3, "0")}.mp3`;
      const { error: uploadError } = await supabase.storage
        .from("audiobook-audio")
        .upload(filePath, audioBuffer, { contentType: "audio/mpeg", upsert: true });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: publicUrl } = supabase.storage.from("audiobook-audio").getPublicUrl(filePath);

      if (audiobookId) {
        await supabase.from("audiobooks").update({
          audio_url: publicUrl.publicUrl, status: "generated",
        }).eq("id", audiobookId).eq("author_id", user.id);
      }

      return new Response(JSON.stringify({
        success: true, chapterIndex, audioUrl: publicUrl.publicUrl,
        durationEstimate: Math.round(truncatedText.length / 15),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[tts-v2] error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("429") ? 429 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("[tts-v2] ElevenLabs API error:", response.status, errText);
    throw new Error(`ElevenLabs TTS failed [${response.status}]: ${errText}`);
  }

  return await response.arrayBuffer();
}
