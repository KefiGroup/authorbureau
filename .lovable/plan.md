

## Status of Sprint 34: NOT BUILT

### What exists today (would conflict)

**Database — different schema, similar purpose:**
- `email_flows` + `email_flow_steps` + `email_flow_enrollments` (the existing native engine, used by ABBY Nurture / Sprint 28)
- `email_send_log` (transactional send log, used by `auth-email-hook`, `send-transactional-email`, `process-email-queue`, `handle-email-suppression`, `handle-email-unsubscribe`)
- `email_campaigns` + `email_templates` + `email_unsubscribe_tokens`
- `leads` table — has `nurture_stage`, `quiz_score`, `last_activity_at`, but **no `abby_score`, `total_revenue`, `stage`** columns
- Sprint 34's `email_sequences` / `email_sequence_steps` / `email_sends` / `email_lists` / `lead_activities` — **do not exist**

**Email sending stack already in place:**
- Uses **Lovable Email** (via `auth-email-hook` + `send-transactional-email` + `process-email-queue` cron) — NOT Resend directly
- A pgmq queue, suppression list, and unsubscribe tokens are already wired up

**UI:**
- `/marketing-hub` exists and is **not** "Coming Soon" — it's a campaign activation grid keyed off `author_nodes.marketing_activated_at` (8 campaigns: Email Marketing, Lead Magnets, Social Media, etc.)
- Sidebar already shows "Marketing Hub" with no lock badge

**Edge functions:**
- 19 `deploy-*-to-ghl` functions still exist (memory says "GHL deploy functions are deprecated" but files remain)
- `generate-bp01-email-marketing`, `generate-bp02-lead-magnets`, `generate-bp05-webinars` exist but don't write to any sequence engine
- `send-email`, `generate-email-sequence`, `trigger-sequence`, `process-email-events` — **none exist**

### Conflicts vs Sprint 34 spec

| Sprint 34 says | Reality | Decision |
|---|---|---|
| Create new `email_sequences` table | An existing `email_flows` table already serves this purpose (used by ABBY Nurture Engine) | **Reuse `email_flows`/`email_flow_steps`** — adapt UI labels. Don't create parallel tables. |
| Send via Resend with `RESEND_API_KEY` | Already on Lovable Email infra | **Reuse Lovable Email** — don't add a second sender. (Architecture PDF says Resend, but project is already using Lovable's managed Resend wrapper, which delivers the same outcome without a new key.) |
| New `email_sends` log | `email_send_log` exists | Extend `email_send_log` with `lead_id`, `sequence_step_id`, `author_id`, `opened_at`, `clicked_at` columns. |
| New `lead_activities` table | Does not exist | **Create as specified** |
| New `email_lists` table | Does not exist | **Create as specified** |
| Add `abby_score`, `last_activity_at`, `total_revenue` to `leads` | `last_activity_at` exists; others missing | Add the 2 missing columns + a `stage` column |
| Marketing Hub = 4 tabs (Overview / Sequences / Contacts / Settings) replacing "Coming Soon" | Hub is the 8-card campaign grid (not coming soon) | **Wrap existing grid as a 5th view ("Campaigns") inside the new tabbed shell** — preserves working flows + adds the 4 tabs. |
| BP-01/02/05 builders trigger sequence generation | Builders generate node content, no sequence write | Add a post-generation step that writes to `email_flows`/`email_flow_steps` |

### Cleanup recommended (minor)

1. **Don't delete the existing `email_flows` engine** — it's actively wired into BP-02 publish and ABBY Nurture (Sprint 28). Treat Sprint 34 as a UI + UX layer over it, plus the few missing tables.
2. The 19 `deploy-*-to-ghl` edge functions are dead code (per memory). They aren't in Sprint 34 scope; flag for a future cleanup sprint.
3. No destructive migration needed.

### Plan (revised Sprint 34)

**Phase A — Memory + Schema (1 migration)**
- Save `mem://architecture/abby-7-engines-master-plan` (architecture v4.0 summary) and `mem://sprints/sprint-34-abby-email-engine` (sprint spec + reuse decisions) to long-term memory
- Migration:
  - Create `email_lists`, `lead_activities` (per spec)
  - `ALTER leads` add `abby_score INT default 0`, `total_revenue DECIMAL default 0`, `stage TEXT default 'new'`
  - `ALTER email_send_log` add `lead_id`, `sequence_step_id`, `author_id`, `opened_at`, `clicked_at`, `to_name` (nullable, no breaking change)
  - `ALTER email_flows` add `total_subscribers`, `open_rate`, `click_rate`, `node_id` (nullable)
  - Backfill `email_flows.node_id` from `flow_type` where mappable
  - RLS policies per spec
- Skip creating `email_sequences`/`email_sequence_steps`/`email_sends` — `email_flows`/`email_flow_steps`/`email_send_log` already cover these.

**Phase B — Edge functions**
- `generate-email-sequence` — GPT-5.2 (Lovable AI Gateway, per memory) writes to `email_flows` + `email_flow_steps`. Inputs: `{author_id, node_id, sequence_type}`.
- `trigger-sequence` — enrolls a lead into a flow (writes `email_flow_enrollments` + first send via existing `process-email-queue`)
- `process-email-events` — Resend webhook → updates `email_send_log` + `lead_activities` + bumps `leads.abby_score` and `stage`
- Skip creating a new `send-email` — use existing `send-transactional-email` / `process-email-queue` infrastructure

**Phase C — Marketing Hub UI rebuild**
- Refactor `MarketingHub.tsx` into a 4-tab shell: **Overview · Sequences · Contacts · Settings**
- Keep current 8-card "Activate Campaign" grid as the **Overview** Quick Actions
- Sequences tab: list `email_flows` rows with status, step preview, subscriber/open/click metrics
- Contacts tab: `email_lists` cards + Recent Leads table (sorted by `last_activity_at`)
- Settings tab: form persists to `author_profiles.email_settings` (JSONB)
- Empty states + ABBY voice copy per spec

**Phase D — BP-01 / BP-02 / BP-05 hooks**
- Add a post-content step in each of the 3 builders that calls `generate-email-sequence` and shows the success card with "View Email Sequence →" link
- Do not change the existing builder layout/dialogue

**Phase E — QA / verification**
- Smoke test all 4 tabs render
- Verify sequence generation writes `email_flows` + `email_flow_steps` correctly
- Verify no regression to BP-02 publish flow or ABBY Nurture

### What this avoids
- No table duplication (uses existing engine where possible)
- No second email-sending stack (uses already-wired Lovable Email queue)
- No breaking change to BP-02 / ABBY Nurture / transactional emails

### Recommendation
**Continue the build — no cleanup pre-work needed.** Proceed straight into Phase A on approval.

