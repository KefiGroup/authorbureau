import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAiGateway } from "../_shared/builder-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const toolPrompts: Record<string, string> = {
  workbook: `You are an expert instructional designer who DEEPLY READS and ANALYZES the author's full book manuscript before generating anything.

CRITICAL WORKFLOW:
1. FIRST: Read the ENTIRE source material / manuscript provided below. Identify every key concept, chapter theme, unique theory, proprietary framework, memorable anecdote, case study, and transformational principle.
2. SECOND: Map out the book's structure — what is the author's core thesis? What is their unique methodology or step-by-step process? What language and terminology do THEY use?
3. THIRD: Generate the workbook that is a FAITHFUL COMPANION to the actual book — not a generic workbook on the same topic.

CRITICAL: If the author has defined unique frameworks, theories, or methodologies (either in their profile OR discovered in the manuscript), you MUST structure the entire workbook around those frameworks. The workbook should teach, apply, and reinforce the author's proprietary approach — NOT generic advice. Use the author's OWN terminology, chapter references, and examples from the book.

Include:
- A workbook title and subtitle that reference the author's framework if one exists
- 8-12 chapters, each directly mapped to the book's actual chapters/sections, with:
  - Chapter title (aligned with the author's framework steps/principles and actual book chapters)
  - 2-3 reflection questions that reference SPECIFIC concepts, stories, or examples from the book
  - 1 practical exercise/activity that applies the framework using the author's own methodology
  - 1 action plan template
- A final "Putting It All Together" summary section that ties back to the book's core thesis
Format the output in clean markdown. Make exercises actionable and thought-provoking. Reference specific pages, chapters, or sections from the manuscript.`,

  course: `You are an expert curriculum designer who DEEPLY READS and ANALYZES the author's full book manuscript before generating anything.

CRITICAL WORKFLOW:
1. FIRST: Read the ENTIRE source material / manuscript. Identify the book's structure, key arguments, unique frameworks, case studies, and transformational journey.
2. SECOND: Extract the author's proprietary methodology — their unique language, step-by-step processes, and original concepts.
3. THIRD: Design the course as a structured teaching experience that faithfully represents the AUTHOR'S approach, not generic industry advice.

CRITICAL: If the author has defined unique frameworks, theories, or methodologies, you MUST structure the course modules around those frameworks. Each module should map to a framework principle or step. Use the author's OWN terminology.

Include:
- Course title and description (2-3 sentences) referencing the author's methodology
- Target audience (derived from the book's actual target reader)
- Learning outcomes (4-6 bullet points tied to the book's actual promises)
- 6-10 modules, each mapped to the book's chapters/sections, with:
  - Module title (aligned with framework steps if applicable)
  - Module description referencing specific book content
  - 3-5 lesson titles drawn from actual book concepts
  - Key takeaway
- Suggested assessment method
Format in clean markdown.`,

  social: `You are an expert social media strategist for authors who DEEPLY READS the author's full book manuscript before generating content.

CRITICAL WORKFLOW:
1. FIRST: Read the ENTIRE source material / manuscript. Extract key quotes, memorable stories, unique concepts, actionable tips, and the author's voice/tone.
2. SECOND: Identify the author's unique frameworks and terminology — posts should sound like THE AUTHOR, not a generic marketer.
3. THIRD: Generate posts that directly reference and teach concepts from the actual book.

CRITICAL: If the author has defined unique frameworks, theories, or methodologies, weave them throughout the content. Posts should reference, teach, and promote the author's proprietary approach using their exact language.

Include:
- 30 posts organized by week
- Mix of content types: framework teachings, direct quotes from the book, behind-the-scenes, tips from specific chapters, engagement questions about book concepts, promotional
- For each post provide:
  - Day number and content type
  - Post caption (ready to copy-paste, using the author's voice and referencing actual book content)
  - Suggested hashtags (5-8)
  - Platform recommendation (Instagram/LinkedIn/Twitter)
Format in clean markdown.`,

  email: `You are an expert email marketing strategist for authors who DEEPLY READS the author's full book manuscript before generating content.

CRITICAL WORKFLOW:
1. FIRST: Read the ENTIRE source material / manuscript. Understand the book's core transformation, key insights, and the author's unique voice.
2. SECOND: Identify the most compelling concepts that would hook readers and build desire for more.
3. THIRD: Create an email sequence that progressively reveals the author's methodology using their own language and examples from the book.

CRITICAL: If the author has defined unique frameworks, theories, or methodologies, the email sequence should progressively teach the framework, building curiosity and demonstrating its value. Use specific examples and stories from the book.

Include:
- Sequence name and goal
- Lead magnet idea tied to the book and framework
- 7 emails, each with:
  - Subject line (using the author's terminology)
  - Preview text
  - Email body (150-250 words, referencing specific book concepts)
  - Call-to-action
- Timing recommendations (days between emails)
Format in clean markdown.`,

  speaker: `You are an expert speaker coach who DEEPLY READS the author's full book manuscript before generating content.

CRITICAL WORKFLOW:
1. FIRST: Read the ENTIRE source material / manuscript. Identify the most compelling stories, transformational moments, and keynote-worthy concepts.
2. SECOND: Extract the author's unique methodology and speaking voice.
3. THIRD: Build talk topics that showcase the author's ACTUAL expertise and book content.

CRITICAL: If the author has defined unique frameworks, theories, or methodologies, the keynote topics should be built around those frameworks using the author's exact terminology.

Include:
- Speaker one-sheet content:
  - Professional headline (referencing the framework and book)
  - Speaker bio (150 words, drawn from actual book content and author credentials)
  - 3 signature talk titles with descriptions (50 words each) — derived from actual book themes, at least 1 should be a framework deep-dive
  - Key topics/themes (bullet points from actual book chapters)
  - Audience takeaways for each talk
  - Ideal audience description (based on the book's actual target reader)
- Technical requirements section
- Testimonial prompts
Format in clean markdown.`,

  products: `You are an expert digital product strategist who DEEPLY READS the author's full book manuscript before generating ideas.

CRITICAL WORKFLOW:
1. FIRST: Read the ENTIRE source material / manuscript. Identify every actionable concept, framework, process, checklist-worthy section, and teachable moment.
2. SECOND: Understand the author's unique methodology and what makes their approach different from competitors.
3. THIRD: Design products that are natural extensions of the ACTUAL book content, not generic ideas.

CRITICAL: If the author has defined unique frameworks, theories, or methodologies, products should be extensions and applications of those frameworks using the author's exact terminology.

For each product include:
- Product name (referencing the framework and actual book concepts)
- Product type (checklist, template, mini-guide, toolkit, planner, worksheet, etc.)
- Description (2-3 sentences tied to specific book content)
- Target audience (the book's actual reader)
- Suggested price point
- How it connects to the book and the framework — reference specific chapters or concepts
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

    const sanitizedSourceMaterial = typeof sourceMaterial === "string" ? sourceMaterial.slice(0, 200000) : "";

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

=== FULL BOOK MANUSCRIPT ===
${sanitizedSourceMaterial ? sanitizedSourceMaterial : "MANUSCRIPT NOT PROVIDED — generate based on the book description and frameworks above, but note that results will be more generic without the full manuscript."}
=== END MANUSCRIPT ===

${frameworksBlock}

CRITICAL INSTRUCTIONS:
1. You MUST read the ENTIRE manuscript above before generating ANY content.
2. If frameworks are provided (either above or discovered in the manuscript), structure ALL content around those frameworks.
3. Use the author's EXACT terminology, chapter titles, stories, and examples from the manuscript.
4. If the manuscript contains a unique theory or methodology (even if not listed in frameworks above), identify it and build the content around it.
5. Reference specific chapters, page concepts, and examples from the manuscript throughout.
6. The generated content should feel like it was written BY someone who intimately knows this book — not by someone who read a summary.

Please generate the content based on this book.`;

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
        stream: true,
      }),
    }, "ai-author-tools");

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
