/**
 * Shared content rules for public microsites.
 *
 * Two exports:
 *  - HARD_RULES_PROMPT: drop-in system-prompt block for every generator.
 *  - sanitiseForPublic(value): recursive output sanitiser used by get-microsite-page
 *    so existing rows on disk are cleaned at render time without re-running generators.
 */

export const HARD_RULES_PROMPT = `
HARD CONTENT RULES (output that violates these will fail QA):
- NEVER use the emdash character (—, U+2014) or endash (–, U+2013).
  Use commas, periods, or " - " (regular hyphen with spaces) for ranges.
- NEVER include dollar amounts, prices, currency symbols, or pricing tier
  labels ("Associate", "Pro", "Premium") in titles, taglines, headlines,
  body copy, descriptions, or CTA labels. Pricing belongs only in the
  dedicated price_usd field, never in prose.
- Every list item (offer, package, module, episode, lesson, bundle) MUST
  include a concrete, descriptive title or name. NEVER output placeholders
  like "Offer 1", "Module 1: TBD", "[AUTHOR NAME]", "Lorem ipsum".
- Use the author's brand vocabulary verbatim (frameworks, signature phrases,
  proper nouns) exactly as supplied in the context.
`.trim();

/**
 * Replace emdash / endash with sensible ASCII alternates.
 * Between digits (e.g. "5-10") use a hyphen; otherwise a comma+space.
 */
function stripDashesString(input: string): string {
  if (!input || typeof input !== "string") return input;
  let out = input;
  // Emdash and endash between digits → hyphen with spaces (number range).
  out = out.replace(/(\d)\s*[—–]\s*(\d)/g, "$1 - $2");
  // Otherwise → comma + space (preserves sentence flow).
  out = out.replace(/\s*—\s*/g, ", ");
  out = out.replace(/\s*–\s*/g, ", ");
  // Collapse accidental ", ," patterns the previous replace can create.
  out = out.replace(/,\s*,/g, ",");
  return out;
}

/**
 * Recursively walk a JSON-safe value and clean every string leaf.
 * Skips keys that look like URLs / IDs / dates so we don't mangle them.
 */
const PROTECTED_KEY_PATTERN = /(_url$|_uri$|_id$|^id$|_at$|^slug$|^email$|^image$|^photo$)/i;

export function sanitiseForPublic<T>(value: T, parentKey = ""): T {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (parentKey && PROTECTED_KEY_PATTERN.test(parentKey)) return value;
    return stripDashesString(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitiseForPublic(v, parentKey)) as unknown as T;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitiseForPublic(v as unknown, k);
    }
    return out as unknown as T;
  }
  return value;
}
