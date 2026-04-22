

## Diagnosis

Both BA-16 and BA-17 reach `MicrositePage` correctly with `status='live'` — confirmed in DB. The root cause is rendering, not routing.

**Bug 1 — "Coming Soon" badge on BA-17 `/bundles`:** The `GenericPage` fallback at `MicrositePage.tsx:1244-1246` renders a disabled `<Button>Coming Soon</Button>` whenever `actionType === "purchase"` AND there's no payment link. BA-17 has no Stripe link (bundles are still being wired to commerce), so the page shows the bundle title + a "Coming Soon" button — which the user reads as the whole page being unpublished. The actual `bundles[]` and `upsell_sequences[]` data is sitting in `content_json` unrendered.

**Bug 2 — BA-16 `/affiliates` is sparse:** Same fallback. `GenericPage` only knows `content.headline / subheadline / description / bullets / price`. BA-16's generator emits `programme_title`, `commission_structure[]` (note: NOT `commission_tiers`), `affiliate_resources[]` (array of `{resource, description}` objects, NOT a string), `cookie_duration_days`, `payout_schedule`, `abby_summary`. None of those keys are read, so the reader sees only the title + the generic opt-in form.

## Plan — add two bespoke renderers in `MicrositePage.tsx`

### 1. `AffiliatesPage` (BA-16)

Two-column hero. Left: `programme_title`, `tagline`, `abby_summary`. Right: existing opt-in form (already wired — `actionType === "optin"` for BA-16). Below the hero, three stacked sections:

- **"What you'll earn"** — render `commission_structure[]` (with fallback to `commission_tiers[]` for forward-compat) as cards showing `tier`, `commission_rate`, `benefits[]`, `requirements[]`. Highlight the headline rates ("40% first 90 days, 25% ongoing") at the top of this block as a pill row pulled from the first two `commission_rate` strings.
- **"Cookie + payouts"** — single line: `${cookie_duration_days}-day cookie · ${payout_schedule}` (gracefully hide if missing).
- **"What you'll promote"** — short line referencing the book title + author name + first sentence of `data.context.core_thesis` so an affiliate can immediately see the SUCKCESS Framework context. Use `data.book.cover_image_url` as a small thumbnail.
- **"Your affiliate toolkit"** — list `affiliate_resources[]` as bullet rows with resource name + description. Handle both array-of-strings (legacy) and array-of-objects (current) shapes.

CTA below: scroll to the form ("Apply to Promote").

### 2. `BundlesPage` (BA-17)

Hero: `product_ladder_title`, no fake "Coming Soon" button. Below:

- **Bundles grid** — render `bundles[]` as 3 cards: `bundle_name`, `tagline`, `products_included[]` as bullets, `individual_value_usd` struck-through, `bundle_price_usd` prominent, `savings_usd` as a "Save $X" pill. CTA per card: if `data.node.payment_link` exists wire it through, otherwise a "Notify Me" mailto/contact form linked to the author. **No disabled "Coming Soon" buttons.**
- **Upsell sequences** — collapsed details list, one per `upsell_sequences[]` entry: `trigger`, `upsell_product`, `upsell_price_usd`, `upsell_headline`, `upsell_copy` (small print, helpful for SEO + reader curiosity).
- **Downsell** — single small card if `downsell` is present.

No form by default. If Pauline later adds payment links per bundle, the existing `<BuyNowButton>` pattern can drop in here.

### 3. Wire both into the route switch

In `MicrositePage.tsx` around line 217:

```tsx
{resolvedNodeId === "BA-16" && <AffiliatesPage ... />}
{resolvedNodeId === "BA-17" && <BundlesPage ... />}
```

And add `"BA-16"` and `"BA-17"` to the fallback exclusion list on line 219.

### 4. Defensive shape handling

Both new pages must read either the new schema (`commission_tiers`, etc.) or the actual stored schema (`commission_structure`, etc.) so they work for Pauline's existing live row AND any future regenerations. Pattern:

```ts
const tiers = content.commission_tiers ?? content.commission_structure ?? [];
const resources = (content.affiliate_resources ?? []).map((r: any) =>
  typeof r === "string" ? { resource: r, description: "" } : r
);
```

## Files touched

- **Update** `src/pages/MicrositePage.tsx` — add `AffiliatesPage` (BA-16) and `BundlesPage` (BA-17) renderers, route them in the switch, exclude both from `GenericPage` fallback. No prop wiring changes beyond existing `FormPageProps` shape.

## Verification

1. Reload `/pauline-teo/affiliates` → see programme title, tagline, ABBY summary, two commission tier cards (40% / 25%), 60-day cookie + payout line, book context, four affiliate toolkit rows, opt-in form on the right.
2. Reload `/pauline-teo/bundles` → see product ladder title (no fake "Coming Soon" button), three bundle cards with prices/savings, upsell sequence list below.
3. Future regenerations using either schema (current or future) render identically thanks to the defensive shape mapping.

## Scope

- Pure frontend. No DB migration. No edge function changes. No regeneration required for Pauline's existing data.

