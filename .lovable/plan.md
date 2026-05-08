## Goal

Two improvements to **BP-08 Special Editions** so authors can actually shape what Abby produces:

1. **Pick the occasion inside the builder** (Mother's Day, Father's Day, Christmas, Valentine's, Graduation, Back to School, Thanksgiving, New Year, or Generic / no occasion) — instead of having to enter from the Special Edition Calendar URL.
2. **Make the Review step fully editable** for the core text fields and prices, so nothing the author sees on screen is locked behind "regenerate only".

No DB changes. No edge-function rewrite. Frontend-only.

---

## 1. Occasion picker on Step 1 (Introduction)

In `src/components/dashboard/builders/bp08/BP08Builder.tsx`, on step 0 add an occasion-picker block above the "Design My Special Editions" button. It uses the existing `CALENDAR_OCCASIONS` list from `src/lib/special-edition-calendar.ts` — no new data.

UI:
```
What occasion is this edition for?  (optional)

[ Generic / Evergreen ] [ Valentine's Day ] [ Mother's Day ]
[ Father's Day ] [ Graduation ] [ Back to School ]
[ Thanksgiving ] [ Christmas / Holiday ] [ New Year ]
```

Behaviour:
- Pre-selected from the URL `?occasion=…` if the author arrived from the Special Edition Calendar (current behaviour preserved).
- Selecting a chip updates local state AND mirrors into the URL (`navigate(\`/node-builder/BP-08?occasion=…&bookId=…\`, { replace: true })`) so the existing `selectedOccasion` memo + replace-prompt logic keeps working unchanged.
- Selecting "Generic / Evergreen" clears the `?occasion` param.
- The existing amber "you already have a saved edition — replace?" prompt still fires when switching occasion on a book that already has a draft.
- The CTA label updates dynamically: `Design My {Label} Edition` or `Design My Special Editions` for Generic.

No change to `generate-bp08-special-editions/index.ts` — it already accepts the `occasion` payload and themes everything around it.

---

## 2. Fully editable Review step

Today only `edition_title`, `marketing_angle`, and `sales_page.headline` are inline-editable. Make every visible text field editable using the existing `<InlineSectionCard>` pattern, and make the per-tier and bundle prices editable with a numeric input next to the price.

Edition Tabs become editable in place (no separate "Quick edits" block — remove that to avoid duplication):

**Editions tab — collection header card**
- `edition_title` (input)
- `edition_subtitle` (input)
- `tagline` (input)

**Editions tab — each of the 3 tier cards (`content.editions[i]`)**
- `name` (input)
- `description` (textarea)
- `print_specs` (input)
- `suggested_price_usd` (number input next to the `$` label, same pattern as the global price override)
- `includes` array stays read-only (per user choice — leave Abby's list as is)

**Bundle tab**
- `bundle_offer.name` (input)
- `bundle_offer.description` (textarea)
- `bundle_offer.suggested_price_usd` (number input)
- `bundle_offer.savings_note` (input)
- `who_its_for` (textarea)
- `marketing_angle` (textarea)

**Pricing tab** — leave as-is (already has the base-price override).

**Sales Page tab**
- `sales_page.headline` (input)
- `sales_page.subheadline` (input)
- `sales_page.exclusivity_statement` (textarea)
- `sales_page.cta_button_text` (input)

All edits write through `setContent(...)` (and the existing `autosaveBuilderDraft` triggered by `InlineSectionCard`) so they persist across reloads and flow through to Publish, the DOCX export, the order form, and the library asset.

### Tier-price + bundle-price inputs

Reuse the same pattern already on the Pricing tab:
```tsx
<Input
  type="number"
  className="w-24 text-lg font-bold text-right"
  value={ed.suggested_price_usd}
  onChange={(e) => updateEdition(i, { suggested_price_usd: Number(e.target.value) })}
/>
```
where `updateEdition(i, patch)` does an immutable update on `content.editions` and then `setContent(next)`. Same shape for the bundle.

---

## Out of scope

- No edits to `supabase/functions/generate-bp08-special-editions/index.ts`.
- No "Regenerate this tier" buttons.
- No edits to `includes` per tier (per your choice).
- No DB schema changes.
- BP-09 / cover generator are unchanged — the existing `editionSubtitle` ("{Occasion} Special Edition") logic already wired to the cover continues to work and will now reflect whichever occasion the author picked in step 1.

## Files touched

- `src/components/dashboard/builders/bp08/BP08Builder.tsx` (only file)
