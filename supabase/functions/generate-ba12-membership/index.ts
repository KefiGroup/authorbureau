import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, makeServiceClient, parseAiJson, errorMessage,
  buildAuthorContext, snapshotAuthorNode, upsertAuthorNode,
} from "../_shared/builder-helpers.ts";

const NODE_ID = "BA-12";
const NODE_NAME = "Membership";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let priorNodeState: Record<string, unknown> | null = null;
  let parsedAuthorId: string | null = null;
  const supabase = makeServiceClient();

  try {
    const { author_id } = await req.json();
    if (!author_id) throw new Error("author_id is required");
    parsedAuthorId = author_id;

    const { data: author } = await supabase
      .from("author_profiles").select("pen_name, genres, user_id").eq("id", author_id).single();
    if (!author) throw new Error("Author not found");

    priorNodeState = await snapshotAuthorNode(supabase, author_id, NODE_ID);
    const { ctx, book, bookTitle, coreThesis } =
      await buildAuthorContext(supabase, author_id, author.user_id ?? null);
    if (!bookTitle) throw new Error("No book found. Please add a book first.");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: "You are ABBY for Authors Bureau. Design a SINGLE-TIER monthly membership community. Respond with ONLY valid JSON (no markdown, no code fences)." },
          { role: "user", content: `Design a monthly membership for ${author.pen_name}'s book '${bookTitle}'.

Book context:
- Author: ${author.pen_name}
- Title: ${bookTitle}
- Core thesis: ${coreThesis || "Use book description and context to infer."}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
- Genre: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}

Return JSON exactly in this shape:
{
  "membership_name": "string (memorable, branded)",
  "tagline": "string", "who_its_for": "string", "transformation_promise": "string",
  "benefits": ["5 specific member-facing benefits"],
  "monthly_price_usd": 27, "pricing_rationale": "string",
  "sales_copy": { "headline": "string", "subheadline": "string", "problem": "string",
    "promise": "string", "what_you_get": ["string","string","string","string","string"], "cta": "string" },
  "welcome_emails": [
    { "day": 0, "subject": "string", "body": "4-6 sentences signed by ${author.pen_name}" },
    { "day": 2, "subject": "string", "body": "string" },
    { "day": 5, "subject": "string", "body": "string" }
  ],
  "monthly_newsletter_template": {
    "subject_pattern": "${author.pen_name} Insider — {month} {year}",
    "sections": ["Coach's note","Featured framework","Member spotlight","This month's challenge"]
  },
  "abby_summary": "string"
}

Single tier only. No generic placeholders.` },
        ],
        temperature: 0.7,
      }),
    });
    if (!aiRes.ok) throw new Error(`AI gateway error: ${aiRes.status} ${(await aiRes.text()).slice(0,300)}`);
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");
    const monthlyPrice = Number(content.monthly_price_usd ?? 27);

    await supabase.from("membership_content").upsert({
      author_id,
      name: content.membership_name,
      tagline: content.tagline ?? null,
      benefits: content.benefits ?? [],
      sales_copy: content.sales_copy ?? {},
      welcome_emails: content.welcome_emails ?? [],
      monthly_newsletter_template: content.monthly_newsletter_template ?? null,
      monthly_price: monthlyPrice,
      currency: "usd",
      status: "draft",
    }, { onConflict: "author_id" });

    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready",
      current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.membership_name,
      price_usd: monthlyPrice,
      currency: "usd",
      delivery_type: "membership",
    });

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    if (priorNodeState && parsedAuthorId) {
      try { await upsertAuthorNode(supabase, parsedAuthorId, NODE_ID, NODE_NAME, priorNodeState); }
      catch (e) { console.error(`generate-${NODE_ID} restore error:`, errorMessage(e)); }
    }
    const message = errorMessage(err);
    console.error(`generate-${NODE_ID} error:`, message);
    return new Response(JSON.stringify({ success: false, error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
