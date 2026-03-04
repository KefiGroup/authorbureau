import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const { data: book, error: bookErr } = await sb.from("books").select("title, subtitle, description, genre, author_name").eq("id", bookId).single();
    if (bookErr || !book) {
      return new Response(JSON.stringify({ error: "Book not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const postsPerDay = frequency === "daily" ? 1 : frequency === "3x" ? 3 / 7 : 5 / 7;
    const totalPosts = Math.round(postsPerDay * duration);

    const mixDescription = Object.entries(contentMix as Record<string, number>)
      .filter(([_, v]) => v > 0)
      .map(([k, v]) => `${k}: ${v}%`)
      .join(", ");

    const systemPrompt = `You are a social media content strategist for authors. Generate exactly ${totalPosts} social media posts for an author promoting their book.

Book: "${book.title}"${book.subtitle ? ` — ${book.subtitle}` : ""}
Genre: ${book.genre || "Non-fiction"}
Description: ${book.description || "N/A"}
Author: ${book.author_name || "Author"}

Platforms: ${(platforms as string[]).join(", ")}
Content mix: ${mixDescription}
Tone: ${(tones as string[]).join(", ")}
${topicsEmphasize ? `Topics to emphasize: ${topicsEmphasize}` : ""}
${topicsAvoid ? `Topics to avoid: ${topicsAvoid}` : ""}

For each post return a JSON object with: platform, caption, hashtags (array), category (one of: tips, quotes, stories, promotions, engagement), suggested_time (HH:MM format).

Distribute posts evenly across the ${duration} days starting from today. Assign a day_number (1 to ${duration}) to each post. If frequency is less than daily, space them accordingly.

Return ONLY a JSON array of post objects. No markdown, no explanation.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate ${totalPosts} social media posts for the book "${book.title}". Return as a JSON array.` },
        ],
        stream: true,
      }),
    });

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
