/**
 * invokeGenerator — a timeout-guarded replacement for
 * `supabase.functions.invoke(...)` for the long-running AI builder generators.
 *
 * Why this exists:
 *   The builders previously called `supabase.functions.invoke(...)` directly.
 *   That call has NO client-side timeout — if the edge function stalls or the
 *   connection hangs, the promise never settles. The builders' "Generating"
 *   step shows a cosmetic rotating-message animation while awaiting, so a hung
 *   call looks like an *infinite generation loop* with no error and no retry.
 *
 *   This helper wraps `fetchWithTimeout` + `getActiveToken` (the same pattern
 *   used by funnels-api.ts) so a hang becomes a clean, catchable error after
 *   `timeoutMs`. The return shape mirrors `functions.invoke` ({ data, error })
 *   so call sites need minimal changes.
 */
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

export interface InvokeGeneratorResult<T = any> {
  data: T | null;
  error: { message: string } | null;
}

export interface InvokeGeneratorOptions {
  /** Hard ceiling for the request. AI gateway tops out around 180s, so 200s leaves headroom. */
  timeoutMs?: number;
}

const FRIENDLY_TIMEOUT =
  "This is taking longer than expected. Abby may be busy — please try again in a moment.";

export async function invokeGenerator<T = any>(
  fnName: string,
  body: Record<string, unknown>,
  options: InvokeGeneratorOptions = {},
): Promise<InvokeGeneratorResult<T>> {
  const { timeoutMs = 200000 } = options;

  let token: string | null = null;
  try {
    token = await getActiveToken();
  } catch {
    /* fall through — treated as not signed in below */
  }
  if (!token) {
    return { data: null, error: { message: "You appear to be signed out. Please sign in again." } };
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`;

  try {
    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      },
      timeoutMs,
    );

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      /* non-JSON body */
    }

    if (!res.ok) {
      const msg = data?.error || `Generation failed (HTTP ${res.status})`;
      return { data, error: { message: msg } };
    }

    return { data: data as T, error: null };
  } catch (err: any) {
    // AbortError → our timeout fired. Anything else → network failure.
    const isTimeout = err?.name === "AbortError";
    return {
      data: null,
      error: { message: isTimeout ? FRIENDLY_TIMEOUT : err?.message || "Could not reach Abby. Please try again." },
    };
  }
}
