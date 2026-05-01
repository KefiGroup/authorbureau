/**
 * Single source of truth for the 7 universal special-edition occasions.
 * Used by:
 *  - SpecialEditionCalendarCard (dashboard strip)
 *  - SpecialEditionCalendarPage (12-month grid)
 *  - generate-nudges edge function (Seasonal Edition Triggers)
 *
 * The BP-08 builder's full OCCASION_TEMPLATES list still includes niche
 * occasions (birthday, corporate-gift, etc.) — those are intentionally
 * NOT on the calendar to keep it clean.
 */

export interface CalendarOccasion {
  /** Stable id — must match OCCASION_TEMPLATES ids in OccasionTemplateGrid.tsx */
  id: string;
  label: string;
  emoji: string;
  /** Peak gift-buying window (display only) */
  peakWindow: string;
  /** The peak / target launch date used for countdown math (month is 1-indexed) */
  peakMonth: number;
  peakDay: number;
  /** How many weeks before the peak we consider the "launch window" (Amazon print + marketing runway) */
  launchWindowWeeks: number;
  /** Default edition type (matches EDITION_TYPE_OPTIONS in SpecialEditionsStepRenderer) */
  defaultEditionType: "signed" | "collectors" | "gift-set" | "anniversary" | "illustrated";
  /** Default suggested price in USD */
  defaultPriceUsd: number;
  /** Pre-filled "Includes / Extras" suggestion */
  defaultIncludes: string;
}

export const CALENDAR_OCCASIONS: CalendarOccasion[] = [
  {
    id: "valentines",
    label: "Valentine's Day",
    emoji: "💝",
    peakWindow: "Jan 15 – Feb 14",
    peakMonth: 2,
    peakDay: 14,
    launchWindowWeeks: 10,
    defaultEditionType: "signed",
    defaultPriceUsd: 49,
    defaultIncludes:
      "Signed bookplate, themed Valentine's foreword, gift inscription page, ribbon bookmark, companion 'Letters of Love' reflection journal (PDF).",
  },
  {
    id: "mothers-day",
    label: "Mother's Day",
    emoji: "🌷",
    peakWindow: "Apr 15 – May 12",
    peakMonth: 5,
    peakDay: 12,
    launchWindowWeeks: 10,
    defaultEditionType: "collectors",
    defaultPriceUsd: 69,
    defaultIncludes:
      "Hardcover with sprayed edges, themed Mother's Day foreword, gift inscription page, signed bookplate, companion 'Letters of Gratitude' journal (PDF), author audio note.",
  },
  {
    id: "fathers-day",
    label: "Father's Day",
    emoji: "🛡",
    peakWindow: "May 15 – Jun 15",
    peakMonth: 6,
    peakDay: 15,
    launchWindowWeeks: 10,
    defaultEditionType: "signed",
    defaultPriceUsd: 59,
    defaultIncludes:
      "Signed limited copy, themed Father's Day foreword, leather-look bookmark, gift inscription page, companion 'Legacy & Leadership' reflection PDF.",
  },
  {
    id: "graduation",
    label: "Graduation",
    emoji: "🎓",
    peakWindow: "Apr 1 – Jun 30",
    peakMonth: 5,
    peakDay: 30,
    launchWindowWeeks: 10,
    defaultEditionType: "gift-set",
    defaultPriceUsd: 79,
    defaultIncludes:
      "Hardcover + Workbook gift set, themed Graduation foreword, signed bookplate, companion 'Career Action Plan' PDF, author audio congratulations.",
  },
  {
    id: "back-to-school",
    label: "Back to School",
    emoji: "📚",
    peakWindow: "Jul 15 – Sep 15",
    peakMonth: 9,
    peakDay: 1,
    launchWindowWeeks: 10,
    defaultEditionType: "gift-set",
    defaultPriceUsd: 69,
    defaultIncludes:
      "Signed copy + Workbook bundle, themed Back-to-School foreword, study planner insert, companion 'Growth Mindset' reflection PDF.",
  },
  {
    id: "thanksgiving",
    label: "Thanksgiving",
    emoji: "🦃",
    peakWindow: "Oct 15 - Nov 27",
    peakMonth: 11,
    peakDay: 27,
    launchWindowWeeks: 8,
    defaultEditionType: "collectors",
    defaultPriceUsd: 69,
    defaultIncludes:
      "Hardcover gratitude edition, themed Thanksgiving foreword, 'Season of Gratitude' reflection journal (PDF), signed bookplate, family-discussion guide, author audio gratitude note.",
  },
  {
    id: "christmas",
    label: "Christmas / Holiday",
    emoji: "🎁",
    peakWindow: "Oct 15 – Dec 25",
    peakMonth: 12,
    peakDay: 15,
    launchWindowWeeks: 10,
    defaultEditionType: "collectors",
    defaultPriceUsd: 99,
    defaultIncludes:
      "Hardcover gift edition with sprayed edges & dust jacket, themed holiday foreword, signed bookplate, gift box, companion 'Reflection & Gratitude' journal (PDF), author audio holiday message.",
  },
  {
    id: "new-year",
    label: "New Year",
    emoji: "✨",
    peakWindow: "Dec 15 – Jan 15",
    peakMonth: 1,
    peakDay: 1,
    launchWindowWeeks: 10,
    defaultEditionType: "signed",
    defaultPriceUsd: 59,
    defaultIncludes:
      "Limited numbered signed edition, themed New Year foreword, goal-setting insert, companion 'Year Ahead Planner' PDF, author audio kickoff note.",
  },
];

/** Get the next occurrence (today or future) of an occasion's peak date. */
export function nextOccurrence(occasion: CalendarOccasion, now: Date = new Date()): Date {
  const year = now.getFullYear();
  const thisYear = new Date(year, occasion.peakMonth - 1, occasion.peakDay);
  // Strip time when comparing
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (thisYear.getTime() >= today.getTime()) return thisYear;
  return new Date(year + 1, occasion.peakMonth - 1, occasion.peakDay);
}

export function daysUntil(occasion: CalendarOccasion, now: Date = new Date()): number {
  const target = nextOccurrence(occasion, now);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function weeksUntil(occasion: CalendarOccasion, now: Date = new Date()): number {
  return Math.max(0, Math.round(daysUntil(occasion, now) / 7));
}

export function isInLaunchWindow(occasion: CalendarOccasion, now: Date = new Date()): boolean {
  const wks = weeksUntil(occasion, now);
  return wks > 0 && wks <= occasion.launchWindowWeeks;
}

/** Get the next N upcoming occasions, sorted by soonest. */
export function getUpcomingOccasions(now: Date = new Date(), count: number = 3): CalendarOccasion[] {
  return [...CALENDAR_OCCASIONS]
    .sort((a, b) => daysUntil(a, now) - daysUntil(b, now))
    .slice(0, count);
}

export function findCalendarOccasion(id?: string | null): CalendarOccasion | undefined {
  if (!id) return undefined;
  return CALENDAR_OCCASIONS.find((o) => o.id === id);
}

/** Group occasions by month (1-12) for the full-calendar grid. */
export function occasionsByMonth(): Record<number, CalendarOccasion[]> {
  const map: Record<number, CalendarOccasion[]> = {};
  for (let m = 1; m <= 12; m++) map[m] = [];
  for (const o of CALENDAR_OCCASIONS) map[o.peakMonth].push(o);
  return map;
}

export const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
