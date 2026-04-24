import { createClient, processLock } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const AUTH_STORAGE_KEY = "authorsbureau-shared-auth";
const RETRYABLE_AUTH_ABORT = /(operation was aborted|aborterror|signal is aborted|lock acquire timeout)/i;

type SharedSessionInput = {
  access_token: string;
  refresh_token: string;
};

function isRetryableAuthError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? "");
  return RETRYABLE_AUTH_ABORT.test(text);
}

function delay(ms: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

export const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
export const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

export const sharedSupabase = createClient<Database>(
  SHARED_BACKEND_URL,
  SHARED_ANON_KEY,
  {
    auth: {
      storage: localStorage,
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      lock: processLock,
      lockAcquireTimeout: 2000,
    },
  }
);

// Re-export as `supabase` so existing imports only need to change the path
export const supabase = sharedSupabase;

export async function establishSharedSession(sessionData: SharedSessionInput) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const { data, error } = await sharedSupabase.auth.setSession(sessionData);

    if (!error) {
      return data.session;
    }

    lastError = error;

    if (!isRetryableAuthError(error) || attempt === 3) {
      throw error;
    }

    await delay(150 * attempt);
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to establish session.");
}
