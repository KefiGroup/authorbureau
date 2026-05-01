# 03 · ABBY Node Activation Prompts

_Version 2.0 · 2026-05-01_

For every node builder shipped to date, this document records the **exact prompt(s)** the corresponding edge function sends to the Lovable AI Gateway when the author activates that node.

Prompts are extracted verbatim from each `supabase/functions/generate-*/index.ts` file. Both top-level template-literal constants and inline `messages: [{ role, content: \`...\` }]` blocks are captured. Dynamic placeholders such as `${authorName}`, `${bookTitle}`, `${ctx.target_audience_persona}` are preserved exactly as they appear in source.

**Sprint 2 fix**: v1.0 missed 25 of 29 generators because the build script only matched top-level template-literal consts. v2.0 also captures inline message blocks.

---

## BA-10 · Online Course (Build)

- **Edge function**: `supabase/functions/generate-ba10-online-course/index.ts`
- **Model**: `google/gemini-2.5-flash`
- **Max tokens**: `6000`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Create`, `resolvedBookTitle`, `author`, `ctx`, `coreThesis`, `targetAudience`, `keyFrameworks`, `uniqueInsights`, `genre`, `errorMessage(fetchErr)`, `aiRes`, `)`, `1,`, `mi`, `li`

### system

```text
You are ABBY, the AI business agent for Authors Bureau. You design online courses using Bloom's Taxonomy (Remember → Understand → Apply → Analyze → Evaluate → Create) and Kolb's Experiential Learning Cycle (Concrete Experience → Reflective Observation → Abstract Conceptualisation → Active Experimentation). Modules MUST progress from lower-order to higher-order thinking. Each module specifies its primary Bloom's level and Kolb's stage with measurable, Bloom-aligned learning objectives. Respond with ONLY valid JSON. Every lesson MUST include a 1-sentence `outline`.
```

### user

```text
${`Create a complete online course for ${author.pen_name}'s book '${resolvedBookTitle}'.

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
      });
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
    for (let mi = 0; mi < modules.length; mi}${}${) {
      const m = modules[mi] as Record<string, unknown>;
      const { data: newModule, error: modErr } = await supabase
        .from("course_modules")
        .insert({
          course_id: courseId,
          module_number: (m as { number?: number }).number ?? mi}${1,
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
      for (let li = 0; li < lessons.length; li}${}${) {
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

    await upsertAuthorNode(supabase, author_id, {
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
          priorNodeState,
          bookIdForRestore,
        );
      } catch (restoreErr) {
        console.error("generate-ba10-online-course restore error:", errorMessage(restoreErr));
      }
    }
    return failResponse(errorMessage(err));
  }
});}
```

---

## BA-11 · Audiobook

- **Edge function**: `supabase/functions/generate-ba11-audiobook/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Create`, `bookTitle`, `author`, `bookSubtitle`, `coreThesis`, `JSON`, `ctx`, `NODE_ID`

### system

```text
You are ABBY, the AI business agent for Authors Bureau. Personalise everything to the author's specific book. Respond with ONLY valid JSON (no markdown, no code fences).

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Create a complete audiobook production package for ${author.pen_name}'s book '${bookTitle}'.

Book context:
- Author: ${author.pen_name}
- Title: ${bookTitle}
- Subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis || "Use book description and context to infer."}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
- Unique insights: ${JSON.stringify(ctx?.unique_insights ?? [])}
- Genre: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}

Generate JSON: {"audiobook_title","narrator_style","estimated_duration_hours":6,"narrator_brief":"3-4 sentences","chapter_guides":[5 items with chapter_number/chapter_title/key_emphasis_points(2 items)/pacing_note/pronunciation_notes],"distribution_platforms":[3 items with platform/royalty_rate/timeline],"production_checklist":[5 items],"suggested_retail_price_usd":19.99,"abby_summary"}

Make everything specific to this book. No placeholders.` },
        ],
      }),
    });
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error(`generate-${NODE_ID} ai-gateway error:`, aiRes.status, errText.slice(0, 500));
      return failResponse(aiGatewayErrorMessage(aiRes.status, errText));
    }
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");

    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready",
      current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.audiobook_title,
      price_usd: Number(content.suggested_retail_price_usd ?? 19.99),
      currency: "usd",
      delivery_type: "audiobook",
    }, book?.id ?? book_id ?? null);

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    if (priorNodeState && parsedAuthorId) {
      try { await upsertAuthorNode(supabase, parsedAuthorId, NODE_ID, NODE_NAME, priorNodeState, parsedBookId); }
      catch (e) { console.error(`generate-${NODE_ID} restore error:`, errorMessage(e)); }
    }
    const message = errorMessage(err);
    console.error(`generate-${NODE_ID} error:`, message);
    return failResponse(message);
  }
});}
```

---

## BA-12 · Membership

- **Edge function**: `supabase/functions/generate-ba12-membership/index.ts`
- **Model**: `openai/gpt-5-mini`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Design`, `bookTitle`, `author`, `coreThesis`, `JSON`, `ctx`, `NODE_ID`

### system

```text
You are ABBY for Authors Bureau. Design a 3-tier monthly membership community personalised to the author's book. Respond with ONLY valid JSON (no markdown, no code fences).

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Design a 3-tier monthly membership for ${author.pen_name}'s book '${bookTitle}'.

Book context:
- Author: ${author.pen_name}
- Title: ${bookTitle}
- Core thesis: ${coreThesis || "Use book description and context to infer."}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
- Genre: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}

Return JSON in this EXACT shape (field names matter):
{
  "membership_title": "string (memorable, branded)",
  "tagline": "string",
  "who_its_for": "string",
  "transformation_promise": "string",
  "tiers": [
    { "name": "Insider",   "price": 17,  "description": "string", "benefits": ["3-4 specific benefits"] },
    { "name": "Member",    "price": 47,  "description": "string", "benefits": ["4-5 specific benefits"] },
    { "name": "VIP",       "price": 97,  "description": "string", "benefits": ["5-6 specific benefits"] }
  ],
  "content_calendar": "string (3-5 sentences describing what members get monthly: live calls, Q&As, workshops, content drops)",
  "welcome_emails": [
    { "day": 0, "subject": "string", "body": "4-6 sentences signed by ${author.pen_name}" },
    { "day": 2, "subject": "string", "body": "string" },
    { "day": 5, "subject": "string", "body": "string" }
  ],
  "abby_summary": "string"
}

3 tiers exactly. Prices ascending. No generic placeholders.` },
        ],
      }),
    });
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error(`generate-${NODE_ID} ai-gateway error:`, aiRes.status, errText.slice(0, 500));
      return failResponse(aiGatewayErrorMessage(aiRes.status, errText));
    }
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");
    const tiers = Array.isArray(content.tiers) ? content.tiers : [];
    const entryPrice = Number(tiers[0]?.price ?? content.monthly_price_usd ?? 27);

    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready",
      current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.membership_title || content.membership_name,
      price_usd: entryPrice,
      currency: "usd",
      delivery_type: "membership",
    }, book?.id ?? book_id ?? null);

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    if (priorNodeState && parsedAuthorId) {
      try { await upsertAuthorNode(supabase, parsedAuthorId, NODE_ID, NODE_NAME, priorNodeState, parsedBookId); }
      catch (e) { console.error(`generate-${NODE_ID} restore error:`, errorMessage(e)); }
    }
    const message = errorMessage(err);
    console.error(`generate-${NODE_ID} error:`, message);
    return failResponse(message);
  }
});}
```

---

## BA-13 · Group Coaching

- **Edge function**: `supabase/functions/generate-ba13-group-coaching/index.ts`
- **Model**: `openai/gpt-5-mini`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Create`, `bookTitle`, `author`, `bookSubtitle`, `coreThesis`, `JSON`, `ctx`, `NODE_ID`

### system

```text
You are ABBY for Authors Bureau. Personalise everything to the author's book. Respond with ONLY valid JSON (no markdown, no code fences).

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Create a complete group coaching programme for ${author.pen_name}'s book '${bookTitle}'.

Book context:
- Author: ${author.pen_name}
- Title: ${bookTitle}
- Subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis || "Use book description and context to infer."}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
- Genre: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}

Return JSON in this EXACT shape (field names matter):
{
  "programme_title": "string",
  "programme_subtitle": "string",
  "tagline": "string",
  "duration": "8 weeks",
  "group_size": "8-12 participants",
  "session_frequency": "Weekly 90-min Zoom call",
  "transformation_promise": "string",
  "who_its_for": "string",
  "weeks": [
    { "week_number": 1, "title": "string", "description": "2-3 sentences", "activity": "string" },
    { "week_number": 2, "title": "string", "description": "string", "activity": "string" },
    { "week_number": 3, "title": "string", "description": "string", "activity": "string" },
    { "week_number": 4, "title": "string", "description": "string", "activity": "string" },
    { "week_number": 5, "title": "string", "description": "string", "activity": "string" },
    { "week_number": 6, "title": "string", "description": "string", "activity": "string" },
    { "week_number": 7, "title": "string", "description": "string", "activity": "string" },
    { "week_number": 8, "title": "string", "description": "string", "activity": "string" }
  ],
  "suggested_price_usd": 1997,
  "pricing_rationale": "string",
  "sales_page": { "headline": "string", "subheadline": "string", "cta_button_text": "Apply Now" },
  "abby_summary": "string"
}

8 weeks exactly. No placeholders.` },
        ],
      }),
    });
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error(`generate-${NODE_ID} ai-gateway error:`, aiRes.status, errText.slice(0, 500));
      return failResponse(aiGatewayErrorMessage(aiRes.status, errText));
    }
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");

    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready",
      current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.programme_title,
      price_usd: Number(content.suggested_price_usd ?? 1997),
      currency: "usd",
      delivery_type: "group_coaching",
    }, book?.id ?? book_id ?? null);

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    if (priorNodeState && parsedAuthorId) {
      try { await upsertAuthorNode(supabase, parsedAuthorId, NODE_ID, NODE_NAME, priorNodeState, parsedBookId); }
      catch (e) { console.error(`generate-${NODE_ID} restore error:`, errorMessage(e)); }
    }
    const message = errorMessage(err);
    console.error(`generate-${NODE_ID} error:`, message);
    return failResponse(message);
  }
});}
```

---

## BA-14 · Podcast

- **Edge function**: `supabase/functions/generate-ba14-podcast/index.ts`
- **Model**: `openai/gpt-5-mini`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Create`, `bookTitle`, `author`, `bookSubtitle`, `coreThesis`, `JSON`, `ctx`, `NODE_ID`

### system

```text
You are ABBY for Authors Bureau. Personalise everything to the author's book. Respond with ONLY valid JSON (no markdown, no code fences).

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Create a complete podcast for ${author.pen_name}'s book '${bookTitle}'.

Book context:
- Author: ${author.pen_name}
- Title: ${bookTitle}
- Subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis || "Use book description and context to infer."}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
- Genre: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}

Return JSON in this EXACT shape (field names matter):
{
  "podcast_title": "string",
  "tagline": "string",
  "format": "Solo, interview, or hybrid — be specific",
  "target_listener": "string",
  "episodes": [
    { "title": "string", "description": "2-3 sentences" },
    { "title": "string", "description": "string" },
    { "title": "string", "description": "string" },
    { "title": "string", "description": "string" },
    { "title": "string", "description": "string" },
    { "title": "string", "description": "string" },
    { "title": "string", "description": "string" },
    { "title": "string", "description": "string" },
    { "title": "string", "description": "string" },
    { "title": "string", "description": "string" }
  ],
  "launch_plan": "string (3-5 sentences covering distribution platforms, promotion, and cadence)",
  "abby_summary": "string"
}

Exactly 10 episodes. No placeholders.` },
        ],
      }),
    });
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error(`generate-${NODE_ID} ai-gateway error:`, aiRes.status, errText.slice(0, 500));
      return failResponse(aiGatewayErrorMessage(aiRes.status, errText));
    }
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");

    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready",
      current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.podcast_title || content.show_title,
      currency: "usd",
      delivery_type: "podcast",
    }, book?.id ?? book_id ?? null);

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    if (priorNodeState && parsedAuthorId) {
      try { await upsertAuthorNode(supabase, parsedAuthorId, NODE_ID, NODE_NAME, priorNodeState, parsedBookId); }
      catch (e) { console.error(`generate-${NODE_ID} restore error:`, errorMessage(e)); }
    }
    const message = errorMessage(err);
    console.error(`generate-${NODE_ID} error:`, message);
    return failResponse(message);
  }
});}
```

---

## BA-15 · Media & PR

- **Edge function**: `supabase/functions/generate-ba15-media-pr/index.ts`
- **Model**: `openai/gpt-5-mini`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Create`, `bookTitle`, `author`, `bookSubtitle`, `coreThesis`, `JSON`, `ctx`, `NODE_ID`

### system

```text
You are ABBY for Authors Bureau. Personalise everything to the author's book. Respond with ONLY valid JSON (no markdown, no code fences). All listed fields must be PLAIN STRINGS unless explicitly an object/array.

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Create a complete media kit and PR strategy for ${author.pen_name}'s book '${bookTitle}'.

Book context:
- Author: ${author.pen_name}
- Title: ${bookTitle}
- Subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis || "Use book description and context to infer."}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
- Genre: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}

Return JSON in this EXACT shape (note: press_release and pitch_template are STRINGS, not objects):
{
  "media_kit_title": "string",
  "speaker_headline": "string (one-line credentials)",
  "media_kit_content": "string (3-5 sentences: bio, expertise, signature topics)",
  "press_release": "string (full press release: headline + 3-4 paragraphs + boilerplate, plain text with newlines)",
  "pitch_template": "string (full media pitch email: subject line + opening + hook + credentials + CTA, plain text with newlines)",
  "target_media_outlets": [
    { "outlet": "string", "type": "string", "audience": "string", "pitch_angle": "string" }
  ],
  "talking_points": ["5 specific talking points"],
  "abby_summary": "string"
}

5 outlets. press_release and pitch_template MUST be strings. No placeholders.` },
        ],
      }),
    });
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error(`generate-${NODE_ID} ai-gateway error:`, aiRes.status, errText.slice(0, 500));
      return failResponse(aiGatewayErrorMessage(aiRes.status, errText));
    }
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");

    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready",
      current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.speaker_headline,
      currency: "usd",
      delivery_type: "media_pr",
    }, book?.id ?? book_id ?? null);

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    if (priorNodeState && parsedAuthorId) {
      try { await upsertAuthorNode(supabase, parsedAuthorId, NODE_ID, NODE_NAME, priorNodeState, parsedBookId); }
      catch (e) { console.error(`generate-${NODE_ID} restore error:`, errorMessage(e)); }
    }
    const message = errorMessage(err);
    console.error(`generate-${NODE_ID} error:`, message);
    return failResponse(message);
  }
});}
```

---

## BA-16 · Affiliate Program

- **Edge function**: `supabase/functions/generate-ba16-affiliate/index.ts`
- **Model**: `openai/gpt-5-mini`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Create`, `bookTitle`, `author`, `bookSubtitle`, `coreThesis`, `JSON`, `ctx`, `NODE_ID`

### system

```text
You are ABBY for Authors Bureau. Personalise everything to the author's book. Respond with ONLY valid JSON (no markdown, no code fences).

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Create a complete affiliate programme for ${author.pen_name}'s book '${bookTitle}'.

Book context:
- Author: ${author.pen_name}
- Title: ${bookTitle}
- Subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis || "Use book description and context to infer."}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
- Genre: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}

Return JSON in this EXACT shape (field names matter):
{
  "programme_title": "string",
  "tagline": "string",
  "overview": "string (2-3 sentences explaining the programme)",
  "commission_structure": [
    { "tier": "Standard", "commission_rate": "30%", "requirements": "string", "benefits": ["benefit 1", "benefit 2"] },
    { "tier": "VIP",      "commission_rate": "50%", "requirements": "string", "benefits": ["benefit 1", "benefit 2", "benefit 3"] }
  ],
  "affiliate_resources": [
    { "resource": "string", "description": "string" }
  ],
  "recruitment_strategy": {
    "target_affiliates": "string",
    "outreach_message": "string (full email-ready outreach)",
    "recruitment_channels": ["channel 1", "channel 2", "channel 3"]
  },
  "cookie_duration_days": 60,
  "payout_schedule": "string",
  "abby_summary": "string"
}

4 resources. No placeholders.` },
        ],
      }),
    });
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error(`generate-${NODE_ID} ai-gateway error:`, aiRes.status, errText.slice(0, 500));
      return failResponse(aiGatewayErrorMessage(aiRes.status, errText));
    }
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");

    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready",
      current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.programme_title,
      currency: "usd",
      delivery_type: "affiliate",
    }, book?.id ?? book_id ?? null);

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    if (priorNodeState && parsedAuthorId) {
      try { await upsertAuthorNode(supabase, parsedAuthorId, NODE_ID, NODE_NAME, priorNodeState, parsedBookId); }
      catch (e) { console.error(`generate-${NODE_ID} restore error:`, errorMessage(e)); }
    }
    const message = errorMessage(err);
    console.error(`generate-${NODE_ID} error:`, message);
    return failResponse(message);
  }
});}
```

---

## BA-17 · Bundles

- **Edge function**: `supabase/functions/generate-ba17-upsells/index.ts`
- **Model**: `openai/gpt-5-mini`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Create`, `bookTitle`, `author`, `bookSubtitle`, `coreThesis`, `JSON`, `ctx`, `NODE_ID`

### system

```text
You are ABBY for Authors Bureau. Personalise everything to the author's book. Respond with ONLY valid JSON (no markdown, no code fences).

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Create a complete upsell and bundle system for ${author.pen_name}'s book '${bookTitle}'.

Book context:
- Author: ${author.pen_name}
- Title: ${bookTitle}
- Subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis || "Use book description and context to infer."}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
- Genre: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}

Return JSON in this EXACT shape (field names matter):
{
  "product_ladder_title": "string",
  "bundles": [
    { "bundle_name": "string", "products_included": ["product 1","product 2","product 3"], "individual_value_usd": 297, "bundle_price_usd": 197, "savings_usd": 100, "tagline": "string" }
  ],
  "upsell_sequences": [
    { "trigger": "string (what purchase triggers this)", "upsell_product": "string", "upsell_price_usd": 47, "upsell_headline": "string", "upsell_copy": "2-3 sentences" }
  ],
  "downsell": { "trigger": "string", "downsell_product": "string", "downsell_price_usd": 17, "downsell_headline": "string" },
  "abby_summary": "string"
}

3 bundles, 3 upsell_sequences. No placeholders.` },
        ],
      }),
    });
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error(`generate-${NODE_ID} ai-gateway error:`, aiRes.status, errText.slice(0, 500));
      return failResponse(aiGatewayErrorMessage(aiRes.status, errText));
    }
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");

    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready",
      current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.product_ladder_title,
      currency: "usd",
      delivery_type: "upsells",
    }, book?.id ?? book_id ?? null);

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    if (priorNodeState && parsedAuthorId) {
      try { await upsertAuthorNode(supabase, parsedAuthorId, NODE_ID, NODE_NAME, priorNodeState, parsedBookId); }
      catch (e) { console.error(`generate-${NODE_ID} restore error:`, errorMessage(e)); }
    }
    const message = errorMessage(err);
    console.error(`generate-${NODE_ID} error:`, message);
    return failResponse(message);
  }
});}
```

---

## BA-18 · JV Partnerships

- **Edge function**: `supabase/functions/generate-ba18-jv-partnerships/index.ts`
- **Model**: `openai/gpt-5-mini`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Create`, `bookTitle`, `author`, `bookSubtitle`, `coreThesis`, `JSON`, `ctx`, `NODE_ID`

### system

```text
You are ABBY for Authors Bureau. Personalise everything to the author's book. Respond with ONLY valid JSON (no markdown, no code fences). pitch_template MUST be a plain string.

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Create a complete JV partnership strategy for ${author.pen_name}'s book '${bookTitle}'.

Book context:
- Author: ${author.pen_name}
- Title: ${bookTitle}
- Subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis || "Use book description and context to infer."}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
- Genre: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}

Return JSON in this EXACT shape (field names matter):
{
  "jv_strategy_title": "string",
  "ideal_partners": [
    { "type": "string (partner type/category)", "description": "2-3 sentences", "revenue_model": "string (how revenue is shared)" },
    { "type": "string", "description": "string", "revenue_model": "string" },
    { "type": "string", "description": "string", "revenue_model": "string" }
  ],
  "pitch_template": "string (full email-ready partnership pitch: subject line + opening + value prop + revenue share + CTA, plain text with newlines)",
  "outreach_checklist": ["5 actionable steps"],
  "abby_summary": "string"
}

3 partners. pitch_template MUST be a string. No placeholders.` },
        ],
      }),
    });
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error(`generate-${NODE_ID} ai-gateway error:`, aiRes.status, errText.slice(0, 500));
      return failResponse(aiGatewayErrorMessage(aiRes.status, errText));
    }
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");

    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready",
      current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.jv_strategy_title,
      currency: "usd",
      delivery_type: "jv_partnerships",
    }, book?.id ?? book_id ?? null);

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    if (priorNodeState && parsedAuthorId) {
      try { await upsertAuthorNode(supabase, parsedAuthorId, NODE_ID, NODE_NAME, priorNodeState, parsedBookId); }
      catch (e) { console.error(`generate-${NODE_ID} restore error:`, errorMessage(e)); }
    }
    const message = errorMessage(err);
    console.error(`generate-${NODE_ID} error:`, message);
    return failResponse(message);
  }
});}
```

---

## BP-00 · Initial Analysis

- **Edge function**: `supabase/functions/generate-bp00-analysis/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Research`

### system

```text
You are ABBY, the AI business agent for Authors Bureau. You research published books and extract commercial intelligence. CRITICAL: write everything specifically for the EXACT book title and description provided — never substitute a different topic, niche, or domain. Always respond with valid JSON only — no markdown, no code fences.
```

### user

```text
${`Research this book and extract commercial intelligence:

${searchContext}

Return JSON with these exact keys:
{
  "book_title": "Exact book title",
  "book_subtitle": "Subtitle or null",
  "core_thesis": "Central argument in 2-3 sentences, specific to THIS book",
  "key_frameworks": ["Framework 1","Framework 2","Framework 3","Framework 4","Framework 5"],
  "target_audience_persona": {
    "demographics": "Age, profession, life stage",
    "psychographics": "Values, pain points, aspirations",
    "buying_triggers": "What makes them buy this book"
  },
  "unique_insights": ["Insight 1","Insight 2","Insight 3"],
  "commercial_angles": ["Angle 1","Angle 2","Angle 3"],
  "competitor_books": [{"title":"...","author":"...","differentiation":"..."}],
  "review_themes": ["Theme 1","Theme 2","Theme 3"],
  "review_count_estimate": 50,
  "genre": "Primary genre",
  "abby_message": "I have analysed your book [Title] and identified [N] commercial opportunities. Here is what stands out: [brief specific insight]."
}

Be specific. Never default to generic finance, business, or self-help content unless that is exactly what THIS book is about.`,
          }}
```

---

## BP-01 · Email Marketing

- **Edge function**: `supabase/functions/generate-bp01-email-marketing/index.ts`
- **Model**: `google/gemini-2.5-flash`
- **Max tokens**: `4000`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: `systemPrompt`, `userPrompt`

### system

```text
${systemPrompt}
```

### user

```text
${userPrompt}
```

---

## BP-02 · Lead Magnet

- **Edge function**: `supabase/functions/generate-bp02-lead-magnets/index.ts`
- **Model**: `google/gemini-2.5-flash`
- **Max tokens**: `10000`
- **Prompt blocks extracted**: 6
- **Dynamic variables**: `systemPrompt`, `userPrompt`, ``Fix`

### system (block 1)

```text
${systemPrompt}
```

### user (block 2)

```text
${userPrompt}
```

### system (block 3)

```text
You are a JSON repair tool. Return ONLY valid JSON, no prose.

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user (block 4)

```text
${`Fix this into valid JSON:\n${rawContent.slice(0, 12000)}` }}
```

### system (block 5)

```text
You are a JSON repair tool. Return ONLY valid JSON, no prose.
```

### user (block 6)

```text
${`Fix this into valid JSON:\n${rawContent.slice(0, 12000)}` }}
```

---

## BP-02 (Social Pack) · Lead Magnet — Social Pack (companion to BP-02)

- **Edge function**: `supabase/functions/generate-bp02-social-pack/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `5000`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: `prompt`

### system

```text
You are ABBY, the AI business agent for Authors Bureau. Generate social media content that is warm, expert, and specific to the author's book. Return valid JSON only.

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${prompt}
```

---

## BP-03 · Social Media

- **Edge function**: `supabase/functions/generate-bp03-social-media/index.ts`
- **Model**: `openai/gpt-5.2`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: `SYSTEM_PROMPT`, `userPrompt`

### system

```text
${SYSTEM_PROMPT}
```

### user

```text
${userPrompt}
```

---

## BP-04 · Author Website

- **Edge function**: `supabase/functions/generate-bp04-website/index.ts`
- **Model**: `openai/gpt-5.2`
- **Max tokens**: `6000`
- **Prompt blocks extracted**: 3
- **Dynamic variables**: `systemPrompt`, `userPrompt`, `extraReminder`

### system (block 1)

```text
${systemPrompt}
```

### user (block 2)

```text
${userPrompt}
```

### system (block 3)

```text
${extraReminder}
```

---

## BP-05 · Webinar / Live Event

- **Edge function**: `supabase/functions/generate-bp05-webinars/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `default`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: `userPrompt`

### system

```text
You are ABBY, the AI business agent for Authors Bureau. You help authors turn their books into complete business empires. You are warm, expert, and encouraging. You always personalise everything to the author's specific book, audience, and niche. Never be generic. Always respond with valid JSON only — no markdown, no code fences.

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${userPrompt}
```

---

## BP-06 · Online Course

- **Edge function**: `supabase/functions/generate-bp06-online-course/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `12000`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Create`, `bookTitle`, `author`, `bookSubtitle`, `coreThesis`, `JSON`, `ctx`, `NODE_ID`

### system

```text
You are ABBY, the AI business agent for Authors Bureau. You help authors turn their books into complete business empires. You are warm, expert, and encouraging. Always personalise everything. Always respond with valid JSON only — no markdown, no code fences.

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Create a companion workbook for ${author.pen_name}'s book '${bookTitle}'.

Author details:
- Author name: ${author.pen_name}
- Book title: ${bookTitle}
- Book subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
- Unique insights: ${JSON.stringify(ctx?.unique_insights ?? [])}
- Genre/Niche: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}

Generate the following as a JSON object with these EXACT keys and EXACT shapes:
{
  "workbook_title": "Compelling workbook title (e.g., 'The [Book Title] Workbook')",
  "workbook_subtitle": "One-line subtitle",
  "tagline": "Punchy tagline — MAX 8 WORDS, no period",
  "page_count": "e.g., 45 pages",
  "format": "8.5 × 11\\" PDF + Word — Amazon KDP-ready (do not change this value)",
  "transformation_promise": "ONE sentence, second person ('you'), present-tense action verb, MAX 30 words.",
  "sections": [
    {
      "number": 1,
      "title": "Section title",
      "description": "2-3 sentences describing what this section covers",
      "exercises": ["Exercise 1", "Exercise 2", "Exercise 3"],
      "outcome": "VERB PHRASE only. Must NOT start with 'You', 'Readers', 'By the end', 'will', 'can', or 'be able to'. Start with a lowercase action verb."
    }
  ],
  "who_its_for": "Start with 'For…'. MAX 60 words.",
  "what_youll_get": [
    {
      "name": "Exact deliverable name",
      "type": "canvas | planner | tracker | playbook | story | vision | worksheet",
      "purpose": "ONE sentence: what the reader uses it for",
      "linked_section": 1
    }
  ],
  "pricing_recommendation": "free" | "paid",
  "suggested_price_usd": 0,
  "free_rationale": "Why FREE works: 2-3 sentences.",
  "paid_rationale": "Why PAID works: 2-3 sentences referencing market price bands.",
  "pricing_rationale": "Short single-sentence summary of the recommended path",
  "sales_page": {
    "headline": "Sales page headline",
    "subheadline": "Supporting subheadline",
    "pain_point": "2-3 sentences",
    "solution_statement": "2-3 sentences",
    "cta_button_text": "e.g., Download Free Workbook"
  },
  "abby_summary": "2-3 sentence summary from ABBY"
}

CRITICAL STRUCTURE RULES:
- "sections" array MUST have EXACTLY 5 items, mapped to the book's chapters/themes.
- "what_youll_get" array MUST have EXACTLY 4 items. Each item MUST be an OBJECT with name/type/purpose/linked_section.
- "linked_section" must be a section number (1-5).
- Re-check every "outcome" before returning.

PRICING GUIDANCE — Recommend whichever path serves THIS author best, but ALWAYS provide both rationales.
Make everything specific to this author's book.` }
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error(`generate-${NODE_ID} ai-gateway error:`, aiRes.status, errText.slice(0, 500));
      return failResponse(aiGatewayErrorMessage(aiRes.status, errText));
    }
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");

    if (Array.isArray(content.sections)) {
      content.sections = content.sections.map((s: Record<string, unknown>) => ({
        ...s,
        outcome: normalizeOutcome(s.outcome as string | undefined),
      }));
    }

    content.abby_recommendation = content.pricing_recommendation === "paid" ? "paid" : "free";
    content.abby_recommended_price_usd = Number(content.suggested_price_usd) || 0;

    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready",
      current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.workbook_title,
      price_usd: Number(content.suggested_price_usd ?? 0),
      currency: "usd",
      delivery_type: "workbook",
    }, book?.id ?? book_id ?? null);

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    if (priorNodeState && parsedAuthorId) {
      try { await upsertAuthorNode(supabase, parsedAuthorId, NODE_ID, NODE_NAME, priorNodeState, parsedBookId); }
      catch (e) { console.error(`generate-${NODE_ID} restore error:`, errorMessage(e)); }
    }
    const message = errorMessage(err);
    console.error(`generate-${NODE_ID} error:`, message);
    return failResponse(message);
  }
});}
```

---

## BP-07 · Home Study Course

- **Edge function**: `supabase/functions/generate-bp07-coaching/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `8192`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Create`, `bookTitle`, `author`, `bookSubtitle`, `coreThesis`, `JSON`, `ctx`, `NODE_ID`

### system

```text
You are ABBY, the AI business agent for Authors Bureau. Always personalise everything. Always respond with valid JSON only — no markdown, no code fences.

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Create a self-paced home study course for ${author.pen_name}'s book '${bookTitle}'.

Author details:
- Author name: ${author.pen_name}
- Book title: ${bookTitle}
- Book subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
- Unique insights: ${JSON.stringify(ctx?.unique_insights ?? [])}
- Genre/Niche: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}

Generate as JSON with these exact keys:
{
  "programme_title": "Compelling home study programme title",
  "programme_subtitle": "One-line subtitle",
  "tagline": "Short punchy tagline",
  "duration": "e.g., 21 days",
  "format": "e.g., Daily reading + exercises, 15-30 min/day",
  "transformation_promise": "Core transformation",
  "study_weeks": [
    {
      "week": 1,
      "title": "Week title",
      "theme": "One-line theme",
      "days": [
        { "day": 1, "reading": "Chapter/section to read", "exercise": "Practical exercise", "reflection": "Reflection prompt", "action": "One concrete action item" }
      ]
    }
  ],
  "who_its_for": "2-3 sentences",
  "what_youll_get": ["Deliverable 1", "Deliverable 2", "Deliverable 3"],
  "suggested_price_usd": 47,
  "pricing_rationale": "One sentence",
  "sales_page": { "headline": "...", "subheadline": "...", "pain_point": "2-3 sentences", "solution_statement": "2-3 sentences", "cta_button_text": "Start Your Journey" },
  "abby_summary": "2-3 sentence summary"
}

study_weeks must have exactly 3 items (Week 1, Week 2, Week 3). Each week must have exactly 7 days. Make everything specific to this author's book content.` }
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error(`generate-${NODE_ID} ai-gateway error:`, aiRes.status, errText.slice(0, 500));
      return failResponse(aiGatewayErrorMessage(aiRes.status, errText));
    }
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");

    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready",
      current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.programme_title,
      price_usd: Number(content.suggested_price_usd ?? 47),
      currency: "usd",
      delivery_type: "home_study",
    }, book?.id ?? book_id ?? null);

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    if (priorNodeState && parsedAuthorId) {
      try { await upsertAuthorNode(supabase, parsedAuthorId, NODE_ID, NODE_NAME, priorNodeState, parsedBookId); }
      catch (e) { console.error(`generate-${NODE_ID} restore error:`, errorMessage(e)); }
    }
    const message = errorMessage(err);
    console.error(`generate-${NODE_ID} error:`, message);
    return failResponse(message);
  }
});}
```

---

## BP-08 · Special Editions

- **Edge function**: `supabase/functions/generate-bp08-mastermind/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `8000`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Create`, `bookTitle`, `author`, `bookSubtitle`, `coreThesis`, `JSON`, `ctx`, `NODE_ID`

### system

```text
You are ABBY, the AI business agent for Authors Bureau. Always personalise everything. Always respond with valid JSON only — no markdown, no code fences.

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Create special edition book concepts for ${author.pen_name}'s book '${bookTitle}'.

Author details:
- Author name: ${author.pen_name}
- Book title: ${bookTitle}
- Book subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
- Unique insights: ${JSON.stringify(ctx?.unique_insights ?? [])}
- Genre/Niche: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}

Generate as JSON with these exact keys:
{
  "edition_title": "Special Edition collection title",
  "edition_subtitle": "One-line subtitle",
  "tagline": "Short punchy tagline",
  "editions": [
    {
      "number": 1,
      "name": "Edition name (e.g., 'Signed Collector's Edition')",
      "description": "2-3 sentences describing this edition",
      "includes": ["Item 1", "Item 2", "Item 3"],
      "print_specs": "e.g., Hardcover, gold foil, ribbon bookmark",
      "suggested_price_usd": 49
    }
  ],
  "bundle_offer": {
    "name": "Complete Collection Bundle",
    "description": "2-3 sentences",
    "includes_editions": [1, 2, 3],
    "suggested_price_usd": 129,
    "savings_note": "Save $X vs buying separately"
  },
  "who_its_for": "2-3 sentences",
  "marketing_angle": "2-3 sentences on positioning",
  "suggested_price_usd": 49,
  "pricing_rationale": "One sentence",
  "sales_page": {
    "headline": "Sales page headline",
    "subheadline": "Supporting subheadline",
    "exclusivity_statement": "2-3 sentences about limited availability",
    "cta_button_text": "e.g., Order Special Edition"
  },
  "abby_summary": "2-3 sentence summary"
}

editions must have exactly 3 items. Make everything specific.` }
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error(`generate-${NODE_ID} ai-gateway error:`, aiRes.status, errText.slice(0, 500));
      return failResponse(aiGatewayErrorMessage(aiRes.status, errText));
    }
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");

    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready",
      current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.edition_title,
      price_usd: Number(content.suggested_price_usd ?? 49),
      currency: "usd",
      delivery_type: "special_edition",
    }, book?.id ?? book_id ?? null);

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    if (priorNodeState && parsedAuthorId) {
      try { await upsertAuthorNode(supabase, parsedAuthorId, NODE_ID, NODE_NAME, priorNodeState, parsedBookId); }
      catch (e) { console.error(`generate-${NODE_ID} restore error:`, errorMessage(e)); }
    }
    const message = errorMessage(err);
    console.error(`generate-${NODE_ID} error:`, message);
    return failResponse(message);
  }
});}
```

---

## BP-09 · Speaking Decks

- **Edge function**: `supabase/functions/generate-bp09-speaking/index.ts`
- **Model**: `openai/gpt-5.2`
- **Max tokens**: `12000`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Build`, `bookTitle`, `author`, `bookSubtitle`, `coreThesis`, `JSON`, `ctx`, `NODE_ID`

### system

```text
You are ABBY, the AI business agent for Authors Bureau. You build live-audience conversion toolkits — sales pitches, slide decks, scripts — that help authors sell books and book speaking gigs at workshops, signings, and corporate lunches. Always personalise to the author's book, framework, and audience. Always respond with valid JSON only — no markdown, no code fences.

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Build a Live Audience Conversion Toolkit for ${author.pen_name}'s book "${bookTitle}".

Author details:
- Pen name: ${author.pen_name}
- Bio: ${author.bio_short || author.bio_long || "N/A"}
- Book title: ${bookTitle}
- Book subtitle: ${bookSubtitle || "N/A"}
- Core thesis: ${coreThesis}
- Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}
- Key frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}
- Unique insights: ${JSON.stringify(ctx?.unique_insights ?? [])}
- Genre/Niche: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}

Generate a JSON object with EXACTLY these keys (no extras, no markdown):

{
  "kit_title": "${bookTitle} — Live Audience Conversion Toolkit",
  "tagline": "Punchy one-liner positioning the toolkit",
  "abby_summary": "2-3 sentences explaining what's inside and how to use it",

  "shared_assets": {
    "bio_30s": "30-second host introduction (about 75 words)",
    "bio_60s": "60-second host introduction (about 150 words)",
    "bio_2min": "2-minute host introduction (about 300 words)",
    "elevator_pitch": "3-line elevator pitch for impromptu networking",
    "objection_responses": [
      { "objection": "I'll just buy it on Amazon later", "response": "..." },
      { "objection": "I don't read much", "response": "..." },
      { "objection": "Too expensive", "response": "..." },
      { "objection": "I'll think about it", "response": "..." },
      { "objection": "Can you sign it for my friend instead?", "response": "..." }
    ]
  },

  "workshop": {
    "talk_outline": [
      { "section": "Hook", "duration_min": 5, "content": "What to say/do", "speaker_notes": "Delivery tips" },
      { "section": "Story", "duration_min": 10, "content": "...", "speaker_notes": "..." },
      { "section": "Framework Teach", "duration_min": 25, "content": "...", "speaker_notes": "..." },
      { "section": "Live Exercise", "duration_min": 15, "content": "...", "speaker_notes": "..." },
      { "section": "Offer & Close", "duration_min": 5, "content": "...", "speaker_notes": "..." }
    ],
    "pitch_script": "Word-for-word 3-minute transition script that bridges teaching to book sale. Keep it personal, value-first, no hard sell.",
    "slides": [
      { "n": 1, "title": "Title slide", "body": "${bookTitle} by ${author.pen_name}", "speaker_notes": "Welcome the room. Thank the host." },
      { "n": 2, "title": "Pain point 1", "body": "...", "speaker_notes": "..." },
      { "n": 3, "title": "Pain point 2", "body": "...", "speaker_notes": "..." },
      { "n": 4, "title": "Pain point 3", "body": "...", "speaker_notes": "..." },
      { "n": 5, "title": "Framework introduction", "body": "...", "speaker_notes": "..." },
      { "n": 6, "title": "Framework pillar 1", "body": "...", "speaker_notes": "..." },
      { "n": 7, "title": "Framework pillar 2", "body": "...", "speaker_notes": "..." },
      { "n": 8, "title": "Framework pillar 3", "body": "...", "speaker_notes": "..." },
      { "n": 9, "title": "Case study 1", "body": "...", "speaker_notes": "..." },
      { "n": 10, "title": "Case study 2", "body": "...", "speaker_notes": "..." },
      { "n": 11, "title": "Live exercise", "body": "...", "speaker_notes": "..." },
      { "n": 12, "title": "Offer slide", "body": "Get the book — back of room", "speaker_notes": "..." },
      { "n": 13, "title": "QR code slide", "body": "Scan to grab your copy + bonus", "speaker_notes": "..." },
      { "n": 14, "title": "Thank you", "body": "Connect with me", "speaker_notes": "..." }
    ],
    "back_of_room_close": "Word-for-word 90-second script for what to say standing at the table after the talk",
    "handout_outline": "One-page handout text — title, 5 key takeaways, framework summary, where to learn more"
  },

  "book_signing": {
    "reading_passages": [
      { "chapter": "Chapter X", "why": "Why this passage hooks listeners", "bridge_to_next": "How to bridge to the next reading or Q&A" },
      { "chapter": "Chapter Y", "why": "...", "bridge_to_next": "..." },
      { "chapter": "Chapter Z", "why": "...", "bridge_to_next": "..." }
    ],
    "qa_seed_questions": [
      { "q": "Pre-planted question 1", "a": "Polished 60-90 second answer" },
      { "q": "Pre-planted question 2", "a": "..." },
      { "q": "Pre-planted question 3", "a": "..." },
      { "q": "Pre-planted question 4", "a": "..." },
      { "q": "Pre-planted question 5", "a": "..." },
      { "q": "Pre-planted question 6", "a": "..." },
      { "q": "Pre-planted question 7", "a": "..." },
      { "q": "Pre-planted question 8", "a": "..." }
    ],
    "signing_table_script": "30-second per-person script: greet, capture name, ask one question, sign with personalised inscription",
    "inscription_templates": [
      { "for": "the dreamer", "text": "Personalised inscription for someone with big aspirations" },
      { "for": "the rebuilder", "text": "..." },
      { "for": "the leader", "text": "..." },
      { "for": "the seeker", "text": "..." },
      { "for": "the gift-buyer", "text": "..." }
    ],
    "email_capture_ask": "Exact words to use to capture email at the table, plus what they get in return"
  },

  "corporate_lunch": {
    "slides": [
      { "n": 1, "title": "Title slide", "body": "${bookTitle} — for [Company]", "speaker_notes": "..." },
      { "n": 2, "title": "Why this matters to your business", "body": "...", "speaker_notes": "..." },
      { "n": 3, "title": "The cost of not addressing this", "body": "...", "speaker_notes": "..." },
      { "n": 4, "title": "Framework overview", "body": "...", "speaker_notes": "..." },
      { "n": 5, "title": "Application: Productivity", "body": "...", "speaker_notes": "..." },
      { "n": 6, "title": "Application: Leadership", "body": "...", "speaker_notes": "..." },
      { "n": 7, "title": "Application: Retention", "body": "...", "speaker_notes": "..." },
      { "n": 8, "title": "ROI snapshot", "body": "...", "speaker_notes": "..." },
      { "n": 9, "title": "How to roll this out", "body": "...", "speaker_notes": "..." },
      { "n": 10, "title": "Next steps", "body": "Bulk order + follow-up Q&A", "speaker_notes": "..." }
    ],
    "roi_talking_points": [
      { "metric": "Productivity uplift", "framing": "How this book's framework moves the metric" },
      { "metric": "Leadership pipeline", "framing": "..." },
      { "metric": "Employee retention", "framing": "..." }
    ],
    "bulk_proposal": {
      "tier_10": { "books": 10, "price_usd": 199, "includes": ["10 signed paperbacks", "Email follow-up template"] },
      "tier_50": { "books": 50, "price_usd": 899, "includes": ["50 signed paperbacks", "30-min team Q&A call", "Discussion guide"] },
      "tier_200": { "books": 200, "price_usd": 3299, "includes": ["200 signed paperbacks", "60-min on-site or virtual workshop", "Custom discussion guide", "Manager toolkit"] }
    },
    "followup_emails": [
      { "day": 1, "subject": "Thank you for hosting me at [Company]", "body": "..." },
      { "day": 7, "subject": "The ROI recap I promised", "body": "..." },
      { "day": 14, "subject": "Ready to roll this out across your team?", "body": "..." }
    ]
  }
}

Rules:
- Ground every word in the actual book thesis, frameworks, and audience above. No generic filler.
- Workshop slides: exactly 14. Corporate slides: exactly 10. QA seed questions: exactly 8. Inscription templates: exactly 5. Objection responses: exactly 5. Reading passages: exactly 3. Talk outline: exactly 5 sections. Followup emails: exactly 3.
- Speaker notes on every slide must be 1-2 sentences of practical delivery guidance.
- Pitch script and back-of-room close must be word-for-word, ready to read aloud.
- Bulk proposal pricing should reflect a realistic per-book discount as quantity scales.
- No emdashes (use commas, parentheses, or "and"). No markdown.` }
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error(`generate-${NODE_ID} ai-gateway error:`, aiRes.status, errText.slice(0, 500));
      return failResponse(aiGatewayErrorMessage(aiRes.status, errText));
    }
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");

    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready",
      current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.kit_title,
      price_usd: 0,
      currency: "usd",
      delivery_type: "speaking_kit",
    }, book?.id ?? book_id ?? null);

    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    if (priorNodeState && parsedAuthorId) {
      try { await upsertAuthorNode(supabase, parsedAuthorId, NODE_ID, NODE_NAME, priorNodeState, parsedBookId); }
      catch (e) { console.error(`generate-${NODE_ID} restore error:`, errorMessage(e)); }
    }
    const message = errorMessage(err);
    console.error(`generate-${NODE_ID} error:`, message);
    return failResponse(message);
  }
});}
```

---

## YR-19 · 1:1 Coaching

- **Edge function**: `supabase/functions/generate-yr19-coaching/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `16000`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Design`, `bookTitle`, `coreThesis`, `JSON`, `ctx`

### system

```text
You are ABBY. Personalise everything to the author's book. Respond with ONLY valid JSON (no markdown).

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Design a complete 1-on-1 coaching practice for ${author.pen_name}'s book '${bookTitle}'. Core thesis: ${coreThesis}. Target audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}. Key frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}. Genre: ${ctx?.genre || book?.genre || author.genres?.[0] || "General"}.
Generate JSON: {"practice_title","tagline","coaching_philosophy":"2-3 sentences","packages":[3 items: entry($297), mid($2997), premium($4997), each with package_name/duration/price_usd/description/outcomes[3]/ideal_for],"discovery_call_script":{"opening","key_questions":[5],"closing"},"client_agreement_outline":[5 clauses],"abby_summary"}` }
      ], max_completion_tokens: 16000 }),
    });
    if (!aiRes.ok) return failResponse(aiGatewayErrorMessage(aiRes.status, await aiRes.text()));
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");
    await upsertAuthorNode(supabase, author_id, NODE_ID, NODE_NAME, {
      status: "content_ready", current_step: 2,
      content_json: { ...content, _currentStep: 2 },
      personalised_name: content.practice_title,
      price_usd: Number(content.packages?.[1]?.price_usd ?? 2997),
      currency: "usd", delivery_type: "coaching",
    }, book?.id ?? book_id ?? null);
    return new Response(JSON.stringify({ success: true, content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });}
```

---

## YR-20 · Big-Ticket Offer

- **Edge function**: `supabase/functions/generate-yr20-big-ticket/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `16000`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Design`, `bookTitle`, `coreThesis`, `JSON`

### system

```text
You are ABBY. Personalise everything. Respond with ONLY valid JSON (no markdown).

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Design 3 premium big-ticket transformation packages for ${author.pen_name}'s book '${bookTitle}'. Core thesis: ${coreThesis}. Audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}. Frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}.
Generate JSON: {"offers":[3 items at $5000/$12000/$25000 each with offer_name/price_usd/duration/format/transformation_promise/what_included[5-7]/ideal_client/urgency_element],"sales_conversation_guide":{"opening","discovery_questions":[3],"presenting_the_offer","handling_objections":["Objection + response","Objection + response"]},"abby_summary"}` }
      ], max_completion_tokens: 16000 }),
    });
    if (!aiRes.ok) return failResponse(aiGatewayErrorMessage(aiRes.status, await aiRes.text()));
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");
    await upsertAuthorNode(supabase}
```

---

## YR-21 · Paid Speaking

- **Edge function**: `supabase/functions/generate-yr21-speaking/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `16000`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Build`, `bookTitle`, `coreThesis`, `JSON`

### system

```text
You are ABBY. Personalise everything. Respond with ONLY valid JSON (no markdown).

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Build a complete keynote speaking business for ${author.pen_name}, author of '${bookTitle}'. Core thesis: ${coreThesis}. Audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}. Frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}.
Generate JSON: {"speaker_brand","speaker_tagline","signature_talks":[3 items with talk_title/duration_options[4]/audience/key_takeaways[3]/description/opening_hook],"fee_schedule":{"keynote_half_day":{"label","fee_range"},"keynote_full_day":{"label","fee_range"},"virtual_keynote":{"label","fee_range"},"corporate_training":{"label","fee_range"},"international":{"label","fee_range"}},"speaker_one_sheet":{"headline","bio_short","bio_long","topics":[3],"past_clients_placeholder":[3]},"booking_process":[4 steps],"abby_summary"}` }
      ], max_completion_tokens: 16000 }),
    });
    if (!aiRes.ok) return failResponse(aiGatewayErrorMessage(aiRes.status, await aiRes.text()));
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");
    await upsertAuthorNode(supabase}
```

---

## YR-22 · Corporate Training

- **Edge function**: `supabase/functions/generate-yr22-corporate/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `16000`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Design`, `bookTitle`, `coreThesis`, `JSON`

### system

```text
You are ABBY. Personalise everything. Respond with ONLY valid JSON (no markdown).

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Design a corporate training programme for ${author.pen_name}'s book '${bookTitle}'. Core thesis: ${coreThesis}. Audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}. Frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}.
Generate JSON: {"programme_title","tagline","target_organisations":[3],"training_formats":[4 items: Half-Day($5000)/Full-Day($10000)/2-Day($18000)/Online Cohort($8000), each with format/duration/participants/price_usd],"learning_outcomes":[5],"programme_outline":[4 modules with module/title/duration/description],"proposal_template":{"executive_summary","the_challenge","the_solution","investment","next_steps"},"abby_summary"}` }
      ], max_completion_tokens: 16000 }),
    });
    if (!aiRes.ok) return failResponse(aiGatewayErrorMessage(aiRes.status, await aiRes.text()));
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");
    await upsertAuthorNode(supabase}
```

---

## YR-23 · Mastermind

- **Edge function**: `supabase/functions/generate-yr23-mastermind/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `16000`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Design`, `bookTitle`, `coreThesis`, `JSON`

### system

```text
You are ABBY. Personalise everything. Respond with ONLY valid JSON (no markdown).

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Design an exclusive mastermind programme for ${author.pen_name}'s book '${bookTitle}'. Core thesis: ${coreThesis}. Audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}. Frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}.
Generate JSON: {"mastermind_title","tagline","programme_promise","membership_tiers":[2 items: Inner Circle($5000/yr, 12 members) and Elite Circle($15000/yr, 6 members), each with tier_name/price_annual_usd/group_size/meeting_cadence/benefits[4-5]],"curriculum_pillars":[4],"application_questions":[5],"sales_page":{"headline","subheadline","who_its_for","what_youll_get":[4],"cta_button_text"},"abby_summary"}` }
      ], max_completion_tokens: 16000 }),
    });
    if (!aiRes.ok) return failResponse(aiGatewayErrorMessage(aiRes.status, await aiRes.text()));
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");
    await upsertAuthorNode(supabase}
```

---

## YR-24 · Retreats

- **Edge function**: `supabase/functions/generate-yr24-retreats/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `16000`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Design`, `bookTitle`, `coreThesis`, `JSON`

### system

```text
You are ABBY. Personalise everything. Respond with ONLY valid JSON (no markdown).

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Design a complete retreat experience for ${author.pen_name}'s book '${bookTitle}'. Core thesis: ${coreThesis}. Audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}. Frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}.
Generate JSON: {"retreat_title","tagline","retreat_concept","retreat_options":[2: Weekend($3000/person, 3 days/2 nights, 10-15 ppl) and Week-Long($10000/person, 7 days/6 nights, 8-10 ppl), each with format/duration/location_type/group_size/price_per_person_usd/includes[5-7]],"sample_itinerary":[3 days, each with day/title/morning/afternoon/evening],"transformation_arc","abby_summary"}` }
      ], max_completion_tokens: 16000 }),
    });
    if (!aiRes.ok) return failResponse(aiGatewayErrorMessage(aiRes.status, await aiRes.text()));
    const aiData = await aiRes.json();
    const content = parseAiJson(aiData.choices?.[0]?.message?.content || "");
    await upsertAuthorNode(supabase}
```

---

## YR-25 · Certification

- **Edge function**: `supabase/functions/generate-yr25-certification/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `16000`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Design`, `bookTitle`, `coreThesis`, `JSON`

### system

```text
You are ABBY. Personalise everything. Respond with ONLY valid JSON (no markdown).

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Design a certification programme for ${author.pen_name}'s book '${bookTitle}'. Core thesis: ${coreThesis}. Frameworks: ${JSON.stringify(ctx?.key_frameworks ?? [])}.
Generate JSON: {"certification_title","tagline","certification_promise","programme_structure":{"duration","format","assessment_method","pass_mark"},"modules":[6 items with number/title/description/assessment],"certification_levels":[3: Associate($2000)/Certified($3500)/Master($5000), each with level/price_usd/requirements],"badge_concept":{"badge_name","badge_description","display_guidance"},"abby_summary"}` }
      ], max_completion_tokens: 16000 })}
```

---

## YR-26 · Conference

- **Edge function**: `supabase/functions/generate-yr26-conference/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `16000`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Design`, `bookTitle`, `coreThesis`, `JSON`

### system

```text
You are ABBY. Personalise everything. Respond with ONLY valid JSON (no markdown).

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Design a conference for ${author.pen_name}'s book '${bookTitle}'. Core thesis: ${coreThesis}. Audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}.
Generate JSON: {"conference_title","tagline","conference_concept","event_formats":[3: Virtual Summit($97,unlimited)/In-Person($497,200)/VIP Day($1997,20), each with format/duration/capacity/ticket_price_usd/description],"programme_outline":[5 sessions with session_type/title/description],"sponsorship_packages":[3: Gold($5000)/Silver($2500)/Bronze($1000), each with tier/price_usd/benefits[1-3]],"abby_summary"}` }
      ], max_completion_tokens: 16000 })}
```

---

## YR-27 · Fundraising

- **Edge function**: `supabase/functions/generate-yr27-fundraising/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `16000`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Design`, `bookTitle`, `coreThesis`, `JSON`

### system

```text
You are ABBY. Personalise everything. Respond with ONLY valid JSON (no markdown).

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Design a fundraising campaign for ${author.pen_name}'s book '${bookTitle}'. Core thesis: ${coreThesis}. Audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}.
Generate JSON: {"campaign_title","tagline","cause_alignment","campaign_goal_usd":25000,"campaign_duration_days":30,"donation_tiers":[4: Supporter($25)/Champion($100)/Patron($500)/Benefactor($2500), each with tier_name/amount_usd/benefit],"donor_communication_plan":[5 emails at days 0/7/14/28/31, each with day/type/subject/summary],"impact_statement","abby_summary"}` }
      ], max_completion_tokens: 16000 })}
```

---

## YR-28 · Sponsors

- **Edge function**: `supabase/functions/generate-yr28-sponsors/index.ts`
- **Model**: `openai/gpt-5`
- **Max tokens**: `16000`
- **Prompt blocks extracted**: 2
- **Dynamic variables**: ``Design`, `bookTitle`, `coreThesis`, `JSON`

### system

```text
You are ABBY. Personalise everything. Respond with ONLY valid JSON (no markdown).

HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier labels (Associate, Pro, Premium) in titles, taglines, headlines, body copy, descriptions, or CTA labels. Pricing belongs only in the dedicated price_usd field.
- Every list item (offer, package, module, episode, lesson, bundle) MUST include a concrete, descriptive title or name. NEVER output placeholders like 'Offer 1', 'Module 1: TBD', '[AUTHOR NAME]', 'Lorem ipsum'.
- Use the author's brand vocabulary verbatim (frameworks, signature phrases, proper nouns).
```

### user

```text
${`Design a sponsorship & exhibitor programme for ${author.pen_name}'s events around '${bookTitle}'. Core thesis: ${coreThesis}. Audience: ${JSON.stringify(ctx?.target_audience_persona ?? {})}.
Generate JSON: {"programme_title","tagline","audience_profile","sponsorship_packages":[4: Platinum($25000,1 sponsor)/Gold($10000,max 3)/Silver($5000,max 5)/Exhibitor($500,limited), each with tier/price_usd/description/benefits[1-5]/exclusivity],"pitch_deck_outline":[5 slides with slide/title/content_summary],"outreach_strategy":{"target_sponsors","outreach_message","follow_up_cadence"},"abby_summary"}` }
      ], max_completion_tokens: 16000 })}
```

---

