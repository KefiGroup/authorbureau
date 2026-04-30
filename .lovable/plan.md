# Plan — Author-Branded Transactional Sends (3 Low-Effort Wins)

Goal: make every transactional email **feel like it comes from the author**, while continuing to send through the single verified `notify.authorsbureau.com` pipeline. No DNS, no Resend changes, no per-author domain.

## What's already in place

- `send-transactional-email` enqueues to pgmq with a `from` field — currently hardcoded to `"Authors Bureau" <noreply@authorsbureau.com>`.
- `author_email_settings` table already stores **`sender_name`** and **`reply_to_email`** per author (kept in sync by `sync-author-email`).
- `author-broadcast.tsx` already has a "Sent via Authors Bureau on behalf of {senderName}" footer.
- `reply_to` is **not** in the enqueued payload anywhere — completely missing today.
- ~10 other templates (purchase-confirmation, quiz-result, webinar-email, audiobook-distribution-ready, book-submitted/approved, profile-*, abby-daily-report) have no author footer line.

## The three changes

### 1. Strengthen the From name → "Pauline Teo via Authors Bureau"

In `send-transactional-email/index.ts`:

- Accept an optional `authorId` in the request body.
- If `authorId` is present, look up `author_email_settings.sender_name` and `reply_to_email` (service-role read, so RLS-safe).
- Build the `from` string dynamically:
  - With author: `"Pauline Teo via Authors Bureau" <noreply@authorsbureau.com>`
  - Without author (system emails like `book-approved`): `"Authors Bureau" <noreply@authorsbureau.com>` (unchanged).
- Sanitize the display name (strip `<`, `>`, `"`, newlines, RFC-5322-safe).

### 2. Wire Reply-To into the queue payload

- Add `reply_to` to the enqueued pgmq payload.
- Resolution order:
  1. Explicit `replyTo` in request body (highest priority — used by webinar/quiz flows that already know the author email).
  2. `author_email_settings.reply_to_email` for the resolved `authorId`.
  3. Omit (no Reply-To header — replies go to the unmonitored `noreply@`).
- The Lovable email dispatcher already supports `reply_to` in the queue payload — this is just adding a field, no infra change.

### 3. Add the soft author footer to author-context templates

Add a single shared footer line — `"You're receiving this because {senderName} sent it via Authors Bureau."` — to the ~7 author-context templates that lack it:

- `purchase-confirmation.tsx`
- `quiz-result.tsx`
- `webinar-email.tsx`
- `audiobook-distribution-ready.tsx`
- `book-submitted.tsx` / `book-approved.tsx` (admin-facing, but author context still relevant)
- `abby-daily-report.tsx`

Implementation: a small `<AuthorFooter senderName={...} />` shared component in `_shared/transactional-email-templates/` so we don't duplicate the markup. Each template accepts an optional `senderName` prop and renders the footer only when it's provided.

The system unsubscribe footer (system-managed, can't be touched) stays below it — completely separate.

## Caller updates (where we pass `authorId` / `senderName`)

These are the existing send sites that have author context and should now pass it through. None require new schema:

| Caller | What to pass |
|---|---|
| `_shared/from-address.ts` (`sendViaLovable`) | already has `senderName`; add optional `authorId` arg + forward |
| `process-email-flows` (nurture sends) | already loads `author_email_settings` — pass both |
| `crm-auto-capture` quiz-result invocation | pass `authorId` from the quiz context |
| `webinar-register` invocation | pass `authorId` from the webinar |
| `verify-purchase` purchase-confirmation invocation | pass `authorId` from the order |
| `distribute-audiobook` notification | pass `authorId` |
| Admin/system templates (`book-submitted`, `book-approved`, `profile-synced`, `profile-created`, `sender-email-verification`, `abby-daily-report`) | leave as-is — no author context, fall through to default "Authors Bureau" From + no Reply-To |

## Files to edit

```
supabase/functions/send-transactional-email/index.ts        (core change)
supabase/functions/_shared/from-address.ts                  (forward authorId)
supabase/functions/_shared/transactional-email-templates/
  ├── _author-footer.tsx                                    (new shared component)
  ├── purchase-confirmation.tsx
  ├── quiz-result.tsx
  ├── webinar-email.tsx
  ├── audiobook-distribution-ready.tsx
  ├── book-submitted.tsx
  ├── book-approved.tsx
  └── abby-daily-report.tsx
supabase/functions/crm-auto-capture/index.ts                (pass authorId)
supabase/functions/webinar-register/index.ts                (pass authorId)
supabase/functions/verify-purchase/index.ts                 (pass authorId)
supabase/functions/distribute-audiobook/index.ts            (pass authorId)
supabase/functions/process-email-flows/index.ts             (pass authorId)
```

## Deployment

After edits, deploy:
- `send-transactional-email`
- `crm-auto-capture`, `webinar-register`, `verify-purchase`, `distribute-audiobook`, `process-email-flows`

(Templates ride along with `send-transactional-email`.)

## QA checklist

1. Trigger a quiz lead capture for Pauline → inbox shows **From: "Pauline Teo via Authors Bureau"**, **Reply-To: pauline's email**, footer reads **"You're receiving this because Pauline Teo sent it via Authors Bureau."**
2. Trigger `book-approved` (system) → From stays **"Authors Bureau"**, no Reply-To, no author footer (correct — it's a platform notice).
3. Reply to the quiz-result email in Gmail → To-line auto-fills Pauline's email, not `noreply@`.
4. Confirm `email_send_log` still shows `sent` for both flows.
5. Suppression check still runs (no regression to compliance path).

## Out of scope

- Per-author sender domain (still deferred — separate sprint when 3+ Yield authors request it).
- Editing the system-managed unsubscribe footer (forbidden by infra).
- Auth emails (signup/recovery/etc.) — those stay platform-branded.

## Memory

Update `mem://index.md` core rules with a one-liner:
> "Author-context transactional emails: From = '{senderName} via Authors Bureau', Reply-To = author_email_settings.reply_to_email, footer = 'sent on behalf of {senderName}'. System emails keep platform branding."
