

# Quick Answer + Verification Plan — BP-05 through BP-09 Status

## Direct answer to your question

Yes — I checked Pauline's `author_nodes` table directly. Here's exactly what's there for the Brand Products category:

| Node | Name | Built? |
|------|------|--------|
| BP-01 | Email Marketing | ✅ Yes |
| BP-02 | Lead Magnet | ✅ Yes |
| BP-03 | Social Media | ✅ Yes |
| BP-04 | Author Website | ✅ Yes (via `author_slug`) |
| **BP-05** | **Book Sales** | ❌ Not built |
| **BP-06** | **Workbook** | ❌ Not built |
| **BP-07** | **Audiobook** | ❌ Not built |
| **BP-08** | **Special Editions** | ❌ Not built |
| **BP-09** | **Podcast** | ❌ Not built |

So the **correct** count is **4 of 9 built**. The sidebar showing "5 built" is wrong — it's inflated by **+1** because the legacy `courses` draft row is being added to the BP total (and also to the BA total, which is why BA shows 10 instead of 9).

## Why BP-05 through BP-09 are missing

This is **not a bug** — Pauline simply hasn't run those builders yet. The data tells the truth:
- No rows in `author_nodes` with `node_id` in (BP-05, BP-06, BP-07, BP-08, BP-09) for her author profile.
- No rows in the corresponding product tables (`workbooks`, `audiobooks`, `podcasts`) tied to her either.
- Those 5 nodes are still in the "Build Now" state in her Brand Products Hub — which is the expected behaviour per `mem://ux/brand-products-hub-semantics`.

So the audit confirms: **she has built 4, has 5 left to go**, and the sidebar should say **"4 built"** — not 5.

## What this changes about the previously approved fix

Nothing. The fix already approved (replace inflated sums in `AuthorDashboard.tsx` lines 528–545 with `stats.nodesBuilt.brand / .buildAuthority / .yield`) is still exactly the right change and resolves both:
- BP showing 5 instead of 4 (drops the phantom `courses` row).
- BA showing 10 instead of 9 (drops the same `courses` row that was being double-counted into BA).

## Verification after the fix ships

1. `/dashboard` sidebar → Brand Products: **4 built** of 9.
2. `/dashboard` sidebar → Build Authority: **9 built** of 9.
3. `/dashboard` sidebar → Yield Revenue: **10 built** of 10.
4. `/brand-products` hub → BP-05 through BP-09 still show "Build Now" (unchanged).
5. No counter anywhere can exceed its category maximum (9 / 9 / 10).

## Files touched

- `src/pages/AuthorDashboard.tsx` — same 3-line replacement as previously approved. No additional files.

