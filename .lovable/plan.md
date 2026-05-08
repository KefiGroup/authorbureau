## Workbook microsite — designed cover + aesthetic polish

### 1. New SVG workbook cover component
Create `src/components/microsite/WorkbookCoverArt.tsx` — a fully-rendered SVG "workbook" cover (no image asset needed). Visually pairs with the book cover.

- 3:4 aspect, dark navy background, dotted texture
- Spine shadow on left edge
- Gold "COMPANION WORKBOOK" eyebrow
- Decorative concentric circles motif
- Large serif title (auto-shrinks for long titles)
- Hairline rule + italic subtitle
- Author byline
- Bottom accent bar
- Accepts `accentColor` prop so it inherits the per-author microsite theme

### 2. Workbook page — paired cover composition
In `src/pages/MicrositePage.tsx`, replace the empty left column of `WorkbookSalesPage` (~lines 1043–1053) with a stacked book + workbook composition:

```text
   ┌──────────┐
   │  BOOK    │   ← real book cover, slight -6° tilt
   └──────────┘
       ┌──────────┐
       │ WORKBOOK │   ← WorkbookCoverArt, +4° tilt, overlapping forward
       └──────────┘
   "Book + Companion Workbook"
```

- Soft radial accent glow behind the pair for depth
- If no book cover, show workbook cover alone, centered
- Caption underneath ties them together

### 3. Aesthetic polish (workbook page only)
Scoped to `WorkbookSalesPage` — other microsite types untouched.

- Header: subtle accent-tinted panel behind title with rounded corners
- Pricing card: more padding, accent-glow shadow, hairline dividers between price / CTA / checklist, larger CTA with hover lift
- "What's Inside": convert plain rows into hover-elevated cards with numbered accent badges
- "What You'll Get": check icons in soft accent circles instead of bare ticks
- Larger section gaps (`mb-16`) and thin gold dividers between sections
- All values come from existing theme tokens (`v.accent`, `v.cardBg`, `hFont`) — fully respects per-author microsite theme

### Files touched
- **New**: `src/components/microsite/WorkbookCoverArt.tsx`
- **Edit**: `src/pages/MicrositePage.tsx` — only the `WorkbookSalesPage` function

### Out of scope
- No DB / schema changes
- No new uploads or storage — workbook cover is fully generated in the browser
- Other microsite types (book, lead magnet, course, sales pages, etc.) are untouched
