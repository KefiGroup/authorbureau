import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";

/**
 * Resolves the best available auth token from either the Cloud or shared backend.
 * Checks Cloud first (since local Cloud sessions are auto-refreshed), then shared.
 */
export async function getActiveToken(): Promise<string | null> {
  try {
    const { data: cloudSession } = await cloudSupabase.auth.getSession();
    if (cloudSession?.session?.access_token) return cloudSession.session.access_token;
  } catch (error) {
    // Cloud session unavailable
  }
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
