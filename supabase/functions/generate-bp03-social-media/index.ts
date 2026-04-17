import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SYSTEM_PROMPT =
  "You are ABBY, the AI business agent for Authors Bureau. You help authors turn their books into complete business empires. Always personalise to the author's specific book, audience, and niche. Never be generic. Always respond with valid JSON only — no markdown, no code fences.";

async function callAI(userPrompt: string, maxTokens: number) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-5.2",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: maxTokens,
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    if (resp.status === 429) throw new Error("Rate limit exceeded — please try again in a moment");
    if (resp.status === 402) throw new Error("Payment required — AI credits exhausted");
    throw new Error(`AI gateway error [${resp.status}]: ${txt.slice(0, 200)}`);
  }
  const data = await resp.json();
  const raw = data.choices?.[0]?.message?.content || "";
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No valid JSON in AI response");
  return JSON.parse(match[0]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { author_id } = await req.json();
    if (!author_id) throw new Error("author_id required");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: profile } = await sb.from("author_profiles")
      .select("pen_name, genres, user_id").eq("id", author_id).single();
    const { data: ctx } = await sb.from("author_context")
      .select("*").eq("author_id", author_id).order("created_at", { ascending: false }).limit(1).maybeSingle();

    let bookTitle = ctx?.book_title || "";
    let coreThesis = ctx?.core_thesis || "";
    if (!bookTitle) {
      const { data: book } = await sb.from("books")
        .select("title, description").eq("author_id", profile?.user_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      bookTitle = book?.title || "";
      coreThesis = book?.description || "";
    }
    if (!bookTitle) throw new Error("No book found. Please add a book first.");

    const authorName = profile?.pen_name || "Author";
    const genre = (profile?.genres && profile.genres[0]) || "general";
    const audience = JSON.stringify(ctx?.target_audience_persona || {});
    const frameworks = JSON.stringify(ctx?.key_frameworks || []);

    const baseContext = `
Book: ${bookTitle}
Author: ${authorName}
Niche: ${genre}
Core thesis: ${coreThesis}
Target audience: ${audience}
Key frameworks: ${frameworks}
`.trim();

    // Helper to write progress
    const setProgress = async (step: number, label: string, partial: Record<string, unknown> = {}) => {
      const { data: existingNode } = await sb.from("author_nodes")
        .select("id, content_json").eq("author_id", author_id).eq("node_id", "BP-03").maybeSingle();
      const merged = { ...(existingNode?.content_json as object || {}), ...partial, progress: { step, label, total: 3 } };
      if (existingNode) {
        await sb.from("author_nodes").update({ status: "generating", content_json: merged }).eq("id", existingNode.id);
      } else {
        await sb.from("author_nodes").insert({
          author_id, node_id: "BP-03", node_name: "Social Media",
          status: "generating", content_json: merged,
        });
      }
    };

    // STEP 1 — LinkedIn (5 posts)
    await setProgress(1, "Writing LinkedIn posts...");
    const step1 = await callAI(
      `${baseContext}

Generate exactly 5 LinkedIn posts for the book above. Each post: narrative with line breaks, insight-driven, professional thought leadership tone, 150–200 words. Each ends with a CTA pointing to the book.

Respond with JSON only:
{
  "linkedin_posts": [
    { "day": 1, "theme": "...", "caption": "...", "hashtags": ["..."], "cta": "..." }
  ]
}
The array must have exactly 5 items.`,
      6000
    );

    // STEP 2 — Instagram + Facebook (5 + 5)
    await setProgress(2, "Writing Instagram & Facebook posts...", step1);
    const step2 = await callAI(
      `${baseContext}

Generate exactly 5 Instagram posts and 5 Facebook posts for the book above.
- Instagram: visual-first caption, hook in line 1, conversational and aspirational, 80–120 words.
- Facebook: story-format with question at end, warm community-focused tone, 100–150 words.
Each ends with a CTA pointing to the book.

Respond with JSON only:
{
  "instagram_posts": [{ "day": 1, "theme": "...", "caption": "...", "hashtags": ["..."], "cta": "..." }],
  "facebook_posts": [{ "day": 1, "theme": "...", "caption": "...", "hashtags": ["..."], "cta": "..." }]
}
Each array must have exactly 5 items.`,
      8000
    );

    // STEP 3 — Twitter/X + 3 outreach templates
    await setProgress(3, "Writing Twitter/X posts and outreach templates...", { ...step1, ...step2 });
    const step3 = await callAI(
      `${baseContext}

Generate exactly 5 Twitter/X posts and 3 outreach email templates for the book above.
- Twitter/X: sharp thread opener, punchy and provocative, 40–60 words. Each ends with a CTA pointing to the book.
- Outreach templates: (1) Podcast Pitch Email (200–250 words), (2) Media/Press Pitch Email (200–250 words), (3) Book Review Request Email (100–150 words).

Respond with JSON only:
{
  "twitter_posts": [{ "day": 1, "theme": "...", "caption": "...", "hashtags": ["..."], "cta": "..." }],
  "outreach_kit": [{ "type": "Podcast Pitch Email", "subject": "...", "body": "..." }],
  "calendar_name": "Short name for this starter kit",
  "abby_summary": "2-3 sentence summary of what was created",
  "hashtag_strategy": {
    "primary_hashtags": ["3-5"],
    "secondary_hashtags": ["5-8"],
    "author_hashtag": "#..."
  }
}
The twitter_posts array must have exactly 5 items. The outreach_kit array must have exactly 3 items.`,
      6000
    );

    // Compose final content_json — keep `posts` shape compatible with the existing review UI
    const merged = { ...step1, ...step2, ...step3 } as Record<string, any>;
    const linkedin = merged.linkedin_posts || [];
    const instagram = merged.instagram_posts || [];
    const facebook = merged.facebook_posts || [];
    const twitter = merged.twitter_posts || [];

    // Build the unified `posts` array (one entry per day, with all 4 platforms)
    const days = Math.max(linkedin.length, instagram.length, facebook.length, twitter.length);
    const posts = [];
    for (let i = 0; i < days; i++) {
      const li = linkedin[i] || {};
      const ig = instagram[i] || {};
      const fb = facebook[i] || {};
      const tw = twitter[i] || {};
      posts.push({
        day: i + 1,
        theme: li.theme || ig.theme || fb.theme || tw.theme || "",
        post_type: "Insight",
        cta_type: "insight",
        linkedin: { caption: li.caption || "", hashtags: li.hashtags || [] },
        instagram: { caption: ig.caption || "", hashtags: ig.hashtags || [] },
        facebook: { caption: fb.caption || "", hashtags: fb.hashtags || [] },
        twitter: { caption: tw.caption || "", hashtags: tw.hashtags || [] },
      });
    }

    const finalContent = {
      calendar_name: merged.calendar_name || "Social Media Starter Kit",
      hashtag_strategy: merged.hashtag_strategy || { primary_hashtags: [], secondary_hashtags: [], author_hashtag: "" },
      posts,
      outreach_kit: merged.outreach_kit || [],
      abby_summary: merged.abby_summary || `Your social media starter kit for '${bookTitle}' is ready — 20 posts across 4 platforms plus 3 outreach templates.`,
      // Note: 30-day email sequence intentionally dropped — handled by the Email Engine.
    };

    // Save final
    const { data: existingNode } = await sb.from("author_nodes")
      .select("id").eq("author_id", author_id).eq("node_id", "BP-03").maybeSingle();
    if (existingNode) {
      await sb.from("author_nodes").update({
        status: "content_ready",
        content_json: finalContent,
        personalised_name: finalContent.calendar_name,
      }).eq("id", existingNode.id);
    } else {
      await sb.from("author_nodes").insert({
        author_id, node_id: "BP-03", node_name: "Social Media",
        status: "content_ready", content_json: finalContent,
        personalised_name: finalContent.calendar_name,
      });
    }

    return new Response(JSON.stringify({ success: true, content: finalContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-bp03-social-media error:", err);
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
