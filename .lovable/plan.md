## Goal

Close two related gaps from `.lovable/audit-3-must-have.md`:

1. **Lead capture → BP-01 nurture autowire** — currently a quiz/lead-magnet submission only enrolls the new subscriber into the BP-02 flow + `master_nurture`. The actual welcome/nurture series lives in BP-01 and is silently skipped, so newly captured leads receive no follow-up emails until the author manually wires something up.
2. **Hot-Leads CRM widget — surface it where authors actually look.** The widget component already exists (`src/components/dashboard/crm/HotLeadsCard.tsx`, threshold ≥20) but is only mounted on the CRM page. Authors land on the Revenue Dashboard daily — a focused "Hot Leads" card belongs there too, with a one-click jump to the CRM and the contact's detail panel.

No schema changes; no new edge functions; no breaking changes.

## Current state (verified)

- `submit-funnel` calls `enroll-subscriber` with `node_id: funnel.node_id` (=`BP-02` for lead magnets).
- `enroll-subscriber` enrolls in flows where `flow_type === 'master_nurture'` OR `node_id === body.node_id`. BP-01 flows are never matched.
- DB today has 1 BP-01 flow + 1 BP-02 flow (both `draft`, single author). No `master_nurture` flow exists in production. So today, a captured lead gets **zero** automated email follow-up.
- Revenue Dashboard already shows `hotLeads` (>60 score) inline at line 122 of `RevenueDashboard.tsx`, but there is no compact, visually distinct "Hot Leads" card and no link into the CRM contact panel — it's a dense bullet list.
- `HotLeadsCard` (≥20 score) is mounted only on `AuthorCRMPage` line 389.

## Plan

### Step 1 — `enroll-subscriber`: treat BP-01 as the global welcome engine

In `supabase/functions/enroll-subscriber/index.ts`, change the target-flow filter so a subscriber is enrolled in:

- every `flow_type === 'master_nurture'` flow (unchanged), AND
- every `flow_type === 'BP-01'` flow (new — BP-01 is the always-on welcome/nurture engine), AND
- the node-specific flow when `body.node_id` matches (unchanged — covers BP-02, BP-05, etc.).

De-dupe by `flow.id` so a BP-01-keyed master flow isn't enrolled twice. Suppression check, `email_flow_enrollments` upsert, and the instant `process-email-flows` kick remain untouched.

### Step 2 — Lead-capture telemetry

In `submit-funnel`, when the captured node is `BP-02`, log a structured `lead_activities` row with `activity_type='nurture_autowired'` and metadata `{ enrollments: enrollData.enrollments }` so authors can see in the contact timeline that the BP-01 sequence was triggered. Also bump `crm_contacts.abby_score` by +3 on quiz completion (currently fixed at 2) — quiz finishers are warmer than email-only opt-ins.

### Step 3 — Revenue Dashboard: new "Hot Leads" card

Replace the existing dense hot-leads bullet block on `RevenueDashboard.tsx` with the existing `<HotLeadsCard />` component (re-keyed by `author_profiles.id`), placed alongside the "Leads This Week" stat. Each row links to `/dashboard?section=crm&contactId=<id>` so the CRM page can deep-link the contact.

### Step 4 — CRM deep-link from URL

In `AuthorCRMPage.tsx`, read `contactId` from the URL search params on mount; if present, scroll the matching row into view and open `ContactDetailPanel` for it. No new state plumbing — just a `useEffect` watching `searchParams`.

### Step 5 — Verification

- Unit: extend `supabase/functions/enroll-subscriber/__tests__` (or add) to assert BP-01 flows are matched even when `body.node_id='BP-02'`.
- Manual: pick the existing Pauline Teo BP-01 flow, flip it to `active`, submit a test lead via `/{author}/{book}/free-gift`, confirm:
  - one row in `email_flow_enrollments` against the BP-01 flow,
  - one row in `lead_activities` with `activity_type='nurture_autowired'`,
  - `process-email-flows` fires the first BP-01 step within ~1.5s,
  - the contact appears on Revenue Dashboard's Hot Leads card after the score bump,
  - clicking the row deep-links to the CRM contact panel.
- Run `daily-audit` (cron will re-run overnight) to confirm no regression in `email_queue` / `connectors` checks.

## Files touched

- `supabase/functions/enroll-subscriber/index.ts` — add BP-01 branch in flow filter, de-dupe by `flow.id`.
- `supabase/functions/submit-funnel/index.ts` — log `nurture_autowired` activity, +3 score on quiz completion.
- `src/components/dashboard/RevenueDashboard.tsx` — swap inline hot-leads list for `<HotLeadsCard />`, add deep-link query param.
- `src/components/dashboard/crm/HotLeadsCard.tsx` — make rows clickable; emit `onClick` that pushes `contactId` query param.
- `src/components/dashboard/AuthorCRMPage.tsx` — read `contactId` from URL → open panel + scroll.
- `.lovable/audit-3-must-have.md` — mark Lead-capture and CRM gaps closed; remove from "Next sprints".
- `mem://sprints/sprint-34-abby-email-engine` — note BP-01 is enrolled globally (parity with master_nurture).

## Out of scope

- Daily intelligence push email (separate item — `abby-daily-report-dispatcher` already handles it).
- Open/click → ABBY score bumps (audit-3 item, separate sprint — touches `process-email-events`, not lead capture).
- Marketing-Hub flow status flips (authors still flip `draft` → `active` themselves; we don't auto-activate).
- Schema changes; no new tables, no migrations.

## Risks & mitigations

- **Risk**: an author has both a BP-01 flow and a BP-02 flow; both could send a "welcome" email at the same time. **Mitigation**: BP-01 is the welcome series, BP-02 sends the lead magnet itself (different intent). Authors who want only one can set the other to `draft`. Doc this in the memory note.
- **Risk**: existing `total_subscribers` counts go up unexpectedly when BP-01 flows that were previously orphaned start receiving enrollments. **Mitigation**: count is a soft analytics column, not gated behavior; no user impact beyond a more accurate number.
- **Risk**: `<HotLeadsCard />` queries `leads` (author_profile_id) while Revenue Dashboard already passes `aid = author_profiles.id` — so wiring is straight. No RLS change needed.
