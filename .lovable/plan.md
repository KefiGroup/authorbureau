# What happened

Two different things are mixed up in this report. Splitting them out:

## 1. The screenshot (authorsbureau.com → "Something went wrong")

The screenshot is **not** the in-app preview. It's Safari, on the **published** custom domain `authorsbureau.com`. The page being shown is `GlobalErrorBoundary`'s fallback ("ABBY hit a snag — Try again / Go home"), which only renders when a React component throws **during render** somewhere inside `<AppRoutes />`.

Evidence we have right now:

- The in-app preview is healthy. The session replay we captured shows the homepage hero animating (motion transitions on Y-translate/opacity firing) and the directory data loaded successfully (200 on `author_profiles_public` + `books`).
- Console only shows `Lock "lock:authorsbureau-shared-auth" acquisition timed out after 2000ms` from gotrue. That is **expected** — `src/lib/shared-backend.ts` deliberately wraps `processLock` with a 2-second fast-fail timeout and even patches `console.warn` to silence exactly this message. It does not crash anything; the cached-token fallback handles it.
- No runtime errors are reported by the preview, no failing network calls, edge-function logs only show one unrelated `abby-execute` 500.

So the failure is isolated to the **published bundle** at `authorsbureau.com`. Most likely cause: the published deploy is on an older or partially-deployed build that doesn't match the current source (so a chunk import throws on hydration), or one of the homepage's lazy chunks failed to load on the user's Safari session.

This is **not** caused by yesterday's BP-06 multi-book edit:
- BP-06 is only loaded inside `BookBuilderRoute`, never on `/`.
- The BP-06 file imports cleanly (verified — same imports it had before, just with `activeBookId` derived from URL params).
- Audit confirmed no hard-coded UUIDs / emails were introduced.

## 2. The "data wipe" / "books cannot be read" complaint

That part is a separate, real architectural problem and is what the previous Sprint 55c BP-06 patch addressed: the BP-06 builder was using a generic `useAuthorBook()` and not pinning to the `bookId` from the route, so for an author with multiple books (Pauline Teo: *Be SUCKcessful* + *Invest Like Buffett*) the gate could mis-resolve the book. That fix is in and is unaffected by what's on screen now.

# Plan to fix the published site

### Step 1 — Confirm the published bundle is the failure point
- Use `browser--navigate_to_url` to load `https://authorsbureau.com/` headless and capture: console errors, failed network requests, and the actual stack trace caught by `GlobalErrorBoundary`.
- Compare the build hash against the preview's `BUILD_TIMESTAMP` log to tell whether published is on an older / stale deploy or a brand-new broken one.

### Step 2 — Look at what `GlobalErrorBoundary` is actually catching
- `GlobalErrorBoundary` already stores the thrown `Error` in state, but in production builds it only shows the dev `<details>` block in `import.meta.env.DEV`. Add a one-line, prod-safe `console.error("[GlobalErrorBoundary]", error)` so the next reproduction surfaces the real message in browser console (it is currently swallowed in prod).

### Step 3 — Harden the home route against single-component failures
The homepage mounts these top-level components: `Navbar`, hero section, `DynamicMeetOurAuthors`, `MethodologyTrustBadge`, `Footer`, plus the always-mounted `AbbyHelpChatbot`. Today a throw in any one of them takes down the entire site.
- Wrap `AbbyHelpChatbot` and `DynamicMeetOurAuthors` (the two data-fetching components on `/`) in small local error boundaries so a failure inside them degrades to a placeholder instead of replacing the whole page with the global fallback.

### Step 4 — Re-publish
- Once Steps 1–3 land, trigger a fresh publish so `authorsbureau.com` is rebuilt from the current source. If Step 1 confirms the issue was simply a stale/broken cached deploy, this alone will resolve the user-visible symptom; Steps 2–3 keep it from happening silently again.

### Step 5 — Verify
- Reload `authorsbureau.com` in a clean session (Safari hard reload) and confirm the homepage renders.
- Then have the user reload the BP-06 builder for *Be SUCKcessful* (the previous concern) and confirm the "Build My Workbook" button is enabled.

# Technical notes

- `src/components/GlobalErrorBoundary.tsx`: add a non-DEV `console.error` of `error.message` so prod stacks aren't lost.
- `src/pages/Index.tsx`: introduce a tiny `<SectionBoundary>` wrapper (renders `null` on error + logs) around `<DynamicMeetOurAuthors />`.
- `src/App.tsx`: wrap `<AbbyHelpChatbot />` in the same `SectionBoundary` since it sits **outside** `<AppRoutes />` but **inside** `<GlobalErrorBoundary>` — a throw there currently nukes the whole tree.
- No DB migrations, no edge-function changes, no changes to the BP-06 fix from Sprint 55c.

# What I will NOT do

- Not touch BP-06 / `useAuthorBook` again. The Sprint 55c fix is correct.
- Not change auth, storage keys, or the shared lock — the lock-timeout warnings are intentional and already silenced in prod.
- Not introduce any account-specific or book-specific hardcoding.
