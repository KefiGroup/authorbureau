import { useState, useEffect, useCallback } from "react";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

export interface AuthorStats {
  bookCount: number;
  liveMicrosites: number;
  analyzedCount: number;
  stripeConnected: boolean;
  products: {
    totalBuilt: number;
    totalReadyForReview: number;
    totalPublished: number;
    perTable: Record<string, { draft: number; ready_for_review: number; published: number; total: number }>;
    perBook: Record<string, number>;
  };
}

const DEFAULT_STATS: AuthorStats = {
  bookCount: 0,
  liveMicrosites: 0,
  analyzedCount: 0,
  stripeConnected: false,
  products: {
    totalBuilt: 0,
    totalReadyForReview: 0,
    totalPublished: 0,
    perTable: {},
    perBook: {},
  },
};

export function useAuthorStats(userId: string | undefined) {
  const [stats, setStats] = useState<AuthorStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) return;
    try {
      const token = await getActiveToken();
      if (!token) return;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/author-stats`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        setStats(data);
      }
    } catch (err) {
      console.error("useAuthorStats error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { stats, loading, refetch };
}
