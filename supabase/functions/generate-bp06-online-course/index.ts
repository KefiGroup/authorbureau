import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mirror of src/lib/workbook-pdf.ts normalizeOutcome — keeps copy clean even if the model slips.
function normalizeOutcome(raw?: string): string {
  if (!raw) return "";
  let s = String(raw).trim();
  for (let pass = 0; pass < 2; pass++) {
    s = s.replace(
      /^(you['\u2019]?ll|you will|you can|you['\u2019]?ll be able to|you['\u2019]?re going to|you are going to|readers? (will|can)|the readers? (will|can)|by the end[^,]*,\s*(you|readers?) (will|can))\s+/i,
      "",
    );
  }
  s = s.replace(/^be able to\s+/i, "");
  if (s.length > 1 && /^[A-Z][a-z]/.test(s)) s = s[0].toLowerCase() + s.slice(1);
  return s;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { author_id } = await req.json();
    if (!author_id) throw new Error("author_id is required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: author } = await supabase.from("author_profiles").select("pen_name, genres").eq("id", author_id).single();
    if (!author) throw new Error("Author not found");

    const { data: ctx } = await supabase.from("author_context").select("*").eq("author_id", author_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!ctx) throw new Error("No author context found. Please complete your book profile first.");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5",
        max_completion_tokens: 12000,
        messages: [
          { role: "system", content: "You are ABBY, the AI business agent for Authors Bureau. You help authors turn their books into complete business empires. You are warm, expert, and encouraging. Always personalise everything. Always respond with valid JSON only — no markdown, no code fences." },
          { role: "user", content: `Create a companion workbook for ${author.pen_name}'s book '${ctx.book_title}'.

Author details:
- Author name: ${author.pen_name}
- Book title: ${ctx.book_title}
- Book subtitle: ${ctx.book_subtitle || "N/A"}
- Core thesis: ${ctx.core_thesis}
- Target audience: ${JSON.stringify(ctx.target_audience_persona)}
- Key frameworks: ${JSON.stringify(ctx.key_frameworks)}
- Unique insights: ${JSON.stringify(ctx.unique_insights)}
- Genre/Niche: ${author.genres?.[0] || "General"}

Generate the following as a JSON object with these EXACT keys and EXACT shapes:
{
  "workbook_title": "Compelling workbook title (e.g., 'The [Book Title] Workbook')",
  "workbook_subtitle": "One-line subtitle",
  "tagline": "Punchy tagline — MAX 8 WORDS, no period",
  "page_count": "e.g., 45 pages",
  "format": "8.5 × 11\\" PDF + Word — Amazon KDP-ready (do not change this value)",
  "transformation_promise": "ONE sentence, second person ('you'), present-tense action verb, MAX 30 words. Example: 'You leave with a personal SUCKCESS Canvas, a 90-day plan, and a crisis-response playbook you actually use.'",
  "sections": [
    {
      "number": 1,
      "title": "Section title",
      "description": "2-3 sentences describing what this section covers",
      "exercises": ["Exercise 1", "Exercise 2", "Exercise 3"],
      "outcome": "VERB PHRASE only. Must NOT start with 'You', 'Readers', 'By the end', or any subject pronoun. Must NOT start with 'will', 'can', or 'be able to'. Start with a lowercase action verb. WRONG: 'You will own a playbook.' WRONG: 'Readers will articulate a niche.' RIGHT: 'own a personal crisis-response playbook and baseline habits that make you stronger under stress.' RIGHT: 'articulate a crisp niche, redesign your workspace, and track three weekly metrics.'"
    }
  ],
  "who_its_for": "Start with 'For…'. MAX 60 words. Example: 'For first-time authors who want to turn their book into a business — not just a bookshelf trophy.'",
  "what_youll_get": [
    {
      "name": "Exact deliverable name (e.g., 'SUCKCESS Framework Canvas')",
      "type": "canvas | planner | tracker | playbook | story | vision | worksheet",
      "purpose": "ONE sentence: what the reader uses it for",
      "linked_section": 1
    }
  ],
  "pricing_recommendation": "free" | "paid",
  "suggested_price_usd": 0,
  "free_rationale": "Why FREE works for this workbook: 2-3 sentences covering list-building, top-of-funnel value, and how it onramps readers to the author's paid products.",
  "paid_rationale": "Why PAID works for this workbook: 2-3 sentences referencing market price bands ($X–$Y) for comparable workbooks in this niche, plus what justifies that price (depth, frameworks, page count).",
  "pricing_rationale": "Short single-sentence summary of the recommended path",
  "sales_page": {
    "headline": "Sales page headline",
    "subheadline": "Supporting subheadline",
    "pain_point": "2-3 sentences describing the problem",
    "solution_statement": "2-3 sentences positioning the workbook as the solution",
    "cta_button_text": "e.g., Download Free Workbook"
  },
  "abby_summary": "2-3 sentence summary from ABBY"
}

CRITICAL STRUCTURE RULES:
- "sections" array MUST have EXACTLY 5 items, mapped to the book's chapters/themes.
- "what_youll_get" array MUST have EXACTLY 4 items. Each item MUST be an OBJECT with name/type/purpose/linked_section — NEVER a plain string.
- Each "what_youll_get" item's "type" MUST be one of: canvas, planner, tracker, playbook, story, vision, worksheet. Pick the type that matches the deliverable's name (a "Canvas" → canvas; a "90-Day Planner" → planner; a "Tracker" or "Dashboard" → tracker; a "Playbook" or "Protocol" → playbook; a "Story Template" → story; a "Vision" or "Futurecast" → vision; otherwise worksheet).
- "linked_section" must be a section number (1-5) from the sections array — every deliverable should clearly complement one section.
- Re-check every "outcome" before returning: if it starts with "You", "Readers", "By the end", "will", "can", or "be able to" — REWRITE IT.

PRICING GUIDANCE — Recommend whichever path serves THIS author best, but ALWAYS provide both rationales:
- Standalone reflective workbook → typical band $7–$27
- Premium framework workbook with original IP → $27–$47
- Companion to a paid course or coaching package → recommend FREE (lead magnet)
Set suggested_price_usd to a number inside the recommended band when "paid"; set to 0 when "free".

Make everything specific to this author's book.` }
        ],
      }),
    });

    if (!aiRes.ok) throw new Error(`AI gateway error: ${aiRes.status}`);
    const aiData = await aiRes.json();
    let raw = aiData.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const content = JSON.parse(raw);

    // Server-side post-processing: enforce outcome language even if the model slipped.
    if (Array.isArray(content.sections)) {
      content.sections = content.sections.map((s: Record<string, unknown>) => ({
        ...s,
        outcome: normalizeOutcome(s.outcome as string | undefined),
      }));
    }

    // Snapshot Abby's original recommendation into locked fields. The user-editable
    // fields (suggested_price_usd, pricing_recommendation) may be mutated later by
    // the builder UI, but these abby_* fields must never change after generation.
    content.abby_recommendation = content.pricing_recommendation === "paid" ? "paid" : "free";
    content.abby_recommended_price_usd = Number(content.suggested_price_usd) || 0;

    await supabase.from("author_nodes").update({
      status: "content_ready",
      content_json: content,
      personalised_name: content.workbook_title,
    }).eq("author_id", author_id).eq("node_id", "BP-06");

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("generate-bp06 error:", (err as Error).message);
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
