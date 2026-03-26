import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { author_id } = await req.json();
    if (!author_id) throw new Error("author_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: author, error: authorErr } = await supabase
      .from("author_profiles")
      .select("pen_name, user_id, ghl_sub_account_id, subscription_tier")
      .eq("id", author_id)
      .single();
    if (authorErr || !author) throw new Error("Author profile not found");

    const { data: context } = await supabase
      .from("author_context")
      .select("book_title, book_subtitle, core_thesis, key_frameworks, target_audience_persona, unique_insights, commercial_angles")
      .eq("author_id", author_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const bookTitle = context?.book_title || "your book";
    const bookSubtitle = context?.book_subtitle || "";
    const coreThesis = context?.core_thesis || "";
    const keyFrameworks = context?.key_frameworks ? JSON.stringify(context.key_frameworks) : "N/A";
    const audiencePersona = context?.target_audience_persona ? JSON.stringify(context.target_audience_persona) : "readers interested in personal growth";
    const uniqueInsights = context?.unique_insights ? JSON.stringify(context.unique_insights) : "N/A";
    const authorName = author.pen_name || "Author";

    const systemPrompt = `You are ABBY, the AI business agent for Authors Bureau. You help authors turn their books into complete business empires. You are warm, expert, and encouraging. You always personalise everything to the author's specific book, audience, and niche. Never be generic. Always respond with valid JSON only — no markdown, no code fences.`;

    const userPrompt = `Create a complete lead magnet system for ${authorName}'s book '${bookTitle}'.

Book details:
- Title: ${bookTitle}
- Subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis || "N/A"}
- Target audience: ${audiencePersona}
- Key frameworks: ${keyFrameworks}
- Unique insights: ${uniqueInsights}

Generate the following as a JSON object with these exact keys:
{
  "lead_magnets": [
    {
      "number": 1,
      "type": "Type of lead magnet (e.g., PDF Guide, Checklist, Mini-Course, Toolkit, Cheat Sheet, Quiz)",
      "title": "Compelling title for this lead magnet",
      "description": "One sentence describing what readers get and the transformation it delivers",
      "why_it_works": "One sentence explaining why this specific lead magnet will attract this author's audience",
      "pages_or_length": "Estimated length (e.g., 12-page PDF, 5-day email course, 1-page checklist)"
    }
  ],
  "recommended_lead_magnet": 1,
  "recommended_reason": "One sentence explaining why lead magnet #1 is the strongest choice for this author",
  "optin_page": {
    "headline": "Main headline for the opt-in page (compelling, benefit-driven)",
    "subheadline": "Supporting subheadline (clarifies the offer)",
    "bullet_points": ["Benefit 1", "Benefit 2", "Benefit 3"],
    "cta_button_text": "Button text (e.g., Send Me the Free Guide)",
    "privacy_note": "Short privacy reassurance (e.g., No spam. Unsubscribe anytime.)"
  },
  "thankyou_page": {
    "headline": "Thank you page headline",
    "message": "Short message (2-3 sentences) thanking them and telling them what to expect",
    "next_step": "What to do next (e.g., Check your inbox for your free guide)"
  },
  "funnel_name": "Name for this lead magnet funnel (e.g., ${authorName} Free Guide Funnel)",
  "abby_summary": "A 2-3 sentence summary from ABBY explaining what she created and why these lead magnets will grow this author's list"
}

The lead_magnets array must have exactly 3 items, each a different type.
Make everything specific to this author's book and audience. Never use generic placeholder text.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", errText);
      if (aiResponse.status === 429) throw new Error("Rate limited — please try again in a moment");
      if (aiResponse.status === 402) throw new Error("AI credits exhausted — please add funds");
      throw new Error(`AI generation failed (${aiResponse.status})`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    const cleaned = rawContent
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    let parsedContent: Record<string, unknown>;
    try {
      parsedContent = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsedContent = JSON.parse(match[0].replace(/,\s*([}\]])/g, "$1"));
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    const { error: updateErr } = await supabase
      .from("author_nodes")
      .update({
        status: "content_ready",
        content_json: parsedContent,
        personalised_name: (parsedContent as any).funnel_name || "Lead Magnets",
      })
      .eq("author_id", author_id)
      .eq("node_id", "BP-02");

    if (updateErr) console.error("Failed to update author_nodes:", updateErr);

    return new Response(
      JSON.stringify({ success: true, content: parsedContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-bp02 error:", err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
