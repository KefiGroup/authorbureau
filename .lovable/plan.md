## Root causes

### BUG-11 — Revenue Dashboard "Total Contacts: 0" (still 0 after `useAuthReady` gate)

`RevenueFullDashboard.tsx` queries `crm_contacts` with the **project-local** Supabase client (`src/integrations/supabase/client.ts`), but the app's auth lives on the **shared-backend** client (PublishNow / `src/lib/shared-backend.ts`). The project-local client has no session, so `auth.uid()` is null in RLS → the `eq("author_id", user.id)` count silently returns `0`. The CRM page works because it goes through the `author-crm-data` edge function with `getActiveToken()`, which forwards the real shared-backend JWT and bypasses the client mismatch.

The `useAuthReady` gate only fixed *when* the query runs — it can't fix *which client* runs it. Same root cause applies to the Hot Leads query right below it.

### BUG-12 — "First $1,000 — Achieved ✓" with $0 revenue

The `current > 0 && current >= target` guard works correctly, but `metrics.revenueMtd` is **not** $0. `syncMetrics()` (lines 212–232) calls `sync-stripe-metrics`, which, when no Stripe key is connected, returns `{ success: true, projected: true, data: { stripe_revenue_mtd_usd: liveCount * 200 } }`. With 27 live nodes that's **$5,400 of fake projected revenue**, which line 222–226 unconditionally merges into `metrics.revenueMtd` via `Math.max(...)`. That trips the $1,000 milestone even though `purchases` has 0 rows.

Symptom is identical to "still broken" because the guard sees a positive number — it just isn't real money.

## Fixes

### 1. BUG-11 — use shared-backend auth for the contacts count
In `src/pages/RevenueFullDashboard.tsx` (~lines 148–194), replace the two direct `supabase.from("crm_contacts")…` queries with calls to the existing `author-crm-data` edge function via `getActiveToken()` + `fetchWithTimeout()` (same pattern already used in `AuthorCRMPage.tsx`):

- Total count → `crmFetch("list", { page: 1, pageSize: 1 })` → use `data.totalCount` (or `effectiveTotal`) for both `contacts` and `subscribers`.
- Hot leads → either add a `"hot-leads"` action to the same edge function, or reuse `list` with a `min_abby_score=60` filter; whichever the function already supports. (Will inspect `supabase/functions/author-crm-data` before writing the fix to use an existing action and avoid edge-function changes if possible.)

Leaves all other direct project-local DB queries (author_nodes, snapshots, purchases) untouched — those tables are not RLS-keyed to the shared-backend uid.

### 2. BUG-12 — never trip milestones on projected revenue
Two-part fix in `src/pages/RevenueFullDashboard.tsx`:

- **`syncMetrics`** (line 222): only override `revenueMtd` when **`stripe.projected === false`**. Projected numbers stay out of `metrics`.
  ```ts
  if (stripe?.success && stripe.projected === false && stripe.data?.stripe_revenue_mtd_usd) { … }
  setProjected((p) => ({ ...p, stripe: stripe?.projected ?? p.stripe }));
  ```
- **Milestone block** (line 658): also require `!projected.stripe` for revenue-based milestones (`revenue_mtd`, `revenue_ytd`), so projected-only values can never display "Achieved ✓".

No DB or edge-function changes required for either bug.

## Files touched

- `src/pages/RevenueFullDashboard.tsx` — both fixes.
- Possibly read-only inspection of `supabase/functions/author-crm-data/index.ts` to pick the right action for hot leads (no edits expected).

## Verification

- Reload `/revenue` while signed in as Pauline → Total Contacts shows **35**, Hot Leads list populates.
- Same reload → "First $1,000" shows progress bar at 0 / 1,000, **not** Achieved ✓. Stripe header still shows "Start Stripe onboarding" badge.
- After a real Stripe connection + non-zero charges, milestone flips to Achieved ✓ as expected.
