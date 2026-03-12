import { getActiveToken } from "@/lib/get-active-token";

const AI_GATEWAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`;

/**
 * Shared helper – calls the business-consultant edge function, collects SSE
 * stream, and returns the full generated text.  Throws on network / HTTP errors.
 */
export async function generateWithAI(
  prompt: string,
  opts?: { bookId?: string; isPremium?: boolean }
): Promise<string> {
  const token = await getActiveToken();
  if (!token) throw new Error("Not authenticated");

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
    }),
  });

  if (!resp.ok) throw new Error(`AI generation failed (${resp.status})`);

  const text = await resp.text();
  let fullText = "";
  for (const line of text.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const json = line.slice(6).trim();
    if (json === "[DONE]") break;
    try {
      const parsed = JSON.parse(json);
      fullText += parsed.choices?.[0]?.delta?.content || "";
    } catch {
      // skip malformed chunks
    }
  }
  return fullText;
}

/**
 * Calls generateWithAI and parses the result as JSON.
 * Strips markdown code fences if present.
 */
export async function generateJSONWithAI<T = any>(
  prompt: string,
  opts?: { bookId?: string; isPremium?: boolean }
): Promise<T> {
  const raw = await generateWithAI(prompt, opts);
  // Strip markdown code fences
  const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  return JSON.parse(cleaned);
}
