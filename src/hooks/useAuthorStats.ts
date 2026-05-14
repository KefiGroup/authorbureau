import { useState, useEffect, useCallback } from "react";
import { fetchWithTimeout, waitForActiveToken } from "@/lib/get-active-token";

export interface AuthorStats {
  bookCount: number;
  liveMicrosites: number;
  analyzedCount: number;
  stripeConnected: boolean;
  nodesBuilt: {
    brand: number;
    buildAuthority: number;
    yield: number;
  };
  products: {
    totalBuilt: number;
    totalReadyForReview: number;
    totalPublished: number;
    perTable: Record<string, { draft: number; ready_for_review: number; published: number; total: number }>;
    perBook: Record<string, PerBookStats>;
  };
}

export interface PerBookStats {
  brand: number;
  build: number;
  yield: number;
  total: number;
  nodeIds: string[];
}

const DEFAULT_STATS: AuthorStats = {
  bookCount: 0,
  liveMicrosites: 0,
  analyzedCount: 0,
  stripeConnected: false,
  nodesBuilt: { brand: 0, buildAuthority: 0, yield: 0 },
  products: {
    totalBuilt: 0,
    totalReadyForReview: 0,
    totalPublished: 0,
    perTable: {},
    perBook: {},
  },
};

// Module-level cache to prevent re-fetches across remounts
let cachedStatsByUser: Record<string, AuthorStats | undefined> = {};
let cacheTimestampByUser: Record<string, number | undefined> = {};
const CACHE_TTL = 30_000; // 30 seconds

export function useAuthorStats(userId: string | undefined) {
  const cachedStats = userId ? cachedStatsByUser[userId] ?? null : null;
  const [stats, setStats] = useState<AuthorStats>(cachedStats || DEFAULT_STATS);
  const [loading, setLoading] = useState(!cachedStats);

  const refetch = useCallback(async (force = false) => {
    if (!userId) return;
    const userCachedStats = cachedStatsByUser[userId] ?? null;
    const userCacheTimestamp = cacheTimestampByUser[userId] ?? 0;
    // Use cache if fresh and not forced
    if (!force && userCachedStats && Date.now() - userCacheTimestamp < CACHE_TTL) {
      setStats(userCachedStats);
      setLoading(false);
      return;
    }
    // Keep showing previous stats while we refetch — no flash of zero counts
    if (!userCachedStats) setLoading(true);
    try {
      const token = await waitForActiveToken();
      // Auth not ready (shared session still restoring, or session expired):
      // do NOT reset to DEFAULT_STATS — keep cached stats so the dashboard
      // doesn't flip back to a "new user / no books" state mid-session.
      if (!token) {
        setLoading(false);
        return;
      }
      const resp = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/author-stats`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        cachedStatsByUser[userId] = data;
        cacheTimestampByUser[userId] = Date.now();
        setStats(data);
      }
      // 401 / 5xx: keep prior stats; surface no error so cached state stays visible.
    } catch (err) {
      console.error("useAuthorStats error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setStats(DEFAULT_STATS);
      setLoading(false);
      return;
    }

    const userCachedStats = cachedStatsByUser[userId] ?? null;
    setStats(userCachedStats || DEFAULT_STATS);
    setLoading(!userCachedStats);
    refetch();
  }, [refetch, userId]);

  return { stats, loading, refetch: () => refetch(true) };
}
