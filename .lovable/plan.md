## Admin Portal Audit Results

I audited every page, tab, link, and button under `/admin*` against the route table, ran static handler checks, and queried the error log (clean — 0 errors in 48h). Found **5 real bugs**, ordered by severity.

---

### Bug 1 — High · Broken redirect to non-existent route
**File:** `src/pages/AdminDashboard.tsx:271`

```tsx
if (!user) return <Navigate to="/admin-login" replace />;
```

Route is registered as `/admin-auth` (App.tsx:142). A logged-out visit to `/admin` redirects to a 404 (catch-all NotFound).

**Fix:** Change `/admin-login` → `/admin-auth`.

---

### Bug 2 — High · Wise/PayPal copy violates "Stripe Express only" memory rule
**File:** `src/pages/AdminPayouts.tsx:178`

```tsx
<p>Enter the Wise/PayPal transaction reference.</p>
<Input placeholder="e.g. WISE-12345-ABC" />
```

Memory rule: *"Stripe Express ONLY. PayPal/Wise code permanently removed (Sprint 44)."*

**Fix:** Update copy to "Enter the Stripe transfer reference" and placeholder to `e.g. tr_1AbCdE...`. Same page also overlaps with the in-dashboard `Payouts` tab (`AdminPayoutsDashboard`) — flag for future consolidation but leave routing alone in this sprint.

---

### Bug 3 — Medium · Dead "AI Tokens Used" overview card
**File:** `src/components/admin/OverviewTab.tsx:117`

```tsx
{ label: "AI Tokens Used", ..., action: () => {} }
```

Renders as a `<button>` with hover affordance but does nothing on click — looks broken.

**Fix:** Remove the `<button>` wrapper for non-actionable cards (render as `<div>` without hover style), OR make it scroll to the AI Usage Dashboard panel below. Recommend the former for minimal change.

---

### Bug 4 — Medium · "View all" recent submissions points to non-existent tab
**File:** `src/components/admin/OverviewTab.tsx:291`

```tsx
<Button onClick={() => onNavigate("submissions")}>View all</Button>
```

`"submissions"` is not in the `Tab` union (`overview | books | authors | admins | platforms | crm | messages | reading-club | support | payouts | node-gating | audit | errors`). Casting via `as Tab` swallows it, so the click sets an unknown tab and the content area renders **blank**.

**Fix:** Change target to `"books"` (since recent submissions are book submissions) or hide the "View all" button entirely. Recommend routing to `books` with `filter="pending"`.

---

### Bug 5 — Low · Orphan `/admin/content-quality` page
**Files:** `src/App.tsx:148`, `src/pages/admin/ContentQualityLog.tsx`

Route is registered and the component exists, but no link anywhere in the admin UI navigates to it. Reachable only via direct URL.

**Fix:** Add a quick-action button in `OverviewTab` (or a tab entry) linking to `/admin/content-quality`. If the page is intentionally retired, remove the route + file instead. Recommend adding a quick-action link.

---

### Verified Healthy
- All 13 tab buttons in `AdminDashboard` have `onClick` handlers wired to setTab.
- `AdminPayoutsDashboard`, `ErrorsTab`, `AuditLogTab`, `NodeGatingTab`, `AdminsTab`, `AuthorActionMenu`, `BooksTab` action buttons all have valid handlers or live inside Dialog/AlertDialog triggers.
- `AdminNotificationBell` mounts correctly with `user.id` guard.
- `system_error_log`: 0 entries in last 48h.
- `Author Dashboard` link in admin header → `/dashboard` (valid).
- Sign Out button → `signOut()` (valid).

---

### Implementation order (small sprint)
1. AdminDashboard.tsx — fix redirect path (1 line).
2. AdminPayouts.tsx — Stripe-only copy (2 lines).
3. OverviewTab.tsx — non-clickable AI Tokens card + fix "View all" target (~6 lines).
4. OverviewTab.tsx — add Content Quality Log quick action (~4 lines).

No DB changes, no edge function changes, no new dependencies. Pure UI fixes.

Approve and I'll implement all 5 in a single pass.