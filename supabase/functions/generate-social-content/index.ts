import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAiGateway } from "../_shared/builder-helpers.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/*───────────────────────────────────────────────────────────────────────
  RESEARCH-BACKED PLATFORM STRATEGY  (Buffer 2025 · PR by the Book 2026)
  
  LinkedIn:  Carousels get 278% more engagement than video, 596% more than text.
             Video 2nd. Images 3rd. Text last.
  Instagram: Reels get 122% more reach than images; Carousels get 12% more 
             engagement than Reels and 114% more than images.
  Facebook:  Photos get 44% more engagement than video; Text 2nd; Video 3rd.
  X/Twitter: Text posts get 30% more engagement than video, 37% more than images.
             Threads and contrarian takes perform well.
  
  Author-specific 2026 trends (PR by the Book):
  1. Short-form video (Reels/TikTok) for reach & discovery
  2. Community & engagement over follower counts
  3. Authenticity & values-driven storytelling
  4. Bookish subcultures (BookTok, Bookstagram)
  5. Repurposing & cross-platforming
  6. Social SEO (keywords in captions, bios, overlays)
───────────────────────────────────────────────────────────────────────*/

const PLATFORM_FORMAT_STRATEGY: Record<string, string> = {
  linkedin: `LINKEDIN FORMAT STRATEGY (based on Buffer's analysis of millions of posts):
- 🏅 CAROUSELS (document/PDF posts): 278% more engagement than video. Use for frameworks, step-by-step guides, listicles, book excerpts. Aim for 40-50% of LinkedIn posts.
- 🥈 VIDEO: 2nd best. Use for personal stories, behind-the-scenes, thought leadership. 20-25% of posts.
- 🥉 IMAGES with long-form caption: Personal stories, quotes with commentary. 20-25%.
- TEXT POSTS: Best for contrarian takes, vulnerable stories, asking questions. 10-15%.
LINKEDIN HOOKS: Start with a bold statement, contrarian take, or personal failure story. First line must stop the scroll.
LINKEDIN CTA: "Comment [X] if you agree" / "Save this for later" / "Share with someone who needs this"`,

  instagram: `INSTAGRAM FORMAT STRATEGY (based on Buffer's analysis of millions of posts):
- 🏅 REELS (short video): 122% more reach than images. Best for discovery & new audience. 30-35% of posts.
- 🥈 CAROUSELS: 12% more engagement than Reels, 114% more than images. Best for teaching & value. 35-40%.
- 🥉 SINGLE IMAGES: Only for stunning visuals, quotes, or announcements. 15-20%.
- STORIES: Behind-the-scenes, polls, Q&A. 10-15%.
INSTAGRAM HOOKS: Pattern interrupt in first 1-3 seconds (Reels), bold first slide (Carousels).
INSTAGRAM CTA: "Save this" / "Share to your story" / "Double tap if..." / "Link in bio"`,

  facebook: `FACEBOOK FORMAT STRATEGY (based on Buffer's analysis of millions of posts):
- 🏅 PHOTOS: 44% more engagement than video. Use book-related images, author life, quote graphics. 35-40%.
- 🥈 TEXT POSTS: 6.7% more engagement than video. Personal stories, questions, community engagement. 25-30%.
- 🥉 VIDEO: Short native video for storytelling and behind-the-scenes. 20-25%.
- LINK POSTS: Lowest engagement. Use sparingly for blog/purchase links. 5-10%.
FACEBOOK HOOKS: Lead with a question or relatable statement.
FACEBOOK CTA: "Tell me in the comments" / "Share if you agree" / "Tag a friend"`,

  x: `X (TWITTER) FORMAT STRATEGY (based on Buffer's analysis of millions of posts):
- 🏅 TEXT POSTS: 30% more engagement than video. Punchy, opinionated, insightful. 40-45%.
- 🥈 THREADS: Multi-tweet deep dives on book topics. Great for thought leadership. 20-25%.
- 🥉 VIDEO: Short clips, talking head. 15-20%.
- IMAGES: Quote graphics, book photos. 15-20%.
X HOOKS: Contrarian statements, "Most people think X. They're wrong." pattern.
X CTA: "RT if you agree" / "Reply with your take" / "Bookmark this thread"`,
};

const CONTENT_PILLAR_FRAMEWORK = `
CONTENT PILLAR FRAMEWORK (80/20 Rule for Authors):
Apply the 80/20 content rule: 80% VALUE content, 20% PROMOTIONAL content.

The 5 Content Pillars for Authors:
1. EDUCATE (30%): Share frameworks, tips, methodologies from the book. Teach something actionable.
2. INSPIRE (20%): Quotes, transformation stories, client results, reader testimonials.
3. ENTERTAIN (15%): Behind-the-scenes, relatable struggles, humor, hot takes.
4. CONNECT (15%): Ask questions, share vulnerabilities, respond to trends, community building.
5. PROMOTE (20%): Book links, launch announcements, limited offers, events. NEVER exceed 20%.

VIRAL MECHANICS:
- Hook Formula: "Pattern interrupt → Promise → Proof → Payoff"
- Storytelling: "Before → Struggle → Discovery → Transformation" arc
- Contrarian: Challenge common beliefs with evidence from the book
- Curiosity Gap: Tease insights without giving everything away
- Social Proof: Reference reader results, reviews, media mentions

HASHTAG STRATEGY:
- LinkedIn: 3-5 hashtags max, mix of broad (#leadership) and niche (#authorlife)
- Instagram: 15-20 hashtags, mix of large (500K+), medium (50-500K), and niche (<50K)
- X: 1-2 hashtags max, preferably trending or branded
- Facebook: 0-2 hashtags, or none
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { bookId, platforms, frequency, contentMix, tones, duration, topicsEmphasize, topicsAvoid } = await req.json();

    // Fetch book data
    const { data: book, error: bookErr } = await sb.from("books").select("title, subtitle, description, genre, author_name, amazon_url").eq("id", bookId).single();
    if (bookErr || !book) {
      return new Response(JSON.stringify({ error: "Book not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const postsPerDay = frequency === "daily" ? 1 : frequency === "3x" ? 3 / 7 : 5 / 7;
    const totalPosts = Math.round(postsPerDay * duration);

    const mixDescription = Object.entries(contentMix as Record<string, number>)
      .filter(([_, v]) => v > 0)
      .map(([k, v]) => `${k}: ${v}%`)
      .join(", ");

    // Build platform-specific strategy sections
    const platformStrategies = (platforms as string[])
      .map(p => PLATFORM_FORMAT_STRATEGY[p.toLowerCase()] || "")
      .filter(Boolean)
      .join("\n\n");

    const systemPrompt = `You are an elite social media strategist specializing in author brand building and book promotion. You use data-backed strategies from Buffer's 2025 analysis of millions of posts and the latest 2026 author marketing trends.

Generate exactly ${totalPosts} social media posts for an author promoting their book.

BOOK CONTEXT:
Title: "${book.title}"${book.subtitle ? ` — ${book.subtitle}` : ""}
Genre: ${book.genre || "Non-fiction"}
Description: ${book.description || "N/A"}
Author: ${book.author_name || "Author"}

CAMPAIGN SETTINGS:
Platforms: ${(platforms as string[]).join(", ")}
Duration: ${duration} days
Frequency: ${frequency}
Content mix preference: ${mixDescription}
Tone: ${(tones as string[]).join(", ")}
${topicsEmphasize ? `Topics to emphasize: ${topicsEmphasize}` : ""}
${topicsAvoid ? `Topics to avoid: ${topicsAvoid}` : ""}

${CONTENT_PILLAR_FRAMEWORK}

PLATFORM-SPECIFIC FORMAT STRATEGIES (USE THESE EXACT RATIOS):
${platformStrategies}

BOOK PURCHASE LINK: ${book.amazon_url || "N/A"}
${book.amazon_url ? `IMPORTANT: For PROMOTIONAL posts (category: promotions), ALWAYS include the book purchase link "${book.amazon_url}" in the caption with a clear "Get your copy" or "Grab the book" CTA. For VALUE posts (tips, quotes, stories, engagement), include the link in approximately 30% of posts as a soft mention (e.g., "More insights in the book → [link]").` : ""}

CRITICAL RULES:
1. MATCH CONTENT FORMATS TO PLATFORM DATA: Use the exact format distribution ratios above for each platform.
2. Every post MUST have a scroll-stopping hook in the first line.
3. Every post MUST have a clear CTA (call to action).
4. Include format_notes describing what visual/media the author should create (e.g., "Create a 5-slide carousel with one tip per slide" or "Record a 30-second talking-head video").
5. Apply the 80/20 rule: max 20% of posts should be direct promotions.
6. Vary content pillars across the calendar — don't cluster similar types.
7. For each platform, use the HIGHEST-PERFORMING format as the dominant format.
8. ALL promotional posts MUST include the book purchase link in the caption text.

For each post return a JSON object with these fields:
- platform (lowercase)
- format (one of: carousel, reel_script, video_script, image_caption, text_post, poll, thread, story_script)
- format_notes (1-2 sentence description of what media/visual to create)
- hook (the scroll-stopping opening line)
- caption (full post text including the hook)
- cta (the call to action)
- hashtags (array — follow platform-specific hashtag count rules)
- category (one of: tips, quotes, stories, promotions, engagement)
- suggested_time (HH:MM format — use peak engagement times per platform)
- day_number (1 to ${duration})

Distribute posts evenly across ${duration} days. If frequency is less than daily, space them accordingly.

Return ONLY a JSON array of post objects. No markdown, no explanation.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetchAiGateway({
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate ${totalPosts} research-backed social media posts for the book "${book.title}". Use the optimal content format for each platform based on engagement data. Return as a JSON array.` },
        ],
        stream: true,
      }),
    }, "generate-social-content");

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Stream the response back
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-social-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
