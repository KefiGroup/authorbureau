import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAiGateway } from "../_shared/builder-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication to prevent API quota abuse
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate the token with Supabase
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user } } = await supabase.auth.getUser();

    // Also try shared backend if local auth fails
    if (!user) {
      const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
      const SHARED_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";
      const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
      const { data: { user: sharedUser } } = await sharedClient.auth.getUser(token);
      if (!sharedUser) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid session" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { amazonBookUrl, amazonAuthorProfileUrl } = await req.json();

    if (!amazonBookUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "Amazon book URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl connector not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "AI enhancement not available" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve short URLs (a.co, amzn.to) using Firecrawl to get the final URL
    let resolvedBookUrl = amazonBookUrl.trim();
    try {
      const urlObj = new URL(resolvedBookUrl);
      if (['a.co', 'amzn.to', 'amzn.com'].includes(urlObj.hostname)) {
        console.log("Short URL detected, using Firecrawl to resolve:", resolvedBookUrl);
        const resolveRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: resolvedBookUrl,
            formats: ["links"],
            waitFor: 3000,
          }),
        });
        if (resolveRes.ok) {
          const resolveData = await resolveRes.json();
          const sourceUrl = resolveData.data?.metadata?.sourceURL || resolveData.data?.metadata?.url;
          if (sourceUrl && sourceUrl.includes("amazon.com")) {
            resolvedBookUrl = sourceUrl;
            console.log("Resolved short URL to:", resolvedBookUrl);
          }
        }
      }
    } catch (e) {
      console.error("URL resolution failed, using original:", e);
    }

    // Try scraping the Amazon book page directly first
    let bookMarkdown = "";
    console.log("Attempting to scrape Amazon book page:", resolvedBookUrl);

    try {
      const bookScrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: resolvedBookUrl,
          formats: ["markdown"],
          onlyMainContent: true,
          waitFor: 5000,
          location: { country: "US", languages: ["en"] },
          proxy: "stealth",
        }),
      });

      if (bookScrapeResponse.ok) {
        const bookData = await bookScrapeResponse.json();
        bookMarkdown = bookData.data?.markdown || bookData.markdown || "";
        console.log("Direct scrape result length:", bookMarkdown.length);
      }
    } catch (e) {
      console.error("Direct scrape failed:", e);
    }

    // If direct scrape failed or returned garbage, fall back to search
    const isBlockedContent = !bookMarkdown || bookMarkdown.length < 200 ||
      bookMarkdown.toLowerCase().includes("page not found") ||
      bookMarkdown.toLowerCase().includes("couldn't find that page");

    if (isBlockedContent) {
      console.log("Direct scrape blocked by Amazon, falling back to search...");
      // Extract ASIN or search term from the URL
      const asinMatch = resolvedBookUrl.match(/\/dp\/([A-Z0-9]{10})/i) ||
        resolvedBookUrl.match(/\/([A-Z0-9]{10})(?:[/?]|$)/i);
      const searchQuery = asinMatch
        ? `amazon book ${asinMatch[1]} pages rating price`
        : `site:amazon.com ${resolvedBookUrl.split('/').pop()} book`;

      console.log("Searching for book info:", searchQuery);
      try {
        const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: 3,
            scrapeOptions: { formats: ["markdown"] },
          }),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          // Combine markdown from all results
          const results = searchData.data || [];
          bookMarkdown = results.map((r: any) => r.markdown || "").join("\n\n");
          console.log("Search fallback result length:", bookMarkdown.length);
        }
      } catch (e) {
        console.error("Search fallback failed:", e);
      }
    }

    if (!bookMarkdown || bookMarkdown.length < 100) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Could not find book information. Amazon may be blocking scraping. Please try manual entry instead.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Scrape author profile if provided
    let authorData = { markdown: "" };
    if (amazonAuthorProfileUrl) {
      console.log("Scraping Amazon author profile:", amazonAuthorProfileUrl);
      const authorScrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: amazonAuthorProfileUrl,
          formats: ["markdown"],
          onlyMainContent: true,
        }),
      });

      if (authorScrapeResponse.ok) {
        const rawAuthor = await authorScrapeResponse.json();
        authorData = { markdown: rawAuthor.data?.markdown || rawAuthor.markdown || "" };
      }
    }

    // Extract structured data using AI
    console.log("Extracting structured book data with AI...");
    const extractionPrompt = `Extract the following information from the Amazon book page content:
- Book title
- Subtitle (if any)
- Number of pages
- Customer rating (e.g., 4.5 stars)
- Book price
- Main genre/category
- Bestseller badges or rankings
- A concise 1-2 sentence description

Format as JSON with keys: title, subtitle, pages, rating, price, genre, badges (array), description`;

    const aiExtractResponse = await fetchAiGateway({
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You are an expert at extracting structured data from book pages. Always return valid JSON.",
            },
            {
              role: "user",
              content: `${extractionPrompt}\n\nBook page content:\n${bookMarkdown}`,
            },
          ],
          temperature: 0,
        }),
      }
    , "scrape-amazon-book");

    if (!aiExtractResponse.ok) {
      const error = await aiExtractResponse.json();
      console.error("AI extraction error:", error);
      // Fall back to basic extraction if AI fails
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            title: "",
            description: bookMarkdown.slice(0, 200),
            raw: bookMarkdown,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await aiExtractResponse.json();
    let extractedData = {};

    try {
      const content = aiResponse.choices?.[0]?.message?.content || "{}";
      // Extract JSON from the response (might be wrapped in text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse AI extraction:", e);
    }

    // Extract author info from author profile if available
    let authorExtracted = {};
    if (amazonAuthorProfileUrl && authorData.markdown) {
      console.log("Extracting author information with AI...");
      const authorExtractionPrompt = `Extract the following from the Amazon author profile:
- Author name
- Short bio (2-3 sentences max)
- Any social media links

Format as JSON with keys: name, bio, socialLinks (object with platform keys)`;

      const authorAiResponse = await fetchAiGateway({
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "Extract author information from the given content. Return valid JSON.",
              },
              {
                role: "user",
                content: `${authorExtractionPrompt}\n\nAuthor profile content:\n${authorData.markdown}`,
              },
            ],
            temperature: 0,
          }),
        }
      , "scrape-amazon-book");

      if (authorAiResponse.ok) {
        const authorAiData = await authorAiResponse.json();
        try {
          const content = authorAiData.choices?.[0]?.message?.content || "{}";
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            authorExtracted = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.error("Failed to parse author extraction:", e);
        }
      }
    }

    console.log("Book extraction successful");
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...extractedData,
          authorInfo: authorExtracted,
          raw: {
            bookMarkdown: bookMarkdown.slice(0, 1000),
            authorMarkdown: authorData.markdown?.slice(0, 500) || "",
          },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error scraping:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to scrape";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
