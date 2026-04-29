# Fix BP-06 Workbook builder losing `bookId` on entry

## Root cause (confirmed by code trace)

The Book Hub correctly builds the URL `/dashboard/book/{bookId}/build/workbooks?bookId={bookId}&bookTitle=...&builder=workbook` via `getStudioPath` (`abbyFrameworkConfig.ts:296-298`). But that URL goes through this chain:

```
/dashboard/book/:bookId/build/workbooks
  → BookBuilderRoute (mounts AuthorDashboard, queues setSearchParams in useEffect to mirror :bookId into ?bookId=)
    → AuthorDashboard section="workbooks"
      → <Navigate to={`/node-builder/BP-06${location.search}`} replace />   // AuthorDashboard.tsx:446
```

The `<Navigate>` runs on the **first render**, *before* `BookBuilderRoute`'s `useEffect` calls `setSearchParams` to copy `:bookId` from the path into the search string. So `location.search` is whatever the original URL had (which from a Book Hub click is `?bookId=...&bookTitle=...&builder=workbook` and **does** include bookId — that case works).

The case that **breaks** is any entry that has bookId only in the path segment (`/dashboard/book/:bookId/build/workbooks` with no query string), which then redirects to `/node-builder/BP-06` with no `?bookId=`. Inside BP-06 the `bookId` prop is `null`, so `<BuilderHeader onBack={...}>` falls back to `/dashboard?section=my-books`, the top NodeBuilder back link uses `getHubPath("BP-06", null, null)` → `/dashboard` with label "Back to Dashboard", and the "Complete Book Profile" button (line 200) navigates to `/my-books?returnTo=/node-builder/BP-06` (also without bookId). All three reported symptoms collapse into this single root cause.

BP-07/08/09 work today because they're either entered with bookId already in the query string, or because their flows didn't hit this path-only entry pattern.

## Fix

### 1. AuthorDashboard `workbooks` redirect — preserve bookId from `useParams()`

In `src/pages/AuthorDashboard.tsx` around line 444-446, change the `home-study` and `workbooks` (and any sibling `<Navigate>` redirects to `/node-builder/...`) so they merge `bookId`/`bookTitle`/`builder` from BOTH `location.search` and any path param / context that's currently in scope.

Concretely, build the search string like:

```ts
const params = new URLSearchParams(location.search);
// If the route is /dashboard/book/:bookId/build/:node, mirror bookId in
const pathBookId = /\/dashboard\/book\/([^/]+)\/build\//.exec(location.pathname)?.[1];
if (pathBookId && !params.get("bookId")) params.set("bookId", pathBookId);
const search = params.toString() ? `?${params.toString()}` : "";
return <Navigate to={`/node-builder/BP-06${search}`} replace />;
```

Apply the same pattern to the `home-study` (BP-07) Navigate so it never regresses either.

### 2. `BookBuilderRoute` — mirror search params synchronously

In `src/pages/BookBuilderRoute.tsx`, move the `setSearchParams` mirror out of `useEffect` into the render path: if `bookId` (or any `entry.extraParams`) is missing from `searchParams`, call `setSearchParams(next, { replace: true })` and return `null` (or a small loader) for that one render. This guarantees AuthorDashboard never mounts with empty search params.

### 3. `BP06Builder` — preserve bookId on the "Complete Book Profile" CTA

`src/components/dashboard/builders/bp06/BP06Builder.tsx` line 200:

```tsx
onClick={() => navigate(`/my-books?returnTo=/node-builder/BP-06${bookId ? `?bookId=${bookId}` : ""}`)}
```

So returning from My Books restores book context.

### 4. Verify BP-06's own back-button label

`BP06Builder.tsx:189` already passes `onBack` to `BuilderHeader`, but `BuilderHeader` ignores it. The visible top "Back to …" link comes from `NodeBuilder.tsx:144-150` via `getHubPath`, which already returns `"Back to Book Hub · Brand"` and `/book-hub/{bookId}?tab=revenue-streams` when `bookId` is present. After fix #1 + #2 this will show correctly. No code change needed in `NodeBuilder.tsx`.

## Why not "rebuild BP-06"

BP-06's builder logic, generation prompt, and Abby integration are correct and identical in pattern to BP-07/08/09. The bug is purely in the navigation/redirect chain (`AuthorDashboard` → `Navigate` → `NodeBuilder`), not in the builder itself. No regeneration of BP-06 is required.

## Verification after implementation

1. From Book Hub Brand tab → click Workbook card → URL becomes `/node-builder/BP-06?bookId=...&bookTitle=...&builder=workbook`.
2. Top back link reads "← Back to Book Hub · Brand" and goes to `/book-hub/{bookId}?tab=revenue-streams`.
3. If book profile is incomplete, "Complete Book Profile" returns to BP-06 with bookId intact.
4. BP-07/08/09 unaffected (same fix #1/#2 applied to home-study redirect).

## Files to edit

- `src/pages/AuthorDashboard.tsx` (workbooks + home-study Navigate redirects)
- `src/pages/BookBuilderRoute.tsx` (synchronous param mirror)
- `src/components/dashboard/builders/bp06/BP06Builder.tsx` (line 200 returnTo bookId)
