## Audit #6 — Author Dashboard Intelligence

Goal: turn the dashboard into Pauline's daily operating system with real data, a daily 8am brief, and a clean Review-and-Publish workflow. End the sprint with the mandatory 8-level QA pass.

The plan is split into 5 work blocks. Each block has clearly scoped files and a one-line acceptance test.

---

### Block 1 — Revenue Dashboard: real numbers, hot leads, top funnel

File: `src/components/dashboard/RevenueDashboard.tsx`

Add a single `useEffect` that, once the author_id is known, queries (in parallel, all client-side via the Supabase JS client because all five tables have author_id and existing RLS):

- `leads` total + `leads` this week + `leads` last week (for trend arrow)
- `purchases` sum where `created_at >= start_of_month`
- `author_nodes` count where `status = 'live'`
- `email_send_log` open-rate = COUNT(opened_at IS NOT NULL) / COUNT(*) over last 30 days, scoped to this author's templates (filter where `metadata->>'author_id' = :id` OR fallback to all if metadata absent — see Technical Details)
- top funnel = `funnels` for this author, ordered by `(conversions::float / NULLIF(page_views,0)) DESC LIMIT 1`
- hot leads = `leads` where `abby_score > 60` ORDER BY `last_activity_at DESC LIMIT 10`

Add a new section near the top of the Revenue tab called **Pipeline Snapshot** with 6 stat cards (leads total, leads this week + trend, revenue this month, active nodes, email open rate, top funnel name + rate) and a **Hot Leads Today** list rendering name, ABBY score badge, last-activity ago.

Replace the placeholder `MONTHS_DATA` array with a derived 6-month series built from `purchases` grouped by `date_trunc('month', created_at)`.

Acceptance: the page never shows `0` from a hardcoded literal; every number is a SELECT result.

---

### Block 2 — Review & Publish section (new)

New file: `src/components/dashboard/ReviewPublishPage.tsx`
Sidebar entry: insert below "My Author's Page" with id `review-publish`.

Three sections:

1. **What's live** — `author_nodes` where `status = 'live'`, rendered as a grid of cards. Each card shows the node label, the public URL (computed from `compute_node_microsite_url` already in DB), and a Copy-link button + a Visit button.
2. **What's missing** — the diff between `ALL_BUILDER_NODES` and the live set, each with a **Activate now** button that routes to that builder section (uses existing `onNavigate(builderId)`).
3. **Share my author page** — single big card with the `/<slug>` URL and copy button.

Acceptance: copy button writes to clipboard + toast; "Activate now" navigates to the correct builder.

---

### Block 3 — ABBY Daily Intelligence Report (8am email)

Server side:

- New edge function `abby-daily-report` that, for one author_id, gathers:
  - `leads` count where `created_at::date = (now() - interval '1 day')::date`
  - hot leads count where `abby_score > 60`
  - revenue yesterday from `purchases`
  - best node yesterday = node_id with highest `purchases.amount` sum
  - one specific recommendation (rule-based first pass: highest-views funnel with <2% conversion → "broadcast email"; or the newest live node with 0 visits → "share the link")
  - renders a branded HTML email and calls `send-transactional-email` with template `abby-daily-report`
- New transactional template registered in `supabase/functions/send-transactional-email/registry.ts` (or wherever the registry lives)
- New cron orchestrator function `abby-daily-report-dispatcher` that runs hourly, looks up authors whose local time is currently 08:00 (using a new `author_profiles.timezone` text column, default `UTC`), and invokes `abby-daily-report` for each.

Migration:
- `ALTER TABLE author_profiles ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';`
- pg_cron job `abby-daily-report-hourly` — invokes `abby-daily-report-dispatcher` every hour at minute 0 (per the scheduled-jobs guidance, this is inserted via the supabase insert tool, not a migration, since it carries the anon key).

Account-settings UI: add a Timezone dropdown so Pauline can set hers (Pacific/Auckland for the example).

Acceptance: invoking `abby-daily-report-dispatcher` manually at 8am Auckland time triggers exactly one email to Pauline; `email_send_log` shows `template_name = 'abby-daily-report'` with status `sent`.

---

### Block 4 — My Books Hub stability + onboarding gates

File: `src/components/dashboard/MyBooks.tsx`

The "Could not load your books" path is correctly defensive but the auth-lock-timeout warnings in console are the underlying cause of intermittent failures. Two fixes:

1. **Single source of auth**: `MyBooks` already uses `getActiveToken()` + `fetchWithTimeout()`. The lock contention comes from `RevenueDashboard.tsx` line 55-72 instantiating a parallel `supabase.from()` query while `MyBooks` is mid-fetch. Switch RevenueDashboard's queries to also go through `getActiveToken()` + a single `fetch` call to a new `dashboard-stats` edge function (Block 1 above), so only one client owns the auth lock.
2. **Don't show the "add your first book" banner when books exist**: the banner check in `src/pages/AuthorDashboard.tsx` line 644 needs to be wrapped in `books.length === 0`.
3. **Don't show "Meet Abby" when authenticated and onboarded**: `src/components/dashboard/framework-dashboard/MeetAbbySection.tsx` already has logic at `ABBYFrameworkDashboard.tsx` line 114 to wait for the list — confirm and reinforce that gate (`!loading && books.length === 0 && !onboardingComplete`).

Also fix the `AbbyHelpChatbot` ref warning by wrapping the export in `React.forwardRef`. It's a harmless dev warning today but it pollutes Level 1 of the QA.

Acceptance: refresh `/dashboard` 5 times in a row — books load every time, no console errors, no flashes of empty-state UI.

---

### Block 5 — Mandatory 8-level QA (browser-driven)

Run this script after Blocks 1–4 land and report PASS/FAIL per level with the exact failure trace:

```text
L1 Console/Network  : open /dashboard, /dashboard?section=analytics,
                      /dashboard?section=review-publish, /dashboard?section=my-books
                      — assert zero red console errors and zero non-2xx XHRs
L2 Every Button     : click every Copy, Activate now, Visit, tab — observe toast or nav
L3 Empty States     : log in as a fresh test author with no data — every card has a CTA
L4 Data Flow        : create a lead via SQL insert, refresh — Hot Leads list shows it
L5 Mobile 375px     : resize, scroll every section — no horizontal scrollbar
L6 Auth States      : open /pauline-teo and /reading-club in incognito — render fine;
                      open /dashboard in incognito — redirects to /auth
L7 Error Handling   : POST malformed body to abby-daily-report — JSON error, not crash
L8 Navigation       : every dashboard section has at least 2 next-step buttons
```

Result format:
```
LEVEL 1: PASS | LEVEL 2: PASS | LEVEL 3: PASS | LEVEL 4: PASS
LEVEL 5: PASS | LEVEL 6: PASS | LEVEL 7: PASS | LEVEL 8: PASS
OVERALL: PASS
```
Any FAIL must include: page, action, observed vs expected, fix applied.

---

### Technical details

**Email open-rate scoping.** `email_send_log` does not have an author_id column today. Two options: (a) add `author_id UUID` via migration and start populating it from `send-transactional-email`; (b) filter by `template_name LIKE 'abby-%' OR template_name LIKE 'author-%'` and trust that the recipient_email matches the author's audience. Option (a) is the correct long-term fix — included in this plan.

**Hot leads ordering.** `last_activity_at` exists; we'll use `COALESCE(last_activity_at, created_at)` as the sort key.

**Currency.** `purchases.amount` is `numeric` and `purchases.currency` is `text`. For now we sum amounts assuming USD (matches the Commerce Engine v1 platform convention); a future sprint can normalise multi-currency.

**Cron auth.** The `abby-daily-report-dispatcher` cron job uses the same `email_queue_service_role_key` Vault secret pattern as `process-email-queue` so service-role rotation doesn't break it.

**Timezone math.** Postgres `now() AT TIME ZONE author.timezone` gives local time; the dispatcher selects `WHERE EXTRACT(hour FROM now() AT TIME ZONE timezone) = 8`.

**Files touched (estimate):**
- `src/components/dashboard/RevenueDashboard.tsx` (+~200 lines)
- `src/components/dashboard/ReviewPublishPage.tsx` (new, ~250 lines)
- `src/components/dashboard/DashboardSidebar.tsx` (1 entry)
- `src/pages/AuthorDashboard.tsx` (route case + banner gate)
- `src/components/AbbyHelpChatbot.tsx` (forwardRef wrap)
- `src/components/dashboard/AccountSettings*.tsx` (timezone field)
- New edge function `abby-daily-report/`
- New edge function `abby-daily-report-dispatcher/`
- New edge function `dashboard-stats/` (single-roundtrip aggregator)
- 1 migration: timezone column + email_send_log.author_id column
- 1 cron job insert (via supabase insert tool)
- 1 transactional email template

Roughly 1500 LoC added, 50 modified.

---

Ready to execute Blocks 1-5 sequentially after approval. Block 1 ships the most user-visible win first; Block 3 has the longest tail (cron + email template + timezone column).
