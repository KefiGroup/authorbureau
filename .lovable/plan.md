# Audit Completion — Status + Plan to Finish

I re-read the full PDF and checked every finding against the current code. **All 9 critical bugs are fixed. Several medium/low items remain.** One item I "fixed" last round was actually the wrong target (D-04), so it's reopened below.

## ✅ Already fixed (verified in code)

| Ref | Item | Where |
|---|---|---|
| H-01 | "How It Works" blank | `/how-it-works` renders `HowItWorks` |
| H-02 / HP-01 | "Help" 404 | `/help` → `/faq` redirect; navbar points to `/faq` |
| A-01 | Hero price mismatch | CTA now derives from real lowest price |
| A-02 | Terms/Privacy under every card | Removed from cards; footer-only |
| A-06 / Q-01 | "Free Quiz" 404 | Uses `#quiz-section` anchor, conditional |
| S-01 | Fee-schedule raw JSON | Block removed from Speaking page |
| S-02 | Speaking H1 artifact | `formatPublicLabel` → "Book Pauline Teo to Speak" |
| B-01 | Raw node-ID tab bar | Non-product types filtered + canonical labels |
| B-04 | Artifact product name | `formatPublicLabel` on all product titles |
| S-07 | No form confirmation | Success toast + `submitted` state already present |
| A-03 | Hero "18 Products" stat | Proof bar shows Books / Rating / Reviews, not a product count |
| M-01 | Methodology no CTA | Footer CTA "Ready to See What Abby Recommends?" exists |

## ❌ Still to do

### Code fixes (this is what I'll build)
- **B-05** — Cross-sell "Also by" card: add price + "View Book" CTA (needs adding price to the `otherBooks` query/type).
- **H-05** — Add an "↗" external indicator to PublishNow footer links.
- **M-02** — Style framework badges as pill badges with icons.
- **D-02** — Show the author's first book cover thumbnail on directory cards.
- **D-04** (reopened) — Author page with no published books should render a branded "Coming Soon" state, not empty. (My earlier change improved the directory *search* empty state, which is good to keep, but is a different thing.)
- **D-03** — Genre filter still shows internal labels ("Access Strategy", "Ai Advocacy", "Application Development"). Title-casing alone isn't enough; add a denylist/allowlist so only reader-facing genres show.
- **B-02** — Workbook card: add "Free for all Be SUCKcessful readers. Download your companion workbook." description.
- **B-03** — Membership ("Collective") should show a "Join for $17/month" CTA instead of "Contact" when it has a price + enrolment link.
- **A-04** — Add a "Start Here" recommendation banner above the Work With section.
- **A-05** — Group the Affiliate node under a labelled "Partner With Us" sub-section with a short description.
- **A-07** — Refine subscribe copy to a concrete lead-magnet description (kit name + benefit).
- **S-03** — Keep the "Signature Talk" fallback; real talk names are content (below).

### Data fixes (cannot be done in code — need a DB migration or content edit)
- **D-01** — "Entreprenuer" → "Entrepreneur" typo lives in an author profile record.
- **S-03** (content) — Give the 3 talks real titles in Pauline's `signature_talks` data.
- **S-04 / S-05 / S-06** — Speaker photo/video, event-organiser testimonials, past-client logo bar: these are **missing content**, not code bugs. I can add render slots that display them *when the data exists* (and hide cleanly when empty), but the actual photos/quotes/logos must be supplied.

### Intentionally NOT changing
- **H-04** (homepage pricing section) and **H-03** (move 28-stream diagram): public-site rules in project memory suppress pricing on public pages, and the homepage layout is a deliberate design choice. I'll leave both unless you want them overridden.

## Plan of work
1. **Directory** (`Directory.tsx`): D-02 book-cover thumbnail on cards; D-03 reader-friendly genre filtering.
2. **Author page** (`AuthorBookPage.tsx`): D-04 Coming-Soon empty state; B-02 workbook copy; B-03 membership "Join $17/mo" CTA; B-05 cross-sell price+CTA; A-04 "Start Here" banner; A-05 "Partner With Us" grouping.
3. **Subscribe + footer + methodology**: A-07 copy refinement; H-05 external ↗ indicator; M-02 pill badges.
4. **Speaking** (`MicrositePage.tsx`): add hidden-until-present slots for speaker photo (S-04), organiser testimonials (S-05), client logos (S-06).
5. **Data migration**: fix the "Entreprenuer" typo (D-01); optionally seed real talk titles (S-03) if you confirm the names from the report's suggestions.

## Technical notes
- `otherBooks` currently selects only `id, title, slug, cover_image_url`; B-05 needs `price`/`kindle_price` added to that query and the `OtherBook` interface.
- D-03 needs a small `READER_GENRE_DENYLIST` (or allowlist) in `Directory.tsx` applied alongside the existing `normalizeGenre`.
- B-03 depends on whether the membership node carries `price_usd` + an enrolment/checkout link; if present, route through the existing `BuyNowButton` instead of the contact modal.
- S-04/05/06 will read from existing content fields if available (e.g. `content.speaker_photo`, `content.event_testimonials`, `content.client_logos`) and render nothing when absent, per the "empty fields hide cleanly" rule.
