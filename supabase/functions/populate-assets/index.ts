import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// After AI generates raw content, this function parses structured data and populates domain tables
serve(async (req) => {
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
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { assetType, bookId, rawContent } = await req.json();

    if (!assetType || !bookId || !rawContent) {
      return new Response(JSON.stringify({ error: "Missing assetType, bookId, or rawContent" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get book info
    const { data: book } = await supabase
      .from("books")
      .select("id, title, author_id, author_name, description")
      .eq("id", bookId)
      .single();

    if (!book || book.author_id !== user.id) {
      return new Response(JSON.stringify({ error: "Book not found or unauthorized" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let result: any = { saved: true };

    // Use AI to extract structured data from the raw generated content
    if (assetType === "course") {
      result = await populateCourse(supabase, LOVABLE_API_KEY, user.id, bookId, rawContent, book.title);
    } else if (assetType === "email") {
      result = await populateEmailFlow(supabase, LOVABLE_API_KEY, user.id, bookId, rawContent, book.title);
    } else if (assetType === "speaker") {
      result = await populateSpeakingTopics(supabase, LOVABLE_API_KEY, user.id, bookId, rawContent);
    } else if (assetType === "workbook" || assetType === "social" || assetType === "products") {
      // These are content-only assets — just save to generated_assets (already done by frontend)
      result = { saved: true, type: "content_only" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("populate-assets error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function extractStructuredData(apiKey: string, systemPrompt: string, content: string) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
  });

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

async function populateCourse(supabase: any, apiKey: string, authorId: string, bookId: string, rawContent: string, bookTitle: string) {
  const data = await extractStructuredData(apiKey,
    `Extract course structure from this AI-generated course outline. Return JSON with:
    { "title": string, "description": string, "modules": [{ "title": string, "description": string, "lessons": [{ "title": string, "content": string }] }] }
    Keep it faithful to the generated content. Max 12 modules, max 5 lessons per module.`,
    rawContent
  );

  // Delete existing AI-generated course for this book
  const { data: existingCourses } = await supabase
    .from("courses")
    .select("id")
    .eq("author_id", authorId)
    .eq("title", data.title || `Course: ${bookTitle}`);

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

  // Create course
  const { data: course, error: courseErr } = await supabase
    .from("courses")
    .insert({
      author_id: authorId,
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

async function populateEmailFlow(supabase: any, apiKey: string, authorId: string, bookId: string, rawContent: string, bookTitle: string) {
  const data = await extractStructuredData(apiKey,
    `Extract email sequence from this AI-generated email nurture sequence. Return JSON with:
    { "title": string, "description": string, "emails": [{ "subject": string, "preview_text": string, "body": string, "delay_days": number }] }
    body should be the full email text in markdown. delay_days is days after the previous email (first email = 0).`,
    rawContent
  );

  // Delete existing AI-generated flow for this book
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

  // Create flow
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

async function populateSpeakingTopics(supabase: any, apiKey: string, authorId: string, bookId: string, rawContent: string) {
  const data = await extractStructuredData(apiKey,
    `Extract speaking topics from this AI-generated speaker kit. Return JSON with:
    { "topics": [{ "title": string, "description": string, "duration_minutes": number, "fee": number }] }
    Extract 3-5 distinct talk titles with descriptions. Default duration 60 minutes, default fee 2500.`,
    rawContent
  );

  // Delete existing AI-generated topics
  // We add topics, not replace all — but mark as draft
  let topicsCreated = 0;
  for (const topic of (data.topics || [])) {
    // Check if a topic with same title already exists
    const { data: existing } = await supabase
      .from("speaking_topics")
      .select("id")
      .eq("author_id", authorId)
      .eq("title", topic.title);

    if (existing?.length) continue; // Skip duplicates

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
