import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface EnrichmentResult {
  pages?: number;
  rating?: number;
  categories?: string[];
  price?: string;
  description?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Require authentication to prevent API quota abuse
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
      const SHARED_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";
      const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
      const { data: { user: sharedUser } } = await sharedClient.auth.getUser(token);
      if (!sharedUser) {
        return new Response(
          JSON.stringify({ error: "Invalid session" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { amazonUrl, authorProfileUrl } = await req.json();

    if (!amazonUrl && !authorProfileUrl) {
      return new Response(
        JSON.stringify({ error: 'Amazon URL or Author Profile URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: EnrichmentResult = {};

    // Scrape book data from Amazon
    if (amazonUrl) {
      try {
        console.log('Scraping Amazon URL:', amazonUrl);
        const bookResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: amazonUrl,
            formats: ['markdown'],
            onlyMainContent: true,
            waitFor: 2000,
          }),
        });

        const bookData = await bookResponse.json();
        const rawMarkdown = bookData.data?.markdown || bookData.markdown || "";

        if (bookResponse.ok && rawMarkdown) {
          const markdown = rawMarkdown.toLowerCase();

          // Extract page count
          const pageMatch = markdown.match(/(\d+)\s*(?:pages?|pages?:|pages?\s*:)/i);
          if (pageMatch) {
            result.pages = parseInt(pageMatch[1], 10);
          }

          // Extract rating (e.g., "4.5 out of 5" or "4.5 stars")
          const ratingMatch = markdown.match(/(\d+\.?\d*)\s*(?:out of 5|stars?|\/5)/i);
          if (ratingMatch) {
            result.rating = parseFloat(ratingMatch[1]);
          }


          // Extract price
          const priceMatch = markdown.match(/\$(\d+\.?\d{0,2})/);
          if (priceMatch) {
            result.price = `$${priceMatch[1]}`;
          }

          // Extract categories from the markdown content
          const categoryMatches = markdown.match(/#[^#\n]+in(?:\s+)?(?:Books|Kindle|Audiobooks)?[^\n]*(?:\n|$)/gi);
          if (categoryMatches && categoryMatches.length > 0) {
            result.categories = categoryMatches
              .map((cat: string) => cat.replace(/#/g, '').trim())
              .filter((cat: string) => cat.length > 0)
              .slice(0, 5);
          }

          console.log('Book data extracted:', result);
        } else {
          console.log('Book scrape response not ok or no markdown:', bookResponse.ok, !!bookData.markdown);
        }
      } catch (error) {
        console.error('Error scraping book:', error);
        result.error = `Error scraping Amazon book page: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    // Scrape author profile data from provided URL
    if (authorProfileUrl) {
      try {
        console.log('Scraping author profile URL:', authorProfileUrl);
        // Author profile scraping could be added here if needed
      } catch (error) {
        console.error('Error scraping author profile:', error);
      }
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in enrich-book-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
