import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, makeServiceClient, parseAiJson, errorMessage,
  buildAuthorContext, snapshotAuthorNode, upsertAuthorNode,
} from "../_shared/builder-helpers.ts";

const NODE_ID = "BA-17";
const NODE_NAME = "Upsells & Bundles";

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
    const { ctx, book, bookTitle, bookSubtitle, coreThesis } =
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
          { role: "system", content: "You are ABBY, the AI business agent for Authors Bureau. Personalise everything to the author's specific book. Respond with ONLY valid JSON (no markdown, no code fences)." },
          { role: "user", content: `Create a complete upsell and bundle system for ${author.pen_name}'s book '${bookTitle}'.

Book context:
- Author: ${author.pen_name}
- Title: ${bookTitle}
- Subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis || "Use book description and context to infer."}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
- Unique insights: ${JSON.stringify(ctx?.unique_insights ?? [])}
- Genre: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}

Generate JSON: {"product_ladder_title","bundles":[3 items with bundle_name/products_included(3 items)/individual_value_usd/bundle_price_usd/savings_usd/tagline],"upsell_sequences":[3 items with trigger/upsell_product/upsell_price_usd/upsell_headline/upsell_copy],"downsell":{trigger/downsell_product/downsell_price_usd/downsell_headline},"abby_summary"}

Make everything specific to this book. No placeholders.` },
        ],
        temperature: 0.7,
      }),
    });
    if (!aiRes.ok) throw new Error(`AI gateway error: ${aiRes.status} ${(await aiRes.text()).slice(0,300)}`);
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");

    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready",
      current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.product_ladder_title,
      currency: "usd",
      delivery_type: "upsells",
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
