import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const toolPrompts: Record<string, string> = {
  workbook: `You are an expert instructional designer. Based on the book information provided, generate a comprehensive workbook.

CRITICAL: If the author has defined unique frameworks, theories, or methodologies, you MUST structure the entire workbook around those frameworks. The workbook should teach, apply, and reinforce the author's proprietary approach — NOT generic advice.

Include:
- A workbook title and subtitle that reference the author's framework if one exists
- 8-12 chapters, each with:
  - Chapter title (aligned with the author's framework steps/principles if applicable)
  - 2-3 reflection questions that explore the framework's concepts
  - 1 practical exercise/activity that applies the framework
  - 1 action plan template
- A final "Putting It All Together" summary section
Format the output in clean markdown. Make exercises actionable and thought-provoking.`,

  course: `You are an expert curriculum designer. Based on the book information provided, create a detailed course outline.

CRITICAL: If the author has defined unique frameworks, theories, or methodologies, you MUST structure the course modules around those frameworks. Each module should map to a framework principle or step.

Include:
- Course title and description (2-3 sentences)
- Target audience
- Learning outcomes (4-6 bullet points)
- 6-10 modules, each with:
  - Module title (aligned with framework steps if applicable)
  - Module description
  - 3-5 lesson titles
  - Key takeaway
- Suggested assessment method
Format in clean markdown.`,

  social: `You are an expert social media strategist for authors. Based on the book information provided, generate a 30-day social media content calendar.

CRITICAL: If the author has defined unique frameworks, theories, or methodologies, weave them throughout the content. Posts should reference, teach, and promote the author's proprietary approach.

Include:
- 30 posts organized by week
- Mix of content types: framework teachings, quotes from book themes, behind-the-scenes, tips, engagement questions, promotional
- For each post provide:
  - Day number and content type
  - Post caption (ready to copy-paste, referencing the framework where natural)
  - Suggested hashtags (5-8)
  - Platform recommendation (Instagram/LinkedIn/Twitter)
Format in clean markdown.`,

  email: `You are an expert email marketing strategist for authors. Based on the book information provided, create a 7-email nurture sequence.

CRITICAL: If the author has defined unique frameworks, theories, or methodologies, the email sequence should progressively teach the framework, building curiosity and demonstrating its value.

Include:
- Sequence name and goal
- Lead magnet idea tied to the book and framework
- 7 emails, each with:
  - Subject line
  - Preview text
  - Email body (150-250 words)
  - Call-to-action
- Timing recommendations (days between emails)
Format in clean markdown.`,

  speaker: `You are an expert speaker coach. Based on the book information provided, generate a professional speaker kit.

CRITICAL: If the author has defined unique frameworks, theories, or methodologies, the keynote topics should be built around those frameworks.

Include:
- Speaker one-sheet content:
  - Professional headline (referencing the framework)
  - Speaker bio (150 words)
  - 3 signature talk titles with descriptions (50 words each) — at least 1 should be a framework deep-dive
  - Key topics/themes (bullet points)
  - Audience takeaways for each talk
  - Ideal audience description
- Technical requirements section
- Testimonial prompts
Format in clean markdown.`,

  products: `You are an expert digital product strategist. Based on the book information provided, brainstorm 8-10 digital product ideas the author can create and offer.

CRITICAL: If the author has defined unique frameworks, theories, or methodologies, products should be extensions and applications of those frameworks.

For each product include:
- Product name (referencing the framework where appropriate)
- Product type (checklist, template, mini-guide, toolkit, planner, worksheet, etc.)
- Description (2-3 sentences)
- Target audience
- Suggested price point
- How it connects to the book and the framework
- Effort level to create (Low/Medium/High)
Format in clean markdown. Prioritize ideas by revenue potential.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { toolType, bookTitle, bookDescription, authorName, additionalContext, sourceMaterial, frameworks } = await req.json();

    const systemPrompt = toolPrompts[toolType];
    if (!systemPrompt) {
      return new Response(JSON.stringify({ error: "Invalid tool type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const sanitizedSourceMaterial = typeof sourceMaterial === "string" ? sourceMaterial.slice(0, 120000) : "";

    // Build frameworks context block
    let frameworksBlock = "";
    if (Array.isArray(frameworks) && frameworks.length > 0) {
      frameworksBlock = "\n\n=== AUTHOR'S UNIQUE FRAMEWORKS & THEORIES ===\n" +
        "IMPORTANT: The following are the author's proprietary frameworks. ALL generated content MUST be structured around and reference these frameworks.\n\n" +
        frameworks.map((fw: any, i: number) => {
          const principles = Array.isArray(fw.key_principles) && fw.key_principles.length > 0
            ? "\nKey Principles/Steps:\n" + fw.key_principles.filter((p: string) => p.trim()).map((p: string, j: number) => `  ${j + 1}. ${p}`).join("\n")
            : "";
          return `Framework ${i + 1}: "${fw.name}"\nDescription: ${fw.description || "No description provided."}${principles}`;
        }).join("\n\n") +
        "\n=== END FRAMEWORKS ===\n";
    }

    const userMessage = `Book Title: "${bookTitle}"
Author: ${authorName}
Book Description: ${bookDescription}
${additionalContext ? `Additional Context: ${additionalContext}` : ""}
${sanitizedSourceMaterial ? `Source Material (author-provided text): ${sanitizedSourceMaterial}` : "Source Material: Not provided"}
${frameworksBlock}
If source material is provided, prioritize it over assumptions.
If author frameworks are provided, structure ALL content around those frameworks — they are the author's proprietary methodology and must be central to the generated content.
Please generate the content based on this book.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }), {
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-author-tools error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
