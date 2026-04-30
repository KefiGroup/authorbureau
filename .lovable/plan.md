## Audits 3 + 4 — Revenue Engine & Email/CRM Engine

### Headline result

**OVERALL: NEEDS FIXES.** Audit 3 Test A passes; Test B cannot pass (booking flow not built); Test C partially passes; Tests D and E pass with caveats. Audit 4 mostly passes — but engagement scoring updates the wrong table, so the Hot Leads list never lights up.

### What works (verified by reading code + DB)

**Audit 3 — Commerce**
- `BuyNowButton` → `create-checkout-session` → Stripe Checkout works for paid `author_nodes`, `courses`, and BA-12 memberships. Authors Bureau is Merchant of Record (no Connect on this path).
- `verify-purchase` (sync, on thank-you) and `process-purchase` (async webhook) both record into `purchases` and mirror to `author_earnings`.
- Platform fee read from `platform_config.platform_fee_percent` (8% default). Math is correct: `amount`, `platform_fee`, `author_earnings` columns populated.
- Confirmation email sent via Resend from `notify@notify.authorsbureau.com` immediately after `verify-purchase` records the row (Test A step 4).
- Revenue Dashboard reads `author_earnings` — already linked in `verify-purchase` via the inline insert.
- BP-09 single Amazon link (`book.amazon_url`) opens correctly with `target="_blank" rel="noopener"`.

**Audit 4 — Email/CRM**
- Quiz/funnel submit → `submit-funnel` writes to `leads` (score 10, stage `new`, `nurture_stage="welcome"`) and to `crm_contacts` (score 2). Quiz answers stored in `quiz_responses`. Confirmed in DB.
- `auto-enroll` lead → first email sequence step fires immediately.
- `resend-webhook` updates `email_send_log.opened_at` / `clicked_at`, suppresses bounces/complaints, and bumps `leads.abby_score` (+2 open / +5 click, capped 100).
- `process-email-events` recomputes `leads.stage` from `abby_score` (≥50 hot, ≥20 warm, ≥5 engaged).
- Email send log dedups via the partial unique index on `message_id WHERE status='sent'`.
- Lead activities timeline persists every event in `lead_activities`.

### Failures requiring fixes

**F1 — Hot Leads list never updates from email engagement (Audit 4 critical)**
- Symptom: `RevenueFullDashboard.tsx` queries `crm_contacts` for hot leads (`abby_score >= 60`), but `resend-webhook` only bumps `leads.abby_score`. Opens/clicks therefore can never push a contact into the Hot Leads view.
- Fix: in `resend-webhook` and `process-email-events`, mirror the `abby_score` increment + `last_activity_at` to `crm_contacts` matched by `(author_id, lower(email))`. Idempotent upsert; ignore rows that don't exist (lead-only, no CRM contact).

**F2 — Stripe Connect badge does not auto-refresh after return from Stripe (Audit 3 Test E step 4)**
- Symptom: `ConnectSettings` runs `refresh()` once on mount. After Stripe OAuth redirect, the badge stays "Not Connected" until the user manually reloads.
- Fix: add a `visibilitychange` + `focus` listener in `ConnectSettings` that calls `refresh()` when the tab regains focus. Also detect `?stripe=connected` in the URL on mount and force-refresh once.

**F3 — BP-09 Amazon Paperback vs Kindle (Audit 3 Test C steps 2–3)**
- Symptom: schema has only `books.amazon_url`; checklist tests two distinct URLs.
- Two acceptable resolutions:
  - **(a)** Add a separate `amazon_kindle_url` column on `books` (migration + form field on the book editor + microsite render). Keeps the test as written.
  - **(b)** Update the audit to a single "Buy on Amazon" link (current product behaviour).
- We will go with **(a)** since the audit specifies both. Smallest possible change: optional `amazon_kindle_url text`, render second button only when set, no breaking change for existing books.

**F4 — Welcome email sender domain (Audit 4 step 2 of welcome email)**
- Symptom: confirmation email and CRM-notify email hard-code `notify@notify.authorsbureau.com`. Audit text says it should come "from Pauline's Resend-connected domain". Per the platform model (Resend is platform-managed, not per-author), this is **by design** — flag for the user to confirm. No code change unless they want per-author sender domains, which would be a sprint of its own.

### Cannot fix in this audit (out of scope)

**B — YR-19 Coaching booking flow**
- There is no calendar UI, no `Book Session` button on the coaching microsite, and no Daily.co integration. The YR-19 builder only generates the marketing page. Building a real booking flow (calendar component, availability table, Daily.co room creation, confirmation email with link, dashboard view) is a separate sprint.
- Action: report the gap; do not attempt a half-built fix in this audit.

### What we will change (this turn)

1. **`supabase/functions/resend-webhook/index.ts`** — after bumping `leads.abby_score`, mirror the increment to `crm_contacts` for the same `(author_id, lower(email))`, and refresh `last_activity_at`.
2. **`supabase/functions/process-email-events/index.ts`** — same mirror after the existing `leads` update.
3. **`src/pages/ConnectSettings.tsx`** — add `visibilitychange` + `focus` listeners that call `refresh()`; on mount, if the URL contains `?stripe=connected` or `?stripe=success`, run an immediate refresh and strip the param.
4. **DB migration** — `ALTER TABLE books ADD COLUMN amazon_kindle_url text NULL;`
5. **Book editor (`DualModeBookForm` or equivalent)** — add the optional Kindle URL field next to the existing Amazon URL.
6. **Microsite renderers (`AuthorBookPage.tsx`, `DynamicBookMicrosite.tsx`)** — when `amazon_kindle_url` is present, render a second "Buy on Amazon (Kindle)" button next to the existing one (which becomes "Buy on Amazon (Paperback)" only when both URLs exist; otherwise stays "Buy on Amazon").
7. **Deploy** the two updated edge functions.

### Files to touch

```text
EDIT  supabase/functions/resend-webhook/index.ts
EDIT  supabase/functions/process-email-events/index.ts
EDIT  src/pages/ConnectSettings.tsx
EDIT  src/pages/AuthorBookPage.tsx
EDIT  src/pages/DynamicBookMicrosite.tsx
EDIT  src/components/dashboard/DualModeBookForm.tsx   (Kindle URL field; locate exact form file during impl)
NEW   supabase/migrations/<ts>_add_amazon_kindle_url.sql
```

### 8-Level QA after fixes

- L1 Console/Network: open the public microsite + Connect Settings → expect zero red errors.
- L2 Buttons: clicking "Buy on Amazon (Kindle)" opens the new URL in a new tab; "Connect Stripe" → returns to settings → badge flips without manual reload.
- L3 Empty states: book without Kindle URL still shows just one Amazon button.
- L4 Data flow: trigger an `email.opened` event via webhook → confirm `crm_contacts.abby_score` and `leads.abby_score` both incremented for the same email.
- L5 Mobile (375px): both Amazon buttons stack vertically; Connect Settings cards reflow.
- L6 Auth: `/coaching` is public and shows author-controlled copy only — no protected data leaked.
- L7 Errors: missing `crm_contacts` row → mirror update silently no-ops, never throws.
- L8 Navigation: thank-you page links back to author microsite (already in place).

### Final report (post-fix expected)

```text
LEVEL 1: PASS  | LEVEL 2: PASS  | LEVEL 3: PASS  | LEVEL 4: PASS
LEVEL 5: PASS  | LEVEL 6: PASS  | LEVEL 7: PASS  | LEVEL 8: PASS
OVERALL: PASS for fixable items.
Out-of-scope: YR-19 booking flow needs its own sprint (calendar + Daily.co + booking dashboard).
Decision needed from user: per-author Resend sender domain (currently platform-managed).
```
