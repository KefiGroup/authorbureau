import { useEffect, useState, useCallback, useRef } from "react";
import { fetchWithTimeout, waitForActiveToken } from "@/lib/get-active-token";

export interface MyBook {
  id: string;
  title: string;
  cover_image_url?: string | null;
  published_at?: string | null;
}

// Module-level cache so the sidebar + dashboard don't re-fetch independently.
// Keyed by userId so switching users never leaks another user's books.
let cachedUserId: string | null = null;
let cached: MyBook[] | null = null;
let cachedAt = 0;
const TTL = 60_000;
let lastRequestedUserId: string | null = null;

const CACHE_BUST_KEY = (userId: string) => `mybooks_cache_bust_${userId}`;

export function bustMyBooksCache(userId?: string) {
  cached = null;
  cachedUserId = null;
  cachedAt = 0;
  if (!userId || lastRequestedUserId === userId) {
    lastRequestedUserId = null;
  }
  if (userId) {
    try { localStorage.setItem(CACHE_BUST_KEY(userId), String(Date.now())); } catch {}
  }
}

export function useMyBooks(userId: string | undefined) {
  const initial = cachedUserId === userId ? cached : null;
  const [books, setBooks] = useState<MyBook[]>(initial ?? []);
  const [loading, setLoading] = useState(!initial);
  const inFlightRef = useRef(false);

  const refetch = useCallback(async (force = false) => {
    if (!userId) return;
    if (inFlightRef.current) return;

    // Cross-tab cache invalidation (e.g., admin deleted a book elsewhere).
    let bustTs = 0;
    try {
      const v = localStorage.getItem(CACHE_BUST_KEY(userId));
      if (v) bustTs = Number(v) || 0;
    } catch {}

    const sameUser = cachedUserId === userId;
    const fresh = sameUser && cached && Date.now() - cachedAt < TTL && cachedAt > bustTs;
    if (!force && fresh) {
      setBooks(cached!);
      setLoading(false);
      return;
    }

    inFlightRef.current = true;
    try {
      lastRequestedUserId = userId;
      const token = await waitForActiveToken();
      if (!token) {
        // Auth still not ready: keep cached books visible, do NOT clear.
        setLoading(false);
        return;
      }
      const resp = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        },
        15000
      );
      if (!resp.ok) {
        // Transient auth/server failure: preserve cached books.
        return;
      }
      const data = await resp.json();
      const list: MyBook[] = (data?.books ?? []).map((b: any) => ({
        id: b.id,
        title: b.title,
        cover_image_url: b.cover_image_url ?? null,
        published_at: b.published_at ?? null,
      }));
      if (lastRequestedUserId !== userId) {
        return;
      }
      // Always update on success — even when length is 0 — so deletes propagate.
      cached = list;
      cachedUserId = userId;
      cachedAt = Date.now();
      setBooks(list);
    } catch (err) {
      console.error("useMyBooks error:", err);
      // Preserve cached books on error.
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // If userId changed, drop the stale cache view immediately.
    if (cachedUserId && cachedUserId !== userId) {
      cached = null;
      cachedUserId = null;
      cachedAt = 0;
      lastRequestedUserId = null;
      setBooks([]);
      setLoading(true);
    }
    if (!userId) {
      lastRequestedUserId = null;
      setBooks([]);
      setLoading(false);
      return;
    }
    refetch();
  }, [refetch, userId]);

  return { books, loading, refetch: () => refetch(true) };
}
