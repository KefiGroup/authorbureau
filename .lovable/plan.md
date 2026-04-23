# Unify book formats + collectible Special Editions (with occasion themes) under each book

## What you're asking for, in plain English

Three related cleanups on the public author site:

1. **All formats of one book belong under that book.** Today Kindle/Paperback/Audiobook (BA-11), Workbook (BP-06), Special Edition (BP-08) and Bundle (BA-17) appear as *separate cards* in "Work With Me" — even though they're really just different ways to consume the same title.

2. **Special Editions (BP-08) should be presented as collectible, occasion-themed releases** — Valentine's Day, Mother's Day, Father's Day, Christmas, Graduation, Anniversary, Birthday, etc. — not as a generic "premium edition" line item.

3. **Add a "Special Edition / Collector's" design layer to BP-08 itself** — let authors mark an edition as a *limited collectible* (numbered, signed, gift-wrapped, themed cover) tied to a specific occasion, with urgency dates ("Order by May 5 for Mother's Day delivery"). The occasion picker already exists in the BP-08 builder (`OccasionTemplateGrid.tsx` + `OCCASION_TEMPLATES`), so the logic exists — we just surface it properly and add the collectible layer on top.

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
│             Kindle           $9.99    Buy on Amazon →        │
│             Paperback       $19.99    Buy on Amazon →        │
│             Audiobook       $14.99    Listen now →           │
│             Workbook        $12.00    Get workbook →         │
│             Bundle (3-in-1) $29.00    Save 40% →             │
│            ────────────────────────────────────              │
│                                                              │
│            🎁 Collector's Editions (3 available)             │
│             [💐 Mother's Day] [🎄 Christmas] [💝 Valentine's]│
│                                                              │
│            [ View book details ]                             │
└──────────────────────────────────────────────────────────────┘
```

### Source mapping (no schema change)

| Format row | Where it comes from |
|---|---|
| Kindle | `books.amazon_url` + `books.kindle_price` |
| Paperback | `books.amazon_url` + `books.paperback_price` |
| Audiobook | Live BA-11 node linked to this book |
| Workbook | Live BP-06 node linked to this book |
| Bundle | Live BA-17 node linked to this book |
| Collector's Editions | All live BP-08 nodes for this book, grouped by `content_json.occasion_id` |

Linking node → book uses existing `book_id` (or `book_slug` fallback) on `author_nodes`. Nodes with no book link stay in "Work With Me".

---

## Part 2 — Collector's Editions (BP-08) as occasion-themed releases

Special Editions get their own **dedicated, visually-rich subsection** under each book.

### Card design per Collector's Edition

```text
┌─────────────────────────────────────────┐
│  💐 LIMITED · MOTHER'S DAY EDITION      │
│                                         │
│   Be SUCKcessful — Mother's Edition     │
│   With handwritten letter from author   │
│                                         │
│   • Signed hardcover                    │
│   • Gift-wrapped with ribbon            │
│   • Personalised dedication card        │
│   • Numbered: #1–50 of 50               │
│                                         │
│   $49 · Only 50 available               │
│                                         │
│   [ Order Mother's Day Edition → ]      │
│                                         │
│   📅 Order by May 5 for May 12 delivery │
└─────────────────────────────────────────┘
```

Pulled from `BP-08 content_json`:
- Occasion icon + label from `OCCASION_TEMPLATES`
- `edition_title`, `edition_subtitle`, `tagline`
- Top edition tier or all 3 tiers (expandable)
- `suggested_price_usd`
- New collectible fields: `is_collectible`, `print_run_size`, `numbered`, `signed`, `gift_wrapped`, `themed_cover_url`
- Occasion-aware urgency line ("Order by May 5 for Mother's Day delivery") computed from `peakWindow`

### Occasion catalogue (already exists in `OCCASION_TEMPLATES`, surfaced now)

Valentine's Day · Mother's Day · Father's Day · Christmas · Hanukkah · New Year · Easter · Graduation · Anniversary · Birthday · Back-to-School · Black History Month · Pride Month · National Reading Day. Author can also pick "None" → renders as neutral "Premium Edition" without occasion chip.

### Behaviour

- **0 BP-08 for the book** → strip hidden.
- **1 BP-08** → single hero card.
- **2+ BP-08s** → horizontal scroll/grid of occasion cards, sorted by next peak date (in April, Mother's Day surfaces first).
- A small "🎁 Collector's Editions" header sits above the grid.

### Bundling collector's editions

The plain "Bundle" row (BA-17) stays separate — that's the everyday 3-in-1. Collector bundles inside BP-08's `bundle_offer` are surfaced *inside the Collector's Edition card* (e.g. "Save $20 with all 3 occasion editions") so the two concepts don't collide.

---

## Part 3 — BP-08 builder additions (Collector's Edition design layer)

Add a new **"Collector's Edition Design"** sub-step to the BP-08 builder so authors can configure the limited/collectible angle. New fields written into `content_json`:

```ts
{
  is_collectible: boolean,           // toggles the LIMITED ribbon
  print_run_size: number | null,     // e.g. 50, 100, 500 — drives "Only N available"
  numbered: boolean,                 // "#1–50 of 50"
  signed: boolean,                   // "Signed by the author"
  gift_wrapped: boolean,             // "Gift-wrapped with ribbon"
  includes_letter: boolean,          // "Handwritten letter from author"
  includes_dedication_card: boolean, // "Personalised dedication card"
  themed_cover_url: string | null,   // optional alternate cover for this occasion
  delivery_cutoff_days_before: number | null, // e.g. 7 → "Order by May 5 for May 12"
}
```

UI: a single card in the builder titled **"Make it collectible"** with toggles + a "Generate themed cover" button (calls existing `generate-cover-image` edge function with the occasion as a style hint, e.g. "rose-gold floral border for Mother's Day").

Includes 1-click presets per occasion:
- 💐 Mother's Day → signed + gift-wrapped + dedication card, run of 100, 7-day cutoff
- 💝 Valentine's → signed + letter + gift-wrapped, run of 50, 5-day cutoff
- 🎄 Christmas → signed + gift-wrapped + numbered, run of 200, 10-day cutoff
- 🎓 Graduation → signed + dedication card, run of 100, 7-day cutoff
- 👔 Father's Day → signed + letter, run of 100, 7-day cutoff

---

## Part 4 — "Work With Me" section: services only

After the redesign, "Work With Me" shows true services only.

**Kept:** Coaching (BA-13, YR-19), Speaking (YR-21), Corporate Training (YR-22), Mastermind (YR-23), Retreats (YR-24), Certification (YR-25), Membership (BA-12), Online Course (BA-10), Group Coaching, Conference (YR-26), Big Ticket (YR-20).

**Excluded (moved under their book):** BA-11 Audiobook, BP-06 Workbook, BP-08 Special Editions, BA-17 Upsells/Bundles.

**Open question — Media Kit (BA-15):** suggest moving to a "For Press / Media" footer link rather than treating as a service. If you'd rather keep it in Work With Me, say so.

---

## Part 5 — Files to add / change

### New
- `src/components/public/AuthorBookFormatsList.tsx` — stacked formats row (Kindle / Paperback / Audiobook / Workbook / Bundle)
- `src/components/public/AuthorBookCollectorsStrip.tsx` — Collector's Editions strip (occasion cards, urgency, hidden when none)
- `src/components/public/CollectorsEditionCard.tsx` — single occasion-themed card
- `src/components/dashboard/builders/special-editions/CollectibleDesignCard.tsx` — new builder sub-step for Part 3

### Modified
- `src/pages/author-site/types.ts` — helpers `getFormatsForBook`, `getCollectorsEditionsForBook`, `getNextPeakDate`; export `BOOK_FORMAT_NODE_IDS = ["BA-11","BP-06","BP-08","BA-17"]`
- `src/pages/author-site/AuthorBooksSection.tsx` — render new components inside each book card; drop legacy chip row
- `src/pages/DynamicBookMicrosite.tsx` (a.k.a. dedicated book page) — same components with more vertical space for the Collector's strip
- `src/components/public/AuthorWorkWithMe.tsx` — accept already-filtered `serviceOnlyNodes`
- `src/pages/AuthorSite.tsx` — derive `serviceOnlyNodes` by excluding `BOOK_FORMAT_NODE_IDS`
- `src/components/dashboard/builders/special-editions/OccasionTemplateGrid.tsx` — make sure `OCCASION_TEMPLATES` (icon, label, peakWindow) is exported for public-side reuse
- BP-08 builder shell — slot in `CollectibleDesignCard` between occasion picker and pricing

### Database
No schema changes. New collectible fields live inside the existing `author_nodes.content_json` JSON blob.

---

## Part 6 — Out of scope
- Real inventory tracking of limited stock (we display the author-stated `print_run_size` only)
- Per-occasion email reminders ("Mother's Day in 30 days") — Email Hub follow-up
- Internationalised peak dates (Mother's Day differs by country) — using US dates from `OCCASION_TEMPLATES`
- Reordering formats (display order is fixed: Kindle → Paperback → Audiobook → Workbook → Bundle)
- Auto-printing/fulfilment integration for signed/gift-wrapped copies

## Part 7 — Validation
1. Book with Kindle, Paperback, Audiobook, Workbook and Bundle shows one card with 5 stacked format rows, each with the right CTA.
2. Same book with two live BP-08 editions (Mother's Day + Christmas) shows a Collector's strip with two occasion cards, Mother's Day first when viewed in April.
3. Work With Me no longer contains BA-11 / BP-06 / BP-08 / BA-17.
4. Book with no BP-08 shows no Collector's strip.
5. BP-08 with `occasion: "none"` shows as neutral "Premium Edition" (no chip, no countdown).
6. BP-08 with `is_collectible: true` and `print_run_size: 50` shows "Only 50 available" + LIMITED ribbon.
7. Mother's Day card shows "Order by May 5 for May 12 delivery" before the cutoff; switches to "Order soon" inside peak window; hides date line after.
8. The new "Make it collectible" builder card persists toggles to `content_json` and re-renders the public card live after save.
9. Builder presets (one click on Mother's Day preset) populate all collectible fields correctly.
