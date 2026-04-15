import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { author_id } = await req.json();
    if (!author_id) throw new Error("author_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await sb.from("author_profiles").select("pen_name, genres, user_id").eq("id", author_id).single();
    const { data: ctx } = await sb.from("author_context").select("*").eq("author_id", author_id).order("created_at", { ascending: false }).limit(1).maybeSingle();

    // Fallback to books table if no author_context
    let bookTitle = ctx?.book_title || "";
    let bookSubtitle = ctx?.book_subtitle || "";
    let coreThesis = ctx?.core_thesis || "";
    let keyFrameworks = JSON.stringify(ctx?.key_frameworks || []);
    let uniqueInsights = JSON.stringify(ctx?.unique_insights || []);
    let audiencePersona = JSON.stringify(ctx?.target_audience_persona || {});

    if (!bookTitle) {
      const { data: book } = await sb.from("books").select("title, subtitle, description").eq("author_id", profile?.user_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (book) {
        bookTitle = book.title || "";
        bookSubtitle = book.subtitle || "";
        coreThesis = book.description || "";
      }
    }
    if (!bookTitle) throw new Error("No book found. Please add a book first.");

    const authorName = profile?.pen_name || "Author";
    const genre = (profile?.genres && profile.genres[0]) || "general";

    const userPrompt = `Create a complete 30-day marketing kit for ${authorName}'s book '${bookTitle}'.

Book details:
- Title: ${bookTitle}
- Subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis}
- Target audience persona: ${audiencePersona}
- Key frameworks: ${keyFrameworks}
- Unique insights: ${uniqueInsights}
- Niche: ${genre}

IMPORTANT INSTRUCTIONS:

1. SOCIAL MEDIA — Generate exactly 30 posts. Each post MUST have platform-specific content for all 4 platforms with these requirements:
   - LinkedIn: Narrative with line breaks, insight-driven, professional thought leadership tone, 150–200 words
   - Instagram: Visual-first caption, hook in line 1, conversational and aspirational, 80–120 words
   - Facebook: Story-format post with question at end, warm community-focused tone, 100–150 words
   - Twitter/X: Sharp thread opener, punchy and provocative, 40–60 words

2. 4-WEEK STORY ARC — Posts MUST follow this narrative structure:
   - Week 1 (Days 1–7): Establish the Problem — Surface the pain from the book's opening chapters
   - Week 2 (Days 8–14): Introduce the Framework — Name the author's methodology, tease the solution using key_frameworks
   - Week 3 (Days 15–21): Share Transformations — Social proof, reader results, case studies from the book
   - Week 4 (Days 22–30): Make the Offer — Direct promotion, book/workbook/course/webinar, urgency

3. REVENUE-LINKED CTAs — Every post must end with a CTA:
    - Tips/Insights posts: "Get the full framework in ${bookTitle} — link in bio"
    - Story posts: "This is from my book. Want the rest? Link in bio."
    - Engagement posts: "Comment YES if you want my free [lead magnet]"
    - Week 3 social proof: "This could be your story. Start here → [book link]"
    - Week 4 promotional: "Get ${bookTitle} now — link in bio"
   - Every 7th post: Direct lead magnet opt-in CTA

4. EMAIL SEQUENCE — Generate exactly 30 emails matching the same 4-week story arc. Each email has:
   - subject_a and subject_b (A/B test variants)
   - preview_text
   - body (200-400 words, matches the day's social theme)
   - cta (specific action with link placeholder)
   - day (1-30)

5. OUTREACH KIT — Generate exactly 5 templates:
   - Podcast Pitch Email (200–250 words)
   - Media / Press Pitch Email (200–250 words)
   - Book Review Request Email (100–150 words)
   - Book Club Outreach Email (150–200 words)
   - Colleague / Friend Referral Email (80–100 words)
   Each has: type, subject, body

Respond with valid JSON only (no markdown fences):
{
  "calendar_name": "Name for this calendar",
  "hashtag_strategy": {
    "primary_hashtags": ["3-5 main hashtags"],
    "secondary_hashtags": ["5-8 supporting hashtags"],
    "author_hashtag": "#UniqueAuthorHashtag"
  },
  "posts": [
    {
      "day": 1,
      "post_type": "Type (Quote, Tip, Behind the Scenes, Book Excerpt, Question, Story, Announcement)",
      "theme": "Core message",
      "cta_type": "insight|story|engagement|social_proof|promotional|lead_magnet",
      "linkedin": { "caption": "...", "hashtags": ["..."] },
      "instagram": { "caption": "...", "hashtags": ["..."] },
      "facebook": { "caption": "...", "hashtags": ["..."] },
      "twitter": { "caption": "...", "hashtags": ["..."] }
    }
  ],
  "email_sequence": [
    {
      "day": 1,
      "subject_a": "Subject line variant A",
      "subject_b": "Subject line variant B",
      "preview_text": "Preview text",
      "body": "Full email body",
      "cta": "Call to action"
    }
  ],
  "outreach_kit": [
    {
      "type": "Podcast Pitch Email",
      "subject": "Subject line",
      "body": "Full template body"
    }
  ],
  "posting_schedule": {
    "recommended_days": ["Monday", "Wednesday", "Friday"],
    "recommended_time": "9:00 AM local time",
    "rationale": "Why this schedule works"
  },
  "abby_summary": "2-3 sentence summary of what was created"
}

The posts array must have exactly 30 items. The email_sequence array must have exactly 30 items. The outreach_kit array must have exactly 5 items.
Make ALL content specific to this author's book themes, frameworks, and insights. Never use generic placeholder text.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          {
            role: "system",
            content: "You are ABBY, the AI business agent for Authors Bureau. You help authors turn their books into complete business empires. You are warm, expert, and encouraging. You always personalise everything to the author's specific book, audience, and niche. Never be generic. Always respond with valid JSON only — no markdown, no code fences.",
          },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_completion_tokens: 32000,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      throw new Error(`AI gateway error [${aiResp.status}]: ${errText}`);
    }

    const aiData = await aiResp.json();
    const raw = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON — handle possible code fences
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No valid JSON found in AI response");

    const parsed = JSON.parse(jsonMatch[0]);

    // Save to author_nodes
    const { data: existingNode } = await sb.from("author_nodes").select("id").eq("author_id", author_id).eq("node_id", "BP-03").maybeSingle();

    if (existingNode) {
      await sb.from("author_nodes").update({
        status: "content_ready",
        content_json: parsed,
        personalised_name: parsed.calendar_name || "Social Media Marketing Kit",
      }).eq("id", existingNode.id);
    } else {
      await sb.from("author_nodes").insert({
        author_id,
        node_id: "BP-03",
        node_name: "Social Media",
        status: "content_ready",
        content_json: parsed,
        personalised_name: parsed.calendar_name || "Social Media Marketing Kit",
      });
    }

    return new Response(JSON.stringify({ success: true, content: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-bp03-social-media error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
