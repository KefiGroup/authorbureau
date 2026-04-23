# Unify book formats + collectible Special Editions under each book

## What you're asking for, in plain English

Two related cleanups on the public author site:

1. **All formats of one book belong under that book.** Right now Kindle/Paperback/Audiobook (BA-11), Workbook (BP-06), Special Edition (BP-08) and Bundle (BA-17) show up as *separate cards* in "Work With Me" — even though they're really just different ways to consume the same title. Readers get confused and the services list gets cluttered.

2. **Special Editions (BP-08) should be presented as collectible, occasion-themed releases** — Valentine's, Mother's Day, Father's Day, Christmas, Graduation, etc. — not as a generic "premium edition" line item. The occasion picker already exists in the BP-08 builder (`OccasionTemplateGrid.tsx`), so the public surface needs to catch up and actually showcase the occasion theming.

---

## Part 1 — Books section: one card, all formats

### New layout for each book card

```text
┌──────────────────────────────────────────────────────────────┐
│  [Cover]   Be SUCKcessful                                    │
│            Subtitle line if any                              │
│            ★★★★★  4.8 · Self-Help                            │
│                                                              │
│            "Two-line description preview…"                   │
│                                                              │
│            ── Available in ─────────────────────             │
│             Kindle           $9.99    Buy on Amazon →       │
│             Paperback       $19.99    Buy on Amazon →       │
│             Audiobook       $14.99    Listen now →          │
│             Workbook        $12.00    Get workbook →        │
│             Bundle (3-in-1) $29.00    Save 40% →            │
│            ────────────────────────────────────              │
│                                                              │
│            🎁 Collector's Editions (3 available)             │
│             [Mother's Day] [Christmas] [Custom]              │
│                                                              │
│            [ View book details ]                             │
└──────────────────────────────────────────────────────────────┘
```

Format rows are stacked, each with: format icon · format name · price (if known) · format-specific CTA. Collector's Editions get their own coloured strip below the standard formats with occasion chips.

### Source mapping (no schema change)

| Format row | Where it comes from |
|---|---|
| Kindle | `books.amazon_url` + `books.kindle_price` |
| Paperback | `books.amazon_url` + `books.paperback_price` |
| Audiobook | Live BA-11 node linked to this book |
| Workbook | Live BP-06 node linked to this book |
| Bundle | Live BA-17 node linked to this book |
| Collector's Editions | All live BP-08 nodes for this book, grouped by `content_json.occasion_id` |

Linking node → book uses the existing `book_id` (or `book_slug` fallback) on `author_nodes`. Nodes with no book link stay in "Work With Me".

---

## Part 2 — Collector's Editions section (BP-08 redesign on the public site)

Special Editions get their own **dedicated, visually-rich subsection** under each book — not just a row in the formats list. The occasion is the hook.

### Card design per Special Edition

```text
┌─────────────────────────────────────────┐
│  [Occasion icon: 💐 Mother's Day]       │
│   LIMITED · MOTHER'S DAY EDITION        │
│                                         │
│   Be SUCKcessful — Mother's Edition     │
│   With handwritten letter from author   │
│                                         │
│   • Signed hardcover                    │
│   • Gift-wrapped with ribbon            │
│   • Personalised dedication card        │
│   • Delivered before May 12             │
│                                         │
│   $49 · Only 50 available               │
│                                         │
│   [ Order Mother's Day Edition → ]      │
│                                         │
│   📅 Order by May 5 for delivery        │
└─────────────────────────────────────────┘
```

Each card pulls from `BP-08 content_json`:
- Occasion icon + label from `OCCASION_TEMPLATES` (already defined)
- `edition_title`, `edition_subtitle`, `tagline`
- Top edition tier from `editions[]` (or all 3 tiers in an expandable view)
- `suggested_price_usd`
- Occasion-aware urgency line ("Order by May 5 for Mother's Day delivery") computed from `peakWindow`

### Collector's Editions strip behaviour

- If the book has **no live BP-08** → strip is hidden entirely.
- If the book has **1 BP-08** → single hero card.
- If the book has **2+ BP-08s** → horizontal scroll/grid of occasion cards, sorted by next peak window (e.g. in April, Mother's Day surfaces first).
- A small "🎁 Collector's Editions" section header above the grid uses occasion-aware copy: "Limited gift editions for the season".

### "No Occasion" case

If author picked `occasion: "none"` in the builder, the edition still shows but in a neutral "Premium Edition" style — no occasion chip, no countdown, no themed icon. This keeps existing non-themed editions usable.

### Bundling collector's editions into the formats list

The plain "Bundle" row in the formats list (BA-17) stays separate — that's the everyday 3-in-1. Collector bundles offered inside BP-08's `bundle_offer` are surfaced *inside the Collector's Edition card* (e.g. "Save $X with all 3 editions") rather than promoted to the formats list, so the two concepts don't collide.

---

## Part 3 — "Work With Me" section: services only

After the redesign, "Work With Me" shows true services only:

**Kept:** Coaching (BA-13, YR-19), Speaking (YR-21), Corporate Training (YR-22), Mastermind (YR-23), Retreats (YR-24), Certification (YR-25), Membership (BA-12), Online Course (BA-10), Group Coaching, Conference (YR-26), Big Ticket (YR-20).

**Excluded (moved under their book):** BA-11 Audiobook, BP-06 Workbook, BP-08 Special Editions, BA-17 Upsells/Bundles.

**Open question — Media Kit (BA-15):** suggest moving to a "For Press / Media" footer link rather than treating as a service. If you'd rather keep it in Work With Me, say so and we leave it.

---

## Part 4 — Files to add / change

### New
- `src/components/public/AuthorBookFormatsList.tsx` — the stacked formats row component (Kindle / Paperback / Audiobook / Workbook / Bundle)
- `src/components/public/AuthorBookCollectorsStrip.tsx` — the Collector's Editions strip (occasion cards, urgency dates, hidden when none)
- `src/components/public/CollectorsEditionCard.tsx` — single occasion-themed card

### Modified
- `src/pages/author-site/types.ts` — add helpers:
  - `getFormatsForBook(book, liveNodes)` returning `{ kindle?, paperback?, audiobook?, workbook?, bundle? }`
  - `getCollectorsEditionsForBook(book, liveNodes)` returning `BP08Edition[]` enriched with occasion metadata
  - `getNextPeakDate(occasionId)` for the "Order by …" urgency line
  - Update `BOOK_FORMAT_NODE_IDS = ["BA-11","BP-06","BP-08","BA-17"]` constant
- `src/components/public/AuthorBooksSection.tsx` — render `AuthorBookFormatsList` + `AuthorBookCollectorsStrip` inside each book card, drop the legacy chip row
- `src/pages/AuthorBookPage.tsx` — same two components on the dedicated book detail page, with the Collector's Editions strip given more vertical space
- `src/components/public/AuthorWorkWithMe.tsx` — accept already-filtered `serviceOnlyNodes` prop (filtering happens upstream)
- `src/pages/AuthorSite.tsx` — derive `serviceOnlyNodes` by excluding `BOOK_FORMAT_NODE_IDS`, pass per-book format/edition arrays into the books section
- `src/components/dashboard/builders/special-editions/OccasionTemplateGrid.tsx` — no logic change, but export `OCCASION_TEMPLATES` so the public components can reuse the icon + peak-window data (already exported — just consume it on the public side)

### Database
No schema changes. Everything reads from existing fields:
- `books.kindle_price`, `paperback_price`, `amazon_url`
- `author_nodes.book_id` (or `book_slug`), `node_id`, `status`, `content_json`, `price_usd`

---

## Part 5 — Out of scope
- Limited-edition stock counters with real inventory tracking (we display the author's stated number from `content_json` only)
- Per-occasion email reminders ("Mother's Day in 30 days — order now") — that's an Email Hub follow-up
- Auto-generating occasion-themed cover art for each Collector's Edition (current covers stay; can be a follow-up using `generate-cover-image`)
- Reordering / drag-to-arrange formats — display order is fixed (Kindle → Paperback → Audiobook → Workbook → Bundle)
- Internationalised peak dates (Mother's Day differs by country) — using US dates from existing `OCCASION_TEMPLATES`

## Part 6 — Validation
1. A book with Kindle, Paperback, Audiobook (BA-11), Workbook (BP-06) and a Bundle (BA-17) shows a single card with 5 stacked format rows, each with the right CTA.
2. The same book with two live BP-08 editions (Mother's Day + Christmas) shows a Collector's Editions strip with two occasion cards, Mother's Day first if viewed in April.
3. "Work With Me" no longer contains BA-11 / BP-06 / BP-08 / BA-17 cards.
4. A book with no BP-08 shows no Collector's Editions strip.
5. A BP-08 with `occasion: "none"` shows as a neutral "Premium Edition" card without occasion chip or countdown.
6. Mother's Day card shows "Order by May 5 for May 12 delivery" when viewed before May 5; switches to "Order soon" inside the peak window; hides the date line after the peak.
7. The dedicated book page (`/:authorSlug/book/:slug`) shows the same formats list + Collector's strip with a larger hero card per edition.
