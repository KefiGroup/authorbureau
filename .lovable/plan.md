

# Sprint 33 — Fix Broken Navigation + Build Admin Panel

## Summary
Five fixes from the live platform audit. No changes to quiz logic, email system, node builders, or ABBY consultation flow.

---

## Fix 1 — My CRM Route (404 at `/my-contacts`)

**Problem:** There is no `/my-contacts` route. The sidebar "My CRM" correctly uses the dashboard section `author-crm`, but navigating directly to `/my-contacts` returns 404.

**Fix:** Add a route alias in `src/App.tsx`:
```
<Route path="/my-contacts" element={<AuthorDashboard initialSection="author-crm" />} />
```

The CRM page (`AuthorCRMPage.tsx`) already exists with contact table, search, and filtering. No new page needed.

---

## Fix 2 — Admin Panel at `/admin`

**Already exists.** `AdminDashboard.tsx` is a full admin panel with tabs: Overview, Books, Authors, Admins, Platform Access, CRM, Messages, Reading Club, Support, Payouts, Node Gating. It already redirects non-admins to `/dashboard`.

**Enhancements to match sprint spec (4 tabs):**
The existing admin panel already covers all requested functionality. I will verify the following tabs work correctly and add any missing pieces:
- **Authors tab** — already exists (`AuthorsTab.tsx`)
- **Book Approval Queue** — already exists in `BooksTab.tsx`; verify approve/reject with notification
- **Platform Stats** — already exists in `OverviewTab.tsx`; verify it shows total contacts and revenue
- **Activity Log** — check if it exists; if not, add an activity log tab showing recent platform events

No major rework needed here.

---

## Fix 3 — Brand Products Sidebar Counter Shows "0 built"

**Problem:** Sidebar shows "0 built" even though BP-02 and BP-04 are live (5 rows in `author_nodes` with status `live`).

**Root cause:** The `author-stats` edge function correctly queries `author_nodes` with statuses `content_ready`, `live`, `published_pending_ghl`. The `buildUnlocked` count in `AuthorDashboard.tsx` adds `stats.nodesBuilt.brand` plus product table counts. This should already work.

**Fix:** Debug via edge function logs and verify the stats response. The likely issue is that the `allProfileIds` array in the edge function may not be populated correctly, or the stats cache is stale. I will test the endpoint and fix accordingly.

---

## Fix 4 — Book Approval Badge on My Books Hub

**Problem:** Book cards don't show approval status badges (Pending Review / Approved / Rejected).

**Current state:** The `books` table only has `published_at` (set when admin approves). There is no `approval_status` or `rejection_note` column.

**Fix:**
1. **Database migration:** Add `approval_status` (text, default `'pending'`) and `rejection_note` (text, nullable) columns to the `books` table. Backfill existing books: set `approval_status = 'approved'` where `published_at IS NOT NULL`.
2. **UI:** Update `MyBooks.tsx` book cards to show:
   - Yellow "Pending Review" badge (default)
   - Green "Approved" badge (when `approval_status = 'approved'`)
   - Red "Rejected" badge with "View Reason" tooltip (when `approval_status = 'rejected'`)
3. **Admin side:** Update the admin books approval flow to set `approval_status` and `rejection_note` when approving/rejecting.

---

## Fix 5 — Business Plan Sidebar Label

**Problem:** Sidebar shows "Build My Business Plan" with "Start Here" badge even after business plan is generated.

**Current code check:** The sidebar already implements this correctly:
```tsx
label: hasAnalysis ? "My Business Plan" : "Build My Business Plan"
badge: !hasAnalysis ? "Start Here →" : undefined
```

And `hasAnalysis` is set from `stats.analyzedCount > 0` in `AuthorDashboard.tsx`.

**Likely issue:** The `analyzedCount` from the `author-stats` edge function returns 0 even when analysis exists. I will check the edge function logic for how `analyzedCount` is computed and fix the query if needed.

---

## Technical Details

### Files to modify:
- `src/App.tsx` — add `/my-contacts` route alias
- `src/components/dashboard/MyBooks.tsx` — add approval status badges
- `supabase/functions/author-stats/index.ts` — debug/fix counter and analyzedCount logic
- Admin book approval flow — set `approval_status` column on approve/reject

### Database migration:
- Add `approval_status` and `rejection_note` to `books` table
- Backfill approved books

### Edge functions to deploy:
- `author-stats` (if modified)

### No changes to:
- Quiz logic, email system, node builders, ABBY consultation, Marketing Hub

