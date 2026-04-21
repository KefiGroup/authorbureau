/**
 * generate-ba10-online-course
 * ---------------------------
 * Sprint 40 rewrite: generates a complete online course personalised to the
 * author's book and POPULATES the relational tables that the LMS reads from:
 *   - courses                (1 row)
 *   - course_modules         (6–8 rows)
 *   - course_lessons         (3–5 rows per module, with `outline`)
 *
 * Also mirrors a snapshot to author_nodes.content_json for the builder UI and
 * sets author_nodes.BA-10.status = 'in_progress'.
 *
 * Body: { author_id: string }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function compactJson(value: unknown, fallback: string, maxLength = 1600) {
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
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const exactMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!exactMatch) throw new Error("No valid JSON in AI response");
  return JSON.parse(exactMatch[0]);
}

function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

async function upsertAuthorNode(
  supabase: ReturnType<typeof createClient>,
  authorId: string,
  payload: Record<string, unknown>,
) {
  const { data: existingNode, error: existingNodeError } = await supabase
    .from("author_nodes")
    .select("id")
    .eq("author_id", authorId)
    .eq("node_id", "BA-10")
    .maybeSingle();

  if (existingNodeError) throw existingNodeError;

  if (existingNode?.id) {
    const { error } = await supabase.from("author_nodes").update(payload).eq("id", existingNode.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("author_nodes").insert({
    author_id: authorId,
    node_id: "BA-10",
    node_name: "Online Course",
    ...payload,
  });
  if (error) throw error;
}

async function resolveAuthorBook(
  supabase: ReturnType<typeof createClient>,
  authorId: string,
  cloudUserId: string | null,
) {
  let userEmail: string | null = null;

  if (cloudUserId) {
    const { data: userResult } = await supabase.auth.admin.getUserById(cloudUserId);
    userEmail = userResult.user?.email ?? null;
  }

  const candidateAuthorIds = Array.from(new Set([authorId, cloudUserId].filter(Boolean) as string[]));
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

  let priorNodeState: Record<string, unknown> | null = null;

  try {
    const { author_id } = await req.json();
    if (!author_id) throw new Error("author_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: author } = await supabase
      .from("author_profiles")
      .select("pen_name, genres, user_id")
      .eq("id", author_id)
      .single();
    if (!author) throw new Error("Author not found");

    const { data: existingNodeSnapshot } = await supabase
      .from("author_nodes")
      .select("status, content_json, personalised_name, price_usd, currency, delivery_type, current_step")
      .eq("author_id", author_id)
      .eq("node_id", "BA-10")
      .maybeSingle();
    priorNodeState = (existingNodeSnapshot as Record<string, unknown>) ?? null;

    const { data: ctx } = await supabase
      .from("author_context")
      .select("*")
      .eq("author_id", author_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const book = await resolveAuthorBook(supabase, author_id, author.user_id ?? null);
    const resolvedBookTitle = ctx?.book_title?.trim() || book?.title?.trim() || "";
    if (!resolvedBookTitle) throw new Error("No book found. Please add a book first.");
    const coreThesis = ctx?.core_thesis?.trim() || book?.description?.trim() || "";
    const targetAudience = compactJson(ctx?.target_audience_persona, "{}", 1200);
    const keyFrameworks = compactJson(ctx?.key_frameworks, "[]", 1400);
    const uniqueInsights = compactJson(ctx?.unique_insights, "[]", 1400);
    const genre = ctx?.genre || book?.genre || author.genres?.[0] || "General";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.2",
        messages: [
          {
            role: "system",
            content:
              "You are ABBY, the AI business agent for Authors Bureau. Generate a complete, professional online course personalised to the author's book. Respond with ONLY valid JSON (no markdown, no code fences). Every lesson MUST include a 1-2 sentence `outline`.",
          },
          {
            role: "user",
            content: `Create a complete online course for ${author.pen_name}'s book '${resolvedBookTitle}'.

Book context:
- Author: ${author.pen_name}
- Title: ${resolvedBookTitle}
- Subtitle: ${ctx?.book_subtitle || "N/A"}
- Core thesis: ${coreThesis || "Use the book description and context to infer the main promise."}
- Target audience: ${targetAudience}
- Key frameworks: ${keyFrameworks}
- Unique insights: ${uniqueInsights}
- Genre: ${genre}

Return JSON exactly in this shape:
{
  "course_title": "string (compelling, NOT just the book title)",
  "course_subtitle": "string (one-line promise)",
  "tagline": "string (memorable hook)",
  "duration": "string e.g. '6 weeks · 8 modules'",
  "difficulty_level": "Beginner|Intermediate|Advanced",
  "transformation_promise": "string (what students achieve)",
  "who_its_for": "string (specific persona)",
  "what_youll_get": ["4 bullet items"],
  "suggested_price_usd": 197,
  "pricing_rationale": "string (1-2 sentences)",
  "course_description_long": "3-4 paragraph rich description",
  "modules": [
    {
      "number": 1,
      "title": "string",
      "description": "string (2-3 sentences)",
      "outcome": "string (after this module the student can...)",
      "lessons": [
        { "number": 1, "title": "string", "type": "video|reading|exercise|quiz",
          "duration_minutes": 12,
          "outline": "1-2 sentence summary of what's taught" }
      ]
    }
  ],
  "sales_copy": {
    "headline": "string", "subheadline": "string",
    "problem": "string", "solution": "string",
    "outcomes": ["string","string","string"],
    "cta": "string"
  },
  "launch_emails": [
    { "subject": "string", "body": "string (4-6 sentences, signed by ${author.pen_name})" }
  ],
  "abby_summary": "string (1-2 sentences telling the author what was created)"
}

Rules:
- 6 to 8 modules, each with 3 to 5 lessons
- Every lesson MUST have an outline
- 3 launch emails (Day 0, Day 2, Day 5)
- Make everything specific to the book — no generic placeholders`,
          },
        ],
        max_completion_tokens: 8000,
      }),
    });

    if (!aiRes.ok) {
      const details = await aiRes.text();
      throw new Error(`AI gateway error: ${aiRes.status} ${details.slice(0, 300)}`);
    }
    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content || "";
    const content = parseAiJson(raw);

    // ============ Populate relational tables ============
    // 1. Upsert the courses row (one course per author per book for now)
    const coursePayload: Record<string, unknown> = {
      author_id,
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

    // Look up existing course for this author + book
    const { data: existingCourse } = await supabase
      .from("courses")
      .select("id")
      .eq("author_id", author_id)
      .eq("book_id", book?.id ?? null)
      .maybeSingle();

    let courseId: string;
    if (existingCourse?.id) {
      courseId = existingCourse.id;
      const { error: updateCourseError } = await supabase.from("courses").update(coursePayload).eq("id", courseId);
      if (updateCourseError) throw updateCourseError;

      const { data: existingModules, error: existingModulesError } = await supabase
        .from("course_modules")
        .select("id")
        .eq("course_id", courseId);
      if (existingModulesError) throw existingModulesError;

      const moduleIds = (existingModules ?? []).map((module) => module.id);
      if (moduleIds.length > 0) {
        const { error: deleteLessonsError } = await supabase
          .from("course_lessons")
          .delete()
          .in("module_id", moduleIds);
        if (deleteLessonsError) throw deleteLessonsError;
      }

      const { error: deleteModulesError } = await supabase.from("course_modules").delete().eq("course_id", courseId);
      if (deleteModulesError) throw deleteModulesError;
    } else {
      const { data: newCourse, error: courseErr } = await supabase
        .from("courses")
        .insert(coursePayload)
        .select("id")
        .single();
      if (courseErr) throw courseErr;
      courseId = newCourse.id;
    }

    // 2. Insert modules + lessons
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
          learning_objectives: (m as { outcome?: string }).outcome
            ? [(m as { outcome: string }).outcome]
            : [],
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

    // 3. Mirror to author_nodes (status: in_progress until author publishes)
    await upsertAuthorNode(supabase, author_id, {
      status: "content_ready",
      current_step: 2,
      content_json: { ...content, course_id: courseId, _currentStep: 2 },
      personalised_name: content.course_title,
      price_usd: content.suggested_price_usd ?? 197,
      currency: "usd",
      delivery_type: "course",
    });

    return new Response(
      JSON.stringify({ success: true, content: { ...content, course_id: courseId } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    if (priorNodeState) {
      try {
        await upsertAuthorNode(
          createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!),
          (await req.clone().json()).author_id,
          priorNodeState,
        );
      } catch (restoreErr) {
        console.error("generate-ba10-online-course restore error:", errorMessage(restoreErr));
      }
    }
    const message = errorMessage(err);
    console.error("generate-ba10-online-course error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
