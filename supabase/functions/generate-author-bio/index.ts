import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAiGateway } from "../_shared/builder-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { authorName, tagline, linkedinUrl, amazonUrl, genres, bookTitles } = await req.json();

    if (!authorName) {
      return new Response(JSON.stringify({ error: "Author name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const contextParts: string[] = [];
    contextParts.push(`Author Name: ${authorName}`);
    if (tagline) contextParts.push(`Tagline: ${tagline}`);
    if (genres?.length) contextParts.push(`Genres/Topics: ${genres.join(", ")}`);
    if (bookTitles?.length) contextParts.push(`Published Books: ${bookTitles.join(", ")}`);
    if (linkedinUrl) contextParts.push(`LinkedIn Profile: ${linkedinUrl}`);
    if (amazonUrl) contextParts.push(`Amazon Author Page: ${amazonUrl}`);

    const systemPrompt = `You are a professional author bio writer. Write warm, authentic, and specific author bios based on the information provided. Avoid generic filler phrases like "thought leader", "multifaceted visionary", "fresh perspectives", or "compelling storytelling". Instead, be concrete and specific about what the author actually does and writes about.

Use the author's actual gender if obvious from their name; otherwise use "she/her" as default rather than "they/them".

Return ONLY valid JSON with exactly two fields:
- "short_bio": A punchy 1-2 sentence bio (max 50 words) suitable for cards and previews. Start with the author's name.
- "full_bio": A 3-paragraph bio (120-180 words total) that covers who they are, what they write about, and their mission/impact. Start with the author's name.

Do NOT wrap in markdown code blocks. Return raw JSON only.`;

    const userMessage = contextParts.join("\n");

    const response = await fetchAiGateway({
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    }, "generate-author-bio");

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse the JSON from the AI response
    const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const bios = JSON.parse(cleaned);

    return new Response(JSON.stringify(bios), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-author-bio error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
