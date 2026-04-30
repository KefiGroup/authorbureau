/**
 * Shared content rules for public microsites.
 *
 * Three enforcement layers compose around this single source of truth:
 *   Layer 1 (GENERATE): HARD_RULES_PROMPT injected into every generator.
 *   Layer 2 (SAVE):     validateForPublic + sanitiseForPublic before DB write
 *                       (see _shared/persist-node-content.ts).
 *   Layer 3 (RENDER):   sanitiseForPublic + ensurePrimaryCta in get-microsite-page.
 *
 * If a generator slips, the save layer catches it. If a row was saved before the
 * rule existed, the render layer cleans it. New authors inherit all three for free.
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
- NEVER use the words "exercise", "next-step", "next step", or "try this"
  in body copy. Use "step", "practice", "apply", or "what to do next".
- Use the author's brand vocabulary verbatim (frameworks, signature phrases,
  proper nouns) exactly as supplied in the context.
- Always include a clear primary call-to-action label appropriate to the node.
`.trim();

// ---------------------------------------------------------------------------
// String-level scrubbers (pure, idempotent)
// ---------------------------------------------------------------------------

/** Replace emdash / endash with sensible ASCII alternates. */
function stripDashesString(input: string): string {
  if (!input || typeof input !== "string") return input;
  let out = input;
  out = out.replace(/(\d)\s*[—–]\s*(\d)/g, "$1 - $2");
  out = out.replace(/\s*—\s*/g, ", ");
  out = out.replace(/\s*–\s*/g, ", ");
  out = out.replace(/,\s*,/g, ",");
  return out;
}

/**
 * Strip dollar amounts from prose strings.
 *  - "$27/month"               -> ""           (drop, may leave dangling word)
 *  - "Join the Circle for $27" -> "Join the Circle"
 *  - "$497 USD"                -> ""
 * Skipped when the parent JSON key is a known price field (price_usd, price,
 * amount, currency, *_price, *_amount).
 */
function stripPricingFromProseString(input: string): string {
  if (!input || typeof input !== "string") return input;
  let out = input;
  const before = out;
  // "for $27/month", "for $1,997", "for $27.50"
  out = out.replace(/\s+for\s+\$\s?\d[\d,]*(?:\.\d{1,2})?(?:\s?\/\s?\w+)?/gi, "");
  // "starting at $X", "from $X", "just $X"
  out = out.replace(/\s+(?:starting at|from|just|only|priced at)\s+\$\s?\d[\d,]*(?:\.\d{1,2})?(?:\s?\/\s?\w+)?/gi, "");
  // "($27/month)", "($1,997)"
  out = out.replace(/\s*\(\s*\$\s?\d[\d,]*(?:\.\d{1,2})?(?:\s?\/\s?\w+)?\s*\)/g, "");
  // Inline currency suffix "$27 USD", "$1997 usd"
  out = out.replace(/\$\s?\d[\d,]*(?:\.\d{1,2})?(?:\s?\/\s?\w+)?\s+(?:USD|usd)\b/g, "");
  // Catch-all for any remaining naked "$NN" / "$NN.NN" / "$NN/period",
  // optionally followed by a stranded comma ("$25,000, we").
  out = out.replace(/\$\s?\d[\d,]*(?:\.\d{1,2})?(?:\s?\/\s?\w+)?,?/g, "");
  if (out === before) {
    return out;
  }
  // Tidy: collapse whitespace, then peel any stranded preposition that lost
  // its noun phrase (e.g. "At $25,000, we will" -> "At  we will" -> "we will").
  out = out.replace(/\s{2,}/g, " ");
  for (let i = 0; i < 3; i++) {
    const prev = out;
    out = out.replace(ORPHAN_BEFORE_GAP_RE, "$1 ");
    out = out.replace(ORPHAN_BEFORE_PUNCT_RE, "$1");
    if (out === prev) break;
  }
  // Re-collapse + capitalise sentence-initial after orphan removal.
  out = out.replace(/\s{2,}/g, " ");
  out = out.replace(/^([a-z])/, (m) => m.toUpperCase());
  out = out.replace(/([.!?]\s+)([a-z])/g, (_m, p1, p2) => p1 + p2.toUpperCase());
  // Final tidy.
  out = out.replace(/\s+([.,;:!?])/g, "$1");
  out = out.replace(/\(\s*\)/g, "");
  out = out.replace(/,\s*,/g, ",");
  return out.trim();
}

const FORBIDDEN_WORD_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bnext-steps?\b/gi, "next step"],
  [/\bnext\s+steps?\b/gi, "next step"],
  [/\btry this\b/gi, "apply this"],
  [/\bexercises?\b/gi, "practice"],
];

/** Replace forbidden lead-magnet vocabulary in non-lead-magnet content. */
function stripForbiddenWordsString(input: string): string {
  if (!input || typeof input !== "string") return input;
  let out = input;
  for (const [pattern, replacement] of FORBIDDEN_WORD_REPLACEMENTS) {
    out = out.replace(pattern, (match) => {
      // Preserve capitalisation of the first character.
      if (match[0] === match[0].toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
  }
  return out;
}

const PLACEHOLDER_PATTERNS: RegExp[] = [
  /\[insert[^\]]*\]/gi,
  /\{\{[^}]+\}\}/g,
  /<<[^>]+>>/g,
  /\bLorem ipsum[^.]*\.?/gi,
  /\bTBD\b/g,
  /\bUntitled\b/g,
];

/** Drop bracketed placeholder tokens and obvious filler. */
function stripPlaceholdersString(input: string): string {
  if (!input || typeof input !== "string") return input;
  let out = input;
  let didStrip = false;
  for (const pattern of PLACEHOLDER_PATTERNS) {
    const before = out;
    out = out.replace(pattern, "");
    if (out !== before) didStrip = true;
  }
  if (!didStrip) {
    return out.replace(/\s{2,}/g, " ").trim();
  }

  // A placeholder was removed — clean up the grammatical wreckage.
  // Step 1: remove orphan prepositions that now sit before a double-space gap
  // (the gap is our marker that something was removed there). Loop because
  // chains like "by the [...]" leave two prepositions to peel.
  for (let i = 0; i < 3; i++) {
    const before = out;
    out = out.replace(ORPHAN_BEFORE_GAP_RE, "$1 ");
    out = out.replace(ORPHAN_BEFORE_PUNCT_RE, "$1");
    if (out === before) break;
  }
  // Step 2: collapse the gap.
  out = out.replace(/\s{2,}/g, " ");
  // Step 3: capitalise leading char + the first letter after sentence boundaries
  // (handles "...destiny. we will" -> "...destiny. We will" after orphan removal).
  out = out.replace(/^([a-z])/, (m) => m.toUpperCase());
  out = out.replace(/([.!?]\s+)([a-z])/g, (_m, p1, p2) => p1 + p2.toUpperCase());
  // Step 4: tidy stranded artefacts.
  out = out.replace(/\(\s*\)/g, "");
  out = out.replace(/,\s*,/g, ",");
  out = out.replace(/\s+([.,;:!?])/g, "$1");
  out = out.replace(/\s{2,}/g, " ").trim();
  return out;
}


// ---------------------------------------------------------------------------
// Recursive walker
// ---------------------------------------------------------------------------

const PROTECTED_KEY_PATTERN = /(_url$|_uri$|_id$|^id$|_at$|^slug$|^email$|^image$|^photo$|^href$)/i;
const PRICE_KEY_PATTERN = /(^price(_usd)?$|^amount$|^currency$|_price$|_amount$|^price_cents$)/i;

export interface SanitiseOptions {
  archetype?: string | null;
  nodeId?: string | null;
}

function isLeadMagnetNode(opts: SanitiseOptions): boolean {
  // Lead magnets keep their assessment vocabulary (e.g. "exercise" is allowed
  // when it's part of a quiz prompt). All BP-01/BP-02 nodes opt out of the
  // forbidden-word rule.
  return !!opts.nodeId && /^BP-(01|02)/i.test(opts.nodeId);
}

/**
 * Recursively walk a JSON-safe value and clean every string leaf.
 * Skips keys that look like URLs / IDs / dates / price fields.
 */
export function sanitiseForPublic<T>(
  value: T,
  optsOrParentKey: SanitiseOptions | string = {},
  parentKeyArg = "",
): T {
  // Backwards-compat: original signature was sanitiseForPublic(value, parentKey: string).
  let opts: SanitiseOptions;
  let parentKey: string;
  if (typeof optsOrParentKey === "string") {
    opts = {};
    parentKey = optsOrParentKey;
  } else {
    opts = optsOrParentKey || {};
    parentKey = parentKeyArg;
  }

  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    if (parentKey && PROTECTED_KEY_PATTERN.test(parentKey)) return value;
    let cleaned = stripDashesString(value);
    if (!parentKey || !PRICE_KEY_PATTERN.test(parentKey)) {
      cleaned = stripPricingFromProseString(cleaned);
    }
    if (!isLeadMagnetNode(opts)) {
      cleaned = stripForbiddenWordsString(cleaned);
    }
    cleaned = stripPlaceholdersString(cleaned);
    return cleaned as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((v) => sanitiseForPublic(v, opts, parentKey)) as unknown as T;
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitiseForPublic(v as unknown, opts, k);
    }
    return out as unknown as T;
  }

  return value;
}

// ---------------------------------------------------------------------------
// Validation (reports without mutating, used by the save layer)
// ---------------------------------------------------------------------------

export type Violation = {
  rule: "emdash" | "pricing_in_prose" | "forbidden_word" | "placeholder";
  sample: string;
  field_path: string;
};

const EMDASH_RE = /[—–]/;
const PRICE_RE = /\$\s?\d[\d,]*(?:\.\d{1,2})?/;
const FORBIDDEN_RE = /\b(next-step|next step|try this|exercises?)\b/i;
const PLACEHOLDER_RE = /(\[insert|\{\{|<<|Lorem ipsum|\bTBD\b|\bUntitled\b)/i;

function pushViolation(out: Violation[], rule: Violation["rule"], sample: string, path: string) {
  out.push({ rule, sample: sample.slice(0, 200), field_path: path });
}

function walkValidate(
  value: unknown,
  path: string,
  parentKey: string,
  opts: SanitiseOptions,
  out: Violation[],
) {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    if (PROTECTED_KEY_PATTERN.test(parentKey)) return;
    if (EMDASH_RE.test(value)) pushViolation(out, "emdash", value, path);
    if (!PRICE_KEY_PATTERN.test(parentKey) && PRICE_RE.test(value)) {
      pushViolation(out, "pricing_in_prose", value, path);
    }
    if (!isLeadMagnetNode(opts) && FORBIDDEN_RE.test(value)) {
      pushViolation(out, "forbidden_word", value, path);
    }
    if (PLACEHOLDER_RE.test(value)) pushViolation(out, "placeholder", value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => walkValidate(v, `${path}[${i}]`, parentKey, opts, out));
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walkValidate(v, path ? `${path}.${k}` : k, k, opts, out);
    }
  }
}

export function validateForPublic(
  content: unknown,
  opts: SanitiseOptions = {},
): { ok: boolean; violations: Violation[] } {
  const violations: Violation[] = [];
  walkValidate(content, "", "", opts, violations);
  return { ok: violations.length === 0, violations };
}

// ---------------------------------------------------------------------------
// Primary-CTA fallback
// ---------------------------------------------------------------------------

const DEFAULT_CTA_BY_NODE: Record<string, string> = {
  "BA-15": "Request Press Kit",
  "BA-16": "Become an Affiliate",
  "BA-18": "Propose a Partnership",
  "YR-21": "Book a Speaking Engagement",
  "YR-27": "Support the Campaign",
  "YR-28": "Become a Sponsor",
  "BA-14": "Listen Now",
  "YR-22": "Request a Quote",
  "YR-24": "Reserve My Spot",
  "YR-26": "Get Tickets",
  "BP-05": "Reserve My Spot",
};

const CTA_KEY_PATTERN = /^(primary_)?cta(_label|_text|_button|_button_text|_label)?$|^button_text$|^button_label$/i;

/** Returns true if any string key on the tree looks like a CTA and is non-empty. */
function hasAnyCta(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.some(hasAnyCta);
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (CTA_KEY_PATTERN.test(k) && typeof v === "string" && v.trim().length > 0) return true;
      if (hasAnyCta(v)) return true;
    }
  }
  return false;
}

/**
 * If the content has no recognisable CTA, inject a node-appropriate default
 * into a top-level `primary_cta` field. Returns the (possibly mutated) content.
 */
export function ensurePrimaryCta<T>(content: T, nodeId: string | null | undefined): T {
  if (!content || typeof content !== "object") return content;
  if (hasAnyCta(content)) return content;
  const fallback = (nodeId && DEFAULT_CTA_BY_NODE[nodeId.toUpperCase()]) || "Get in Touch";
  (content as Record<string, unknown>).primary_cta = fallback;
  return content;
}
