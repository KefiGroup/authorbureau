// @ts-nocheck — Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAuthorContext, upsertAuthorNode } from "../_shared/builder-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function fail(error: string, extra: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({ success: false, error, ...extra }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { author_id, book_id } = await req.json();
    if (!author_id) return fail("author_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch author profile
    const { data: author, error: authorErr } = await supabase
      .from("author_profiles")
      .select("pen_name, user_id, ghl_sub_account_id, subscription_tier")
      .eq("id", author_id)
      .single();
    if (authorErr || !author) return fail("Author profile not found");

    // Per-book context (book-specific, no cross-book fallback)
    const ctxBundle = await buildAuthorContext(supabase, author_id, author.user_id, book_id ?? null, "BP-01");
    if (ctxBundle.contextBlocked) {
      return fail(
        "Please run the book analysis for this specific book before generating Email Marketing. This prevents content from leaking between your books.",
        { status: "context_blocked", node_id: "BP-01" },
      );
    }
    const context = ctxBundle.ctx;
    const bookTitle = ctxBundle.bookTitle || "your book";
    const bookSubtitle = ctxBundle.bookSubtitle || "";
    const coreThesis = ctxBundle.coreThesis || "";
    const resolvedBookId = ctxBundle.book?.id ?? book_id ?? null;
    const keyFrameworks = context?.key_frameworks ? JSON.stringify(context.key_frameworks) : "N/A";
    const audiencePersona = context?.target_audience_persona ? JSON.stringify(context.target_audience_persona) : "readers interested in personal growth";
    const uniqueInsights = context?.unique_insights ? JSON.stringify(context.unique_insights) : "N/A";
    const commercialAngles = context?.commercial_angles ? JSON.stringify(context.commercial_angles) : "N/A";
    const authorName = author.pen_name || "Author";

    // Fetch real BP-02 lead magnet from generated_assets
    let leadMagnetInfo = "";
    const { data: leadMagnet } = await supabase
      .from("generated_assets")
      .select("title, description, content, status")
      .eq("author_id", author.user_id)
      .eq("asset_type", "builder_draft_lead-magnet")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (leadMagnet) {
      let lmDetails: Record<string, unknown> = {};
      try {
        lmDetails = typeof leadMagnet.content === "string" ? JSON.parse(leadMagnet.content) : (leadMagnet.content as any) || {};
      } catch { /* ignore parse errors */ }

      const lmTitle = leadMagnet.title || (lmDetails as any).title || "";
      const lmType = (lmDetails as any).type || (lmDetails as any).lead_magnet_type || "free resource";
      const lmHeadline = (lmDetails as any).headline || (lmDetails as any).quiz_title || "";
      const lmDescription = leadMagnet.description || (lmDetails as any).description || "";

      leadMagnetInfo = `
EXISTING LEAD MAGNET (already built by the author — you MUST reference this):
- Title: ${lmTitle}
- Type: ${lmType}
- Headline: ${lmHeadline}
- Description: ${lmDescription}
- Status: ${leadMagnet.status || "draft"}

IMPORTANT: The lead_magnet_offer in your response MUST use this exact lead magnet title and description. Do NOT invent a new lead magnet. All email CTAs should drive readers to this specific resource.`;
    }

    // Also check author_nodes for BP-02 microsite URL (book-scoped when possible)
    let leadMagnetUrl = "";
    let bp02Q = supabase
      .from("author_nodes")
      .select("microsite_url, status")
      .eq("author_id", author_id)
      .eq("node_id", "BP-02");
    if (resolvedBookId) bp02Q = bp02Q.eq("book_id", resolvedBookId);
    const { data: bp02Node } = await bp02Q.maybeSingle();

    if (bp02Node?.microsite_url) {
      leadMagnetInfo += `\n- Public URL: ${bp02Node.microsite_url}`;
      leadMagnetUrl = bp02Node.microsite_url;
    }

    // Build the AI prompt
    const systemPrompt = `You are ABBY, the AI business agent for Authors Bureau. You help authors turn their books into complete business empires. You are warm, expert, and encouraging. You always personalise everything to the author's specific book, audience, and niche. Never be generic. Always respond with valid JSON only — no markdown, no code fences.`;

    const userPrompt = `Create a complete email marketing system for ${authorName}'s book '${bookTitle}'.

Book details:
- Title: ${bookTitle}
- Subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis || "N/A"}
- Target audience: ${audiencePersona}
- Key frameworks: ${keyFrameworks}
- Unique insights: ${uniqueInsights}
- Commercial angles: ${commercialAngles}
${leadMagnetInfo}

Generate the following as a JSON object with these exact keys:
{
  "campaign_name": "A compelling name for this author's email marketing campaign (e.g., The [Book Theme] Insider Series)",
  "welcome_sequence": [
    {
      "email_number": 1,
      "subject": "Email subject line",
      "preview_text": "Preview text (40-90 chars)",
      "body": "Full email body (200-300 words, warm and personal, from the author)",
      "send_delay_days": 0
    }
  ],
  "lead_magnet_offer": {
    "title": "${leadMagnet ? "Use the author's existing lead magnet title exactly as provided above" : "Name of the free resource to offer as a lead magnet"}",
    "description": "${leadMagnet ? "Describe the existing lead magnet accurately based on the details above" : "One sentence describing what readers get"}",
    "cta_text": "Button text for the opt-in form"${leadMagnetUrl ? `,\n    "url": "${leadMagnetUrl}"` : ""}
  },
  "first_broadcast": {
    "subject": "Subject line for first broadcast email",
    "preview_text": "Preview text",
    "body": "Full broadcast email body (150-200 words)"
  },
  "list_name": "Name for this author's email list (e.g., ${authorName} Readers)",
  "abby_summary": "A 2-3 sentence summary from ABBY explaining what she created and why it will work for this author's specific audience"
}

The welcome_sequence must have exactly 5 emails: Day 0, Day 2, Day 4, Day 7, Day 14.
Make everything specific to this author's book and audience. Never use generic placeholder text.`;

    // Call Lovable AI gateway (uses LOVABLE_API_KEY)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", errText);
      throw new Error(`AI generation failed (${aiResponse.status})`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from the response (strip any markdown fences)
    const cleaned = rawContent
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    let parsedContent: Record<string, unknown>;
    try {
      parsedContent = JSON.parse(cleaned);
    } catch {
      // Try extracting JSON object
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsedContent = JSON.parse(match[0].replace(/,\s*([}\]])/g, "$1"));
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    // Upsert author_nodes BP-01 — book-scoped
    try {
      await upsertAuthorNode(
        supabase,
        author_id,
        "BP-01",
        "Email Marketing",
        {
          status: "content_ready",
          content_json: parsedContent,
          personalised_name: (parsedContent as any).campaign_name || "Email Marketing",
        },
        resolvedBookId,
      );
    } catch (updateErr) {
      console.error("Failed to upsert author_nodes:", updateErr);
    }

    return new Response(
      JSON.stringify({ success: true, content: parsedContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("generate-bp01 error:", errMessage);

    // Try to set node status to error
    try {
      const { author_id } = await (err as any)._req?.json?.() || {};
      // Can't easily recover author_id here, so just log
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({ success: false, error: errMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
