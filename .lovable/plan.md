# Fix the 3 bugs from the BP-05 → BP-09 audit

I read Manus's audit report and traced each remaining bug to a single root cause in the code. Two of them are NOT what the audit prompt assumes — the back-nav code is already correct in source, and the "Products Built" counter discrepancy is a different shape of the same `bookId` plumbing problem on the backend. Findings and fixes below.

## Bug 1 (P1) — "Go back to Brand Products" lands on My Books for BP-06/07/08/09

**Audit assumption:** the `onBack` handlers in BP06/07/08/09 still hard-code `/brand-products`.

**Actual cause:** all four builders already use the correct
`navigate(bookId ? \`/book-hub/${bookId}?tab=revenue-streams\` : "/dashboard?section=my-books")`
pattern (verified in BP06Builder.tsx:189, BP07:222, BP08:177, BP09:207). The fallback is firing because **`bookId` is `null` at runtime** for these four builders — but it IS populated for BP-05.

The reason: the Brand-tab cards in `BookHub.tsx` open these nodes through dashboard sections (`/dashboard?section=workbooks&bookId=...`). `AuthorDashboard.tsx` then uses React-Router `<Navigate to="/node-builder/BP-06" replace />` for the workbooks/home-study/special-editions/book-sales cases. **`<Navigate>` drops the query string**, so by the time `NodeBuilder.tsx` reads `searchParams.get("bookId")`, it is `null`. BP-05 Webinars is unaffected because it uses `WebinarsManager` (no `<Navigate>`).

**Fix — preserve `bookId` (and `bookTitle`) on the redirects in `src/pages/AuthorDashboard.tsx`:**

Replace each of these five lines with a redirect that forwards the current query string:

```tsx
case "home-study":
  return <Navigate to={`/node-builder/BP-07${location.search}`} replace />;
case "workbooks":
  return <Navigate to={`/node-builder/BP-06${location.search}`} replace />;
case "book-sales":
  return <Navigate to={`/node-builder/BP-09${location.search}`} replace />;
case "special-editions":
  return <Navigate to={`/node-builder/BP-08${location.search}`} replace />;
case "lead-magnet":
  return <Navigate to={`/node-builder/BP-02${location.search}`} replace />;
```

(`useLocation()` is already imported in this file; if not, add it.) Apply the same pattern to the other `<Navigate to="/node-builder/...">` cases in this file (`group-coaching`, `memberships`, `email-marketing`, `big-ticket`) so any future Brand-card flow that depends on `bookId` works consistently.

After this change, the existing `onBack` code in all four builders will correctly route back to `/book-hub/<bookId>?tab=revenue-streams`. No edits needed in BP06/07/08/09 themselves.

## Bug 2 (P2) — BP-05 Webinars shows "Live" with no content

**Cause:** `deploy-bp05-to-ghl` writes `status = "live"` (or `published_pending_ghl`) on the `author_nodes` row before the actual webinar content has been generated. `useBookNodeProgress` then maps any row with those statuses to `completed`, regardless of whether `content_json` exists.

**Fix — `src/hooks/useBookNodeProgress.ts`:**

Tighten the "completed" rule so that a node only counts as live when it actually has content:

1. Update the `author_nodes` select to `"node_id, status, content_json"`.
2. In the row loop, treat `live` / `published_pending_ghl` as `"completed"` **only if** `content_json` is a non-empty object. Otherwise downgrade to `"in-progress"`:

```ts
const hasContent =
  n.content_json &&
  typeof n.content_json === "object" &&
  Object.keys(n.content_json).length > 0;

if ((n.status === "live" || n.status === "published_pending_ghl") && hasContent) {
  map[n.node_id] = "completed";
} else if (n.status === "content_ready" || n.status === "draft" ||
           ((n.status === "live" || n.status === "published_pending_ghl") && !hasContent)) {
  if (map[n.node_id] !== "completed") map[n.node_id] = "in-progress";
}
```

This is generic — it fixes BP-05 today and prevents the same false-Live badge on any other node whose deploy step runs ahead of content generation.

## Bug 3 (P3) — "Products Built" header shows 2 of 56 instead of 29 of 56

**Cause:** `MyBooks.tsx` reads `centralStats.products.totalBuilt` from the `author-stats` edge function. Inside that function, `totalBuilt` is summed only across the 8 `PRODUCT_TABLES` rows (courses, home_study_courses, audiobooks, podcasts, workbooks, coaching_packages, email_flows, social_media_content). It **ignores `author_nodes`** entirely, even though most BP/BA/YR nodes record their built state there. The per-book counter in the same response (`products.perBook`) DOES include `author_nodes`, which is why each book card shows the correct number (28/28, 1/28) while the aggregate shows only 2.

**Fix — `supabase/functions/author-stats/index.ts`:**

Compute `totalBuilt` from the same per-book node sets that the per-book card uses, summing distinct nodes across all books:

```ts
const totalBuilt = Object.values(perBookNodeSets)
  .reduce((sum, set) => sum + set.size, 0);

// totalReadyForReview / totalPublished can stay as the existing
// product-table sums — they are only used by ReviewProductsPage.
```

This makes the header (29/56 in this user's case) consistent with the per-book chips and with the BookHub overview, all of which already use the per-book node sets.

## Files changed

- `src/pages/AuthorDashboard.tsx` — preserve query string on all `<Navigate to="/node-builder/...">` redirects (fixes back-nav for BP-06/07/08/09 and any future bookId-aware flows).
- `src/hooks/useBookNodeProgress.ts` — require non-empty `content_json` before treating a node as "completed" (fixes BP-05 false Live badge generically).
- `supabase/functions/author-stats/index.ts` — derive `totalBuilt` from `perBookNodeSets` so it includes `author_nodes`, matching the per-book counts.

## Verification checklist

1. From the Brand tab on a book, click Workbook / Home Study / Special Editions / Book Sales → builder opens AND its "Go back to Brand Products" button returns to `/book-hub/<bookId>?tab=revenue-streams`.
2. With no webinar content generated, the BP-05 Webinars card shows "Ready to Build" / "In Progress", not "Live".
3. After generating real BP-05 content, the badge flips to "Live" as expected.
4. My Books header shows "29 of 56 Products Built" (matches 28 + 1 from the per-book chips).
