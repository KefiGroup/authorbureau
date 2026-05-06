import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchAiGateway } from "../_shared/builder-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getAuthorContext(supabase: any, userId: string) {
  const [
    profileRes, booksRes, coursesRes, homeStudyRes,
    audiobooksRes, podcastsRes, coachingRes,
    subscriberCountRes, emailFlowsRes, assetsRes,
  ] = await Promise.all([
    supabase.from("author_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("books").select("*").eq("author_id", userId),
    supabase.from("courses").select("*").eq("author_id", userId),
    supabase.from("home_study_courses").select("*").eq("author_id", userId),
    supabase.from("audiobooks").select("*").eq("author_id", userId),
    supabase.from("podcasts").select("*").eq("author_id", userId),
    supabase.from("coaching_packages").select("*").eq("author_id", userId),
    supabase.from("author_subscribers").select("id", { count: "exact", head: true }).eq("author_id", userId).eq("status", "active"),
    supabase.from("email_flows").select("*").eq("author_id", userId),
    supabase.from("generated_assets").select("asset_type, book_id, created_at").eq("author_id", userId),
  ]);

  const profile = profileRes.data || null;

  return {
    author_profile: profile,
    website: {
      subdomain: profile?.author_slug || null,
      custom_domain: profile?.website_url || null,
    },
    books: booksRes.data || [],
    products: {
      online_courses: coursesRes.data || [],
      home_study_courses: homeStudyRes.data || [],
      audiobooks: audiobooksRes.data || [],
      podcasts: podcastsRes.data || [],
    },
    services: {
      coaching: coachingRes.data || [],
    },
    audience: {
      subscriber_count: subscriberCountRes.count || 0,
      email_flows: emailFlowsRes.data || [],
    },
    progress_log: (assetsRes.data || []).map((a: any) => ({
      asset_type: a.asset_type,
      book_id: a.book_id,
      created_at: a.created_at,
    })),
  };
}

async function runPhase1(authorContext: any, apiKey: string) {
  const systemPrompt = `You are ABBY, a world-class web designer and strategist for the Authors Bureau platform. Your job is to analyze an author's context and determine which website pages they need.

RULES:
- Homepage, About Page, and Book(s) Page are ALWAYS recommended and enabled if the author has at least one book.
- Product Sales Pages are recommended and enabled if the author has completed products (courses, home study courses, audiobooks with status 'published' or 'draft').
- Coaching / Services Page is recommended if the author has coaching packages.
- Events Page is recommended if the author has speaking topics or is marked as a speaker.
- Blog / Content Hub is always optional, never auto-enabled.
- Generate a compelling hero_headline from the author's tagline or bio. Keep it under 12 words. Make it powerful and action-oriented.
- Generate nav_links based on enabled pages.

Return ONLY a valid JSON object matching this schema exactly:
{
  "pages": [
    { "id": "homepage", "name": "Homepage", "recommended": true, "enabled": true, "reason": "..." },
    { "id": "about", "name": "About Page", "recommended": true, "enabled": true, "reason": "..." },
    { "id": "books", "name": "My Book(s) Page", "recommended": true, "enabled": true, "reason": "..." },
    { "id": "products", "name": "Product Sales Pages", "recommended": false, "enabled": false, "reason": "..." },
    { "id": "coaching", "name": "Coaching / Services Page", "recommended": false, "enabled": false, "reason": "..." },
    { "id": "events", "name": "Events Page", "recommended": false, "enabled": false, "reason": "..." },
    { "id": "blog", "name": "Blog / Content Hub", "recommended": false, "enabled": false, "reason": "..." }
  ],
  "preview_data": {
    "hero_headline": "...",
    "hero_subheadline": "...",
    "cta_text": "...",
    "nav_links": ["Home", "About", ...]
  }
}`;

  const userPrompt = `Here is the author's complete context. Analyze it and generate the website blueprint:\n\n${JSON.stringify(authorContext, null, 2)}`;

  const resp = await fetchAiGateway({
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  }, "abby-website-builder");

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("AI Phase 1 error:", resp.status, errText);
    throw new Error(`AI error: ${resp.status}`);
  }

  const data = await resp.json();
  let content = data.choices?.[0]?.message?.content || "";
  
  // Clean markdown fences
  content = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  
  return JSON.parse(content);
}

async function runPhase2(authorContext: any, enabledPages: string[], apiKey: string) {
  const systemPrompt = `You are ABBY, generating a complete manus_spec.json file for Manus AI to build a professional author website.

CRITICAL RULES:
- Generate REAL content from the author_context. Never use placeholders like "[Author Name]".
- For each enabled page, generate complete content sections with all text, headings, CTAs, and component specifications.
- Structure the output as a valid manus_spec.json that Manus AI can directly use.
- Include SEO metadata for each page.
- Use the author's actual data: real name, real bio, real book titles, real descriptions.
- For product pages, include real pricing and descriptions.
- Design should be modern, professional, conversion-optimized.

Return ONLY a valid JSON object with this structure:
{
  "project_name": "Author Website - [Real Author Name]",
  "subdomain": "[author_context.website.subdomain or null]",
  "custom_domain": "[author_context.website.custom_domain or null]",
  "design_system": {
    "primary_color": "#...",
    "secondary_color": "#...",
    "font_heading": "...",
    "font_body": "...",
    "style": "modern, clean, professional"
  },
  "pages": {
    "homepage": { ... },
    "about": { ... },
    ...
  },
  "global_components": {
    "header": { "logo_text": "...", "nav_links": [...] },
    "footer": { ... },
    "email_capture": { ... }
  },
  "seo": {
    "site_title": "...",
    "site_description": "...",
    "og_image": "..."
  }
}

IMPORTANT: The "subdomain" and "custom_domain" fields MUST be pulled directly from the author_context.website object. Use the exact values provided — do not generate or guess them.

For each page, include:
- "title": page title
- "meta_description": SEO description
- "sections": array of content sections, each with "type", "heading", "content", "cta" etc.

Generate COMPLETE, REAL content for every section. This must be production-ready.`;

  const userPrompt = `Generate a complete manus_spec.json for the following author. Only include pages that are enabled.

Enabled pages: ${JSON.stringify(enabledPages)}

Author context:
${JSON.stringify(authorContext, null, 2)}`;

  const resp = await fetchAiGateway({
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
    }),
  }, "abby-website-builder");

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("AI Phase 2 error:", resp.status, errText);
    if (resp.status === 429) {
      throw new Error("RATE_LIMITED");
    }
    if (resp.status === 402) {
      throw new Error("PAYMENT_REQUIRED");
    }
    throw new Error(`AI error: ${resp.status}`);
  }

  const data = await resp.json();
  let content = data.choices?.[0]?.message?.content || "";
  content = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  
  return JSON.parse(content);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body = await req.json();
    const phase = body.phase || "1";

    // Fetch author context
    const authorContext = await getAuthorContext(supabase, user.id);

    if (phase === "1") {
      // Phase 1: Auto-analyze and generate UI state
      const blueprint = await runPhase1(authorContext, LOVABLE_API_KEY);
      return new Response(JSON.stringify(blueprint), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (phase === "2") {
      // Phase 2: Generate full manus_spec.json
      const enabledPages = body.enabledPages || [];
      const manusSpec = await runPhase2(authorContext, enabledPages, LOVABLE_API_KEY);
      return new Response(JSON.stringify(manusSpec, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: "Invalid phase" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("abby-website-builder error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    
    if (message === "RATE_LIMITED") {
      return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (message === "PAYMENT_REQUIRED") {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
