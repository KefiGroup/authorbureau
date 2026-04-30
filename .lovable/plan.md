# Wave 3 — Admin Portal Continuation

Waves 1-2 shipped the notification engine, book review workflow, refunds, and System Health. Wave 3 closes the remaining high-value gaps from the canonical spec in Part A of the plan.

## Scope (4 modules)

### 1. Author Lifecycle Controls (Authors tab)
Per-author admin actions, all audit-logged and notification-wired.

- **Suspend / Reinstate**
  - New columns on `author_profiles`: `suspended_at timestamptz`, `suspended_reason text`, `suspended_by uuid`.
  - Behavior (per prior decision): public microsite stays live; only **dashboard login is blocked**. Enforced in `useAuth` / `AuthorDashboard` guard → redirect to a "Account paused" screen with support contact.
  - Modal requires reason; notifies the author via `notify_users` + `account.suspended` email; audit-logged.
  - Reinstate restores access, notifies author, audit-logged.
- **Tier override** — superadmin can set `subscription_tier` (Brand/Build/Yield) + optional `tier_expires_at`, audit-logged.
- **Impersonate (read-only "View as")** — superadmin-only. Generates a short-lived signed token that opens `/dashboard?impersonate=<author_id>` in read-only mode (writes blocked at edge-function layer via `x-impersonation` header check). Banner shown across the dashboard while active.
- **Profile inspector drawer** — read-only mirror of key author fields (books, nodes live, last login, Stripe Connect status, tier, suspension state).

### 2. Support Tab upgrade
Today the tab lists tickets with no workflow. Add:

- Ticket statuses: `open → in_progress → waiting_author → resolved → closed`.
- **Assignment** to a specific admin (dropdown of `user_roles where role='admin'`).
- **SLA timer** — `first_response_due_at` (4h default) and `resolution_due_at` (48h) computed from `created_at`; row badge turns amber at 80% and red on breach.
- **Reply UI** — admin reply posts to existing messages thread + sets status + notifies author via bell.
- New columns on `support_tickets`: `assigned_to uuid`, `status text`, `first_response_at timestamptz`, `resolved_at timestamptz`, `priority text default 'normal'`.

### 3. Broadcast Announcements (Overview tab — superadmin-only)
- Compose modal: title, message, optional link, audience filter (`all authors` | `tier=Brand` | `tier=Build` | `tier=Yield` | `published authors only`).
- On send: server-side fan-out via `notify_users(<resolved uids>, ..., event_key='admin.broadcast')`. Optional checkbox "Also email" → enqueues to `email_queue` with the existing `transactional-email` pipeline.
- Author dashboard: any unread `admin.broadcast` notification surfaces as a dismissible banner above the dashboard header (in addition to the bell).
- Audit-logged with recipient count.

### 4. Audit Log Viewer (new tab "Audit", superadmin-only)
- Reads `admin_audit_log` with filters: actor, event_key, target_type, date range, free-text search on payload.
- Paginated table; row click opens JSON payload drawer.
- CSV export.

## Technical Plan

**Migration** (`<ts>_admin_wave3.sql`):
- `author_profiles` → add `suspended_at`, `suspended_reason`, `suspended_by`, `tier_expires_at`.
- `support_tickets` → add `assigned_to`, `status`, `first_response_at`, `resolved_at`, `priority`, `first_response_due_at`, `resolution_due_at`.
- Trigger `support_tickets_set_due_dates_trg` to compute SLA timestamps on insert.
- RLS: admins read/write both tables; authors read their own ticket row.

**Edge functions:**
- `admin-authors` (new) — actions: `suspend`, `reinstate`, `set-tier`, `impersonate-token`, `profile-inspect`. All check `has_role(uid,'admin')`; impersonate also checks superadmin email allowlist.
- `admin-support` (new) — actions: `assign`, `set-status`, `reply`, `list` (with SLA computed fields).
- `admin-broadcast` (new) — resolves audience, calls `notify_users`, optional email enqueue.
- `admin-data` → add `audit-log` action with filter support.
- All wire to `notify_users` / `notify_all_admins` and write `admin_audit_log` rows.

**Email templates** (registered in `transactional-email-templates/registry.ts`):
- `account-suspended`, `account-reinstated`, `admin-broadcast` (optional channel).

**UI components:**
- `src/components/admin/AuthorsTab.tsx` — extend with action menu (Suspend/Reinstate/Set Tier/Impersonate/Inspect) + drawers/modals.
- `src/components/admin/SupportTab.tsx` — rebuild with Kanban-or-list view, assignment dropdown, SLA badge, reply drawer.
- `src/components/admin/BroadcastDialog.tsx` (new) — composer + audience picker.
- `src/components/admin/AuditLogTab.tsx` (new) — table + filters + JSON drawer.
- `src/components/dashboard/SuspendedAccountScreen.tsx` (new) — shown by `AuthorDashboard` when `author_profiles.suspended_at` is set.
- `src/components/dashboard/BroadcastBanner.tsx` (new) — surfaces unread `admin.broadcast` notifications.
- `src/components/admin/ImpersonationBanner.tsx` (new) — global red banner while a superadmin is impersonating.

**Auth/guard wiring:**
- `useAuth` exposes `isSuspended` from author_profiles; `AuthorDashboard` short-circuits to suspended screen.
- Impersonation: `getActiveToken()` already standard; impersonation token attached as `x-impersonation: <author_id>` header. Edge functions that mutate state reject the header (read-only enforcement).

## Files Touched

```text
NEW  supabase/migrations/<ts>_admin_wave3.sql
NEW  supabase/functions/admin-authors/index.ts
NEW  supabase/functions/admin-support/index.ts
NEW  supabase/functions/admin-broadcast/index.ts
NEW  supabase/functions/_shared/transactional-email-templates/account-suspended.tsx
NEW  supabase/functions/_shared/transactional-email-templates/account-reinstated.tsx
NEW  supabase/functions/_shared/transactional-email-templates/admin-broadcast.tsx
EDIT supabase/functions/_shared/transactional-email-templates/registry.ts
EDIT supabase/functions/admin-data/index.ts                (audit-log action)
EDIT src/components/admin/AuthorsTab.tsx
EDIT src/components/admin/SupportTab.tsx
EDIT src/components/admin/OverviewTab.tsx                  (Broadcast button)
EDIT src/pages/AdminDashboard.tsx                          (Audit tab + impersonation banner mount)
NEW  src/components/admin/BroadcastDialog.tsx
NEW  src/components/admin/AuditLogTab.tsx
NEW  src/components/admin/ImpersonationBanner.tsx
NEW  src/components/dashboard/SuspendedAccountScreen.tsx
NEW  src/components/dashboard/BroadcastBanner.tsx
EDIT src/hooks/useAuth.tsx                                 (expose isSuspended)
EDIT src/pages/AuthorDashboard.tsx                         (guard + banner mount)
EDIT src/types/admin.ts
```

## Out of scope (Wave 4 candidates)
Marketing/ABBY ops console (asset-pack failure queue + retry), feature flags UI, login/IP log, bulk-approve same-author, manual single Stripe payout trigger.

## Open questions
1. **Impersonation** — superadmin-only (paulinet77 + mitchcarson per `superadmin.ts`), correct? Default: yes.
2. **Suspension email** — send by default or admin opt-in checkbox? Default: send by default with opt-out.
3. **SLA defaults** — 4h first response / 48h resolution acceptable, or different per priority?
