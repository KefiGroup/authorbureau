import { supabase as sharedSupabase } from "@/lib/shared-backend";

/**
 * Resolves the active auth token from the single PublishNow/shared auth session.
 */
export async function getActiveToken(): Promise<string | null> {
  try {
    const { data: sharedSession } = await sharedSupabase.auth.getSession();
    if (sharedSession?.session?.access_token) return sharedSession.session.access_token;
  } catch (error) {
    // Shared session unavailable
  }
  return null;
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
