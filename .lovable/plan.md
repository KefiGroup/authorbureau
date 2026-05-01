## What's broken

When you click any date on the Special Edition Calendar (e.g. Mother's Day), the URL becomes `/node-builder/BP-08?occasion=mothers-day&autostart=1` — but `BP08Builder.tsx` never reads either query param. It just opens the generic Step 0 ("Design My Special Editions") and the AI prompt makes no mention of the occasion. So clicking a date does nothing occasion-specific. Also: November is empty because Thanksgiving isn't in the calendar.

## Goal

1. Add Thanksgiving to the calendar (November).
2. Make clicking a date actually pre-load that occasion AND auto-start generation for an occasion-specific special edition.
3. Make the BP-08 AI output reflect the occasion (themed framing, peak window, default extras, suggested price).
4. Show a clear visual workflow on the calendar page so the user understands the journey.

## Changes

### 1. `src/lib/special-edition-calendar.ts`
Add Thanksgiving entry between Back-to-School and Christmas:
```
{
  id: "thanksgiving",
  label: "Thanksgiving",
  emoji: "🦃",
  peakWindow: "Oct 15 - Nov 27",
  peakMonth: 11, peakDay: 27,
  launchWindowWeeks: 8,
  defaultEditionType: "collectors",
  defaultPriceUsd: 69,
  defaultIncludes: "Hardcover gratitude edition, themed Thanksgiving foreword, 'Season of Gratitude' reflection journal (PDF), signed bookplate, family-discussion guide, author audio gratitude note.",
}
```

### 2. `src/components/dashboard/builders/bp08/BP08Builder.tsx` — wire query params
- Read `useSearchParams()` for `occasion` and `autostart`.
- Look up the occasion via `findCalendarOccasion(occasionId)`; store `selectedOccasion` in state.
- When `selectedOccasion` is set on Step 0, show an occasion banner ("Designing your **Mother's Day** edition - peak May 12, launch 10 weeks out") with the emoji, replacing the generic intro paragraph.
- If `autostart=1` AND author/book are ready AND no draft already exists, call `handleGenerate()` automatically once (guarded by a `didAutostartRef` so it never loops).
- Pass `occasion: selectedOccasion` in the POST body to `generate-bp08-special-editions`.
- On success, persist `occasion`, `occasion_label`, `peak_date` into `content_json` (so the calendar page's status detection — which already keys off `cj.occasion` — finally works).

### 3. `supabase/functions/generate-bp08-special-editions/index.ts` — accept occasion
- Accept optional `occasion` object in request body.
- When present, inject into the prompt: occasion label, emoji, peak date, defaultEditionType, defaultIncludes, defaultPriceUsd as the seed concept. Instruct the model to make ALL 3 tiers themed to that occasion (e.g. all 3 are Mother's Day variants at Signed/Collector's/Gift-Set price points).
- When absent, keep current generic behaviour (back-compatible).
- After parse, merge `occasion: <id>`, `occasion_label`, `peak_date` into the saved `content` so dashboard status chips work.

### 4. `src/pages/SpecialEditionCalendarPage.tsx` — add a workflow strip
Insert a 4-step workflow card above the 12-month grid so the journey is obvious:

```text
1. Pick a date          2. Abby designs           3. Save to library         4. Take orders
   (click any           the themed                (Portal extras +           off-platform &
   occasion)            edition tiers             Amazon listing pack)       quote buyers
```

Use existing `Card` styling, no new deps. Also tighten the OccasionRow CTA copy: "Plan edition" → "Generate edition" so users know clicking actually does something now.

### 5. `src/components/dashboard/SpecialEditionCalendarCard.tsx` — same CTA copy tweak
Change "Plan edition" / "Build edition" labels to make it clear clicking a chip generates immediately.

## Out of scope

- No new tables. `author_nodes.content_json.occasion` already exists in usage (calendar page reads it).
- No edge-function deploy gymnastics — `generate-bp08-special-editions` redeploys on save.
- Amazon listing pack actual generation is unchanged; this only fixes the trigger + theming.

## Verification after build

1. Visit `/special-editions-calendar` — Thanksgiving appears in November; workflow strip shows above grid.
2. Click Mother's Day → lands on BP-08, banner shows "Designing your Mother's Day edition", generation auto-starts.
3. Generated tiers reference Mother's Day (foreword, gratitude extras, ~$69 collector price).
4. After Save to Library, return to calendar — Mother's Day shows status chip "Drafted" or "Live on Portal".
