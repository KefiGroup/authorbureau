import { createClient, processLock, type Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const AUTH_STORAGE_KEY = "authorsbureau-shared-auth";
const AUTH_MEMORY_FALLBACK_KEY = `${AUTH_STORAGE_KEY}:memory`;
const RETRYABLE_AUTH_ABORT = /(operation was aborted|aborterror|signal is aborted|lock acquire timeout)/i;

type SharedSessionInput = {
  access_token: string;
  refresh_token: string;
};

let inMemorySessionCache = "";

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

  const syncFallbackFromSessionStorage = () => {
    try {
      const bootstrap = window.sessionStorage.getItem(AUTH_MEMORY_FALLBACK_KEY);
      if (bootstrap) {
        inMemorySessionCache = bootstrap;
        memoryStorage.setItem(AUTH_STORAGE_KEY, bootstrap);
      }
    } catch {
      // Ignore sessionStorage failures too; memory fallback still works.
    }
  };

  try {
    const candidate = window.localStorage;
    const probeKey = `${AUTH_STORAGE_KEY}:probe`;
    candidate.setItem(probeKey, "1");
    candidate.removeItem(probeKey);
    syncFallbackFromSessionStorage();

    return {
      get length() {
        try {
          return candidate.length;
        } catch {
          return memoryStorage.length;
        }
      },
      clear() {
        try {
          candidate.clear();
        } catch {
          memoryStorage.clear();
        }
        inMemorySessionCache = "";
        try {
          window.sessionStorage.removeItem(AUTH_MEMORY_FALLBACK_KEY);
        } catch {
          // ignore
        }
      },
      getItem(key: string) {
        try {
          const value = candidate.getItem(key);
          if (value !== null && key === AUTH_STORAGE_KEY) {
            inMemorySessionCache = value;
          }
          return value;
        } catch {
          return memoryStorage.getItem(key);
        }
      },
      key(index: number) {
        try {
          return candidate.key(index);
        } catch {
          return memoryStorage.key(index);
        }
      },
      removeItem(key: string) {
        try {
          candidate.removeItem(key);
        } catch {
          memoryStorage.removeItem(key);
        }
        if (key === AUTH_STORAGE_KEY) {
          inMemorySessionCache = "";
          try {
            window.sessionStorage.removeItem(AUTH_MEMORY_FALLBACK_KEY);
          } catch {
            // ignore
          }
        }
      },
      setItem(key: string, value: string) {
        if (key === AUTH_STORAGE_KEY) {
          inMemorySessionCache = value;
          memoryStorage.setItem(key, value);
          try {
            window.sessionStorage.setItem(AUTH_MEMORY_FALLBACK_KEY, value);
          } catch {
            // ignore
          }
        }

        try {
          candidate.setItem(key, value);
        } catch {
          memoryStorage.setItem(key, value);
        }
      },
    } satisfies Storage;
  } catch {
    syncFallbackFromSessionStorage();

    return {
      ...memoryStorage,
      removeItem(key: string) {
        memoryStorage.removeItem(key);
        if (key === AUTH_STORAGE_KEY) {
          inMemorySessionCache = "";
        }
        try {
          window.sessionStorage.removeItem(AUTH_MEMORY_FALLBACK_KEY);
        } catch {
          // ignore
        }
      },
      setItem(key: string, value: string) {
        memoryStorage.setItem(key, value);
        if (key === AUTH_STORAGE_KEY) {
          inMemorySessionCache = value;
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
      storageKey: AUTH_STORAGE_KEY,
      persistSession: false,
      autoRefreshToken: true,
      lock: processLock,
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
        const serialized = JSON.stringify(data.session);
        inMemorySessionCache = serialized;
        sharedAuthStorage.setItem(AUTH_STORAGE_KEY, serialized);
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

export async function getSharedSession(): Promise<Session | null> {
  try {
    const { data } = await sharedSupabase.auth.getSession();
    if (data.session?.access_token) {
      return data.session;
    }
  } catch {
    // fall through to fallback cache
  }

  if (!inMemorySessionCache) {
    try {
      inMemorySessionCache = sharedAuthStorage.getItem(AUTH_STORAGE_KEY) ?? "";
    } catch {
      inMemorySessionCache = "";
    }
  }

  if (!inMemorySessionCache) {
    return null;
  }

  try {
    const cachedSession = JSON.parse(inMemorySessionCache) as Session;
    const { data, error } = await sharedSupabase.auth.setSession({
      access_token: cachedSession.access_token,
      refresh_token: cachedSession.refresh_token,
    });

    if (!error && data.session?.access_token) {
      return data.session;
    }

    return cachedSession;
  } catch {
    return null;
  }
}

export function clearSharedSessionCache() {
  inMemorySessionCache = "";
  try {
    sharedAuthStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
}
