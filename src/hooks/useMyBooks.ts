import { useEffect, useState, useCallback } from "react";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

export interface MyBook {
  id: string;
  title: string;
  cover_image_url?: string | null;
  published_at?: string | null;
}

// Module-level cache so the sidebar + dashboard don't re-fetch independently.
let cached: MyBook[] | null = null;
let cachedAt = 0;
const TTL = 60_000;

export function useMyBooks(userId: string | undefined) {
  const [books, setBooks] = useState<MyBook[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);

  const refetch = useCallback(async (force = false) => {
    if (!userId) return;
    if (!force && cached && Date.now() - cachedAt < TTL) {
      setBooks(cached);
      setLoading(false);
      return;
    }
    try {
      const token = await getActiveToken();
      if (!token) return;
      const resp = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        },
        15000
      );
      if (!resp.ok) return;
      const data = await resp.json();
      const list: MyBook[] = (data?.books ?? []).map((b: any) => ({
        id: b.id,
        title: b.title,
        cover_image_url: b.cover_image_url ?? null,
        published_at: b.published_at ?? null,
      }));
      cached = list;
      cachedAt = Date.now();
      setBooks(list);
    } catch (err) {
      console.error("useMyBooks error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { books, loading, refetch: () => refetch(true) };
}
