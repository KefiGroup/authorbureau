
## Sprint 58 — Audit reconciliation + CRM Daily Intelligence push

### Why this scope

While preparing the originally-queued "Mark-as-Posted + Social ZIP + Email scoring" sprint, exploration uncovered that **all three items are already shipped**:

- **ZIP social pack** — `export-social-pack-zip` edge function is deployed; `SocialCalendarTab` already has a "Download Pack (.zip)" button (line 632).
- **Mark-as-Posted** — `social_posts.posted_at` column + status `'posted'` flow + "Mark as Posted" button (SocialCalendarTab line 945) are live.
- **Open/click → ABBY scoring** — `resend-webhook` already bumps `leads.abby_score` (open +2, click +5), mirrors to `crm_contacts`, and logs `email_open` / `email_click` rows in `lead_activities`.

So Sprint 58 splits into **(A) reconcile the audit doc + verify** the existing infra is actually wired, and **(B) ship the next genuinely-missing CRM rail item — the Daily Intelligence push**. Larger remaining gaps (Course-Learn portal, Member portal, Podcast RSS, Daily.co coaching) are each big enough to deserve their own sprints and are explicitly out-of-scope here.

---

### Part A — Audit reconciliation & verification

1. **Verify Resend webhook is reachable in production.**
   - Check `RESEND_WEBHOOK_SECRET` secret is set; if missing, prompt to add it (without it the function accepts unsigned events, which is a soft security risk).
   - Confirm Resend dashboard webhook is pointed at `…/functions/v1/resend-webhook` for events: `email.bounced`, `email.complained`, `email.delivered`, `email.opened`, `email.clicked`, `email.failed`, `email.delivery_delayed`. If unset, surface a one-line note to the user (cannot do it from code).
   - Tail recent `resend-webhook` logs to confirm real opens/clicks are coming through and ABBY scores are moving.

2. **Verify ZIP + Mark-as-Posted end-to-end** with one live author's pack — ensure the download produces a valid zip, captions+graphics are present, and the post flips to `posted` status.

3. **Update `.lovable/audit-3-must-have.md`** capability table:
   - Social media kit → ✅ (ZIP + Mark-as-Posted shipped)
   - Email marketing → ✅ (open/click scoring shipped)
   - CRM → flip "daily intelligence push" gap to in-progress for Part B.
   - Add a "Sprint 58 — Audit reconciliation" section recording these findings.

---

### Part B — CRM Daily Intelligence push

A once-per-day per-author email/dashboard summary of CRM movement, leveraging the now-functional engagement scoring.

**New edge function: `abby-daily-crm-digest`** (`verify_jwt = false`, runs via pg_cron)

For each `author_profiles` row with at least one CRM contact:

- New leads in last 24h (count + top 3 by score)
- Hot leads (score ≥ 60) currently in pipeline (count + delta vs previous day)
- Email engagement: opens / clicks in last 24h (from `lead_activities`)
- Top-moving contact (largest `abby_score` increase in 24h)
- One ABBY-generated next-action recommendation per author (1 sentence, gpt-5-mini)

Emit via existing `send-transactional-email` (`authorId` set so it inherits author-branded From/Reply-To). Also write a row to a new table `crm_daily_digests` so the dashboard can render the same intel as a card without re-emailing.

**Migration:** create `crm_daily_digests` (`author_id`, `digest_date` unique pair, `payload jsonb`, RLS: authors read own).

**Cron:** schedule `abby-daily-crm-digest` at 13:00 UTC daily (matches existing `abby-daily-report-dispatcher` window).

**UI:** add a "Today's CRM Intelligence" card at the top of `AuthorCRMPage` rendering the latest `crm_daily_digests` row for the active author. Falls back gracefully when no digest exists yet.

---

### Files to touch

- `.lovable/audit-3-must-have.md` (reconcile table + Sprint 58 notes)
- `supabase/functions/abby-daily-crm-digest/index.ts` (new)
- `supabase/migrations/<new>.sql` (new `crm_daily_digests` + cron job)
- `src/components/dashboard/AuthorCRMPage.tsx` (top card)
- `src/components/dashboard/crm/DailyIntelligenceCard.tsx` (new)
- `mem://sprints/sprint-58-audit-reconciliation.md` (new)
- `mem://index.md` (add reference)

### Out of scope (future sprints)

- Course `/courses/:slug/learn` portal + enrollments
- Member `/members/:slug` gated route
- Podcast RSS feed
- Daily.co coaching booking
- Per-node ZIP/MP3 export rail
