import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";

async function readCurrentToken(): Promise<string | null> {
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
 * Resolves the best available auth token from either the Cloud or shared backend.
 * Checks Cloud first (since local Cloud sessions are auto-refreshed), then shared.
 */
export async function getActiveToken(): Promise<string | null> {
  const existingToken = await readCurrentToken();
  if (existingToken) return existingToken;

  return await new Promise((resolve) => {
    let settled = false;

    const finish = (token: string | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      window.clearInterval(pollId);
      cloudAuthSub.data.subscription.unsubscribe();
      sharedAuthSub.data.subscription.unsubscribe();
      resolve(token);
    };

    const timeoutId = window.setTimeout(() => finish(null), 5000);

    const pollId = window.setInterval(async () => {
      const token = await readCurrentToken();
      if (token) finish(token);
    }, 250);

    const cloudAuthSub = cloudSupabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) finish(session.access_token);
    });

    const sharedAuthSub = sharedSupabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) finish(session.access_token);
    });
  });
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
