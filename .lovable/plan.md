# Sprint A — Final Fixes

Three remaining items from the audit. Two are clean code fixes; one is a data issue I'll guard against in code.

## S-02 — Speaking page H1 still shows "Pauline Teo | Be SUCKcessful"

**Root cause:** The Speaking page (`SpeakingPage` in `src/pages/MicrositePage.tsx`, line 3352) derives its title from `content.speaker_brand` first and only falls back to `formatPublicLabel(...)`. The stored `speaker_brand` value itself contains the page-title artifact `"Pauline Teo | Be SUCKcessful"`, so the sanitizer never runs on it.

**Fix:** Wrap the resolved title in `formatPublicLabel`, using a meaningful speaking-specific fallback:

```text
title = formatPublicLabel(
  content.speaker_brand || data.node.personalised_name,
  `Book ${data.author.pen_name} to Speak`
)
```

Because `formatPublicLabel` strips a `" — Contact <name>"` suffix and rejects any value containing a pipe (`|`), the artifact collapses to the fallback "Book Pauline Teo to Speak" while a legitimate brand name (e.g. "Pauline Teo Keynotes") is preserved. `data.author.pen_name` is already available on this page.

## H-02 — /help returns 404

**Root cause:** The current Navbar already links Help → `/faq` (which exists), so the nav itself is fixed in source. But there is no `/help` route, so direct navigation / stale links / the older published build still 404.

**Fix:** Add a redirect route in `src/App.tsx` next to the other redirects:

```text
<Route path="/help" element={<Navigate to="/faq" replace />} />
```

This guarantees `/help` always lands on the Help (FAQ) page.

## B-03 (partial) — "Be SUCKcessful Collective" appears twice

**Root cause:** This is a data issue. The membership node (BA-12) correctly shows in **Courses & Membership** with a Buy Now at $17. A second, separately-created node in the **Work With** bucket (`WORK_WITH_NODE_IDS`) was given the same personalised name "Be SUCKcessful Collective", so the same title renders again with a Contact CTA. The audit classifies this as a data cleanup item — the duplicate node should be removed/renamed in the author's data, which isn't a source-code change.

**Code-level guard (defensive):** In `src/pages/AuthorBookPage.tsx` (around line 836), after computing `formatNodes` / `courseNodes` / `workNodes`, drop any `workNodes` entry whose display title already appears in `courseNodes` or `formatNodes`. This prevents a duplicate-named node from showing the same product twice regardless of underlying data. The real duplicate node still needs cleaning in data, which I'll flag.

## Technical details / files touched
- `src/pages/MicrositePage.tsx` — one-line change to `SpeakingPage` title derivation.
- `src/App.tsx` — add `/help` → `/faq` redirect route.
- `src/pages/AuthorBookPage.tsx` — add a title-based de-dup filter so a node already shown in Formats/Courses isn't repeated in Work With.

## Verification
- Confirm Speaking page H1 reads "Book Pauline Teo to Speak" (or a clean brand if one exists).
- Confirm `/help` loads the FAQ page instead of NotFound.
- Confirm "Be SUCKcessful Collective" appears only once on the book detail page.

Note: the B-03 root cause is duplicated node data; the code guard hides the symptom, but I'd recommend removing/renaming the duplicate Work-With node so it doesn't resurface elsewhere.
---

# Sprint B / C — Finish-up (best-effort)

The detailed Sprint B/C finding text lived only in the audit image, so I implemented the items whose intent was unambiguous and safe:

- **D-03 (genre normalization):** Directory author-card genre chips now render through `normalizeGenre()` (title-case), matching the filter bar.
- **D-04 (empty state):** Directory "no results" is now a proper empty state — icon, guidance copy, and a "Clear filters" action (shown when a search/genre is active).
- **S-03 (talk title fallback):** Speaking page talks fall back to "Signature Talk" instead of "Talk 1/2/3".

Still need the original audit wording to action precisely (one-liners too vague to fix without guessing): S-04–06 (missing Speaking sections), A-03 (which stat), A-04 ("Start Here" placement), A-07 (lead-magnet description copy), D-01 (which typo), H-03 (How-It-Works diagram), M-01 (which CTA), M-02 (which badges), B-02 (workbook copy), B-05 (cross-sell), D-02 (thumbnails). H-04 stays suppressed per public-site rules.
