# 05 · AB Author-Level vs Book-Level Node Registry

_Version 3.0 · 2026-05-01_

**Source(s) of truth:**
- `supabase/functions/_shared/node-readiness.ts` (`AUTHOR_LEVEL_NODES`)

---

## Why the distinction matters

Some products are **per-author** (one email list, one podcast, one social presence) — activating them once applies across every book in the author's library. Others are **per-book** (microsite, workbook, audiobook) and must be built individually for each book.

This affects:

- **Counters**: book hub shows "X / 28 Live for THIS book". Author-level live nodes count toward every book's counter.
- **Cross-book pushes**: a podcast episode for Book A also shows up in Book B's marketing automation if both books share the author.
- **Email list scoping**: BP-01 sequences live on the author's master list; book-specific tagging happens via `crm_contact_tags`.

## Author-level (16 nodes)

| ID | Label | Rationale |
|---|---|---|
| BP-01 | Email Marketing | One author = one master email list (Resend domain is shared) |
| BP-03 | Social Media | One author = one set of social channels |
| BA-14 | Podcast Tour | One show, multi-book episodes |
| BA-15 | Media & PR | Author bio + press kit, not book-specific |
| BA-16 | Affiliates | Author's affiliate programme spans all books |
| BA-18 | JV Partnerships | Joint ventures are author-to-author |
| YR-19 | 1-on-1 Coaching | Author's coaching practice |
| YR-20 | Big Ticket Consulting | Author's consulting practice |
| YR-21 | Speaking | Author's speaker kit |
| YR-22 | Corporate Training | Author's training menu |
| YR-23 | Mastermind | Author's mastermind |
| YR-24 | Retreats | Author's retreat schedule |
| YR-25 | Certification | Author's certification programme |
| YR-26 | Conference | Author's conference series |
| YR-27 | Fundraising | Author's fundraising offers |
| YR-28 | Sponsors | Author's sponsorship deck |

## Book-level (12 nodes)

| ID | Label | Rationale |
|---|---|---|
| BP-00 | Initial Analysis | Per-book AI analysis |
| BP-02 | Lead Magnet | Tied to the book's themes |
| BP-04 | Author Website | The book's microsite |
| BP-05 | Webinars | Book-specific webinar topic |
| BP-06 | Workbook | Book-specific companion |
| BP-07 | Home Study Course | Book-specific deep-dive |
| BP-08 | Special Editions | Book-specific bundles |
| BP-09 | Book Sales | Per-book sales channel config |
| BA-10 | Online Course | Book-specific curriculum |
| BA-11 | Audiobook | Book-specific narration |
| BA-12 | Membership | Book-specific recurring offer |
| BA-13 | Group Coaching | Book-specific cohort |
| BA-17 | Bundles | Book-specific bundles |

(BP-00 is the analysis step and not counted in the 28 revenue nodes.)
