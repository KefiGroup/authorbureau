/**
 * Utility functions extracted from UniversalBuilderStudio.
 * Handles JSON extraction, home-study day parsing, course module building, etc.
 */

export function extractBalancedJsonBlock(source: string, openChar: "[" | "{", closeChar: "]" | "}"): string | null {
  for (let start = source.indexOf(openChar); start !== -1; start = source.indexOf(openChar, start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < source.length; i++) {
      const char = source[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === openChar) depth += 1;
      if (char === closeChar) {
        depth -= 1;
        if (depth === 0) {
          return source.slice(start, i + 1).trim();
        }
      }
    }
  }

  return null;
}

export function extractHomeStudyDaysFromContent(rawContent: string): Array<Record<string, string | number | boolean>> {
  const trimmed = (rawContent || "").trim();
  if (!trimmed) return [];

  const candidates: string[] = [trimmed];
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) candidates.unshift(fencedMatch[1].trim());

  const arrayCandidate = extractBalancedJsonBlock(trimmed, "[", "]");
  if (arrayCandidate) candidates.push(arrayCandidate);

  const objectCandidate = extractBalancedJsonBlock(trimmed, "{", "}");
  if (objectCandidate) candidates.push(objectCandidate);

  const seen = new Set<string>();
  for (const candidate of candidates) {
    const normalized = candidate.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);

    try {
      const parsed = JSON.parse(normalized);
      const rawDays = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.days)
          ? parsed.days
          : Array.isArray(parsed?.daily_schedule)
            ? parsed.daily_schedule
            : [];

      if (!Array.isArray(rawDays) || rawDays.length === 0) continue;

      return rawDays.map((day: Record<string, unknown>, idx: number) => {
        const dayNumber = Number(day?.dayNumber ?? day?.day_number ?? idx + 1);
        const weekNumber = Number(day?.weekNumber ?? day?.week_number ?? Math.floor((dayNumber - 1) / 7) + 1);

        return {
          id: typeof day?.id === "string" && day.id ? day.id : crypto.randomUUID(),
          dayNumber,
          weekNumber,
          theme: String(day?.theme ?? ""),
          chapterRef: String(day?.chapterRef ?? day?.chapter_ref ?? ""),
          reading: String(day?.reading ?? day?.concept ?? ""),
          concept: String(day?.concept ?? day?.reading ?? ""),
          exercise: String(day?.exercise ?? ""),
          reflection: String(day?.reflection ?? ""),
          actionPlan: String(day?.actionPlan ?? day?.action_plan ?? ""),
          fieldAssignment: String(day?.fieldAssignment ?? day?.field_assignment ?? ""),
          accountabilityCheck: String(day?.accountabilityCheck ?? day?.accountability_check ?? ""),
          microHabit: String(day?.microHabit ?? day?.micro_habit ?? ""),
          isCatchUp: Boolean(day?.isCatchUp ?? day?.is_catch_up ?? (dayNumber % 7 === 0)),
        };
      });
    } catch {
      // try next parse candidate
    }
  }

  return [];
}

export function mapCoursePriceTier(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return "0";
  if (price <= 47) return "37";
  if (price <= 197) return "147";
  return "297";
}

export function buildCourseModulesFromStructure(structure: Record<string, unknown>[] | undefined): Array<Record<string, unknown>> {
  if (!Array.isArray(structure)) return [];

  const getStringArray = (value: any): string[] =>
    Array.isArray(value)
      ? value
          .map((item) => String(item ?? "").trim())
          .filter(Boolean)
      : [];

  return structure
    .filter((section) => section && (section.title || section.name || Array.isArray(section.items) || Array.isArray(section.lessons)))
    .map((section, moduleIndex) => {
      const learningObjectives = getStringArray(section.learning_objectives ?? section.learningObjectives);
      const sourceChapters = getStringArray(section.source_chapters ?? section.sourceChapters);
      const debriefPoints = getStringArray(section.debrief_points ?? section.debriefPoints);

      const rawLessonItems =
        (Array.isArray(section.items) && section.items) ||
        (Array.isArray(section.lessons) && section.lessons) ||
        (Array.isArray(section.topics) && section.topics) ||
        learningObjectives.map((objective) => ({ title: objective }));

      const lessons = rawLessonItems
        .map((item: any, lessonIndex: number) => {
          const normalized = typeof item === "string" ? { title: item } : (item || {});
          const title = String(
            normalized.title ||
            normalized.lesson_title ||
            normalized.name ||
            normalized.topic ||
            normalized.objective ||
            `Lesson ${lessonIndex + 1}`,
          ).trim();

          if (!title) return null;

          return {
            id: crypto.randomUUID(),
            title,
            description: String(normalized.description || normalized.summary || ""),
            keyTakeaway: String(normalized.keyTakeaway || normalized.key_takeaway || ""),
            estimatedMinutes: Number(normalized.estimatedMinutes ?? normalized.estimated_minutes) || 15,
            position: lessonIndex,
          };
        })
        .filter(Boolean) as Array<Record<string, any>>;

      if (lessons.length === 0) {
        lessons.push({
          id: crypto.randomUUID(),
          title: `${String(section.title || section.name || `Module ${moduleIndex + 1}`)} — Core Lesson`,
          description: String(section.description || section.content_summary || ""),
          keyTakeaway: "",
          estimatedMinutes: 15,
          position: 0,
        });
      }

      return {
        id: crypto.randomUUID(),
        moduleNumber: Number(section.module_number ?? section.moduleNumber) || moduleIndex + 1,
        title: String(section.title || section.name || `Module ${moduleIndex + 1}`),
        description: String(section.description || section.content_summary || section.contentSummary || ""),
        bloomsLevel: String(section.blooms_level || section.bloomsLevel || section.bloom_level || ""),
        kolbsStage: String(section.kolbs_stage || section.kolbsStage || section.kolb_stage || ""),
        learningObjectives,
        contentSummary: String(section.content_summary || section.contentSummary || section.description || ""),
        facilitatorActivity: String(section.facilitator_activity || section.facilitatorActivity || ""),
        debriefPoints: debriefPoints.length > 0 ? debriefPoints : ["", "", ""],
        workbookPageDescription: String(section.workbook_page || section.workbookPage || section.workbook_page_description || ""),
        durationMinutes: Number(section.duration_minutes ?? section.durationMinutes ?? section.duration) || 60,
        sourceChapters,
        position: moduleIndex,
        lessons,
      };
    });
}
