import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAiGateway } from "../_shared/builder-helpers.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { resolveAuthorId } from "../_shared/resolve-author-id.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";

async function resolveUser(token: string): Promise<{ id: string; email: string }> {
  const localClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
  const { data: localUser } = await localClient.auth.getUser(token);
  if (localUser?.user?.id && localUser?.user?.email) {
    return { id: localUser.user.id, email: localUser.user.email };
  }

  const sharedKey = Deno.env.get("SHARED_BACKEND_SERVICE_ROLE_KEY");
  if (sharedKey) {
    const sharedClient = createClient(SHARED_BACKEND_URL, sharedKey, { auth: { persistSession: false } });
    const { data: sharedUser } = await sharedClient.auth.getUser(token);
    if (sharedUser?.user?.id && sharedUser?.user?.email) {
      return { id: sharedUser.user.id, email: sharedUser.user.email };
    }
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.sub && payload.email) return { id: payload.sub, email: payload.email };
  } catch { /* ignore */ }

  throw new Error("Unauthorized");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const user = await resolveUser(token);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { assetType, bookId, rawContent, appendMode, frameworkName } = await req.json();

    if (!assetType || !bookId || !rawContent) {
      return new Response(JSON.stringify({ error: "Missing assetType, bookId, or rawContent" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: book } = await supabase
      .from("books")
      .select("id, title, author_id, author_name, description")
      .eq("id", bookId)
      .single();

    if (!book || book.author_id !== user.id) {
      return new Response(JSON.stringify({ error: "Book not found or unauthorized" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: genAsset } = await supabase
      .from("generated_assets")
      .select("id")
      .eq("book_id", bookId)
      .eq("author_id", authorId)
      .eq("asset_type", assetType)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    const sourceAssetId = genAsset?.id || null;

    let result: any = { saved: true };

    switch (assetType) {
      case "course":
        result = await populateCourse(supabase, user.id, bookId, rawContent, book.title, sourceAssetId);
        break;
      case "email":
        result = await populateEmailFlow(supabase, user.id, bookId, rawContent, book.title);
        break;
      case "speaker":
        result = await populateSpeakingTopics(supabase, user.id, bookId, rawContent);
        break;
      case "workbook":
        result = await populateWorkbook(supabase, user.id, bookId, rawContent, book.title, sourceAssetId, appendMode, frameworkName);
        break;
      case "social":
        result = await populateSocialMedia(supabase, user.id, bookId, rawContent, sourceAssetId);
        break;
      case "products":
        result = await populateProductIdeas(supabase, user.id, bookId, rawContent, book.title, sourceAssetId);
        break;
      default:
        result = { saved: true, type: "content_only" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("populate-assets error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Workbook ─────────────────────────────────────────
async function populateWorkbook(supabase: any, authorId: string, bookId: string, rawContent: string, bookTitle: string, sourceAssetId: string | null, appendMode?: boolean, frameworkName?: string) {
  if (!appendMode) {
    await supabase.from("workbooks").delete().eq("author_id", authorId).eq("book_id", bookId);
  }

  const title = frameworkName
    ? `Workbook: ${frameworkName}`
    : `Workbook: ${bookTitle}`;

  const description = frameworkName
    ? `AI-generated workbook for the "${frameworkName}" framework from "${bookTitle}"`
    : `AI-generated companion workbook for "${bookTitle}"`;

  const { data: wb, error } = await supabase
    .from("workbooks")
    .insert({
      author_id: authorId,
      book_id: bookId,
      source_asset_id: sourceAssetId,
      title,
      description,
      content_markdown: rawContent,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Workbook insert failed: ${error.message}`);
  return { saved: true, type: "workbook", workbookId: wb.id };
}

async function populateSocialMedia(supabase: any, authorId: string, bookId: string, rawContent: string, sourceAssetId: string | null) {
  await supabase.from("social_media_content").delete().eq("author_id", authorId).eq("book_id", bookId);

  const { error } = await supabase
    .from("social_media_content")
    .insert({
      author_id: authorId,
      book_id: bookId,
      source_asset_id: sourceAssetId,
      platform: "all",
      content_type: "calendar",
      content_text: rawContent,
      status: "draft",
    });

  if (error) throw new Error(`Social media insert failed: ${error.message}`);
  return { saved: true, type: "social_media", postsCreated: 1 };
}

async function populateProductIdeas(supabase: any, authorId: string, bookId: string, rawContent: string, bookTitle: string, sourceAssetId: string | null) {
  const results: string[] = [];

  const { data: existing1 } = await supabase.from("home_study_courses").select("id").eq("author_id", authorId).eq("book_id", bookId);
  if (!existing1?.length) {
    const { error } = await supabase.from("home_study_courses").insert({
      author_id: authorId,
      book_id: bookId,
      source_asset_id: sourceAssetId,
      title: `Home Study: ${bookTitle}`,
      description: `30-day self-paced study program for "${bookTitle}"`,
      content_markdown: rawContent,
      status: "draft",
    });
    if (!error) results.push("home_study");
  }

  const { data: existing2 } = await supabase.from("webinars").select("id").eq("author_id", authorId).eq("book_id", bookId);
  if (!existing2?.length) {
    const { error } = await supabase.from("webinars").insert({
      author_id: authorId,
      book_id: bookId,
      source_asset_id: sourceAssetId,
      title: `Webinar: ${bookTitle}`,
      description: `60-minute webinar presentation from "${bookTitle}"`,
      script_markdown: "",
      status: "draft",
    });
    if (!error) results.push("webinar");
  }

  const { data: existing3 } = await supabase.from("audiobooks").select("id").eq("author_id", authorId).eq("book_id", bookId);
  if (!existing3?.length) {
    const { error } = await supabase.from("audiobooks").insert({
      author_id: authorId,
      book_id: bookId,
      source_asset_id: sourceAssetId,
      title: `Audiobook: ${bookTitle}`,
      description: `Audiobook script for "${bookTitle}"`,
      script_markdown: "",
      status: "draft",
    });
    if (!error) results.push("audiobook");
  }

  return { saved: true, type: "product_ideas", created: results };
}

async function populateCourse(supabase: any, authorId: string, bookId: string, rawContent: string, bookTitle: string, sourceAssetId: string | null) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const data = await extractStructuredData(LOVABLE_API_KEY,
    `Extract course structure from this AI-generated course outline. Return JSON with:
    { "title": string, "description": string, "modules": [{ "title": string, "description": string, "lessons": [{ "title": string, "content": string }] }] }
    Keep it faithful to the generated content. Max 12 modules, max 5 lessons per module.`,
    rawContent
  );

  const { data: existingCourses } = await supabase
    .from("courses")
    .select("id")
    .eq("author_id", authorId)
    .eq("book_id", bookId);

  if (existingCourses?.length) {
    for (const c of existingCourses) {
      const { data: modules } = await supabase.from("course_modules").select("id").eq("course_id", c.id);
      if (modules?.length) {
        for (const m of modules) {
          await supabase.from("course_lessons").delete().eq("module_id", m.id);
        }
        await supabase.from("course_modules").delete().eq("course_id", c.id);
      }
      await supabase.from("courses").delete().eq("id", c.id);
    }
  }

  const { data: course, error: courseErr } = await supabase
    .from("courses")
    .insert({
      author_id: authorId,
      book_id: bookId,
      source_asset_id: sourceAssetId,
      title: data.title || `Course: ${bookTitle}`,
      description: data.description || "",
      status: "draft",
    })
    .select("id")
    .single();

  if (courseErr) throw new Error(`Course insert failed: ${courseErr.message}`);

  let modulesCreated = 0;
  let lessonsCreated = 0;

  for (let i = 0; i < (data.modules || []).length; i++) {
    const mod = data.modules[i];
    const { data: moduleRow, error: modErr } = await supabase
      .from("course_modules")
      .insert({
        course_id: course.id,
        title: mod.title,
        description: mod.description || "",
        position: i,
      })
      .select("id")
      .single();

    if (modErr) continue;
    modulesCreated++;

    for (let j = 0; j < (mod.lessons || []).length; j++) {
      const lesson = mod.lessons[j];
      const { error: lessonErr } = await supabase.from("course_lessons").insert({
        module_id: moduleRow.id,
        title: lesson.title,
        content: lesson.content || "",
        position: j,
      });
      if (!lessonErr) lessonsCreated++;
    }
  }

  return { saved: true, type: "course", courseId: course.id, modulesCreated, lessonsCreated };
}

async function populateEmailFlow(supabase: any, authorId: string, bookId: string, rawContent: string, bookTitle: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const data = await extractStructuredData(LOVABLE_API_KEY,
    `Extract email sequence from this AI-generated email nurture sequence. Return JSON with:
    { "title": string, "description": string, "emails": [{ "subject": string, "preview_text": string, "body": string, "delay_days": number }] }
    body should be the full email text in markdown. delay_days is days after the previous email (first email = 0).`,
    rawContent
  );

  const { data: existingFlows } = await supabase
    .from("email_flows")
    .select("id")
    .eq("author_id", authorId)
    .eq("book_id", bookId)
    .eq("ai_generated", true)
    .eq("flow_type", "nurture");

  if (existingFlows?.length) {
    for (const f of existingFlows) {
      await supabase.from("email_flow_steps").delete().eq("flow_id", f.id);
      await supabase.from("email_flow_enrollments").delete().eq("flow_id", f.id);
      await supabase.from("email_flows").delete().eq("id", f.id);
    }
  }

  const { data: flow, error: flowErr } = await supabase
    .from("email_flows")
    .insert({
      author_id: authorId,
      book_id: bookId,
      title: data.title || `Nurture: ${bookTitle}`,
      description: data.description || "",
      flow_type: "nurture",
      ai_generated: true,
      status: "draft",
    })
    .select("id")
    .single();

  if (flowErr) throw new Error(`Flow insert failed: ${flowErr.message}`);

  let stepsCreated = 0;
  for (let i = 0; i < (data.emails || []).length; i++) {
    const email = data.emails[i];
    const { error: stepErr } = await supabase.from("email_flow_steps").insert({
      flow_id: flow.id,
      step_number: i + 1,
      subject: email.subject || `Email ${i + 1}`,
      preview_text: email.preview_text || null,
      body_markdown: email.body || "",
      trigger_delay_days: email.delay_days || (i * 3),
      status: "active",
    });
    if (!stepErr) stepsCreated++;
  }

  return { saved: true, type: "email_flow", flowId: flow.id, stepsCreated };
}

async function populateSpeakingTopics(supabase: any, authorId: string, bookId: string, rawContent: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const data = await extractStructuredData(LOVABLE_API_KEY,
    `Extract speaking topics from this AI-generated speaker kit. Return JSON with:
    { "topics": [{ "title": string, "description": string, "duration_minutes": number, "fee": number }] }
    Extract 3-5 distinct talk titles with descriptions. Default duration 60 minutes, default fee 2500.`,
    rawContent
  );

  let topicsCreated = 0;
  for (const topic of (data.topics || [])) {
    const { data: existing } = await supabase
      .from("speaking_topics")
      .select("id")
      .eq("author_id", authorId)
      .eq("title", topic.title);

    if (existing?.length) continue;

    const { error } = await supabase.from("speaking_topics").insert({
      author_id: authorId,
      title: topic.title,
      description: topic.description || "",
      duration_minutes: topic.duration_minutes || 60,
      fee: topic.fee || 2500,
      fee_currency: "USD",
      status: "active",
    });
    if (!error) topicsCreated++;
  }

  return { saved: true, type: "speaking_topics", topicsCreated };
}

async function extractStructuredData(apiKey: string, systemPrompt: string, content: string) {
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
        { role: "user", content },
      ],
      tools: [{
        type: "function",
        function: {
          name: "extract_data",
          description: "Extract structured data from the content",
          parameters: {
            type: "object",
            properties: { data: { type: "object" } },
            required: ["data"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "extract_data" } },
    }),
  }, "populate-assets");

  if (!resp.ok) {
    const t = await resp.text();
    console.error("AI extraction error:", resp.status, t);
    throw new Error("AI extraction failed");
  }

  const json = await resp.json();
  const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in response");
  return JSON.parse(toolCall.function.arguments).data;
}
