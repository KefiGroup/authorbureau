import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAiGateway } from "../_shared/builder-helpers.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/*───────────────────────────────────────────────────────────────────────
  PODCAST MONETIZATION STRATEGY (2026 Best Practices)

  Revenue Streams:
  1. Book Sales — every episode ends with book CTA
  2. Sponsorship — AI generates media kit with CPM rates ($15-50)
  3. Lead Capture — show notes include lead magnet links → CRM
  4. Course Upsell — strategic episodes tease course content
  5. Coaching Pipeline — "Want to go deeper?" CTA → consultation
  6. Premium Content — bonus episodes behind membership paywall
  7. Cross-Author Promo — JV episode swaps with other authors

  Episode Formats:
  - Solo Teaching: Author teaches concepts from chapters
  - Simulated Interview: Q&A format (host asks, author answers)
  - Deep Dive: Single concept exploration with examples
  - Quick Tips: 5-10 min micro-episodes
  - Book Launch Series: Countdown episodes building anticipation

  Distribution: Spotify, Apple Podcasts, YouTube, Amazon Music, iHeartRadio
  CPM Rates 2026: Pre-roll $15-25, Mid-roll $25-50, Post-roll $10-20
───────────────────────────────────────────────────────────────────────*/

const PODCAST_STRATEGY = `
PODCAST MONETIZATION FRAMEWORK FOR AUTHORS:

EPISODE STRUCTURE (proven format):
1. Hook (30s): Start with a bold claim, surprising stat, or provocative question from the book
2. Intro (60s): Theme music cue → "Welcome to [Podcast Name]..." → episode overview
3. Main Content (15-25 min): Teach, tell stories, share frameworks from the book
4. Mid-Roll Ad Marker: [AD BREAK] — natural pause point for sponsors
5. Continued Content (10-15 min): Deeper exploration, case studies, real-world applications
6. CTA Segment (2 min): Book purchase link, lead magnet, course/coaching mention
7. Outro (30s): Next episode teaser → "Subscribe, rate, and review" → theme music

MONETIZATION INTEGRATION RULES:
- Every episode intro mentions the book title naturally (not salesy)
- Show notes ALWAYS include: book purchase link, lead magnet URL, social links
- 1 in 4 episodes should have a "deeper dive" CTA pointing to courses/coaching
- Pull quotes should be designed for audiogram social media clips (15-30 seconds)
- Guest interview questions should position the author as the expert

CONTENT STRATEGY:
- First 3 episodes: Foundation episodes covering core book thesis
- Middle episodes: Deep dives into individual chapters/frameworks
- Final episodes: Implementation guides and transformation stories
- Bonus: Q&A episode addressing common reader questions

FORMAT SELECTION (AI decides based on chapter content):
- Solo Teaching: Best for frameworks, methodologies, step-by-step processes
- Simulated Interview: Best for storytelling chapters, case studies, personal narratives
- Deep Dive: Best for complex concepts that need thorough exploration
- Quick Tips: Best for actionable advice, checklists, daily practices
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

    const { bookId, episodeCount, formatPreference, tone, targetAudience, monetizationGoals, podcastTitle } = await req.json();

    // Fetch book data
    const { data: book, error: bookErr } = await sb.from("books").select("title, subtitle, description, genre, author_name").eq("id", bookId).single();
    if (bookErr || !book) {
      return new Response(JSON.stringify({ error: "Book not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch manuscript if available
    let manuscriptContext = "";
    const { data: assets } = await sb.from("generated_assets").select("content").eq("book_id", bookId).eq("asset_type", "manuscript_analysis").limit(1);
    if (assets && assets.length > 0 && assets[0].content) {
      manuscriptContext = `\n\nMANUSCRIPT ANALYSIS:\n${assets[0].content.slice(0, 8000)}`;
    }

    const monetizationDesc = (monetizationGoals as string[] || []).join(", ") || "book sales, audience growth";

    const systemPrompt = `You are an elite podcast strategist and scriptwriter specializing in turning author books into revenue-generating podcast series. You understand podcast monetization deeply — sponsorship rates, audience funnels, and content strategy.

Generate exactly ${episodeCount} complete podcast episodes for an author's book-based podcast series.

BOOK CONTEXT:
Title: "${book.title}"${book.subtitle ? ` — ${book.subtitle}` : ""}
Genre: ${book.genre || "Non-fiction"}
Description: ${book.description || "N/A"}
Author: ${book.author_name || "Author"}
Podcast Title: "${podcastTitle || book.title + ' Podcast'}"
${manuscriptContext}

GENERATION SETTINGS:
Episodes: ${episodeCount}
Format Preference: ${formatPreference || "mix"} (if "mix", AI picks best format per episode based on content)
Tone: ${tone || "Conversational, Educational"}
Target Audience: ${targetAudience || "Readers interested in " + (book.genre || "personal development")}
Monetization Goals: ${monetizationDesc}

${PODCAST_STRATEGY}

FOR EACH EPISODE, generate a JSON object with:
- episode_number (1 to ${episodeCount})
- title (compelling, SEO-friendly episode title)
- description (2-3 sentence episode description for podcast directories)
- format (one of: solo_teaching, simulated_interview, deep_dive, quick_tips, book_launch)
- script_markdown (FULL episode script in markdown, 2000-3000 words, with speaker cues like **[HOST]:** and **[AUTHOR]:** for interview format, timing markers like [00:00], [AD BREAK] markers)
- show_notes (markdown formatted show notes with: episode summary, key takeaways, timestamps, links section with book purchase link placeholder, lead magnet placeholder, social links placeholder)
- intro_script (30-60 second intro script with theme music cues)
- outro_script (30 second outro with next episode teaser and CTA)
- pull_quotes (array of 3-5 short quotable phrases from the episode, 15-30 words each, designed for audiogram social clips)
- guest_questions (array of 5-8 interview questions if format is simulated_interview, otherwise empty array)
- ad_markers (array of objects with {timestamp: "MM:SS", type: "pre_roll"|"mid_roll"|"post_roll", suggested_copy: "sample ad read copy"})
- duration_minutes (estimated episode duration, 10-40 min depending on format)

CRITICAL RULES:
1. Each episode script must be COMPLETE and production-ready — not an outline.
2. Scripts should feel conversational, NOT like reading a book aloud.
3. Include natural transitions, anecdotes, and real-world examples.
4. Every episode must have at least one clear monetization touchpoint (book CTA, course mention, coaching offer).
5. Pull quotes should be punchy and shareable — designed for social media audiograms.
6. Show notes must be SEO-optimized with keywords relevant to the book's topic.
7. Ad markers should be at natural pause points in the content.
8. Vary episode formats if "mix" is selected — don't make all episodes the same format.

Return ONLY a JSON array of episode objects. No markdown fences, no explanation.`;

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
          { role: "user", content: `Generate ${episodeCount} complete, production-ready podcast episodes for the book "${book.title}". Each episode should have a full script, show notes, pull quotes, and monetization touchpoints. Return as a JSON array.` },
        ],
        stream: true,
      }),
    }, "generate-podcast-season");

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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-podcast-season error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
