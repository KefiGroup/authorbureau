# Audit — Social Calendar empty-state banner ("Almost there")

## What the user sees
On book "Be SUCKcessful", the Social Calendar shows an amber banner: *"Your Social Media kit is activated, but your posts didn't load. This usually clears after a quick refresh."* with **Refresh Posts** and **Open Social Media Kit** buttons. Tapping Refresh does not fix it.

## Root cause (4 real bugs, 1 copy bug)

The banner renders when `posts.length === 0 && bp03Activated === true`. Both signals come from `marketing-hub-state/social_calendar`, which **is** correctly scoped per `(author_id, book_id)`. So the state itself is honest: BP-03 was activated for some book context, but no `social_posts` rows exist for the currently selected book. The repair path is what's broken.

### Bug 1 — `repairCalendar` never sends `book_id`
`SocialCalendarTab.tsx` line 271:
```ts
body: JSON.stringify({ action: "repair_calendar" })   // no book_id
```
Server-side `bp03-node-state` reads `body.book_id` and, when null, falls back to the **latest** BP-03 node for the author — which may be a different book entirely. Result: Refresh Posts can rebuild the wrong book's kit.

### Bug 2 — `rebuildSocialPosts` writes `book_id = NULL`
`bp03-node-state/index.ts` lines 119–158: the function signature is `(cloudAdmin, authorId, content)` and the inserted row literal has no `book_id` column. Every repaired post lands with `book_id = NULL`. The calendar query at `marketing-hub-state` line 212 is `.eq("book_id", bookId)`, so those rows are invisible to any per-book view. This is the **direct** cause of "Refresh Posts does nothing" on a book-scoped tab.

### Bug 3 — `auto_repair_if_stale` is also book-blind on the staleness probe
Same file, lines 432–438: the stale-row probe filters only by `author_id + node_id`, never by `book_id`. It can decide "stale" based on another book's rows and trigger a rebuild that, per Bug 2, lands NULL-scoped.

### Bug 4 — `bp03Activated` leaks across books in real usage
`marketing-hub-state` does scope the node lookup with `.eq("book_id", bookId)`, but only when the client passes `bookId`. If the user lands on the calendar without a book selected (initial load, deep link, or stale `bookId` ref), the query reverts to author-wide and `bp03_activated` becomes "true if ANY book has activated BP-03". Combined with Bug 2's NULL rows being filtered out, the banner becomes the default empty state for any newly-selected book.

### Bug 5 — Misleading copy
Even after the bugs above are fixed, the current copy ("…but your posts didn't load. This usually clears after a quick refresh.") frames a per-book gap as a transient load failure. There is no flow on this screen to actually generate posts for the selected book — the only CTA that helps is **Open Social Media Kit**, which is the secondary button.

## Severity
- Bugs 1 + 2: high — Refresh Posts is silently a no-op for any book that wasn't the "latest" BP-03 node.
- Bug 3: medium — can churn rows pointlessly and emit toasts that look like progress.
- Bug 4: medium — the wrong empty-state branch shows for fresh books.
- Bug 5: low/UX — confusing message, but accurate once the per-book reality is acknowledged.

## Proposed fix plan (no code changes yet — awaiting approval)

### 1. Make repair fully book-scoped (client + server)
- `SocialCalendarTab.tsx` `repairCalendar`: include `book_id: bookId` in the POST body (and refuse to call when `bookId` is missing, surfacing a "Pick a book first" toast instead).
- `bp03-node-state` `rebuildSocialPosts`: accept `bookId: string | null`, include it in the delete filter (`.eq("book_id", bookId)` when present, `.is("book_id", null)` when not) and in every inserted row.
- Pass `requestedBookId` through both `repair_calendar` and `auto_repair_if_stale` call sites.

### 2. Tighten staleness probe to the active book
- In `auto_repair_if_stale`, add `.eq("book_id", requestedBookId)` (or `.is("book_id", null)` fallback) to `stalePostsQuery` so it can't trip on another book.

### 3. Backfill orphaned NULL `book_id` posts
One-shot migration: for each `social_posts` row where `node_id='BP-03' AND book_id IS NULL`, set `book_id` from the matching `author_nodes` row (`author_id, node_id='BP-03'`) when exactly one BP-03 node exists for that author; leave the rest for manual review and log the count.

### 4. Rewrite the empty-state copy to match per-book reality
Replace the amber "Almost there / posts didn't load" card with an honest two-line message:
- Title: *"No posts for this book yet."*
- Body: *"BP-03 is activated, but the Social Media kit hasn't been generated for **{bookTitle}**. Open the kit to write 20 posts for this book."*
- Primary CTA: **Open Social Media Kit** (with `bookId`).
- Secondary CTA: **Try Refresh** (kept for the genuine transient-fetch case, now with `book_id` wired).

### 5. Verification
- Reproduce by switching to "Be SUCKcessful": current behaviour = banner + dead Refresh; expected after fix = the rewritten card with a working Open Social Media Kit CTA, and (if the kit was generated) Refresh Posts populates the calendar for that book.
- Check `social_posts` after Refresh: every new row has the correct `book_id`.
- Check the original book's calendar still loads its posts unchanged.

## Files in scope
- `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx` — copy + repair payload.
- `supabase/functions/bp03-node-state/index.ts` — `rebuildSocialPosts` signature, `repair_calendar`, `auto_repair_if_stale`.
- One database migration for the NULL-`book_id` backfill.

Out of scope: graphics generation, carousel redesign, BP-03 builder flow itself.
