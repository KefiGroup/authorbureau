import { getActiveToken } from "@/lib/get-active-token";

const AI_GATEWAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`;

interface GenerateWithAIOptions {
  bookId?: string;
  isPremium?: boolean;
  builderMode?: boolean;
  builderId?: string;
  builderLabel?: string;
  builderStep?: string;
}

/**
 * Shared helper – calls the business-consultant edge function, parses SSE safely,
 * and returns the full generated text.
 */
export async function generateWithAI(
  prompt: string,
  opts?: GenerateWithAIOptions
): Promise<string> {
  const token = await getActiveToken();
  if (!token) throw new Error("Not authenticated");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  const resp = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      bookId: opts?.bookId,
      isPremium: opts?.isPremium ?? true,
      builderMode: opts?.builderMode,
      builderId: opts?.builderId,
      builderLabel: opts?.builderLabel,
      builderStep: opts?.builderStep,
    }),
    signal: controller.signal,
  });

  if (!resp.ok) {
    clearTimeout(timeout);
    const errText = await resp.text().catch(() => "");
    throw new Error(errText || `AI generation failed (${resp.status})`);
  }
  if (!resp.body) {
    clearTimeout(timeout);
    throw new Error("AI response stream unavailable");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let fullText = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      textBuffer += decoder.decode(value, { stream: true });
      let nlIdx: number;

      while ((nlIdx = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, nlIdx);
        textBuffer = textBuffer.slice(nlIdx + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          fullText += parsed.choices?.[0]?.delta?.content || "";
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  } finally {
    clearTimeout(timeout);
  }

  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        fullText += parsed.choices?.[0]?.delta?.content || "";
      } catch {
        // ignore incomplete trailing chunk
      }
    }
  }

  return fullText.trim();
}

/**
 * Calls generateWithAI and parses the result as JSON.
 * Strips markdown code fences if present.
 */
export async function generateJSONWithAI<T = any>(
  prompt: string,
  opts?: GenerateWithAIOptions
): Promise<T> {
  const raw = await generateWithAI(prompt, opts);
  const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  return JSON.parse(cleaned);
}
