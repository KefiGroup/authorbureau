## Goal

Bring the BP-09 **corporate lunch deck** up to the same professional standard we just shipped for the workshop deck. Right now it still uses the old `{n, title, body}` schema, which is why your screenshot shows generic labels ("Title slide", "Why this matters to your bu…", "Framework overview") instead of real headlines, and why it renders as flat black-on-white slides with no visual design.

## What changes

### 1. Generator (`generate-bp09-book-sales/index.ts`)

Replace the corporate `slides` schema with the same layout-aware shape we use for the workshop deck, and assign a deliberate layout per slide:

```text
1  title       — "Be SUCKcessful, for [Company]" + author/role
2  stat        — "Why this matters" as a stat callout (e.g. "73% of teams cite confidence dips during change")
3  stat        — "The cost of not addressing this" as a money/time stat with sentence underneath
4  framework_grid — 8-stage SUCKCESS overview (chips grid, same as workshop slide 5)
5  framework   — Application: Productivity (3-4 specific moves with bullets)
6  framework   — Application: Leadership (3-4 specific moves with bullets)
7  framework   — Application: Retention (3-4 specific moves with bullets)
8  two_column  — ROI snapshot: "What you measure" | "What changes" (3 metric rows each)
9  bullets     — How to roll this out (3 numbered phases)
10 offer       — Next steps: bulk order tiers + Q&A CTA
```

Tighten the prompt rules so:
- `headline` must be a sentence the speaker reads aloud, never a wireframe label like "Title slide", "ROI snapshot", "Next steps".
- Stat slides must include a real number with units in `stat.value`.
- Application slides must reference the actual book's framework stages by name.
- Speaker notes 1-2 sentences each.

### 2. Exporter (`export-bp09-slides/index.ts`)

The exporter already supports all these layouts because we built them for the workshop deck. We add:

- A `normaliseSlide()` pass for corporate that maps any legacy `{title, body}` field gracefully (so existing toolkits exported during the gap don't crash).
- An `offer` layout polish: navy left panel with bulk tier rectangles (Tier 10 / Tier 50 / Tier 200) instead of book mockup, since this is the corporate-lunch CTA.
- Reuse the same Midnight Executive palette, coral accent bar motif, and slide-number footer as the workshop deck so both decks look like they belong to the same kit.

### 3. UI hint on the corporate deck card

Add a one-line caption under the deck title in `BP09Builder.tsx` that says *"Regenerate the toolkit to refresh slides with the latest layouts"* — only shown when the existing slides are missing the `layout` field (i.e. older content). This makes it obvious to you (and any author who landed on the in-between version) that a regenerate is needed to see the upgrade.

### 4. QA loop (mandatory)

1. Deploy `generate-bp09-book-sales` and `export-bp09-slides`.
2. Regenerate Pauline's BP-09 toolkit.
3. Export both decks (workshop + corporate), convert PPTX → PDF → JPG, inspect every slide.
4. Verify: no leftover labels like "Why this matters to your business" as a headline, real stats on slide 2 and 3, framework chips render, application slides have bullets, offer slide has visible bulk tiers, no overlapping text, footer slide-number visible.
5. Iterate until clean.

## Files touched

- `supabase/functions/generate-bp09-book-sales/index.ts` — new corporate slide schema + layout assignments + tightened rules.
- `supabase/functions/export-bp09-slides/index.ts` — `offer` layout for bulk tiers, normalise pass for legacy corporate slides.
- `src/components/dashboard/builders/bp09/BP09Builder.tsx` — small "regenerate to refresh" hint on deck cards when `layout` is missing.

## Out of scope

- The "ABBY hit a snag" toast in your screenshot. It's from the background Nudge Engine, unrelated to BP-09. If it keeps appearing on the dashboard, mention it and I'll trace it separately.
- BP-09 handout PDF (`export-bp09-handout`).

Approve and I'll implement, deploy, and run the QA pass.
