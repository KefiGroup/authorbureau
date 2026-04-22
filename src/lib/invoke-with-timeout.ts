import { getActiveToken } from "@/lib/get-active-token";

/**
 * Invoke a Supabase Edge Function with an explicit timeout (default 90s).
 * Uses fetch + AbortController so we can override the implicit ~30s gateway-
 * close timeout that breaks heavy generators (BA-13, BA-15, BA-18).
 *
 * Returns { data, error } in the same shape as supabase.functions.invoke().
 */
export async function invokeWithTimeout<T = any>(
  functionName: string,
  body: Record<string, unknown>,
  timeoutMs = 90000,
): Promise<{ data: T | null; error: Error | null }> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!projectId || !anonKey) {
    return { data: null, error: new Error("Supabase env not configured") };
  }
  const url = `https://${projectId}.supabase.co/functions/v1/${functionName}`;
  const token = (await getActiveToken()) ?? anonKey;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text }; }
    if (!res.ok) {
      const message = parsed?.error || parsed?.message || `HTTP ${res.status}`;
      return { data: parsed as T, error: new Error(message) };
    }
    return { data: parsed as T, error: null };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return {
        data: null,
        error: new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s. Please try again.`),
      };
    }
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  } finally {
    clearTimeout(timer);
  }
}
