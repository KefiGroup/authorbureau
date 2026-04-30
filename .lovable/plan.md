# Pass B — Render-Time Scrubber + Permanent Quality Gate

## Context

Re-audit of Pauline's 21 live pages shows the Pass A sanitiser is working (zero emdashes), but three classes of leak remain:

- **Pricing in prose** (8 pages): `"Join the Circle for $27/month"`, `$497`, `$1,997`, etc.
- **Forbidden lead-magnet words** (5 pages): `exercise`, `next-step` leaking into Brand/Build/Yield generators.
- **Placeholders** (1 page): literal `[insert ...]` token.
- **Missing CTA** (5 pages): BA-15, BA-16, BA-18, YR-21, YR-27 emit body content but no terminal CTA label.

We need to (a) fix the live pages now without re-running 21 generators, and (b) make this rigor automatic for every future author so the same audit on a brand-new account scores 8/8.

## Goal

A **single source of truth** (`microsite-content-rules.ts`) drives **three enforcement layers**:

```text
Layer 1: GENERATE  →  HARD_RULES_PROMPT injected into every generator (already done)
Layer 2: SAVE      →  validateForPublic() runs before any author_nodes insert/update
Layer 3: RENDER    →  sanitiseForPublic() scrubs at read time (defence in depth)
```

If a generator slips, the save layer catches it. If a row was saved before the rule existed, the render layer cleans it. New authors inherit all three for free.

## Plan

### 1. Extend the shared scrubber (`supabase/functions/_shared/microsite-content-rules.ts`)

Add three new pure functions alongside the existing `sanitiseForPublic`:

- **`stripPricingFromProse(s)`** — regex-strip `$\d[\d,]*(\.\d{2})?(/\w+)?` patterns from string leaves. Skip when parent key is `price_usd`, `price`, `amount`, `currency`, or any `*_price` field. Replace with a neutral phrase: `"$27/month"` → `""` (drop) or `"available at checkout"` when the surrounding sentence would break (detected by a trailing " for " before the price).
- **`stripForbiddenWords(s)`** — replace `next-step|next step|try this|exercise` (case-insensitive, word-bounded) with safer alternates: `step`, `apply`, `practice`. Lead magnets (BP-01/02) opt out — they have their own assessment vocabulary rules, and we'll pass an `archetype` hint to skip the rule there.
- **`stripPlaceholders(s)`** — drop `[insert ...]`, `{{...}}`, `<<...>>`, `Lorem ipsum`, `TBD`, `Untitled`, and bare `Offer 1/2/3` / `Module 1: TBD` patterns. When a whole list item title is just a placeholder, the renderer already hides it (Pass A); this just cleans residual prose.

Compose them in a new top-level `sanitiseForPublic(value, { archetype, nodeId })` that runs in this order: `stripDashes → stripPricingFromProse → stripForbiddenWords → stripPlaceholders`. Keep the existing `PROTECTED_KEY_PATTERN` so URLs/IDs are untouched.

Add a separate **`validateForPublic(content)`** that returns `{ ok: boolean, violations: Array<{rule, sample, path}> }` — same rules, but reports instead of mutates. This is what the save layer will use.

Add a **`ensurePrimaryCta(content, nodeId)`** helper. It looks for a `cta`, `primary_cta`, `cta_label`, or `button_text` field anywhere in the tree. If none exists, it injects a node-appropriate default into a new top-level `primary_cta` field:

| Node | Default CTA |
|---|---|
| BA-15 (press) | `Request Press Kit` |
| BA-16 (affiliates) | `Become an Affiliate` |
| BA-18 (partners) | `Propose a Partnership` |
| YR-21 (speaking) | `Book a Speaking Engagement` |
| YR-27 (fundraising) | `Support the Campaign` |
| _other outbound_ | `Get in Touch` |

The `MicrositePage.tsx` renderer already shows a primary CTA button when `node.content_json.primary_cta` exists, so this just feeds existing UI.

### 2. Wire the scrubber into `get-microsite-page` (Layer 3)

The function already calls `sanitiseForPublic`. Two small changes:

- Pass `{ archetype: node.archetype, nodeId: node.node_id }` into `sanitiseForPublic` so the lead-magnet exception works.
- After sanitisation, call `ensurePrimaryCta(payload.node.content_json, node.node_id)` so the 5 CTA-less pages get an immediate, sensible button without re-generating.

This single deploy fixes all 21 of Pauline's pages and every other live author's pages instantly.

### 3. Add the save-layer guard (Layer 2)

Create `supabase/functions/_shared/persist-node-content.ts` exposing `saveNodeContent(supabase, { author_id, node_id, content_json, ...rest })` that:

1. Runs `sanitiseForPublic` on `content_json` before write (so the DB row itself is clean — no need to rely on render-time scrubbing forever).
2. Runs `validateForPublic` and logs any violations to a new `content_quality_log` table (`node_id, author_id, rule, sample, created_at`) so we can monitor which generators still misbehave.
3. Calls `ensurePrimaryCta` so saved rows always have a CTA.
4. Performs the upsert.

Refactor the 25 existing generator edge functions to call `saveNodeContent(...)` instead of writing to `author_nodes` directly. This is mechanical — they all currently do a `supabase.from('author_nodes').upsert({...})` near the end. Replace that single call.

### 4. Lightweight quality dashboard (read-only, optional but cheap)

Add a `content_quality_log` table and a tiny admin page at `/admin/content-quality` that lists the last 100 violations grouped by `node_id` and `rule`. This gives us a continuous signal: if a generator starts leaking, we see it immediately on the next save instead of discovering it during an audit.

Schema:
```text
content_quality_log (
  id uuid pk, author_id uuid, node_id text,
  rule text,        -- 'pricing_in_prose' | 'forbidden_word' | 'placeholder' | 'emdash' | 'missing_cta'
  sample text,      -- first 200 chars of the offending value
  field_path text,  -- e.g. 'sections[2].body'
  created_at timestamptz default now()
)
-- RLS: only superadmins can SELECT.
```

### 5. Re-audit + verify

Re-run the existing `/tmp/audit/audit.py` script after deploy. Acceptance:

- All 21 of Pauline's pages score **8/8**.
- Spot-check one other live author (if any exist) — same 8/8 expected.
- A test write through `saveNodeContent` with a deliberately dirty payload returns clean content and creates a row in `content_quality_log`.

## Files to change

**New**
- `supabase/functions/_shared/persist-node-content.ts`
- `src/pages/admin/ContentQualityLog.tsx` (read-only admin view)
- migration: `content_quality_log` table + RLS

**Edit**
- `supabase/functions/_shared/microsite-content-rules.ts` (add 4 functions, keep existing exports)
- `supabase/functions/get-microsite-page/index.ts` (pass archetype hint, call `ensurePrimaryCta`)
- 25 generator edge functions: swap their direct `author_nodes` upsert for `saveNodeContent(...)`. No prompt changes needed — `HARD_RULES_PROMPT` stays as is.

**No changes to**
- `MicrositePage.tsx` (already renders `primary_cta` if present)
- Generator prompts (Layer 1 already in place)
- Any author-facing UI

## How this scales to future authors

Every new author who activates a node goes through `saveNodeContent` (Layer 2), so their content is sanitised + CTA-ensured **before it ever reaches the database**. Every read goes through `sanitiseForPublic` (Layer 3) as a safety net. Generators keep `HARD_RULES_PROMPT` (Layer 1) so the model is steered correctly upstream. The quality log gives us early warning when a model starts drifting, so we can patch a single shared rule file instead of chasing 25 generators.

## Out of scope (not doing in this pass)

- Re-running the 25 generators — unnecessary, scrubber + save-layer handle it.
- Touching `MicrositePage.tsx` — already correct.
- Changing rules for lead-magnet pages (BP-01/02) — they have separate vocabulary requirements handled in their own generators.
