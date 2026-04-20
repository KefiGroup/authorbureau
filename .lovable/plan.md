
## Investigation summary

The user reports that after publishing, `authorsbureau.com` still serves the old bundle calling `rest/v1/books?author_id=eq...` directly instead of the new `get-author-book` edge function. They also note "Online Course still says coming soon."

## Hard truths about what I can and cannot do

**I cannot force a rebuild or redeploy the frontend bundle.** There is no tool available to me that triggers Lovable's build pipeline or invalidates the published CDN bundle. The Publish action lives exclusively in the Lovable IDE chrome and is user-initiated. No `code--exec`, no edge function deploy, no migration will rebuild the frontend.

**What "Publish → Update" actually does:** it takes the current repo state, builds it, and ships it to `authorsbureau.com`. If the file `src/hooks/useAuthorBook.ts` is correct in the repo (it is — verified earlier), a successful Publish will ship the new hook. There is no separate "force rebuild" toggle.

**Likely real causes for the stale network trace:**
1. The Publish click didn't actually complete (Publish button was non-clickable per earlier message)
2. The user is testing on a cached browser tab — service worker or HTTP cache serving the old JS chunk
3. The user is testing on a custom domain (`authorsbureau.com`) that may have CDN caching ahead of the Lovable origin
4. There's another component still calling `books` directly that isn't the hook (display-only `bookTitle` lookups in BA-10/BA-12, mentioned in prior turn)

## Plan

### Step 1 — Verify repo state is still correct
Re-read `src/hooks/useAuthorBook.ts` to confirm it has not been reverted since last check.

### Step 2 — Find the *other* direct `books` queries
Search for any `from("books")` or `rest/v1/books?author_id` callsite in the frontend. The network trace pattern `books?author_id=eq.ef23c521-...` strongly suggests a component other than `useAuthorBook` is querying the books table directly for display purposes (likely `CourseBuilder`, `BA-10`, `BA-12`, or a sidebar tile). This would persist *even after* a successful publish of the hook fix.

Specifically grep for:
- `from("books")`
- `from('books')`
- `.eq("author_id"` near books
- `books?author_id`

### Step 3 — Investigate "Online Course still says coming soon"
Search for "coming soon" string in the codebase, particularly around online course / BA-10 / `online-course` node. This is likely a separate gating issue:
- A `disabled` flag in `BUILDER_NODE_MAP["online-course"]`
- A status check in the Brand Products Hub that reads `coming_soon` instead of `available`
- A hardcoded badge in the course tile

### Step 4 — Fix the actual root causes
Based on findings, in default mode I will:
- **(a)** Route any remaining direct `books` ownership/title lookups through `useAuthorBook` so the network trace is fully clean
- **(b)** Flip the "coming soon" flag for online course to `available`/built (whichever the codebase uses)
- **(c)** Bump a version constant in `useAuthorBook.ts` (e.g., add a header `x-hook-version: v2`) so the user can confirm in the network trace that the new bundle is actually live

### Step 5 — Tell the user clearly what only they can do
- Click Publish → Update once more (frontend rebuild requires this — there is no programmatic alternative)
- Hard refresh `authorsbureau.com` with Cmd/Ctrl+Shift+R, or test in incognito to bypass service worker / CDN cache
- If the custom domain still serves stale JS after publish + hard refresh, the issue is CDN propagation (usually <5 min)

### What I will NOT do
- Pretend I can "force a rebuild" — I cannot. Saying so would be dishonest.
- Re-deploy the edge function or re-run the migration — both are already live and verified.
- Re-write `useAuthorBook.ts` again — it is already correct.

## Deliverable
A concrete code change that (1) eliminates remaining direct `books` queries causing the stale network trace, (2) fixes the "coming soon" label on Online Course, and (3) adds a version marker so we can confirm bundle freshness. Plus a clear note that Publish → Update + hard refresh is required to ship and that I cannot trigger it programmatically.
