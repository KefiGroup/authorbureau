import { createClient, processLock } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const AUTH_STORAGE_KEY = "authorsbureau-shared-auth";
const AUTH_MEMORY_FALLBACK_KEY = `${AUTH_STORAGE_KEY}:memory`;
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

function getSafeStorage(): Storage {
  const memory = new Map<string, string>();

  const memoryStorage: Storage = {
    get length() {
      return memory.size;
    },
    clear() {
      memory.clear();
    },
    getItem(key: string) {
      return memory.has(key) ? memory.get(key)! : null;
    },
    key(index: number) {
      return Array.from(memory.keys())[index] ?? null;
    },
    removeItem(key: string) {
      memory.delete(key);
    },
    setItem(key: string, value: string) {
      memory.set(key, value);
    },
  };

  if (typeof window === "undefined") {
    return memoryStorage;
  }

  try {
    const candidate = window.localStorage;
    const probeKey = `${AUTH_STORAGE_KEY}:probe`;
    candidate.setItem(probeKey, "1");
    candidate.removeItem(probeKey);
    return candidate;
  } catch {
    try {
      const bootstrap = window.sessionStorage.getItem(AUTH_MEMORY_FALLBACK_KEY);
      if (bootstrap) {
        memoryStorage.setItem(AUTH_STORAGE_KEY, bootstrap);
      }
    } catch {
      // Ignore sessionStorage failures too; memory fallback still works.
    }

    return {
      ...memoryStorage,
      removeItem(key: string) {
        memoryStorage.removeItem(key);
        try {
          window.sessionStorage.removeItem(AUTH_MEMORY_FALLBACK_KEY);
        } catch {
          // ignore
        }
      },
      setItem(key: string, value: string) {
        memoryStorage.setItem(key, value);
        if (key === AUTH_STORAGE_KEY) {
          try {
            window.sessionStorage.setItem(AUTH_MEMORY_FALLBACK_KEY, value);
          } catch {
            // ignore
          }
        }
      },
    } as Storage;
  }
}

const sharedAuthStorage = getSafeStorage();

export const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
export const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

export const sharedSupabase = createClient<Database>(
  SHARED_BACKEND_URL,
  SHARED_ANON_KEY,
  {
    auth: {
      storage: sharedAuthStorage,
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
      try {
        sharedAuthStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.session));
      } catch {
        // Ignore manual cache write failures — the in-memory session is already active.
      }
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
