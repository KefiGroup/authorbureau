## Goal

Eliminate the duplicate Brand Products surface so the **Book Hub → Brand tab** is the single source of truth, without breaking any existing links, deep paths, or builder back buttons. Replace the misleading "View on Website" CTA with phrasing that fits every node type.

## What changes

### 1. `BrandProductsHub.tsx` becomes a thin redirect

Rather than ripping the route out (which would break ~10 existing links across builders, dashboard, library, success screens, etc.), I'll convert the page itself into a redirect. Any visit to `/brand-products` is sent to the active book's Brand tab:

```
/brand-products  →  /book-hub/:bookId?tab=revenue-streams
```

If no active book is resolved yet, fallback to `/dashboard`.

This means:
- All existing "Back to Brand Products" buttons keep working (no builder edits needed).
- The duplicate UI is gone — the standalone hub component code is fully replaced.
- One route, one experience. Single source of truth maintained.

### 2. Rename the published-state CTA on `SmartProductCard`

Currently shows **"View on Website →"** for every published node — incorrect for Email Marketing, Social Media, CRM-driven nodes, etc. that don't live on the public website.

**New label: "Open & Manage →"** (with the existing Eye icon)

Why this phrasing:
- Works universally — Email Marketing, Social Media, Webinars, Workbooks, Courses, Coaching, all of them
- Action-oriented (matches "Build This Product" / "Continue Building" sibling CTAs)
- Honest: tapping it opens the builder where the author can review, edit, or re-generate the live asset
- Short enough to fit the card without wrapping

Alternative phrasings I considered and rejected:
- "View Live →" — ambiguous (live where?)
- "Manage →" — too thin
- "Edit →" — implies only editing, not viewing analytics/status
- "Open Builder →" — too technical

### 3. Verify nothing else breaks

- Sidebar pathname matching (`/brand-products` → "revenue-streams" section) is preserved because the route still exists; the redirect is internal.
- `PublishSuccessScreen` BP success path (`/brand-products`) still works → flows into the new Book Hub Brand tab.
- `NodeBuilder` and `BP01–09` "back" handlers still work.
- No imports removed; no broken references.

## Files touched

| File | Change |
|---|---|
| `src/pages/BrandProductsHub.tsx` | Replace contents with redirect-only component using `useBookContext` |
| `src/components/dashboard/SmartProductCard.tsx` | Change line 453 CTA text from "View on Website →" to "Open & Manage →" |

That's it — two surgical edits. No router changes, no link rewrites across 10+ files, no risk of orphan paths.

## Out of scope

- The `BookHubOverview` Brand tab itself stays as-is (it's already the winning design).
- No changes to data fetching, no schema work, no edge functions.

## After build

I'll confirm the TypeScript build passes, then summarize the final CTA wording so you can sanity-check it before publishing.
