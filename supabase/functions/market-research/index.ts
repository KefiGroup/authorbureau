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
  productType?: string; // e.g. "workbook", "online-course", "coaching"
}

// Map common genres to Amazon Best Sellers category IDs
const AMAZON_CATEGORY_MAP: Record<string, { categoryId: string; categoryName: string }> = {
  "self-help": { categoryId: "4736", categoryName: "Self-Help" },
  "personal development": { categoryId: "4736", categoryName: "Self-Help" },
  "business": { categoryId: "3", categoryName: "Business & Money" },
  "finance": { categoryId: "2665", categoryName: "Personal Finance" },
  "investing": { categoryId: "2665", categoryName: "Personal Finance" },
  "leadership": { categoryId: "11124", categoryName: "Leadership" },
  "management": { categoryId: "11124", categoryName: "Leadership" },
  "health": { categoryId: "10", categoryName: "Health, Fitness & Dieting" },
  "wellness": { categoryId: "10", categoryName: "Health, Fitness & Dieting" },
  "fitness": { categoryId: "10", categoryName: "Health, Fitness & Dieting" },
  "parenting": { categoryId: "20", categoryName: "Parenting & Relationships" },
  "relationships": { categoryId: "20", categoryName: "Parenting & Relationships" },
  "spirituality": { categoryId: "22", categoryName: "Religion & Spirituality" },
  "religion": { categoryId: "22", categoryName: "Religion & Spirituality" },
  "fiction": { categoryId: "10399", categoryName: "Literature & Fiction" },
  "memoir": { categoryId: "4646", categoryName: "Biographies & Memoirs" },
  "biography": { categoryId: "4646", categoryName: "Biographies & Memoirs" },
  "education": { categoryId: "6", categoryName: "Education & Teaching" },
  "psychology": { categoryId: "11648", categoryName: "Psychology" },
  "cooking": { categoryId: "4370", categoryName: "Cookbooks, Food & Wine" },
  "science": { categoryId: "75", categoryName: "Science & Math" },
  "technology": { categoryId: "5", categoryName: "Computers & Technology" },
  "children": { categoryId: "4", categoryName: "Children's Books" },
  "young adult": { categoryId: "28", categoryName: "Teen & Young Adult" },
  "motivation": { categoryId: "4736", categoryName: "Self-Help" },
  "entrepreneurship": { categoryId: "2675", categoryName: "Entrepreneurship" },
  "marketing": { categoryId: "2690", categoryName: "Marketing & Sales" },
};

function resolveAmazonCategory(genre: string): { categoryId: string; categoryName: string } {
  const lower = genre.toLowerCase().trim();
  // Direct match
  if (AMAZON_CATEGORY_MAP[lower]) return AMAZON_CATEGORY_MAP[lower];
  // Partial match
  for (const [key, val] of Object.entries(AMAZON_CATEGORY_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  // Default fallback: general books
  return { categoryId: "1000", categoryName: "Books" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookTitle, genre, keywords, description, productType } = await req.json() as MarketResearchRequest;

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

    const amazonCategory = resolveAmazonCategory(genre);
    const amazonBestsellerUrl = `https://www.amazon.com/gp/bestsellers/books/${amazonCategory.categoryId}`;

    // Run all data sources in parallel
    const results = await Promise.allSettled([

      // ─── 1. Firecrawl: Amazon Bestsellers (structured JSON extraction) ───
      FIRECRAWL_API_KEY
        ? fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: amazonBestsellerUrl,
              formats: [
                {
                  type: "json",
                  schema: {
                    type: "object",
                    properties: {
                      category_name: { type: "string", description: "The bestseller category being viewed" },
                      products: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            rank: { type: "number", description: "Bestseller rank (1-50)" },
                            title: { type: "string", description: "Full product title" },
                            author: { type: "string", description: "Author name" },
                            price: { type: "string", description: "Listed price (e.g. '$14.99')" },
                            rating: { type: "number", description: "Star rating out of 5" },
                            review_count: { type: "string", description: "Number of reviews (e.g. '2,345')" },
                            format: { type: "string", description: "Format: Kindle, Paperback, Hardcover, Audiobook" },
                          },
                          required: ["title"],
                        },
                      },
                    },
                    required: ["products"],
                  },
                  prompt: "Extract the top 20 bestselling products from this Amazon bestseller page. Include rank, title, author, price, rating, review count, and format for each item.",
                },
                "markdown",
              ],
              onlyMainContent: true,
              waitFor: 4000,
            }),
          }).then(r => r.json()).catch((err) => {
            console.warn("Firecrawl Amazon scrape failed:", err);
            return null;
          })
        : Promise.resolve(null),

      // ─── 2. Firecrawl: Digital product competitors (Gumroad/Udemy/Teachable) ───
      FIRECRAWL_API_KEY
        ? fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: `${searchTerms} ${productType || "online course OR workbook OR coaching program"} site:gumroad.com OR site:udemy.com OR site:teachable.com OR site:kajabi.com`,
              limit: 10,
              scrapeOptions: { formats: ["markdown"] },
            }),
          }).then(r => r.json()).catch(() => null)
        : Promise.resolve(null),

      // ─── 3. Perplexity: Comprehensive market intelligence ───
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
                  content: "You are a market research analyst specializing in author monetization and digital product ecosystems. Return structured, data-backed insights with specific numbers, price ranges, and trends. Be concise and actionable.",
                },
                {
                  role: "user",
                  content: `Research the current market for a book titled "${bookTitle}" in the "${genre}" genre.${description ? ` Book description: ${description}` : ""}

I need the following analysis:

1. **TOP 3-5 TRENDING SUB-TOPICS** in the ${genre} space right now — what specific angles are getting the most reader attention?

2. **COMPETITOR DIGITAL PRODUCTS**: What courses, workbooks, coaching programs, and memberships exist in this niche? Include specific:
   - Product names and creators
   - Price points (exact numbers)
   - Platforms they sell on (Teachable, Gumroad, Udemy, etc.)
   - Estimated sales volume if available

3. **AUDIENCE DEMOGRAPHICS**: Who buys products in this niche? Age range, income level, top 3 pain points, buying triggers.

4. **PRICING BENCHMARKS** for this specific genre:
   - Workbooks: typical price range
   - Online courses: typical price range
   - 1-on-1 coaching: per-session rate
   - Group coaching: per-cohort price
   - Memberships: monthly price range
   - Audiobooks: typical price
   - Webinar series: price range
   - Home study courses: price range

5. **POSITIONING KEYWORDS**: The top 5 words/phrases that bestselling titles in this genre use (e.g., "challenge", "blueprint", "mastery").

6. **MARKET GAP**: What product type is UNDERSERVED in this niche that an author could fill?

Be specific with numbers. Cite sources.`,
                },
              ],
              search_recency_filter: "month",
            }),
          }).then(r => r.json()).catch(() => null)
        : Promise.resolve(null),

      // ─── 4. Perplexity: Niche-specific pricing deep dive ───
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
                  content: `What are the current average prices for these digital products in the "${genre}" niche? Give me exact numbers from real products selling today:

- Online courses (beginner vs premium)
- Companion workbooks (PDF)
- 21-day / 30-day challenge programs
- 1-on-1 coaching per session
- Group coaching programs (8-12 week)
- Membership communities (monthly)
- Webinar series (live)
- Home study courses
- Audiobooks
- Keynote speaking fees (beginner vs established)
- Corporate training (half-day vs full-day)

Also: What is the #1 bestselling digital product in the ${genre} niche right now, and what is its exact price?`,
                },
              ],
              search_recency_filter: "week",
            }),
          }).then(r => r.json()).catch(() => null)
        : Promise.resolve(null),
    ]);

    // Process results
    const [amazonResult, gumroadResult, marketIntelResult, pricingResult] = results;

    // ─── Parse Amazon structured data ───
    let amazonProducts: Array<{
      rank: number;
      title: string;
      author: string;
      price: string;
      rating: number;
      review_count: string;
      format: string;
    }> = [];
    let amazonMarkdown = "";
    let amazonCategoryName = amazonCategory.categoryName;

    if (amazonResult.status === "fulfilled" && amazonResult.value) {
      const amazonData = amazonResult.value;
      // Try structured JSON first
      const jsonData = amazonData?.data?.json || amazonData?.json;
      if (jsonData?.products && Array.isArray(jsonData.products)) {
        amazonProducts = jsonData.products.slice(0, 20);
        amazonCategoryName = jsonData.category_name || amazonCategory.categoryName;
      }
      // Also capture markdown as fallback context
      amazonMarkdown = (amazonData?.data?.markdown || amazonData?.markdown || "").slice(0, 3000);
    }

    // ─── Parse competitor products ───
    const competitorProducts: Array<{ title: string; url: string; snippet: string; platform: string }> = [];
    if (gumroadResult.status === "fulfilled" && gumroadResult.value?.success && gumroadResult.value?.data) {
      for (const item of gumroadResult.value.data.slice(0, 8)) {
        const url = item.url || "";
        let platform = "Unknown";
        if (url.includes("gumroad.com")) platform = "Gumroad";
        else if (url.includes("udemy.com")) platform = "Udemy";
        else if (url.includes("teachable.com")) platform = "Teachable";
        else if (url.includes("kajabi.com")) platform = "Kajabi";

        competitorProducts.push({
          title: item.title || "Unknown",
          url,
          snippet: (item.markdown || item.description || "").slice(0, 300),
          platform,
        });
      }
    }

    // ─── Parse Perplexity market intelligence ───
    let marketIntel = "";
    let marketCitations: string[] = [];
    if (marketIntelResult.status === "fulfilled" && marketIntelResult.value?.choices?.[0]?.message?.content) {
      marketIntel = marketIntelResult.value.choices[0].message.content;
      marketCitations = marketIntelResult.value.citations || [];
    }

    // ─── Parse Perplexity pricing intelligence ───
    let pricingIntel = "";
    let pricingCitations: string[] = [];
    if (pricingResult.status === "fulfilled" && pricingResult.value?.choices?.[0]?.message?.content) {
      pricingIntel = pricingResult.value.choices[0].message.content;
      pricingCitations = pricingResult.value.citations || [];
    }

    // ─── Synthesize: Compute pricing benchmarks from Amazon data ───
    const priceNumbers = amazonProducts
      .map(p => parseFloat((p.price || "").replace(/[^0-9.]/g, "")))
      .filter(n => !isNaN(n) && n > 0);

    const pricingAnalysis = priceNumbers.length >= 3
      ? {
          lowest: `$${Math.min(...priceNumbers).toFixed(2)}`,
          highest: `$${Math.max(...priceNumbers).toFixed(2)}`,
          average: `$${(priceNumbers.reduce((a, b) => a + b, 0) / priceNumbers.length).toFixed(2)}`,
          median: `$${priceNumbers.sort((a, b) => a - b)[Math.floor(priceNumbers.length / 2)].toFixed(2)}`,
          sampleSize: priceNumbers.length,
        }
      : null;

    // ─── Synthesize: Extract common title keywords ───
    const titleWords = amazonProducts
      .map(p => p.title.toLowerCase())
      .join(" ")
      .split(/\s+/)
      .filter(w => w.length > 3 && !["the", "and", "for", "how", "your", "with", "from", "this", "that", "what", "will", "about", "book", "edition", "paperback", "hardcover"].includes(w));
    const wordFreq: Record<string, number> = {};
    titleWords.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
    const topKeywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    // ─── Build the market research payload ───
    const research = {
      genre,
      bookTitle,
      searchTerms,
      amazonCategory: amazonCategoryName,

      // Structured Amazon bestseller data
      amazonBestsellers: amazonProducts.length > 0 ? {
        products: amazonProducts,
        pricingAnalysis,
        topTitleKeywords: topKeywords,
        sourceUrl: amazonBestsellerUrl,
      } : null,

      // Fallback markdown context from Amazon
      amazonBestsellerContext: amazonProducts.length === 0 && amazonMarkdown
        ? amazonMarkdown
        : null,

      // Competitor digital products from Gumroad/Udemy/Teachable
      competitorProducts,

      // Perplexity market intelligence
      marketIntelligence: marketIntel,
      marketCitations,

      // Perplexity pricing benchmarks
      pricingIntelligence: pricingIntel,
      pricingCitations,

      // Metadata
      dataTimestamp: new Date().toISOString(),
      dataSources: [
        amazonProducts.length > 0 ? "Amazon Bestsellers (structured)" : (amazonMarkdown ? "Amazon Bestsellers (markdown)" : null),
        competitorProducts.length > 0 ? "Gumroad/Udemy/Teachable" : null,
        marketIntel ? "Perplexity Market Intelligence" : null,
        pricingIntel ? "Perplexity Pricing Research" : null,
      ].filter(Boolean),
    };

    console.log(`Market research completed for "${bookTitle}" (${genre}) — ${research.dataSources.length} sources, ${amazonProducts.length} Amazon products, ${competitorProducts.length} competitor products`);

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
