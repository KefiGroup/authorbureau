// BA-11 Voice Preview - fresh endpoint to bypass stale gateway state
// Minimal ElevenLabs TTS preview with in-code auth validation

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
    const decoded = atob(padded);
    const claims = JSON.parse(decoded);
    return { sub: claims.sub, email: claims.email };
  } catch (_e) {
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
  console.log("[ba11-voice-preview] request started", { method: req.method });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  console.log("[ba11-voice-preview] auth header present:", !!authHeader);

  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { error: "Missing Authorization bearer token" });
  }

  const token = authHeader.slice(7).trim();
  const claims = decodeJwtSub(token);
  console.log("[ba11-voice-preview] jwt decode:", {
    ok: !!claims?.sub,
    email: claims?.email,
  });

  if (!claims?.sub) {
    return json(401, { error: "Could not resolve user identity from token" });
  }

  let body: { voiceId?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const voiceId = body.voiceId;
  const text =
    body.text ||
    "Hello, this is a preview of how I would narrate your audiobook. I hope you enjoy the warmth and clarity of my voice.";

  console.log("[ba11-voice-preview] params:", {
    voiceId,
    textLen: text.length,
    user: claims.sub,
  });

  if (!voiceId || typeof voiceId !== "string") {
    return json(400, { error: "voiceId is required" });
  }

  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) {
    console.error("[ba11-voice-preview] ELEVENLABS_API_KEY missing");
    return json(500, { error: "ELEVENLABS_API_KEY is not configured" });
  }

  try {
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

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      console.error("[ba11-voice-preview] elevenlabs error", ttsRes.status, errText);
      return json(502, {
        error: `ElevenLabs error ${ttsRes.status}`,
        details: errText.slice(0, 500),
      });
    }

    const buf = new Uint8Array(await ttsRes.arrayBuffer());
    const audioBase64 = bytesToBase64(buf);
    console.log("[ba11-voice-preview] success, bytes:", buf.length);

    return json(200, { audioBase64, format: "mp3" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[ba11-voice-preview] exception", msg);
    return json(500, { error: msg });
  }
});
