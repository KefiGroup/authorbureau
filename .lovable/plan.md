# Wave 4 — Error Visibility & Alerting

Right now the admin can see *audit* events but cannot see *failures*. Edge-function exceptions, webhook errors, cron failures, queue DLQ messages, and Stripe/Resend bounces all happen silently. This wave adds a single source of truth for errors with real-time visibility and admin notifications.

## What the admin will see

1. **Red dot on the bell** the moment a critical error is logged (real-time via Supabase Realtime).
2. **New "Errors" tab** in the admin panel with:
   - Live counters: `Critical / Error / Warning` in the last 1h, 24h, 7d.
   - Filterable table: source, severity, time range, search.
   - Detail dialog: full stack/payload, context, "Acknowledge" + "Mark resolved" actions.
3. **Upgraded System Health card** on the Overview tab:
   - Real error count from the new log (not approximated from audit_log).
   - Per-source health pills (edge functions, Stripe webhook, Resend, payouts cron, email queue DLQ).
   - "Stale cron" warnings when monthly payouts haven't run in >35 days.
4. **Admin email digest** (optional, daily) when there are ≥1 unresolved critical errors.

## Technical design

### 1. New table `system_error_log`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| source | text | `edge_function` / `webhook` / `cron` / `email_queue` / `stripe` / `client` |
| function_name | text | e.g. `create-checkout-session`, `run-monthly-payouts` |
| severity | text | `critical` / `error` / `warning` |
| message | text | Short error string |
| stack | text | Full stack/details |
| context | jsonb | Request params, user_id, etc. |
| acknowledged_by | uuid | Admin who ack'd |
| acknowledged_at | timestamptz | |
| resolved_at | timestamptz | |
| created_at | timestamptz | default now() |

RLS: admins read/update; service role inserts.

### 2. Shared helper `_shared/log-error.ts`

A thin Deno helper every edge function imports inside its `catch` block:

```ts
await logError({ source: "edge_function", function_name: "create-checkout-session",
                 severity: "error", message: err.message, stack: err.stack, context });
```

Inserts into `system_error_log` and, if `severity = critical`, calls `notify_all_admins` so the bell pings instantly.

### 3. Wire into hot paths (Phase A — highest-value 8 functions)

- `create-checkout-session`, `verify-purchase`, `process-purchase`, `refund-purchase` (commerce)
- `run-monthly-payouts`, `generate-annual-statements` (financial cron)
- `send-transactional-email`, `process-email-flows` (email)

Add try/catch wrappers; classify Stripe `card_declined` etc. as `warning`, infra errors as `error`, data corruption / failed payouts as `critical`.

### 4. Email queue DLQ surfacing

Add a `email-queue-dlq` action to `admin-data` that calls `pgmq.read('emails_dlq', …)` and returns count + sample. Surface as a red pill on the health card when count > 0.

### 5. Realtime channel

`ALTER PUBLICATION supabase_realtime ADD TABLE public.system_error_log;`
`AdminNotificationBell` subscribes and increments unread badge on new `severity in ('critical','error')` rows.

### 6. New `admin-data` actions

- `errors-list` — filtered query with source/severity/since/resolved filters.
- `errors-summary` — count by severity buckets {1h, 24h, 7d}.
- `errors-acknowledge` — sets ack fields for selected ids.
- `errors-resolve` — sets resolved_at, audit-logs the action.
- `email-queue-dlq` — pgmq read + counts.

### 7. New UI files

- `src/components/admin/ErrorsTab.tsx` — filters, table, detail dialog with ack/resolve.
- `src/components/admin/ErrorBadge.tsx` — severity pill (reused).
- Update `SystemHealthCard.tsx` to use `errors-summary` instead of approximated audit count.
- Update `AdminDashboard.tsx` tabs array: insert "Errors" between Support and Payouts; superadmin or admin role.
- Update `AdminNotificationBell.tsx` to listen on the realtime channel.

## Out of scope (this wave)

- Slack/PagerDuty integration (can layer on later via webhook).
- Frontend exception capture (no Sentry yet — separate decision).
- Auto-remediation (e.g. retry failed payouts from the UI).

## Files

- migration: `system_error_log` + RLS + realtime + ack/resolve audit.
- new: `supabase/functions/_shared/log-error.ts`
- new: `src/components/admin/ErrorsTab.tsx`
- edited: 8 hot-path edge functions (try/catch + logError)
- edited: `supabase/functions/admin-data/index.ts`
- edited: `src/components/admin/SystemHealthCard.tsx`, `AdminNotificationBell.tsx`, `src/pages/AdminDashboard.tsx`

## Notification policy

- `critical` → in-app bell ping for all admins immediately.
- `error` → counts toward 24h badge, no immediate ping.
- `warning` → visible in tab, no badge.

## Defaults proposed (tell me if you want different)

- Daily digest email to all admins at 09:00 UTC when there are ≥1 unresolved `critical` errors. (Off by default — say "yes" to enable.)
- Errors auto-archive after 30 days resolved.
