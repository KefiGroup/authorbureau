import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AmazonProduct {
  rank: number;
  title: string;
  author?: string;
  price?: string;
  rating?: number;
  reviewCount?: number;
  format?: string;
}

export interface PricingAnalysis {
  lowest: string;
  highest: string;
  average: string;
  median: string;
  sampleSize: number;
}

export interface TitleKeyword {
  word: string;
  count: number;
}

export interface MarketResearchData {
  genre: string;
  bookTitle: string;
  amazonCategory: string;
  amazonBestsellers: {
    products: AmazonProduct[];
    pricingAnalysis: PricingAnalysis | null;
    topTitleKeywords: TitleKeyword[];
    sourceUrl: string;
  } | null;
  competitorProducts: { title: string; url: string; snippet: string; platform: string }[];
  marketIntelligence: string;
  marketCitations: string[];
  pricingIntelligence: string;
  pricingCitations: string[];
  dataTimestamp: string;
  dataSources: string[];
}

const MARKET_RESEARCH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-research`;

// Cache to avoid re-fetching within the same session
const cache = new Map<string, MarketResearchData>();

export function useMarketResearch(bookId: string | undefined, bookTitle?: string, genre?: string) {
  const [data, setData] = useState<MarketResearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = bookId ? `${bookId}-${genre || ""}` : "";

  const fetch_ = useCallback(async () => {
    if (!bookTitle || !genre) return;
    if (cacheKey && cache.has(cacheKey)) {
      setData(cache.get(cacheKey)!);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(MARKET_RESEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookTitle, genre }),
      });
      if (!resp.ok) throw new Error("Market research unavailable");
      const result = await resp.json();
      setData(result);
      if (cacheKey) cache.set(cacheKey, result);
    } catch (err) {
      console.error("Market research error:", err);
      setError(err.message);
    }
    setLoading(false);
  }, [bookTitle, genre, cacheKey]);

  useEffect(() => {
    if (bookTitle && genre) fetch_();
  }, [bookTitle, genre, fetch_]);

  return { data, loading, error, refetch: fetch_ };
}
