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

    const { data: profile } = await sb.from("author_profiles").select("pen_name, genre").eq("id", author_id).single();
    const { data: ctx } = await sb.from("author_context").select("*").eq("author_id", author_id).order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (!ctx) throw new Error("No book context found. Please complete your book profile first.");

    const authorName = profile?.pen_name || "Author";
    const genre = profile?.genre || "general";

    const userPrompt = `Create a complete 30-day social media content calendar for ${authorName}'s book '${ctx.book_title}'.

Book details:
- Title: ${ctx.book_title}
- Subtitle: ${ctx.book_subtitle || "N/A"}
- Core thesis: ${ctx.core_thesis}
- Target audience: ${JSON.stringify(ctx.target_audience_persona || {})}
- Key frameworks: ${JSON.stringify(ctx.key_frameworks || [])}
- Unique insights: ${JSON.stringify(ctx.unique_insights || [])}
- Niche: ${genre}

Generate the following as a JSON object with these exact keys:
{
  "calendar_name": "Name for this author's social media calendar (e.g., ${authorName} 30-Day Book Launch Calendar)",
  "hashtag_strategy": {
    "primary_hashtags": ["3-5 main hashtags specific to the book topic"],
    "secondary_hashtags": ["5-8 supporting hashtags for reach"],
    "author_hashtag": "A unique branded hashtag for this author"
  },
  "posts": [
    {
      "day": 1,
      "post_type": "Type of post (Quote, Tip, Behind the Scenes, Book Excerpt, Question, Story, or Announcement)",
      "theme": "The core message or theme of this post",
      "linkedin": { "caption": "Full LinkedIn caption (150-300 words, professional tone, includes call to action)", "hashtags": ["3-5 relevant hashtags"] },
      "instagram": { "caption": "Full Instagram caption (100-200 words, engaging tone, includes call to action)", "hashtags": ["8-12 relevant hashtags"] },
      "facebook": { "caption": "Full Facebook caption (100-200 words, conversational tone)", "hashtags": ["3-5 relevant hashtags"] },
      "twitter": { "caption": "Twitter/X post (max 280 characters, punchy and direct)", "hashtags": ["2-3 relevant hashtags"] }
    }
  ],
  "posting_schedule": {
    "recommended_days": ["Monday", "Wednesday", "Friday"],
    "recommended_time": "9:00 AM local time",
    "rationale": "One sentence explaining why this schedule works for this author's audience"
  },
  "abby_summary": "A 2-3 sentence summary from ABBY explaining what she created and why this social media strategy will grow this author's audience"
}

The posts array must have exactly 30 items (Day 1 through Day 30).
Vary the post types — do not repeat the same type more than 3 times in a row.
Make all captions specific to this author's book themes and insights. Never use generic placeholder text.`;

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
        max_tokens: 16000,
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
        personalised_name: parsed.calendar_name || "Social Media Calendar",
      }).eq("id", existingNode.id);
    } else {
      await sb.from("author_nodes").insert({
        author_id,
        node_id: "BP-03",
        node_name: "Social Media",
        status: "content_ready",
        content_json: parsed,
        personalised_name: parsed.calendar_name || "Social Media Calendar",
      });
    }

    return new Response(JSON.stringify({ success: true, content: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-bp03-social-media error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
