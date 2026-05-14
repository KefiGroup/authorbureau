import { getSharedSession, supabase as sharedSupabase } from "@/lib/shared-backend";

const SHARED_AUTH_KEY = "authorsbureau-shared-auth";
const SHARED_AUTH_MEMORY_KEY = `${SHARED_AUTH_KEY}:memory`;

/**
 * Decode a JWT and return its `exp` (seconds since epoch), or null if it
 * cannot be parsed. Pure client-side; no network call.
 */
function getJwtExpirySeconds(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // base64url -> base64
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = typeof atob === "function" ? atob(padded) : "";
    if (!json) return null;
    const payload = JSON.parse(json);
    return typeof payload?.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * Returns true if the token is missing, malformed, expired, or expires within
 * the next `safetyWindowSec` seconds. Conservatively treats unparseable
 * tokens as expired so we don't ship dead tokens to the server.
 */
function isTokenExpired(token: string | null, safetyWindowSec = 30): boolean {
  if (!token) return true;
  const exp = getJwtExpirySeconds(token);
  if (exp === null) return true;
  const nowSec = Math.floor(Date.now() / 1000);
  return exp - nowSec <= safetyWindowSec;
}

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

// In-flight de-duplicator: when many widgets mount simultaneously and each
// asks for the token, share a single underlying lookup for ~250ms instead of
// piling N concurrent requests onto the gotrue lock.
let inflightToken: { promise: Promise<string | null>; expiresAt: number } | null = null;
const INFLIGHT_TTL_MS = 250;

export interface GetActiveTokenOptions {
  /**
   * When true, bypass the cache and call refreshSession() to obtain a fresh
   * access token. Use this on the retry path after the server rejects a
   * stale token.
   */
  forceRefresh?: boolean;
}

/**
 * Resolves the active auth token. Races the gotrue lock-protected getSession()
 * against a 2s timeout — if the lock is contended we fall back to the cached
 * session token in localStorage so callers don't hang for 10s.
 *
 * If the cached token has expired (or is about to expire), we skip the fast
 * path and let getSession() refresh it. With `{ forceRefresh: true }` we call
 * refreshSession() directly and ignore any cache.
 */
export async function getActiveToken(
  options: GetActiveTokenOptions = {},
): Promise<string | null> {
  if (options.forceRefresh) {
    // Bypass dedup cache on force-refresh so we always hit the network.
    inflightToken = null;
    try {
      const { data } = await sharedSupabase.auth.refreshSession();
      const refreshed = data?.session?.access_token ?? null;
      if (refreshed) return refreshed;
    } catch {
      /* fall through to normal path */
    }
    // Last resort: re-read cache (may have been refreshed by another tab).
    return readCachedAccessToken();
  }

  const now = Date.now();
  if (inflightToken && inflightToken.expiresAt > now) {
    return inflightToken.promise;
  }

  const promise = (async (): Promise<string | null> => {
    // Fast path: only return the cached token if it's still valid. An
    // expired/near-expired token must NOT be returned — we'd send a dead
    // token to the server and get 401/Invalid session back.
    const cached = readCachedAccessToken();
    if (cached && !isTokenExpired(cached)) return cached;

    // Cached token is missing or stale. Ask the auth client for a fresh
    // session — this triggers an automatic refresh if needed.
    const sessionPromise = sharedSupabase.auth.getSession()
      .then(({ data }) => data?.session?.access_token ?? null)
      .catch(() => null);

    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 2000);
    });

    try {
      const fast = await Promise.race([sessionPromise, timeoutPromise]);
      if (fast && !isTokenExpired(fast)) return fast;
    } catch {
      /* fall through */
    }

    // Final fallback: re-read storage (a parallel refresh may have written
    // a fresh token by now).
    const refreshed = readCachedAccessToken();
    return refreshed && !isTokenExpired(refreshed) ? refreshed : null;
  })();

  inflightToken = { promise, expiresAt: now + INFLIGHT_TTL_MS };
  void promise.finally(() => {
    if (inflightToken && inflightToken.promise === promise) {
      // keep TTL — don't null it out so peers can still reuse.
    }
  });
  return promise;
}

export interface WaitForActiveTokenOptions {
  maxMs?: number;
  intervalMs?: number;
  forceRefreshOnTimeout?: boolean;
}

/**
 * Wait for shared-auth restoration to finish before giving up on the token.
 * This prevents dashboard queries from permanently booting with a false empty
 * state when the first read races session restore.
 */
export async function waitForActiveToken(
  options: WaitForActiveTokenOptions = {},
): Promise<string | null> {
  const {
    maxMs = 8000,
    intervalMs = 250,
    forceRefreshOnTimeout = true,
  } = options;

  const startedAt = Date.now();

  while (Date.now() - startedAt < maxMs) {
    const token = await getActiveToken();
    if (token) return token;

    await getSharedSession().catch(() => null);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return forceRefreshOnTimeout ? getActiveToken({ forceRefresh: true }) : null;
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
