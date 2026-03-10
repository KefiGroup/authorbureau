import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MarketResearchRequest {
  bookTitle: string;
  genre: string;
  keywords?: string[];
  description?: string;
}

interface MarketInsight {
  competitorProducts: Array<{
    type: string;
    priceRange: string;
    popularity: string;
    source: string;
  }>;
  trendingTopics: string[];
  audienceDemographics: string;
  pricingBenchmarks: Record<string, string>;
  marketSummary: string;
  dataTimestamp: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookTitle, genre, keywords, description } = await req.json() as MarketResearchRequest;

    if (!bookTitle || !genre) {
      return new Response(
        JSON.stringify({ error: "bookTitle and genre are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");

    const searchTerms = keywords?.length
      ? keywords.join(", ")
      : `${genre} ${bookTitle}`;

    // Run Firecrawl (Amazon scrape) and Perplexity (market intelligence) in parallel
    const results = await Promise.allSettled([
      // --- Firecrawl: Scrape Amazon bestsellers for this genre ---
      FIRECRAWL_API_KEY
        ? fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: `https://www.amazon.com/s?k=${encodeURIComponent(genre + " book")}&i=stripbooks&s=relevanceblender`,
              formats: ["markdown"],
              onlyMainContent: true,
              waitFor: 3000,
            }),
          }).then(r => r.json()).catch(() => null)
        : Promise.resolve(null),

      // --- Firecrawl: Scrape Gumroad/Udemy for digital products in this niche ---
      FIRECRAWL_API_KEY
        ? fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: `${searchTerms} online course OR workbook OR coaching program site:gumroad.com OR site:udemy.com OR site:teachable.com`,
              limit: 8,
              scrapeOptions: { formats: ["markdown"] },
            }),
          }).then(r => r.json()).catch(() => null)
        : Promise.resolve(null),

      // --- Perplexity: Market intelligence + pricing + trends ---
      PERPLEXITY_API_KEY
        ? fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "sonar-pro",
              messages: [
                {
                  role: "system",
                  content: "You are a market research analyst specializing in author monetization and digital product ecosystems. Return structured, data-backed insights with specific numbers, price ranges, and trends. Be concise.",
                },
                {
                  role: "user",
                  content: `Research the market for a book titled "${bookTitle}" in the "${genre}" genre.${description ? ` Book description: ${description}` : ""}

I need:
1. COMPETITOR PRODUCTS: What digital products (courses, workbooks, coaching, memberships) exist in this niche? Include specific price points and platforms.
2. TRENDING TOPICS: What are the top 5 trending sub-topics or keywords in this genre right now?
3. AUDIENCE DEMOGRAPHICS: Who buys products in this niche? Age, income, pain points.
4. PRICING BENCHMARKS: Average prices for courses, workbooks, coaching, memberships, and speaking fees in this niche.
5. REVENUE POTENTIAL: Estimated monthly revenue for a new author selling digital products in this niche, with realistic conversion rates.
6. TOP PLATFORMS: Where are these products being sold? (Gumroad, Teachable, Kajabi, Amazon KDP, etc.)

Be specific with numbers and cite sources where possible.`,
                },
              ],
              search_recency_filter: "month",
            }),
          }).then(r => r.json()).catch(() => null)
        : Promise.resolve(null),

      // --- Perplexity: Niche-specific pricing deep dive ---
      PERPLEXITY_API_KEY
        ? fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "sonar",
              messages: [
                {
                  role: "user",
                  content: `What is the average price for these digital products in the "${genre}" niche:
- Online courses
- Companion workbooks
- 1-on-1 coaching per session
- Group coaching programs
- Membership communities (monthly)
- Webinar series
- Home study courses
- Audiobooks

Also list the top 3 bestselling digital products in this niche right now with their exact prices.`,
                },
              ],
              search_recency_filter: "week",
            }),
          }).then(r => r.json()).catch(() => null)
        : Promise.resolve(null),
    ]);

    // Process results
    const [amazonResult, gumroadResult, marketIntelResult, pricingResult] = results;

    let amazonData = null;
    if (amazonResult.status === "fulfilled" && amazonResult.value) {
      amazonData = amazonResult.value;
    }

    let gumroadData = null;
    if (gumroadResult.status === "fulfilled" && gumroadResult.value) {
      gumroadData = gumroadResult.value;
    }

    let marketIntel = "";
    let marketCitations: string[] = [];
    if (marketIntelResult.status === "fulfilled" && marketIntelResult.value?.choices?.[0]?.message?.content) {
      marketIntel = marketIntelResult.value.choices[0].message.content;
      marketCitations = marketIntelResult.value.citations || [];
    }

    let pricingIntel = "";
    let pricingCitations: string[] = [];
    if (pricingResult.status === "fulfilled" && pricingResult.value?.choices?.[0]?.message?.content) {
      pricingIntel = pricingResult.value.choices[0].message.content;
      pricingCitations = pricingResult.value.citations || [];
    }

    // Compile competitor products from Gumroad/Udemy scrape
    const competitorProducts: Array<{ title: string; url: string; snippet: string }> = [];
    if (gumroadData?.success && gumroadData?.data) {
      for (const item of gumroadData.data.slice(0, 6)) {
        competitorProducts.push({
          title: item.title || "Unknown",
          url: item.url || "",
          snippet: (item.markdown || item.description || "").slice(0, 200),
        });
      }
    }

    // Build the market research payload
    const research = {
      genre,
      bookTitle,
      searchTerms,
      amazonBestsellerContext: amazonData?.data?.markdown
        ? amazonData.data.markdown.slice(0, 3000)
        : amazonData?.markdown
        ? amazonData.markdown.slice(0, 3000)
        : null,
      competitorProducts,
      marketIntelligence: marketIntel,
      marketCitations,
      pricingIntelligence: pricingIntel,
      pricingCitations,
      dataTimestamp: new Date().toISOString(),
      dataSources: [
        FIRECRAWL_API_KEY ? "Amazon Bestsellers" : null,
        FIRECRAWL_API_KEY ? "Gumroad/Udemy/Teachable" : null,
        PERPLEXITY_API_KEY ? "Perplexity Market Intelligence" : null,
        PERPLEXITY_API_KEY ? "Perplexity Pricing Research" : null,
      ].filter(Boolean),
    };

    console.log(`Market research completed for "${bookTitle}" (${genre}) — ${research.dataSources.length} sources used`);

    return new Response(JSON.stringify(research), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Market research error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
