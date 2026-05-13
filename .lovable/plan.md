
# Author Page + Book Detail Page Redesign

Implements the 13-item priority list from `AB_Redesign_Brief.pdf` as 4 sprints. Pages affected: `AuthorSite` (`/:authorSlug`) and `AuthorBookPage` (`/:authorSlug/:bookSlug`). Theme palette (navy/gold/cream) is preserved — no design-system rewrite. All work is per-author at the rendering layer (no schema changes).

---

## Sprint 1 — Revenue Loop (priorities 🔴 1–4)

Closes the "no clear path to buy" gap. ~3 days.

1. **Book detail: Products & Resources section** (`AuthorBookPage.tsx`)
   - New `<BookProductGrid>` rendering all live nodes tied to the book in a 2×3 grid (Workbook, Home Study, Collective, Certification, Coaching, Quiz).
   - Each card: name, type badge, one-line description, price, CTA. Purchasable items wire to existing `<BuyNowButton>` (Stripe checkout already shipped — Commerce Engine v1).
   - Inserted directly under "About This Book".

2. **Sticky "Get the Book — $0.99" nav CTA** (`AuthorBrandedNav.tsx`)
   - Adds a gold filled CTA pinned right of the nav, visible on Author + Book pages, on desktop and mobile.
   - Resolves the lowest-price live `BP-08`/Kindle product from the curated book; hides cleanly if no price is set.

3. **Hero rebuild** (`AuthorHeroSection.tsx`)
   - 55/45 split, 90vh navy hero. Left: gold "INTERNATIONAL BESTSELLING AUTHOR" badge → Playfair H1 transformation hook → Inter subhead → primary `Get the Book — $X.XX` + secondary `Take the Free Quiz` CTAs → review-count proof strip → format logos. Right: full-height author photo, gold frame, floating "#1 Amazon Best Seller" badge.
   - Headline + subhead pulled from `author_profiles.tagline`/`bio_short` with sensible defaults; bestseller badge only when `featured` directory status.

4. **Reader testimonials** (`AuthorTestimonialsSection.tsx`)
   - Filter the existing testimonials list to `kind = 'reader'` (or equivalent flag); hide author-peer testimonials from the public site (still visible to owner preview).
   - Add closing CTA strip: "Join 1,200+ readers… Get the book for $X.XX →".
   - No data migration — existing rows surface based on a `is_reader` derived flag (peer testimonials route to a private dashboard view in a follow-up).

---

## Sprint 2 — Narrative Sections (🟡 5–8)

Restructures the page into a sales sequence. ~3 days.

5. **SUCKCESS Framework section** (new `AuthorFrameworkSection.tsx`)
   - 4×2 grid of letter-cards (gold letter, stage name, one-line). Source: `author_context.key_frameworks` (already populated by ABBY); render only when the curated book has a framework with ≥6 stages. Closing CTA → quiz lead magnet.

6. **Work With Me three-tier layout** (`AuthorWorkWithMe.tsx`)
   - Tier 1 *Start Here* (gold border): membership/home-study/quiz.
   - Tier 2 *Go Deeper*: 1-on-1, group, certification.
   - Tier 3 *Enterprise*: corporate, speaking, mastermind, retreat (collapsed under "Inquire" cards).
   - Tier mapping derived from existing `node_id` prefixes; nodes that don't fit a tier go to Tier 2.

7. **Subscribe section as lead magnet** (`AuthorSubscribeSection.tsx`)
   - Headline "Get the [BookTitle] Starter Kit — Free" + 1-line value prop + name/email + "No spam…" microcopy. Pulls lead-magnet name from the curated book's BP-02 node when present.
   - Pre-fill name + email when reader is logged in (also satisfies priority 9).

8. **Book detail: First Chapter Preview** (`AuthorBookPage.tsx`)
   - Collapsible cream block between hero and "About This Book". Renders `books.first_chapter_excerpt` (first 500 words). Hidden if empty.

---

## Sprint 3 — Polish + Conversion Hygiene (🟢 10–13)

~2 days.

10. **Hero "Subscribe for Updates" button**: replace with primary buy CTA (resolved by Sprint 1) — old handler removed.
11. **Hide Coming Soon items** from `AuthorBooksSection`: filter products by `status = 'live'`; coming-soon variants only render on `AuthorBookPage` with a "Notify Me" capture.
12. **SEO**: update `useDocumentMeta` for both pages — title `{Name} — Bestselling Author of {BookTitle} | {Framework}`, description, alt text on hero photo, Person + Book JSON-LD schema, canonical URL confirmed.
13. **Mobile fixes**: reverse hero stack (text first), reduce stat row to 2 items at <640px, collapse Work With Me to 3 featured + "See all" expand, 48px min touch targets on subscribe form, dim Coming Soon buttons.

---

## Sprint 4 — Nav & Social Proof Bar (rounds out the brief)

~1 day.

- **Nav prune** (`AuthorBrandedNav.tsx`): remove `Learn` and `Events` from primary; promote `Free Quiz` to primary; collapse `Events` into a `Work With Me` dropdown.
- **Social Proof Bar** (new `AuthorSocialProofBar.tsx`): 80px cream strip under hero with "As seen in" + sold-count stats. Hidden when no media logos uploaded.
- **Podcast + Media section** (new `AuthorPodcastMediaSection.tsx`): two-column navy block reusing existing `BA-14` data + a media-kit URL field (already on `author_profiles`).

---

## Out of scope

- No DB schema migrations beyond reading existing fields. If `books.first_chapter_excerpt` doesn't exist yet, we ship the section behind a feature flag and add the column in a follow-up.
- No global theme rewrite — existing `--gold`/`--navy`/`--cream` tokens stay.
- Other authors' pages: changes apply universally, but copy defaults (e.g., framework letter labels) only render when the author has the data.

---

## Technical notes

- All section work stays in `src/pages/author-site/*` and `src/components/public/*` — no edge-function or business-logic changes.
- New sections are additive components rendered from `AuthorSite.tsx`'s existing JSX block; the per-author `liveNodes` filter pattern is reused so nothing breaks for authors without that node.
- Stripe wiring already exists via `<BuyNowButton>` (Commerce Engine v1); we only add new placement points.
- Pre-fill subscribe uses `useAuth()` already imported elsewhere on the page.
- Sticky nav CTA uses the same gold-shimmer utility class introduced in §1.4 of the brief — added to `index.css` once, reused everywhere.

```text
Sprint 1 → Sprint 2 → Sprint 3 → Sprint 4
   ↓           ↓           ↓           ↓
 revenue   narrative    polish    nav + extras
```
