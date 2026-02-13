import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // Scrape the Amazon book page
    console.log("Scraping Amazon book page:", amazonBookUrl);
    const bookScrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: amazonBookUrl,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    if (!bookScrapeResponse.ok) {
      const error = await bookScrapeResponse.json();
      console.error("Firecrawl book scrape error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.error || "Failed to scrape Amazon book page",
        }),
        {
          status: bookScrapeResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const bookData = await bookScrapeResponse.json();
    const bookMarkdown = bookData.markdown || "";

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
        authorData = await authorScrapeResponse.json();
      }
    }

    // Extract structured data using AI
    console.log("Extracting structured book data with AI...");
    const extractionPrompt = `Extract the following information from the Amazon book page content:
- Book title
- Subtitle (if any)
- Number of pages
- Customer rating (e.g., 4.5 stars)
- Number of reviews
- Book price
- Main genre/category
- Bestseller badges or rankings
- A concise 1-2 sentence description

Format as JSON with keys: title, subtitle, pages, rating, reviewCount, price, genre, badges (array), description`;

    const aiExtractResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
    );

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

      const authorAiResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
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
      );

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
