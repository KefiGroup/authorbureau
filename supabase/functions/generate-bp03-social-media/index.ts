// @ts-nocheck — Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAiGateway, corsHeaders, makeServiceClient, buildAuthorContext, upsertAuthorNode, snapshotAuthorNode,
  failResponse, errorMessage,
} from "../_shared/builder-helpers.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SYSTEM_PROMPT =
  "You are ABBY, the AI business agent for Authors Bureau. You help authors turn their books into complete business empires. Always personalise to the author's specific book, audience, and niche. Never be generic. Always respond with valid JSON only — no markdown, no code fences.";

async function callAI(userPrompt: string, maxTokens: number) {
  const resp = await fetchAiGateway({
    method: "POST",
    headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-5.2",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: maxTokens,
    }),
  }, "generate-bp03-social-media");
  if (!resp.ok) {
    const txt = await resp.text();
    if (resp.status === 429) throw new Error("Rate limit exceeded — please try again in a moment");
    if (resp.status === 402) throw new Error("Payment required — AI credits exhausted");
    throw new Error(`AI gateway error [${resp.status}]: ${txt.slice(0, 200)}`);
  }
  const data = await resp.json();
  const raw = data.choices?.[0]?.message?.content || "";
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No valid JSON in AI response");
  return JSON.parse(match[0]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let priorState: Record<string, unknown> | null = null;
  let parsedAuthorId: string | null = null;
  let parsedBookId: string | null = null;
  const sb = makeServiceClient();

  try {
    const { author_id, book_id } = await req.json();
    if (!author_id) throw new Error("author_id required");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    parsedAuthorId = author_id;
    parsedBookId = book_id ?? null;

    const { data: profile } = await sb.from("author_profiles")
      .select("pen_name, genres, user_id").eq("id", author_id).single();
    if (!profile) throw new Error("Author profile not found");

    const ctxBundle = await buildAuthorContext(sb, author_id, profile.user_id ?? null, book_id ?? null, "BP-03");
    if (ctxBundle.contextBlocked) {
      return new Response(
        JSON.stringify({
          success: false,
          status: "context_blocked",
          node_id: "BP-03",
          error: "Please run the book analysis for this specific book before generating Social Media. This prevents content from leaking between your books.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const ctx = ctxBundle.ctx;
    const resolvedBookId = ctxBundle.book?.id ?? book_id ?? null;
    const bookTitle = ctxBundle.bookTitle;
    const coreThesis = ctxBundle.coreThesis;
    if (!bookTitle) throw new Error("No book found. Please add a book first.");

    priorState = await snapshotAuthorNode(sb, author_id, "BP-03", resolvedBookId);
    const hadUsableKit = (() => {
      const cj: any = priorState?.content_json;
      return !!cj && ((Array.isArray(cj.posts) && cj.posts.length > 0) ||
                      (Array.isArray(cj.outreach_kit) && cj.outreach_kit.length > 0));
    })();

    const authorName = profile.pen_name || "Author";
    const genre = (profile.genres && profile.genres[0]) || ctxBundle.book?.genre || "general";
    const audience = JSON.stringify(ctx?.target_audience_persona || {});
    const frameworks = JSON.stringify(ctx?.key_frameworks || []);

    const baseContext = `
Book: ${bookTitle}
Author: ${authorName}
Niche: ${genre}
Core thesis: ${coreThesis}
Target audience: ${audience}
Key frameworks: ${frameworks}
`.trim();

    const setProgress = async (step: number, label: string, partial: Record<string, unknown> = {}) => {
      await upsertAuthorNode(sb, author_id, "BP-03", "Social Media", {
        status: "generating",
        content_json: { ...partial, progress: { step, label, total: 3 } },
      }, resolvedBookId);
    };

    // STEP 1 — LinkedIn
    await setProgress(1, "Writing LinkedIn posts...");
    const step1 = await callAI(
      `${baseContext}

Generate exactly 5 LinkedIn posts for the book above. Each post: narrative with line breaks, insight-driven, professional thought leadership tone, 150–200 words. Each ends with a CTA pointing to the book.

Respond with JSON only:
{
  "linkedin_posts": [
    { "day": 1, "theme": "...", "caption": "...", "hashtags": ["..."], "cta": "..." }
  ]
}
The array must have exactly 5 items.`,
      6000
    );

    // STEP 2 — Instagram + Facebook (with 5-slide carousel scripts on ~30% of IG posts)
    await setProgress(2, "Writing Instagram & Facebook posts...", step1);
    const step2 = await callAI(
      `${baseContext}

Generate exactly 5 Instagram posts and 5 Facebook posts for the book above.
- Instagram: visual-first caption, hook in line 1, conversational and aspirational, 80–120 words. Add alt_text describing the suggested image (1 short sentence).
- Facebook: story-format with question at end, warm community-focused tone, 100–150 words.
Each ends with a CTA pointing to the book.

CAROUSEL RULE: Mark exactly 2 of the 5 Instagram posts (positions 2 and 4) as format="carousel" and supply carousel_slides — exactly 5 slides each in this structure: slide 1 = cover hook, slides 2-4 = three insights from the book, slide 5 = CTA. Each slide has { headline (≤8 words), body (≤25 words) }.
The other 3 Instagram posts use format="single" and omit carousel_slides.

Respond with JSON only:
{
  "instagram_posts": [{ "day": 1, "theme": "...", "format": "single", "caption": "...", "hashtags": ["..."], "alt_text": "...", "cta": "...", "carousel_slides": null }],
  "facebook_posts": [{ "day": 1, "theme": "...", "caption": "...", "hashtags": ["..."], "cta": "..." }]
}
Each array must have exactly 5 items. carousel_slides is null for single posts and a 5-item array for carousel posts.`,
      10000
    );

    // STEP 3 — Twitter/X + outreach
    await setProgress(3, "Writing Twitter/X posts and outreach templates...", { ...step1, ...step2 });
    const step3 = await callAI(
      `${baseContext}

Generate exactly 5 Twitter/X posts and 3 outreach email templates for the book above.
- Twitter/X: sharp thread opener, punchy and provocative, 40–60 words. Each ends with a CTA pointing to the book.
- Outreach templates: (1) Podcast Pitch Email (200–250 words), (2) Media/Press Pitch Email (200–250 words), (3) Book Review Request Email (100–150 words).

Respond with JSON only:
{
  "twitter_posts": [{ "day": 1, "theme": "...", "caption": "...", "hashtags": ["..."], "cta": "..." }],
  "outreach_kit": [{ "type": "Podcast Pitch Email", "subject": "...", "body": "..." }],
  "calendar_name": "Short name for this starter kit",
  "abby_summary": "2-3 sentence summary of what was created",
  "hashtag_pool": {
    "anchors": ["5 anchor hashtags locked from the book's core themes — used on every post for identity consistency. No # symbol, just the word."],
    "rotating": ["30 rotating hashtags drawn from the book's adjacent topics, audience interests, and niche communities. No # symbol."]
  }
}
The twitter_posts array must have exactly 5 items. The outreach_kit array must have exactly 3 items. anchors must have exactly 5 items. rotating must have exactly 30 items.`,
      6000
    );

    const merged = { ...step1, ...step2, ...step3 } as Record<string, any>;
    const linkedin = merged.linkedin_posts || [];
    const instagram = merged.instagram_posts || [];
    const facebook = merged.facebook_posts || [];
    const twitter = merged.twitter_posts || [];

    // Hashtag pool: 5 anchor (locked) + 30 rotating. Each post gets anchors + 5 rotating tags
    // selected by index so the same post slot always shows the same rotation (deterministic).
    const rawPool = merged.hashtag_pool || {};
    const anchorTags: string[] = (Array.isArray(rawPool.anchors) ? rawPool.anchors : [])
      .map((t: any) => String(t).replace(/^#/, "").trim()).filter(Boolean).slice(0, 5);
    const rotatingPool: string[] = (Array.isArray(rawPool.rotating) ? rawPool.rotating : [])
      .map((t: any) => String(t).replace(/^#/, "").trim()).filter(Boolean).slice(0, 30);
    const pickRotating = (seed: number): string[] => {
      if (rotatingPool.length === 0) return [];
      const out: string[] = [];
      for (let k = 0; k < 5; k++) out.push(rotatingPool[(seed * 5 + k) % rotatingPool.length]);
      return out;
    };
    const applyPool = (existing: string[], seed: number): string[] => {
      const merged = new Set<string>([...anchorTags, ...pickRotating(seed)]);
      // Keep up to 3 of the AI-generated platform-specific tags as flavour
      (existing || []).slice(0, 3).forEach((t) => merged.add(String(t).replace(/^#/, "").trim()));
      return Array.from(merged).filter(Boolean);
    };

    const days = Math.max(linkedin.length, instagram.length, facebook.length, twitter.length);
    const posts = [];
    for (let i = 0; i < days; i++) {
      const li = linkedin[i] || {};
      const ig = instagram[i] || {};
      const fb = facebook[i] || {};
      const tw = twitter[i] || {};
      const igCarousel = Array.isArray(ig.carousel_slides) && ig.carousel_slides.length === 5;
      posts.push({
        day: i + 1,
        theme: li.theme || ig.theme || fb.theme || tw.theme || "",
        post_type: "Insight",
        cta_type: "insight",
        linkedin: { caption: li.caption || "", hashtags: applyPool(li.hashtags || [], i * 4 + 0) },
        instagram: {
          caption: ig.caption || "",
          hashtags: applyPool(ig.hashtags || [], i * 4 + 1),
          alt_text: ig.alt_text || "",
          format: igCarousel ? "carousel" : "single",
          carousel_slides: igCarousel ? ig.carousel_slides : null,
        },
        facebook: { caption: fb.caption || "", hashtags: applyPool(fb.hashtags || [], i * 4 + 2) },
        twitter: { caption: tw.caption || "", hashtags: applyPool(tw.hashtags || [], i * 4 + 3) },
      });
    }

    const finalContent = {
      calendar_name: merged.calendar_name || "Social Media Starter Kit",
      hashtag_pool: { anchors: anchorTags, rotating: rotatingPool },
      posts,
      outreach_kit: merged.outreach_kit || [],
      abby_summary: merged.abby_summary || `Your copy-paste social kit for '${bookTitle}' is ready — 20 posts across 4 platforms (with Instagram carousels) plus 3 outreach templates.`,
    };

    await upsertAuthorNode(sb, author_id, "BP-03", "Social Media", {
      status: "content_ready",
      content_json: finalContent,
      personalised_name: finalContent.calendar_name,
    }, resolvedBookId);

    return new Response(JSON.stringify({ success: true, content: finalContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-bp03-social-media error:", errorMessage(err));
    // Restore prior state if we had a usable kit
    try {
      const cj: any = priorState?.content_json;
      const hadUsableKit = !!cj && ((Array.isArray(cj.posts) && cj.posts.length > 0) ||
                                    (Array.isArray(cj.outreach_kit) && cj.outreach_kit.length > 0));
      if (priorState && parsedAuthorId && hadUsableKit && priorState.status && priorState.status !== "generating") {
        const restored = { ...priorState };
        delete (restored.content_json as any)?.progress;
        await upsertAuthorNode(sb, parsedAuthorId, "BP-03", "Social Media", restored, parsedBookId);
      }
    } catch (e) {
      console.error("[BP-03] restore failed:", errorMessage(e));
    }
    return failResponse(errorMessage(err));
  }
});
