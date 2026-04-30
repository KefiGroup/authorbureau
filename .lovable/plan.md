## Current Admin Portal — Audit (paulinet77@gmail.com)

`/admin` already has 11 tabs wired to two edge functions (`admin-books`, `admin-data`):

| Tab | What it does today | Gap |
|---|---|---|
| Overview | Counts (books, authors, admins) + pending badges | No revenue/payout/system-health metrics, no recent-activity feed |
| Authors | List/search authors | No suspend, no impersonate, no audit trail |
| Books | List + Approve/Reject/Delete; sends `book-approved` email | No in-portal notification to author OR admin, no rejection reason workflow, no resubmission, no version history |
| CRM | Author CRM contacts | OK |
| Messages | Author↔Admin chat | OK |
| Reading Club | Reader activity | OK |
| Support | Tickets list | No SLA, no assignment, no ticket statuses transitions |
| Payouts | Stripe Express batches | No notification to author when paid/failed |
| Node Gating | Toggle nodes per tier | superadmin-only ✓ |
| Admins | Promote/Demote | superadmin-only ✓ |
| Platforms | PublishNow access | OK |

Notifications infra: `public.notifications` table exists with realtime + RLS, and `NotificationCenter.tsx` bell already renders for authors. **Nothing currently writes to it on book submit/approve/reject/payout/support events.** That is the core missing piece.

---

## Part A — Systematic Admin Function Map (the spec)

Recommended canonical set of admin capabilities, grouped:

```text
1. Author Management
   - Directory (search, filter by tier/status/country)
   - Profile inspector (read-only mirror of author dashboard)
   - Suspend / reinstate / delete (with reason)
   - Impersonate (read-only "view as")
   - Tier override (Brand/Build/Yield) + expiry
   - Manual book-approval override per author
   - Email/slug change audit log

2. Book / Content Lifecycle
   - Submission queue (pending_review)
   - Approve / Request changes (with note) / Reject (with reason)
   - Resubmission tracking (version N)
   - Force-unpublish + reason
   - Bulk approve same-author
   - Microsite preview link per book

3. Commerce & Payouts
   - Order ledger (gross, 8% fee, net)
   - Refund initiation + audit
   - Stripe Connect status per author
   - Payout batches (existing) + manual single payout
   - Failed-payout queue

4. Marketing / ABBY Engine
   - Asset pack generation status per author/node
   - Failed-generation queue + retry
   - Email send log (template, recipient, status) — already partly exists
   - Social posts queue (Buffer)

5. Support & Communication
   - Ticket inbox + assignment + SLA timer
   - Author↔Admin DM (exists)
   - Broadcast announcement (banner + notification + optional email)

6. Platform Configuration
   - Node gating per tier (exists)
   - Platform fee % (exists in platform_config)
   - Feature flags
   - Public-content quality log viewer

7. System Health
   - Edge-function error feed (last 24h)
   - Cron job status (process-email-queue, etc.)
   - Stripe / ElevenLabs / Buffer connector status
   - Database orphan/ghost-uid warnings (table exists)

8. Audit & Security
   - Admin action log (who did what, when, target, before/after)
   - Login/IP log
   - Role changes log
   - Superadmin-only zones (existing pattern ✓)
```

This is the spec to fine-tune toward. Implementation lands in waves; Wave 1 is below.

---

## Part B — Business-Rules Engine: Notifications & Lifecycle

### Canonical events (Wave 1 covers Book lifecycle end-to-end)

| Event | Triggered by | Notify Author | Notify Admins | Email |
|---|---|---|---|---|
| `book.submitted` | Author submits / publishes draft (sets approval_status='pending_review') | "Submission received, under review" | "New book pending review: {title}" + link | optional admin digest |
| `book.approved` | Admin clicks Approve | "Your book is live 🎉" + microsite URL | log only | existing `book-approved` ✓ |
| `book.changes_requested` | Admin clicks Request Changes (new) + note | "Changes requested: {note}" | log only | new `book-changes-requested` template |
| `book.rejected` | Admin clicks Reject + reason | "Submission rejected: {reason}" | log only | new `book-rejected` template |
| `book.resubmitted` | Author edits + resubmits | confirm to author | "Resubmission v{n}: {title}" | — |
| `payout.paid` | Stripe webhook | "Payout {amt} sent" | log | existing |
| `payout.failed` | Stripe webhook | "Payout failed: action needed" | "Payout failure for {author}" | optional |
| `support.opened` | Author opens ticket | confirm | "New ticket: {subject}" | optional |
| `support.replied` | Counterparty replies | recipient gets bell | recipient (if admin) | — |
| `purchase.completed` | verify-purchase webhook | "New sale {amt}" | log | existing |
| `node.published` (microsite goes live) | author_nodes.status→live | confirm | log | — |
| `admin.broadcast` | Admin posts announcement | all authors get bell | — | optional |

### Single mechanism

One DB helper + one edge function entrypoint = all events go through it:

- `public.notify_users(target_user_ids uuid[], title text, message text, link text, event_key text)` — SECURITY DEFINER inserts to `notifications` (and a new `audit_log` row with event_key + actor).
- New table `public.admin_audit_log` (actor_id, event_key, target_type, target_id, payload jsonb, created_at) — backbone of the Audit & System-Health tabs.
- New helper `notify_all_admins(...)` resolves admin user_ids via `user_roles where role='admin'`.

### Wave-1 Implementation Scope

**Schema (migration):**
1. `public.admin_audit_log` table + RLS (admins read; service-role write).
2. SQL function `public.notify_users(...)` and `public.notify_all_admins(...)`.
3. Add `books.submitted_at`, `books.review_round int default 1`, `books.rejection_note text` (rejection_note already exists per code; verify), `books.review_history jsonb`.
4. Trigger `books_after_status_change` → calls the right `notify_*` based on `approval_status` transition.

**Edge function changes:**
- `admin-books` `approve`: call `notify_users([author], 'Your book is live', ..., '/books/{slug}')` + audit log. Email already wired ✓.
- `admin-books` `reject`: accept `reason`, store in `rejection_note`, notify author, audit log, send new `book-rejected` email template.
- New action `request-changes`: same as reject but status='changes_requested' and uses `book-changes-requested` template.
- New action in book write path (`save-book`/`publish-book`, whichever exists): on first transition to `pending_review`, notify all admins.

**UI changes:**
- `BooksTab.tsx`: add "Request Changes" button + modal with reason textarea. Reject button gets a required reason modal too. Show `review_round` badge.
- `OverviewTab.tsx`: add "Recent Activity" feed pulling last 20 rows of `admin_audit_log`.
- New `AdminNotificationBell.tsx` mounted in `AdminDashboard` header — same pattern as author `NotificationCenter` but filtered to admin events.
- New email templates: `book-rejected.tsx`, `book-changes-requested.tsx` registered in `transactional-email-templates/registry.ts`.

**Author side:**
- Existing `NotificationCenter.tsx` already polls + realtime — no change needed; it will pick up rows automatically.
- Add a small "Resubmit" action on author's book card when `approval_status='changes_requested'` or `'rejected'`.

### Out of scope for Wave 1 (queued for Wave 2+)
- Impersonate, suspend/reinstate, refund flow, broadcast announcements, system-health dashboard, ticket SLA. These are itemised in Part A and will land sequentially.

---

## Files that will be touched in Wave 1

```text
NEW  supabase/migrations/<ts>_admin_audit_and_notify.sql
NEW  supabase/functions/_shared/transactional-email-templates/book-rejected.tsx
NEW  supabase/functions/_shared/transactional-email-templates/book-changes-requested.tsx
EDIT supabase/functions/_shared/transactional-email-templates/registry.ts
EDIT supabase/functions/admin-books/index.ts         (reject reason, request-changes, audit, notify)
EDIT supabase/functions/save-book/index.ts (or equivalent)  (notify admins on submit)
NEW  src/components/admin/AdminNotificationBell.tsx
EDIT src/pages/AdminDashboard.tsx                    (mount bell, recent activity)
EDIT src/components/admin/BooksTab.tsx               (reason modals, review_round badge)
EDIT src/components/admin/OverviewTab.tsx            (Recent Activity feed)
EDIT src/components/dashboard/MyBooks.tsx            (Resubmit CTA when changes_requested/rejected)
```

---

## Open questions before we start

1. For "Request Changes" vs "Reject" — should rejection be terminal (author cannot resubmit same book) or always allow resubmission? Default plan: changes_requested = resubmittable, rejected = terminal (admin must re-open).
2. Should admin notifications email-digest hourly instead of one-per-event? Default: in-portal bell only, email digest deferred to Wave 2.
3. Confirm the Author dashboard should show the rejection/changes note inline on the book card (default: yes).

Confirm or override these and I'll execute Wave 1.
