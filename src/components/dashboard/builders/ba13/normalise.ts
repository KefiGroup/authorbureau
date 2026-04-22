/**
 * Normalises BA-13 (Group Coaching) content to the new shape.
 * Idempotent.
 *
 * Legacy: curriculum: [{ week, title, focus, homework }]
 * New:    weeks:      [{ week_number, title, description, activity }]
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normaliseGroupCoaching(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;
  return {
    ...raw,
    weeks: Array.isArray(raw.weeks)
      ? raw.weeks
      : Array.isArray(raw.curriculum)
        ? raw.curriculum.map((c: any, i: number) => ({
            week_number: c.week ?? i + 1,
            title: c.title,
            description: c.focus || c.description || "",
            activity: c.homework || c.activity || "",
          }))
        : [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isLegacyGroupCoaching(raw: any): boolean {
  return !raw || !Array.isArray(raw.weeks) || raw.weeks.length === 0;
}
