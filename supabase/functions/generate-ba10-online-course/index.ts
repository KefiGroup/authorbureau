/**
 * generate-ba10-online-course
 * ---------------------------
 * Sprint 40 (stabilization): generates a complete online course personalised
 * to the author's book and POPULATES the relational tables that the LMS reads:
 *   - courses                (1 row)
 *   - course_modules         (exactly 6 rows)
 *   - course_lessons         (exactly 3 rows per module, with `outline`)
 *
 * Pedagogical framework (Bloom's Taxonomy + Kolb's cycle) is preserved.
 * Mirrors a snapshot to author_nodes.content_json for the builder UI.
 *
 * Body: { author_id: string }
 *
 * Failure mode: returns HTTP 200 with { success: false, error } so the
 * frontend can render a real, actionable error.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchAiGateway, corsHeaders, upsertAuthorNode } from "../_shared/builder-helpers.ts";
import { getCanonicalNodeLabel } from "../_shared/canonical-node-labels.ts";

const NODE_ID = "BA-10";
const NODE_NAME = getCanonicalNodeLabel(NODE_ID);

const AI_TIMEOUT_MS = 55_000;

function compactJson(value: unknown, fallback: string, maxLength = 800) {
  try {
    const serialized = JSON.stringify(value ?? fallback);
    return serialized.length > maxLength
      ? `${serialized.slice(0, maxLength)}…`
      : serialized;
  } catch {
    return fallback;
  }
}

function parseAiJson(raw: string) {
  if (!raw) throw new Error("Empty AI response");
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // fall through
  }

  // Extract first {...} block
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in AI response");
  cleaned = match[0];

  try {
    return JSON.parse(cleaned);
  } catch {
    // One repair pass: balance braces/brackets, strip trailing commas, control chars
    let repaired = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, " ");
    let braces = 0, brackets = 0;
    for (const ch of repaired) {
      if (ch === "{") braces++;
      else if (ch === "}") braces--;
      else if (ch === "[") brackets++;
      else if (ch === "]") brackets--;
    }
    while (brackets-- > 0) repaired += "]";
    while (braces-- > 0) repaired += "}";
    return JSON.parse(repaired);
  }
}

function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try { return JSON.stringify(err); } catch { return String(err); }
}

function failResponse(error: string, diagnostics?: unknown) {
  console.error("generate-ba10-online-course failure:", error, diagnostics ?? "");
  return new Response(
    JSON.stringify({ success: false, error, diagnostics }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// upsertAuthorNode is imported from ../_shared/builder-helpers.ts (Sprint 51).
// Signature: (supabase, authorId, nodeId, nodeName, payload, bookId?) — guard rail
// in the shared helper forces nodeName to canonical via getCanonicalNodeLabel.

async function resolveAuthorBook(
  supabase: ReturnType<typeof createClient>,
  authorId: string,
  cloudUserId: string | null,
  bookId?: string | null,
) {
  let userEmail: string | null = null;
  if (cloudUserId) {
    const { data: userResult } = await supabase.auth.admin.getUserById(cloudUserId);
    userEmail = userResult.user?.email ?? null;
  }

  const candidateAuthorIds = Array.from(new Set([authorId, cloudUserId].filter(Boolean) as string[]));

  // Honour an explicit bookId if it actually belongs to this author.
  if (bookId) {
    const { data: byId } = await supabase
      .from("books")
      .select("id, title, cover_image_url, description, genre, owner_email, author_id")
      .eq("id", bookId)
      .maybeSingle();
    if (byId) {
      const ownsByAuthorId = byId.author_id && candidateAuthorIds.includes(byId.author_id);
      const ownsByEmail = userEmail && byId.owner_email === userEmail;
      if (ownsByAuthorId || ownsByEmail) return byId;
    }
  }

  const bookQuery = supabase
    .from("books")
    .select("id, title, cover_image_url, description, genre, owner_email, author_id")
    .order("created_at", { ascending: false })
    .limit(1);

  const orParts: string[] = [];
  if (candidateAuthorIds.length) orParts.push(`author_id.in.(${candidateAuthorIds.join(",")})`);
  if (userEmail) orParts.push(`owner_email.eq.${userEmail}`);

  const { data: books, error } = orParts.length
    ? await bookQuery.or(orParts.join(","))
    : await bookQuery;

  if (error) throw error;
  return books?.[0] ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let authorIdForRestore: string | null = null;
  let priorNodeState: Record<string, unknown> | null = null;
  let bookIdForRestore: string | null = null;

  try {
    const { author_id, book_id } = await req.json();
    if (!author_id) return failResponse("author_id is required");
    authorIdForRestore = author_id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: author } = await supabase
      .from("author_profiles")
      .select("pen_name, genres, user_id")
      .eq("id", author_id)
      .single();
    if (!author) return failResponse("Author profile not found");

    const courseOwnerId = author.user_id?.trim();
    if (!courseOwnerId) {
      return failResponse("Author account mapping is missing. Please contact support.");
    }

    // Preflight: verify the auth user actually exists BEFORE wasting AI tokens.
    // This prevents the long FK-violation crash on courses.author_id.
    try {
      const { data: authCheck, error: authCheckErr } = await supabase.auth.admin.getUserById(courseOwnerId);
      if (authCheckErr || !authCheck?.user?.id) {
        return failResponse(
          "Your author account needs to be re-linked before Abby can save this course. Please contact support.",
          { code: "AUTH_USER_MISSING", author_profile_id: author_id, stale_user_id: courseOwnerId },
        );
      }
    } catch (preflightErr) {
      return failResponse(
        "Your author account needs to be re-linked before Abby can save this course. Please contact support.",
        { code: "AUTH_USER_LOOKUP_FAILED", error: errorMessage(preflightErr) },
      );
    }

    bookIdForRestore = book_id ?? null;
    let snapQ = supabase
      .from("author_nodes")
      .select("status, content_json, personalised_name, price_usd, currency, delivery_type, current_step")
      .eq("author_id", author_id)
      .eq("node_id", "BA-10");
    snapQ = book_id ? snapQ.eq("book_id", book_id) : snapQ.is("book_id", null);
    const { data: existingNodeSnapshot } = await snapQ.maybeSingle();
    priorNodeState = (existingNodeSnapshot as Record<string, unknown>) ?? null;

    // Resolve the SELECTED book first (honours book_id), then fetch context matching that book.
    const book = await resolveAuthorBook(supabase, author_id, courseOwnerId, book_id);

    let ctx: Record<string, any> | null = null;
    if (book?.title) {
      const { data: matchedCtx } = await supabase
        .from("author_context")
        .select("*")
        .eq("author_id", author_id)
        .eq("book_title", book.title)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      ctx = matchedCtx ?? null;
    }
    // BOOK-STRICT: do NOT fall back to "latest context for this author" — that
    // was the bug that wrote Be SUCKcessful content into Invest's BA-10.
    if (!ctx) {
      return failResponse(
        "Please run the book analysis (BP-00) for this specific book before generating the Online Course. This prevents content from leaking between your books.",
      );
    }

    const resolvedBookTitle = book?.title?.trim() || ctx?.book_title?.trim() || "";
    if (!resolvedBookTitle) return failResponse("No book found. Please add a book first.");
    const coreThesis = book?.description?.trim() || ctx?.core_thesis?.trim() || "";
    const targetAudience = compactJson(ctx?.target_audience_persona, "{}", 600);
    const keyFrameworks = compactJson(ctx?.key_frameworks, "[]", 700);
    const uniqueInsights = compactJson(ctx?.unique_insights, "[]", 700);
    const genre = ctx?.genre || book?.genre || author.genres?.[0] || "General";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return failResponse("AI service not configured");

    // ============ AI call (timeout-guarded, JSON-mode) ============
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let aiRes: Response;
    try {
      aiRes = await fetchAiGateway({
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          temperature: 0.25,
          response_format: { type: "json_object" },
          max_completion_tokens: 6000,
          messages: [
            {
              role: "system",
              content:
                "You are ABBY, the AI business agent for Authors Bureau. You design online courses using Bloom's Taxonomy (Remember → Understand → Apply → Analyze → Evaluate → Create) and Kolb's Experiential Learning Cycle (Concrete Experience → Reflective Observation → Abstract Conceptualisation → Active Experimentation). Modules MUST progress from lower-order to higher-order thinking. Each module specifies its primary Bloom's level and Kolb's stage with measurable, Bloom-aligned learning objectives. Respond with ONLY valid JSON. Every lesson MUST include a 1-sentence `outline`.",
            },
            {
              role: "user",
              content: `Create a complete online course for ${author.pen_name}'s book '${resolvedBookTitle}'.

Book context:
- Author: ${author.pen_name}
- Title: ${resolvedBookTitle}
- Subtitle: ${ctx?.book_subtitle || "N/A"}
- Core thesis: ${coreThesis || "Use the description and context to infer the main promise."}
- Target audience: ${targetAudience}
- Key frameworks: ${keyFrameworks}
- Unique insights: ${uniqueInsights}
- Genre: ${genre}

Return JSON exactly in this shape (concise — keep prose short to fit token budget):
{
  "course_title": "string (compelling, NOT just the book title)",
  "course_subtitle": "string (one-line promise)",
  "tagline": "string (memorable hook)",
  "duration": "string e.g. '6 weeks · 6 modules'",
  "difficulty_level": "Beginner|Intermediate|Advanced",
  "transformation_promise": "string",
  "who_its_for": "string (specific persona)",
  "what_youll_get": ["4 short bullets"],
  "suggested_price_usd": 197,
  "pricing_rationale": "1 sentence",
  "course_description_long": "2 short paragraphs",
  "pedagogical_approach": "1 sentence summarising how Bloom's + Kolb's structure this course",
  "modules": [
    {
      "number": 1,
      "title": "string",
      "description": "1-2 sentences",
      "blooms_level": "Remember|Understand|Apply|Analyze|Evaluate|Create",
      "kolbs_stage": "Concrete Experience|Reflective Observation|Abstract Conceptualisation|Active Experimentation",
      "learning_objectives": ["By the end, students will <Bloom-aligned verb> ...", "..."],
      "outcome": "1 sentence",
      "lessons": [
        { "number": 1, "title": "string", "type": "video|reading|exercise|quiz", "duration_minutes": 12, "outline": "1 sentence" }
      ]
    }
  ],
  "sales_copy": {
    "headline": "string", "subheadline": "string",
    "problem": "1-2 sentences", "solution": "1-2 sentences",
    "outcomes": ["string","string","string"],
    "cta": "string"
  },
  "slides": [
    { "title": "string (course title)", "body": "transformation promise", "notes": "speaker notes", "layout_hint": "hero" },
    { "title": "Who this is for", "body": "string", "notes": "string", "layout_hint": "split" },
    { "title": "What you will learn", "body": "string", "notes": "string", "layout_hint": "bullets" },
    { "title": "The pedagogical approach", "body": "Bloom + Kolb summary", "notes": "string", "layout_hint": "bullets" },
    { "title": "Module 1", "body": "string", "notes": "string", "layout_hint": "split" },
    { "title": "Module 2", "body": "string", "notes": "string", "layout_hint": "split" },
    { "title": "Module 3", "body": "string", "notes": "string", "layout_hint": "split" },
    { "title": "Module 4", "body": "string", "notes": "string", "layout_hint": "split" },
    { "title": "Module 5", "body": "string", "notes": "string", "layout_hint": "split" },
    { "title": "Module 6", "body": "string", "notes": "string", "layout_hint": "split" },
    { "title": "Outcome", "body": "what students will be able to do", "notes": "string", "layout_hint": "stat" },
    { "title": "Enrol now", "body": "call to action", "notes": "string", "layout_hint": "divider" }
  ],
  "abby_summary": "1-2 sentences summarising what was built and the pedagogical approach"
}

Strict rules:
- EXACTLY 6 modules
- EXACTLY 3 lessons per module
- Bloom progression: M1 Remember, M2 Understand, M3 Apply, M4 Analyze, M5 Evaluate, M6 Create
- Each module has 2 measurable Bloom-aligned learning_objectives
- Every lesson has an outline
- Specific to '${resolvedBookTitle}' — no generic placeholders
- Keep all prose short to stay within token limit`,
            },
          ],
        }),
      }, "generate-ba10-online-course");
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      const msg = (fetchErr as Error)?.name === "AbortError"
        ? "ABBY took too long to respond. Please click Try Again."
        : `AI gateway request failed: ${errorMessage(fetchErr)}`;
      return failResponse(msg);
    }
    clearTimeout(timeoutId);

    if (!aiRes.ok) {
      const details = await aiRes.text();
      if (aiRes.status === 429) return failResponse("ABBY is rate-limited right now. Please wait a few seconds and try again.", details.slice(0, 300));
      if (aiRes.status === 402) return failResponse("ABBY's AI credits need topping up. Please add credits in Settings → Workspace → Usage.", details.slice(0, 300));
      return failResponse(`AI gateway error (${aiRes.status}). Please try again.`, details.slice(0, 300));
    }

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content || "";
    let content: any;
    try {
      content = parseAiJson(raw);
    } catch (parseErr) {
      return failResponse(
        "ABBY returned malformed content. Please click Try Again.",
        { parseErr: errorMessage(parseErr), preview: raw.slice(0, 400) },
      );
    }

    // Validate required top-level fields
    const required = ["course_title", "modules", "suggested_price_usd"];
    const missing = required.filter((k) => content[k] === undefined || content[k] === null);
    if (missing.length || !Array.isArray(content.modules) || content.modules.length === 0) {
      return failResponse(
        "ABBY's response was incomplete. Please click Try Again.",
        { missing, hasModules: Array.isArray(content.modules), moduleCount: content.modules?.length },
      );
    }

    // ============ Populate relational tables ============
    const coursePayload: Record<string, unknown> = {
      author_id: courseOwnerId,
      book_id: book?.id ?? null,
      title: content.course_title,
      subtitle: content.course_subtitle ?? null,
      tagline: content.tagline ?? null,
      description: content.course_description_long ?? null,
      target_student: content.who_its_for ?? null,
      transformation_promises: content.what_youll_get ?? [],
      cover_image_url: book?.cover_image_url ?? null,
      price: content.suggested_price_usd ?? 197,
      currency: "usd",
      status: "draft",
      course_format: "self_paced",
    };

    const { data: existingCourse } = await supabase
      .from("courses")
      .select("id")
      .eq("author_id", courseOwnerId)
      .eq("book_id", book?.id ?? null)
      .maybeSingle();

    let courseId: string;
    if (existingCourse?.id) {
      courseId = existingCourse.id;
      const { error: updateCourseError } = await supabase.from("courses").update(coursePayload).eq("id", courseId);
      if (updateCourseError) throw updateCourseError;

      const { data: existingModules } = await supabase
        .from("course_modules")
        .select("id")
        .eq("course_id", courseId);

      const moduleIds = (existingModules ?? []).map((m) => m.id);
      if (moduleIds.length > 0) {
        await supabase.from("course_lessons").delete().in("module_id", moduleIds);
      }
      await supabase.from("course_modules").delete().eq("course_id", courseId);
    } else {
      const { data: newCourse, error: courseErr } = await supabase
        .from("courses")
        .insert(coursePayload)
        .select("id")
        .single();
      if (courseErr) throw courseErr;
      courseId = newCourse.id;
    }

    const modules: Array<Record<string, unknown>> = Array.isArray(content.modules) ? content.modules : [];
    for (let mi = 0; mi < modules.length; mi++) {
      const m = modules[mi] as Record<string, unknown>;
      const { data: newModule, error: modErr } = await supabase
        .from("course_modules")
        .insert({
          course_id: courseId,
          module_number: (m as { number?: number }).number ?? mi + 1,
          title: (m as { title?: string }).title ?? `Module ${mi + 1}`,
          description: (m as { description?: string }).description ?? null,
          position: mi,
          blooms_level: (m as { blooms_level?: string }).blooms_level ?? null,
          kolbs_stage: (m as { kolbs_stage?: string }).kolbs_stage ?? null,
          learning_objectives: Array.isArray((m as { learning_objectives?: unknown }).learning_objectives)
            ? (m as { learning_objectives: unknown[] }).learning_objectives
            : ((m as { outcome?: string }).outcome ? [(m as { outcome: string }).outcome] : []),
        })
        .select("id")
        .single();
      if (modErr) throw modErr;

      const lessons: Array<Record<string, unknown>> = Array.isArray((m as { lessons?: unknown[] }).lessons)
        ? ((m as { lessons: unknown[] }).lessons as Record<string, unknown>[])
        : [];
      for (let li = 0; li < lessons.length; li++) {
        const l = lessons[li];
        await supabase.from("course_lessons").insert({
          module_id: newModule.id,
          title: (l as { title?: string }).title ?? `Lesson ${li + 1}`,
          outline: (l as { outline?: string }).outline ?? null,
          content: JSON.stringify({
            type: (l as { type?: string }).type ?? "video",
            duration_minutes: (l as { duration_minutes?: number }).duration_minutes ?? null,
            outline: (l as { outline?: string }).outline ?? null,
          }),
          position: li,
          video_url: null,
        });
      }
    }

    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready",
      current_step: 2,
      content_json: { ...content, course_id: courseId, _currentStep: 2 },
      personalised_name: content.course_title,
      price_usd: content.suggested_price_usd ?? 197,
      currency: "usd",
      delivery_type: "course",
    }, book?.id ?? book_id ?? null);

    return new Response(
      JSON.stringify({ success: true, content: { ...content, course_id: courseId } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    if (priorNodeState && authorIdForRestore) {
      try {
        await upsertAuthorNode(
          createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!),
          authorIdForRestore,
          NODE_ID,
          NODE_NAME,
          priorNodeState,
          bookIdForRestore,
        );
      } catch (restoreErr) {
        console.error("generate-ba10-online-course restore error:", errorMessage(restoreErr));
      }
    }
    return failResponse(errorMessage(err));
  }
});
