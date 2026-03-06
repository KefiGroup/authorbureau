import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/*
  Abby Execute — the Manus-like agent engine.

  Modes:
    1. "plan"   — decompose a product build into executable steps
    2. "step"   — execute a single step (generate content, save, configure, etc.)
    3. "status" — return current execution state for a book
    4. "update-plan" — re-evaluate and update the business plan after product completion
*/

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, bookId, productNode, businessPlan, completedProducts } = body;

    // ─── ACTION: PLAN — Decompose a product into executable steps ───
    if (action === "plan") {
      const steps = getProductSteps(productNode, businessPlan);
      return new Response(JSON.stringify({ steps }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: STEP — Execute a single step ───
    if (action === "step") {
      const { stepId, stepType, context } = body;

      if (stepType === "generate") {
        // Stream AI generation
        const systemPrompt = buildGenerationPrompt(productNode, context);
        const response = await fetch(AI_GATEWAY, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: context.userPrompt || `Generate the ${productNode} content for the book "${context.bookTitle}".` },
            ],
            stream: true,
          }),
        });

        if (!response.ok) {
          const t = await response.text();
          return new Response(JSON.stringify({ error: `AI error: ${t}` }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(response.body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      if (stepType === "save") {
        // Save generated content to generated_assets
        const { content, assetType } = context;
        const { error } = await supabase.from("generated_assets").upsert({
          book_id: bookId,
          author_id: user.id,
          asset_type: assetType || productNode,
          content,
          updated_at: new Date().toISOString(),
        }, { onConflict: "book_id,asset_type" });

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (stepType === "configure") {
        // Auto-configure product settings (pricing, metadata) with author approval
        const configPrompt = `Based on this business plan, suggest optimal settings for the "${productNode}" product:
        
Business Plan: ${JSON.stringify(businessPlan)}
Book: ${context.bookTitle}

Return a JSON object with:
- suggested_price: number
- suggested_currency: "USD"
- suggested_title: string (product title)
- suggested_description: string (1-2 sentences)
- reasoning: string (why these settings)`;

        const configResp = await fetch(AI_GATEWAY, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "You are a product pricing and configuration expert. Return valid JSON only." },
              { role: "user", content: configPrompt },
            ],
            tools: [{
              type: "function",
              function: {
                name: "configure_product",
                description: "Configure product settings",
                parameters: {
                  type: "object",
                  properties: {
                    suggested_price: { type: "number" },
                    suggested_currency: { type: "string" },
                    suggested_title: { type: "string" },
                    suggested_description: { type: "string" },
                    reasoning: { type: "string" },
                  },
                  required: ["suggested_price", "suggested_currency", "suggested_title", "suggested_description", "reasoning"],
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "configure_product" } },
          }),
        });

        const configData = await configResp.json();
        let config = {};
        try {
          const toolCall = configData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall) config = JSON.parse(toolCall.function.arguments);
        } catch { /* fallback */ }

        return new Response(JSON.stringify({ config }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (stepType === "connectors") {
        // Return recommended connectors for the product
        const connectorMap: Record<string, any[]> = {
          workbook: [
            { name: "Amazon KDP", type: "free", url: "https://kdp.amazon.com", description: "Publish workbook as paperback or ebook" },
            { name: "Gumroad", type: "free", url: "https://gumroad.com", description: "Sell digital workbook directly" },
          ],
          audiobook: [
            { name: "ACX / Audible", type: "free", url: "https://www.acx.com", description: "Distribute audiobook on Audible" },
            { name: "Findaway Voices", type: "pro", url: "https://findawayvoices.com", description: "Wide audiobook distribution" },
          ],
          course: [
            { name: "Teachable", type: "free", url: "https://teachable.com", description: "Host and sell online courses" },
            { name: "Thinkific", type: "pro", url: "https://thinkific.com", description: "Premium course platform" },
          ],
          "social-media": [
            { name: "Buffer", type: "free", url: "https://buffer.com", description: "Schedule social media posts" },
            { name: "Hootsuite", type: "pro", url: "https://hootsuite.com", description: "Enterprise social management" },
          ],
          "email-marketing": [
            { name: "Mailchimp", type: "free", url: "https://mailchimp.com", description: "Email campaigns (free tier)" },
            { name: "ConvertKit", type: "pro", url: "https://convertkit.com", description: "Creator-focused email marketing" },
          ],
          podcast: [
            { name: "Buzzsprout", type: "free", url: "https://buzzsprout.com", description: "Podcast hosting & distribution" },
            { name: "Spotify for Podcasters", type: "free", url: "https://podcasters.spotify.com", description: "Free podcast hosting" },
          ],
          coaching: [
            { name: "Calendly", type: "free", url: "https://calendly.com", description: "Booking & scheduling" },
            { name: "Zoom", type: "free", url: "https://zoom.us", description: "Video sessions" },
          ],
          speaking: [
            { name: "SpeakerHub", type: "free", url: "https://speakerhub.com", description: "Speaking profile & booking" },
          ],
          webinar: [
            { name: "Zoom Webinar", type: "pro", url: "https://zoom.us/webinar", description: "Host paid webinars" },
            { name: "Demio", type: "pro", url: "https://demio.com", description: "Automated webinar platform" },
          ],
        };

        const connectors = connectorMap[productNode] || [];
        return new Response(JSON.stringify({ connectors }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Unknown step type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: UPDATE-PLAN — Re-evaluate business plan after completion ───
    if (action === "update-plan") {
      if (!businessPlan || !completedProducts) {
        return new Response(JSON.stringify({ error: "Missing businessPlan or completedProducts" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updatePrompt = `You are Abby, an AI business strategist. An author has completed building some products from their business plan.

Current Business Plan: ${JSON.stringify(businessPlan)}
Completed Products: ${JSON.stringify(completedProducts)}

Re-evaluate the plan:
1. Mark completed products
2. Recalculate revenue projections based on what's live
3. Suggest the next priority product to build and why
4. If the author has completed a full tier, celebrate and recommend the next tier
5. Adjust any pricing recommendations based on market feedback

Return the updated plan in the same JSON structure as the original, with these additions:
- Each product should have a "status" field: "completed", "in_progress", or "pending"
- Add a "next_priority" object with: { "node": "...", "reason": "..." }
- Add a "completion_percentage" number (0-100)
- Add an "abby_insight" string with a personalized strategic observation`;

      const resp = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a business strategy advisor. Return valid JSON only matching the exact schema requested." },
            { role: "user", content: updatePrompt },
          ],
        }),
      });

      const data = await resp.json();
      let updatedPlan = businessPlan;
      try {
        const content = data.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) updatedPlan = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("Failed to parse updated plan:", e);
      }

      // Save updated plan
      await supabase.from("generated_assets").upsert({
        book_id: bookId,
        author_id: user.id,
        asset_type: "business_plan",
        content: JSON.stringify(updatedPlan),
        updated_at: new Date().toISOString(),
      }, { onConflict: "book_id,asset_type" });

      return new Response(JSON.stringify({ plan: updatedPlan }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: STATUS — Get current execution state ───
    if (action === "status") {
      const { data: plan } = await supabase
        .from("generated_assets")
        .select("content, updated_at")
        .eq("book_id", bookId)
        .eq("author_id", user.id)
        .eq("asset_type", "business_plan")
        .maybeSingle();

      const { data: assets } = await supabase
        .from("generated_assets")
        .select("asset_type, updated_at")
        .eq("book_id", bookId)
        .eq("author_id", user.id);

      return new Response(JSON.stringify({
        plan: plan ? JSON.parse(plan.content) : null,
        completedAssets: (assets || []).map(a => a.asset_type),
        lastUpdated: plan?.updated_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("abby-execute error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Step Decomposition ──────────────────────────────────
function getProductSteps(productNode: string, plan: any): any[] {
  const planProduct = findProductInPlan(productNode, plan);
  const pricing = planProduct?.pricing || "TBD";
  const title = planProduct?.title || productNode;

  return [
    {
      id: "analyze",
      label: "📖 Analyzing manuscript",
      description: "Abby is reading your book and identifying the best content for this product.",
      type: "generate",
      status: "pending",
      duration: "~30s",
    },
    {
      id: "generate",
      label: `✍️ Generating ${title}`,
      description: `Creating your ${productNode} content from your book's frameworks and key insights.`,
      type: "generate",
      status: "pending",
      duration: "~2min",
    },
    {
      id: "save",
      label: "💾 Saving to your library",
      description: "Storing the generated content in your book's product library.",
      type: "save",
      status: "pending",
      duration: "~5s",
    },
    {
      id: "configure",
      label: `⚙️ Configuring ${title}`,
      description: `Setting up pricing (${pricing}), metadata, and product settings for your approval.`,
      type: "configure",
      status: "pending",
      duration: "~10s",
    },
    {
      id: "connectors",
      label: "🔗 Preparing distribution",
      description: "Identifying the best platforms to distribute and sell this product.",
      type: "connectors",
      status: "pending",
      duration: "~5s",
    },
    {
      id: "update-plan",
      label: "📋 Updating business plan",
      description: "Marking this product complete and recalculating your revenue projections.",
      type: "update-plan",
      status: "pending",
      duration: "~10s",
    },
  ];
}

function findProductInPlan(node: string, plan: any): any {
  if (!plan?.packages) return null;
  for (const tier of ["starter", "pro", "enterprise"]) {
    const pkg = plan.packages[tier];
    if (!pkg?.products) continue;
    const match = pkg.products.find((p: any) =>
      p.node?.toLowerCase() === node.toLowerCase()
    );
    if (match) return match;
  }
  return null;
}

function buildGenerationPrompt(productNode: string, context: any): string {
  const base = `You are an expert content creator for authors. Generate professional, comprehensive content for a "${productNode}" product.

Book Title: ${context.bookTitle || "Unknown"}
Book Description: ${context.bookDescription || "No description"}
Author: ${context.authorName || "Unknown"}
${context.manuscript ? `\nManuscript Excerpt:\n${context.manuscript.substring(0, 50000)}` : ""}
${context.frameworks ? `\nKey Frameworks: ${JSON.stringify(context.frameworks)}` : ""}
${context.businessPlan ? `\nBusiness Plan Context: ${JSON.stringify(context.businessPlan)}` : ""}

Generate high-quality, actionable content that an author can review, customize, and publish.`;

  return base;
}
