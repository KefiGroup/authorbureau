

# Fix — Sales pages render empty (`$TBA`, no copy) for BP-06/07/08/09 + upgrade copy quality

## What's actually broken
The builders are producing rich sales copy and saving it to the database — verified live for BP-07:

```text
content.sales_page = {
  headline, subheadline, pain_point, solution_statement, cta_button_text
}
content.tagline, content.format, content.duration, content.transformation_promise,
content.what_youll_get, content.who_its_for, content.suggested_price_usd, content.study_weeks[...]
```

But the public renderer (`SalesPage` in `src/pages/MicrositePage.tsx`, lines 1085–1169) only reads:
- `content.title` (doesn't exist)
- `content.subtitle` (doesn't exist)
- `content.description` (doesn't exist)
- `content.bullets` / `content.exercises` / `content.modules` (don't exist)
- `content.price` (doesn't exist — it's `suggested_price_usd`)

So the page falls back to `cfg.title` ("Home Study Course") + `$TBA` + a blank body. Same field-mismatch hits BP-06, BP-08 (different builder shapes again) and BP-09 (`content.book_description` vs actual `sales_page.headline`).

This is a **renderer bug**, not a content bug. We don't need to "regenerate copy" — we need to render what's already saved, and upgrade the layout to a proven long-form sales structure for the cases where copy is thin.

---

## Proven long-form sales page structure (research-backed)
Based on the conversion patterns used by ConvertKit, Teachable, ClickFunnels and the AIDA + PAS frameworks (also matches our existing `salesCopyTypes.ts` 11-section spec already used by the Online Course builder), every sales page needs these blocks in this order:

1. **Hero** — headline (≤12 words, outcome + timeframe), subheadline (≤25 words), CTA, hero image
2. **Problem / Pain** — 1 paragraph + 3–5 pain bullets ("Are you struggling with…")
3. **Transformation** — Before → After two-column list (3 items each)
4. **Introduction** — 2–3 sentence "what this is" paragraph
5. **What's inside** — 5+ bullet items mapped to actual modules/weeks
6. **How it works** — 3 numbered steps
7. **Author bio** — name, photo, 2–3 sentence credentials block
8. **Social proof** — 3 testimonials (skip block if none)
9. **Pricing card** — price (+ optional compare-at), 4+ included items, CTA
10. **FAQ** — 5 Q&A items addressing objections
11. **Final CTA** — urgency headline + CTA + risk reversal

Total target length: **800–1,400 words** for paid info products (industry sweet spot for Home Study / Workbook / Special Edition); short-form for direct book purchase (BP-09).

---

## What I'll change

### Fix 1 — Make the renderer read the real content shape
**File:** `src/pages/MicrositePage.tsx` — `SalesPage` (BP-06/07/08) + `BookSalesPage` (BP-09)

Map every field with sensible fallbacks so existing live nodes light up immediately:

| Renderer expects | Falls back to |
|---|---|
| headline | `sales_page.headline` → `programme_title` → `workbook_title` → `edition_title` → `cfg.title` |
| subheadline | `sales_page.subheadline` → `tagline` → `transformation_promise` |
| pain paragraph | `sales_page.pain_point` |
| solution paragraph | `sales_page.solution_statement` → `transformation_promise` |
| who-it's-for | `who_its_for` |
| what-you-get bullets | `what_youll_get` → derived from `study_weeks`/`modules` (one bullet per week/module) |
| price | `price` → `suggested_price_usd` → `priceOverride` → `pricing_recommendation.suggested_price` |
| original price | `original_price` → `pricing_recommendation.compare_at` |
| CTA | `sales_page.cta_button_text` → cfg default |

Same field unification for BP-09: read `sales_page.headline`, `book_description`, `who_its_for`, etc.

### Fix 2 — Render the full long-form structure
**File:** `src/pages/MicrositePage.tsx` (replace the current 70-line `SalesPage` body)

Render the 11-section template. Each section auto-hides if its data is empty — keeps the layout clean for nodes that only have hero + price. Order:

```text
Hero (cover + headline + subheadline + CTA)
─────────────────────
Problem (paragraph + 3 pain bullets)
─────────────────────
Transformation (Before | After, 2 columns)
─────────────────────
What's Inside (bullet list from study_weeks/modules/what_youll_get)
─────────────────────
How It Works (3 steps: Enrol → Complete → Transform)
─────────────────────
Who It's For (paragraph)
─────────────────────
Author bio + photo (pulled from author_profiles)
─────────────────────
Pricing Card (price, compare-at, BuyNowButton, 4+ included items, "30-day guarantee")
─────────────────────
FAQ (default 4 items if none in content: refund, time required, tech needed, who it's for)
─────────────────────
Final CTA (urgency line + button + "Secure checkout · Stripe")
```

Style: keep existing `theme.vars` color tokens (Pauline's screenshot shows the cream/gold theme working) so it stays brand-consistent.

### Fix 3 — Upgrade the AI copywriter prompt for these 4 builders
**Files:** `src/components/dashboard/builders/bp06/BP06Builder.tsx`, `bp07/BP07Builder.tsx`, `bp08/BP08Builder.tsx`, `bp09/BP09Builder.tsx` (the generation step in each)

Today the prompt only asks for `{headline, subheadline, pain_point, solution_statement, cta_button_text}`. Expand it to also produce:

- `intro_paragraph` (50–80 words)
- `transformation: { before: [3 items], after: [3 items] }`
- `what_youll_get: [5–8 bullets]` — must reference actual weeks/modules from the curriculum (Mismatch Validator already enforces this for BP-07/08)
- `faq: [{q, a}]` — 5 items
- `final_cta: { headline, urgency, button_text }`
- `guarantee: "30-day money-back guarantee"` (default)

Word-count rules baked into the prompt: hero headline ≤12 words, subheadline ≤25 words, each pain/before/after bullet ≤14 words, each FAQ answer 30–60 words, total page 800–1,400 words. Plain text only, no markdown.

Same Lovable AI Gateway, same `openai/gpt-5.2` model already used elsewhere — no model change, no temperature override (per `manus-2026-04-23` audit memory).

### Fix 4 — One-time backfill script for already-published nodes
**New edge function:** `supabase/functions/backfill-sales-copy/index.ts` (admin-only, callable from dashboard once)

For every `author_nodes` row where `node_id IN ('BP-06','BP-07','BP-08','BP-09')` AND `status='live'` AND `content_json->'sales_page'->>'intro_paragraph' IS NULL`:
- pull existing curriculum/structure
- call the upgraded copywriter prompt
- merge new fields into `content_json` (preserve everything that's already there)
- re-publish

This means Pauline's already-live Home Study page gets the full 11-section copy without her having to click anything. I'll trigger it once after deploy and confirm.

### Fix 5 — Mirror `suggested_price_usd` → `price` going forward
Already partially done in last sprint for BP-07/08. Add the same one-line mirror in BP-06 and BP-09 publish handlers so `content.price` is always set. This is the belt-and-braces version of Fix 1 — even if the renderer fallback chain breaks, the canonical field is populated.

---

## Out of scope
- BA-/YR-tier pages (coaching, training, mastermind, etc.) — they have their own dedicated renderers in `MicrositePage.tsx` already and aren't reporting the same bug. I'll add the long-form structure to them in a follow-up sprint if you want.
- Re-running social distribution / email sequences — copy upgrade only, no marketing-side regeneration.

## Files to change
- `src/pages/MicrositePage.tsx` — rewrite `SalesPage` and `BookSalesPage` to the 11-section template with full fallback chain
- `src/components/dashboard/builders/bp06/BP06Builder.tsx` — expand AI prompt + mirror price
- `src/components/dashboard/builders/bp07/BP07Builder.tsx` — expand AI prompt
- `src/components/dashboard/builders/bp08/BP08Builder.tsx` — expand AI prompt
- `src/components/dashboard/builders/bp09/BP09Builder.tsx` — expand AI prompt + mirror price
- new `supabase/functions/backfill-sales-copy/index.ts` — one-time backfill for live nodes
- `supabase/config.toml` — register the new function with `verify_jwt = false` (admin guard inside function)

## Validation
1. Reload `authorsbureau.com/pauline-teo/home-study` → headline, subheadline, pain, solution, price ($XX, not $TBA), 21-week bullet list, FAQ, final CTA all render.
2. Same check on `/workbook`, `/special-edition`, `/be-suckcessful` (BP-09).
3. Generate a brand-new BP-07 in another author's dashboard → all 11 sections populate from a single AI call.
4. Word counts within target (eyeball: hero ≤12 words, total page 800–1,400 words).
5. No section renders if its underlying field is empty (e.g. testimonials hidden when none provided).

