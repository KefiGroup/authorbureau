// BA-11 Audiobook chapter generation - fresh endpoint, no client-side gateway issues.
// Mirrors ba11-voice-preview pattern: in-code JWT decode, ElevenLabs TTS, returns base64 MP3.

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

  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { error: "Missing Authorization bearer token" });
  }

  const token = authHeader.slice(7).trim();
  const claims = decodeJwtSub(token);
  console.log("[ba11-audiobook-generate] jwt decode:", { ok: !!claims?.sub, email: claims?.email });

  if (!claims?.sub) {
    return json(401, { error: "Could not resolve user identity from token" });
  }

  let body: {
    voiceId?: string;
    chapterText?: string;
    chapterIndex?: number;
    bookId?: string;
    action?: string;
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
    user: claims.sub,
  });

  if (!voiceId || typeof voiceId !== "string") {
    return json(400, { error: "voiceId is required" });
  }
  if (!chapterText || typeof chapterText !== "string" || chapterText.trim().length === 0) {
    return json(400, { error: "chapterText is required" });
  }

  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) {
    console.error("[ba11-audiobook-generate] ELEVENLABS_API_KEY missing");
    return json(500, { error: "ELEVENLABS_API_KEY is not configured" });
  }

  // Truncate extremely long chapters to keep within ElevenLabs limits (~5000 chars per request).
  // For the BA-11 MVP we cap at 4500 to be safe; longer chapters can be chunked in a future pass.
  const MAX_CHARS = 4500;
  const text =
    chapterText.length > MAX_CHARS ? chapterText.slice(0, MAX_CHARS) : chapterText;
  if (chapterText.length > MAX_CHARS) {
    console.log("[ba11-audiobook-generate] truncated chapter from", chapterText.length, "to", MAX_CHARS);
  }

  try {
    const startedAt = Date.now();
    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
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
        error: `ElevenLabs error ${ttsRes.status}`,
        details: errText.slice(0, 500),
      });
    }

    const buf = new Uint8Array(await ttsRes.arrayBuffer());
    const audioBase64 = bytesToBase64(buf);
    console.log("[ba11-audiobook-generate] success, bytes:", buf.length);

    return json(200, {
      audioBase64,
      format: "mp3",
      bytes: buf.length,
      chapterIndex,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[ba11-audiobook-generate] exception", msg);
    return json(500, { error: msg });
  }
});
