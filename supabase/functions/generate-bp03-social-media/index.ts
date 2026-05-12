// @ts-nocheck — Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAiGateway, corsHeaders, makeServiceClient, buildAuthorContext, upsertAuthorNode, snapshotAuthorNode,
  failResponse, errorMessage,
} from "../_shared/builder-helpers.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SYSTEM_PROMPT =
  "You are ABBY, the AI business agent for Authors Bureau. You help authors turn their books into complete business empires. Always personalise to the author's specific book, audience, and niche. Never be generic. Always respond with valid JSON only — no markdown, no code fences.";

// 6 post archetypes (BP-03 v2), 5 posts each => 30 posts.
// Author/thought-leader voice. These exact values are also stored in
// social_posts.archetype (CHECK constraint), so changing them requires a
// matching DB migration.
const ARCHETYPES = [
  "Quote",
  "Lesson",
  "Question",
  "Story",
  "Framework",
  "Proof",
] as const;

// Build a 30-slot archetype map: 5 of each archetype, interleaved so the feed
// doesn't look like a block of one type. Day index is 1-based.
function archetypeForDay(day: number): string {
  return ARCHETYPES[(day - 1) % ARCHETYPES.length];
}

// Decide which Instagram days are carousel posts. Spec: ~30% of 20 = 6 carousels.
// Spread evenly across the 20-day calendar.
const CAROUSEL_IG_DAYS = new Set([3, 6, 9, 12, 15, 18]);

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

// Build the archetype manifest the AI will see — 20 entries, each with day + post_type.
function archetypeManifest(): string {
  return Array.from({ length: 20 }, (_, i) => {
    const day = i + 1;
    return `Day ${day} = ${archetypeForDay(day)}`;
  }).join("\n");
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

POST ARCHETYPE MAP (20 days, 6 archetypes interleaved across the run):
${archetypeManifest()}

Each post MUST honour its assigned archetype (one short word):
- Quote: a single sharp pull-quote drawn from the book.
- Lesson: a teach-this-back insight from the book; one clear takeaway.
- Question: open with a provocative question; invite a reply in the comments.
- Story: a short narrative beat (your story, a client story, a scene from the book).
- Framework: name and walk through one of the book's frameworks/models in 3-4 lines.
- Proof: a result, case study, testimonial, or research-backed proof point.
`.trim();

    const setProgress = async (step: number, label: string, partial: Record<string, unknown> = {}) => {
      await upsertAuthorNode(sb, author_id, "BP-03", "Social Media", {
        status: "generating",
        content_json: { ...partial, progress: { step, label, total: 3 } },
      }, resolvedBookId);
    };

    // STEP 1 — LinkedIn (20)
    await setProgress(1, "Writing 20 LinkedIn posts...");
    const step1 = await callAI(
      `${baseContext}

Generate exactly 20 LinkedIn posts (Day 1..Day 20), one per day, each matching the archetype mapped to that day above.
Voice: professional thought leadership. Long-form narrative with line breaks, insight-driven, 150–200 words. Each post ends with a CTA pointing to the book.

Respond with JSON only:
{
  "linkedin_posts": [
    { "day": 1, "post_type": "Quote", "theme": "...", "caption": "...", "hashtags": ["..."], "cta": "..." }
  ]
}
The array MUST have exactly 20 items in day order. post_type MUST match the archetype map.`,
      12000,
    );

    // STEP 2 — Instagram (20, with 6 carousels) + Facebook (20)
    await setProgress(2, "Writing 20 Instagram + 20 Facebook posts...", step1);
    const carouselDaysList = Array.from(CAROUSEL_IG_DAYS).sort((a, b) => a - b).join(", ");
    const step2 = await callAI(
      `${baseContext}

Generate exactly 20 Instagram posts AND 20 Facebook posts (Day 1..Day 20), one per day, each matching the archetype mapped to that day above.

INSTAGRAM voice: visual-first caption, hook in line 1, conversational and aspirational, 80–120 words. Each post ends with a CTA pointing to the book. Add alt_text describing the suggested image (1 short sentence).

CAROUSEL RULE: These exact days MUST be format="carousel" with 5 slides each: ${carouselDaysList}.
All other Instagram days MUST be format="single" with carousel_slides: null.
Carousel slides structure: slide 1 = cover hook, slides 2-4 = three insights from the book, slide 5 = CTA. Each slide = { headline (≤8 words), body (≤25 words) }.

FACEBOOK voice: warm story-format, community-focused, 100–150 words, ends with a question and a CTA pointing to the book.

Respond with JSON only:
{
  "instagram_posts": [
    { "day": 1, "post_type": "Quote", "theme": "...", "format": "single", "caption": "...", "hashtags": ["..."], "alt_text": "...", "cta": "...", "carousel_slides": null }
  ],
  "facebook_posts": [
    { "day": 1, "post_type": "Quote", "theme": "...", "caption": "...", "hashtags": ["..."], "cta": "..." }
  ]
}
Each array MUST have exactly 20 items in day order. post_type MUST match the archetype map.`,
      20000,
    );

    // STEP 3 — Twitter/X (20) + outreach
    await setProgress(3, "Writing 20 X posts and outreach templates...", { ...step1, ...step2 });
    const step3 = await callAI(
      `${baseContext}

Generate exactly 20 Twitter/X posts (Day 1..Day 20) AND 3 outreach email templates.

TWITTER/X voice: sharp thread opener, punchy and provocative, 40–60 words, ends with a CTA pointing to the book. Each must match its archetype.

Outreach templates:
(1) Podcast Pitch Email (200–250 words)
(2) Media/Press Pitch Email (200–250 words)
(3) Book Review Request Email (100–150 words)

Respond with JSON only:
{
  "twitter_posts": [
    { "day": 1, "post_type": "Quote", "theme": "...", "caption": "...", "hashtags": ["..."], "cta": "..." }
  ],
  "outreach_kit": [
    { "type": "Podcast Pitch Email", "subject": "...", "body": "..." }
  ],
  "calendar_name": "Short name for this 20-post kit",
  "abby_summary": "2-3 sentence summary of what was created",
  "hashtag_pool": {
    "anchors": ["5 anchor hashtags locked from the book's core themes — used on every post for identity consistency. No # symbol."],
    "rotating": ["20 rotating hashtags drawn from the book's adjacent topics, audience interests, and niche communities. No # symbol."]
  }
}
twitter_posts MUST have exactly 20 items in day order. outreach_kit MUST have exactly 3. anchors MUST have 5. rotating MUST have 20.`,
      12000,
    );

    const merged = { ...step1, ...step2, ...step3 } as Record<string, any>;
    const linkedin = merged.linkedin_posts || [];
    const instagram = merged.instagram_posts || [];
    const facebook = merged.facebook_posts || [];
    const twitter = merged.twitter_posts || [];

    // Hashtag pool
    const rawPool = merged.hashtag_pool || {};
    const anchorTags: string[] = (Array.isArray(rawPool.anchors) ? rawPool.anchors : [])
      .map((t: any) => String(t).replace(/^#/, "").trim()).filter(Boolean).slice(0, 5);
    const rotatingPool: string[] = (Array.isArray(rawPool.rotating) ? rawPool.rotating : [])
      .map((t: any) => String(t).replace(/^#/, "").trim()).filter(Boolean).slice(0, 20);
    const pickRotating = (seed: number): string[] => {
      if (rotatingPool.length === 0) return [];
      const out: string[] = [];
      for (let k = 0; k < 5; k++) out.push(rotatingPool[(seed * 5 + k) % rotatingPool.length]);
      return out;
    };
    const applyPool = (existing: string[], seed: number): string[] => {
      const merged = new Set<string>([...anchorTags, ...pickRotating(seed)]);
      (existing || []).slice(0, 3).forEach((t) => merged.add(String(t).replace(/^#/, "").trim()));
      return Array.from(merged).filter(Boolean);
    };

    // Always emit exactly 20 days
    const days = 20;
    const posts = [];
    for (let i = 0; i < days; i++) {
      const day = i + 1;
      const archetype = archetypeForDay(day);
      const li = linkedin[i] || {};
      const ig = instagram[i] || {};
      const fb = facebook[i] || {};
      const tw = twitter[i] || {};

      // Force-correct format flag for IG: if AI didn't comply, snap to spec.
      const shouldBeCarousel = CAROUSEL_IG_DAYS.has(day);
      const aiSaysCarousel = (ig.format === "carousel") && Array.isArray(ig.carousel_slides) && ig.carousel_slides.length === 5;
      const igFormat = shouldBeCarousel && aiSaysCarousel ? "carousel" : "single";
      const igSlides = shouldBeCarousel && aiSaysCarousel ? ig.carousel_slides : null;

      posts.push({
        day,
        theme: li.theme || ig.theme || fb.theme || tw.theme || "",
        post_type: archetype, // canonical archetype label
        cta_type: archetype === "Question" ? "question" : archetype === "Quote" ? "quote" : "insight",
        linkedin: { caption: li.caption || "", hashtags: applyPool(li.hashtags || [], i * 4 + 0) },
        instagram: {
          caption: ig.caption || "",
          hashtags: applyPool(ig.hashtags || [], i * 4 + 1),
          alt_text: ig.alt_text || "",
          format: igFormat,
          carousel_slides: igSlides,
        },
        facebook: { caption: fb.caption || "", hashtags: applyPool(fb.hashtags || [], i * 4 + 2) },
        twitter: { caption: tw.caption || "", hashtags: applyPool(tw.hashtags || [], i * 4 + 3) },
      });
    }

    const carouselCount = posts.filter((p) => p.instagram.format === "carousel").length;

    const finalContent = {
      calendar_name: merged.calendar_name || "30-Day Social Media Kit",
      hashtag_pool: { anchors: anchorTags, rotating: rotatingPool },
      posts,
      outreach_kit: merged.outreach_kit || [],
      abby_summary: merged.abby_summary
        || `Your 30-day copy-paste social kit for '${bookTitle}' is ready — 30 posts × 4 platforms (with ${carouselCount} Instagram carousels) plus 3 outreach templates.`,
      stats: {
        post_count: posts.length,
        platforms: 4,
        carousel_count: carouselCount,
        archetype_count: ARCHETYPES.length,
      },
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
