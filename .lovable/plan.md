

# Plan — Make the public Workbook page actually look like a workbook sales page

## The bug

The public URL `/{author}/{book}/workbook` (rendered by `MicrositePage.tsx` → `SalesPage`) shows almost nothing: just the word "Workbook", the **book** cover, "$TBA", and a Buy Now button.

Why: `SalesPage` reads field names that don't exist on the BP-06 payload Abby actually saves to `author_nodes.content_json`:

| SalesPage reads | Abby actually saves |
|---|---|
| `content.title` / `content.headline` | `content.workbook_title` |
| `content.subtitle` | `content.workbook_subtitle` |
| `content.description` | `content.transformation_promise` + `content.who_its_for` |
| `content.exercises` / `content.modules` / `content.bullets` | `content.sections[]` (each with nested `exercises[]`, `outcome`) |
| `content.price` | `content.suggested_price_usd` |
| nothing | `content.what_youll_get[]`, `content.tagline`, `content.format`, `content.sales_page` |

So everything Abby produced is sitting in the database, just never read.

## What we'll build

Rewrite the **workbook branch** of `SalesPage` in `src/pages/MicrositePage.tsx` (only touch `type === "workbook"` — leave home-study and special-edition unchanged so we don't regress them).

### New layout (mirrors what Abby generates)

```
┌─────────────────────────────────────────────────────────────┐
│  [Workbook badge]                                            │
│  {workbook_title}                                            │
│  {workbook_subtitle}                                         │
│  {tagline}                                                   │
│                                                              │
│  Transformation: {transformation_promise}                    │
│                                                              │
│  ┌────────────────────┐  ┌──────────────────────────────┐   │
│  │  Book cover        │  │ ${suggested_price_usd}       │   │
│  │  (companion to     │  │  or "Free download"          │   │
│  │   {book.title})    │  │  [Buy Now / Download]        │   │
│  │                    │  │  ✓ 8.5 × 11" PDF + Word       │   │
│  │                    │  │  ✓ Instant download           │   │
│  └────────────────────┘  └──────────────────────────────┘   │
│                                                              │
│  WHAT'S INSIDE                                               │
│  Section 1: {title}                                          │
│    {description}                                             │
│    Exercises: {exercises[]}                                  │
│    After this section, you can: {outcome}                    │
│  … (5 sections)                                              │
│                                                              │
│  WHAT YOU'LL GET                                             │
│  ✓ {what_youll_get[]}                                        │
│                                                              │
│  WHO IT'S FOR                                                │
│  {who_its_for}                                               │
│                                                              │
│  [ Sticky bottom Buy Now bar on mobile ]                     │
└─────────────────────────────────────────────────────────────┘
```

### Field mapping changes

```ts
// In SalesPage, when type === "workbook":
const title    = content.workbook_title || content.title || data.node.personalised_name || "Workbook";
const subtitle = content.workbook_subtitle || content.subtitle;
const tagline  = content.tagline;
const promise  = content.transformation_promise;
const whoFor   = content.who_its_for;
const youGet   = Array.isArray(content.what_youll_get) ? content.what_youll_get : [];
const sections = Array.isArray(content.sections) ? content.sections : [];
const format   = content.format || "8.5 × 11\" PDF";

// Pricing
const isFree   = content.pricing_recommendation === "free" || Number(content.suggested_price_usd) === 0;
const priceNum = Number(content.suggested_price_usd) || 0;
const priceLabel = isFree ? "Free" : (priceNum > 0 ? `$${priceNum}` : null);
// If priceLabel is null AND not free → show "Pricing coming soon" instead of "$TBA"
```

### Price + CTA logic

- `suggested_price_usd > 0` → show `${price}` and **Buy Now** (existing `BuyNowButton` flow stays).
- `pricing_recommendation === "free"` → show "**Free download**" and a **Download Workbook** button that links to `data.node.delivery_url` (or a fallback "available shortly" disabled state).
- Neither set → show "**Pricing coming soon**" + "Notify me" mailto, instead of the broken "$TBA".

### Format/KDP chip

Show a small chip under the price: `8.5 × 11" PDF + Word · Instant download`. Matches the locked KDP standard from the previous sprint.

### Sections renderer

Replace the flat bullet list (which never matched workbook data) with a section list:

```tsx
{sections.map((s, i) => (
  <div key={i} className="border-l-2 pl-4 py-1">
    <p className="text-xs uppercase tracking-wide text-muted">Section {s.number ?? i + 1}</p>
    <h3>{s.title}</h3>
    <p className="text-sm">{s.description}</p>
    {Array.isArray(s.exercises) && s.exercises.length > 0 && (
      <ul className="mt-2 space-y-1">
        {s.exercises.map((ex, j) => <li key={j}>• {ex}</li>)}
      </ul>
    )}
    {s.outcome && <p className="mt-2 text-sm italic">After this section, you can: {s.outcome}</p>}
  </div>
))}
```

### Cover image

Keep `data.book.cover_image_url` (the workbook reuses the book cover by design — confirmed in the screenshot). No change needed; just label it as "Companion to **{book.title}**" so visitors understand it's the workbook for that book.

### Sticky mobile CTA

Add a fixed-bottom Buy Now bar on screens `< md` (Tailwind `md:hidden fixed inset-x-0 bottom-0`) so the price + CTA are always reachable. Mirrors how `BookSalesPage` works.

## Files touched

- `src/pages/MicrositePage.tsx` — rewrite the `type === "workbook"` branch of `SalesPage` (≈ lines 887–967). Home-study and special-edition branches stay byte-identical.

## Out of scope

- The home-study / special-edition branches (separate field shapes, separate fix when the user reports them).
- Backfilling existing nodes whose `content_json` is missing fields — render-time falls back gracefully.
- Adding a PDF preview embed or sample-pages carousel (later iteration).
- Re-running `generate-bp06-*` for old workbooks.

## Verification

1. Visit `/pauline-teo/be-suckcessful/workbook` → page now shows: workbook title (not just "Workbook"), tagline, transformation promise, 5 sections with exercises, "What you'll get", "Who it's for", and a real price (or "Free download" / "Pricing coming soon").
2. Workbook with `suggested_price_usd = 27` → shows `$27` + Buy Now.
3. Workbook with `pricing_recommendation = "free"` → shows "Free download" + Download button.
4. Workbook with neither set → shows "Pricing coming soon" (no more "$TBA").
5. Resize to mobile → sticky bottom CTA bar appears.
6. Home-study and special-edition microsites are visually unchanged.

