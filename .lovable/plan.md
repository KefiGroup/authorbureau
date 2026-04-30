## Goal
Systematically load every route in the app, detect runtime errors, broken edge function calls, stale references, and missing data, then fix the issues found.

## Scope — routes to audit

**Public**
- `/` (Index), `/directory`, `/solutions`, `/solutions/:genre`, `/how-it-works`, `/methodology`, `/pricing`, `/contact`, `/faq`, `/terms`, `/terms-of-sale`, `/privacy`, `/unsubscribe`
- `/readers-bureau`, `/readers-bureau/auth`
- `/auth`, `/admin-auth`, `/join`, `/create-microsite`, `/sso`

**Author (logged-in)**
- `/dashboard` (and sections via `?section=`: profile, my-books, marketing-hub, author-crm, brand, build, yield, revenue)
- `/my-books`, `/my-contacts`, `/marketing-hub`
- `/dashboard/book/:bookId` (BookHub), `/dashboard/book/:bookId/build/:node`
- `/account-settings`, `/connect-settings`, `/earnings`, `/abby-coach`, `/special-editions-calendar`, `/revenue-dashboard`
- `/admin`, `/admin/payouts`, `/admin/content-quality`

**Public author microsites** (sample using a known author slug, e.g. Pauline Teo)
- `/:authorSlug`, `/:authorSlug/:bookSlug`, `/:authorSlug/:bookSlug/:productType`
- `/:authorSlug/webinar`, `/:authorSlug/members`, `/:authorSlug/course/:courseSlug`

## Method

1. **Static pass (no preview needed)**
   - `rg` for stale patterns: imports of removed files, references to deprecated GHL deploy functions in active flows, `supabase.auth.getSession()` calls in shared-backend contexts (should be `getActiveToken`), direct `books` table queries for ownership checks (should use `get-author-book`), TypeScript errors via `tsc --noEmit`-equivalent signals in dev-server log.
   - Check edge-function imports vs `supabase/functions/` directory for any missing deployments referenced from the client.
   - Scan `src/pages/*.tsx` for unused/orphan pages no longer mounted in `App.tsx` (e.g. `MicrositePage.tsx`, `ReaderPortal.tsx`, `ReadingClub.tsx`, `FunnelPage.tsx`, `ThankYouPage.tsx`, `DynamicBookMicrosite.tsx`) — flag for removal if confirmed dead.

2. **Runtime pass (browser tool)**
   - For each route group, `navigate_to_sandbox` then `read_console_logs` + `list_network_requests` filtered to errors (4xx/5xx).
   - Capture per-route: page rendered? console errors? failed network calls? Edge-function 401/500s?
   - Test author pages while logged in (use existing session in preview); skip routes requiring specific data we don't have (e.g. random `:purchaseId`).

3. **Categorize findings**
   - **Critical**: page crashes / blank screen / 401 from edge fn the page depends on.
   - **High**: visible error toast, missing data, broken link.
   - **Stale**: dead imports, orphan pages, references to removed/renamed functions, `verify_jwt` mismatches.
   - **Low**: console warnings, deprecation notices.

4. **Fix pass**
   - Apply token-standard fixes (`getActiveToken` + `fetchWithTimeout`) where edge calls 401.
   - Wire missing `bookId` props or add fallbacks where queries return empty.
   - Delete or redirect confirmed orphan pages.
   - Update any client-side calls referencing renamed/removed edge functions.
   - Re-run failing route after each fix to confirm green.

## Deliverable

A short audit report (in chat) listing each route with status (OK / Fixed / Known-limitation), plus the list of files changed. Orphan pages are removed only after confirming no inbound route or import references them.

## Out of scope
- New features, redesigns, copy changes.
- Routes requiring real purchase IDs or third-party callbacks (Stripe success, social OAuth) — these are smoke-tested only for render, not full flow.
- Database migrations unless a missing column is the root cause of a page crash.
