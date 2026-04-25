import { supabase as sharedSupabase } from "@/lib/shared-backend";

const SHARED_AUTH_KEY = "authorsbureau-shared-auth";
const SHARED_AUTH_MEMORY_KEY = `${SHARED_AUTH_KEY}:memory`;

function readCachedAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const tryParse = (raw: string | null): string | null => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      const token = parsed?.access_token || parsed?.session?.access_token;
      return typeof token === "string" && token.length > 0 ? token : null;
    } catch {
      return null;
    }
  };
  try {
    const fromLocal = tryParse(window.localStorage.getItem(SHARED_AUTH_KEY));
    if (fromLocal) return fromLocal;
  } catch {
    /* ignore */
  }
  try {
    return tryParse(window.sessionStorage.getItem(SHARED_AUTH_MEMORY_KEY));
  } catch {
    return null;
  }
}

/**
 * Resolves the active auth token. Races the gotrue lock-protected getSession()
 * against a 2s timeout — if the lock is contended we fall back to the cached
 * session token in localStorage so callers don't hang for 10s.
 */
export async function getActiveToken(): Promise<string | null> {
  const sessionPromise = sharedSupabase.auth.getSession()
    .then(({ data }) => data?.session?.access_token ?? null)
    .catch(() => null);

  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), 2000);
  });

  try {
    const fast = await Promise.race([sessionPromise, timeoutPromise]);
    if (fast) return fast;
  } catch {
    /* fall through */
  }

  return readCachedAccessToken();
}

/**
 * Fetch with a timeout. Returns the Response or throws on timeout.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 25000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}
