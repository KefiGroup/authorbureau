# 05 · ABBY CRM Intelligence Prompts

_Version 3.0 · 2026-05-01_

**Source(s) of truth:**
- `supabase/functions/abby-daily-report/index.ts`
- `supabase/functions/abby-daily-report-dispatcher/index.ts`
- `supabase/functions/generate-daily-insight/index.ts`
- `supabase/functions/generate-nudges/index.ts`
- `supabase/functions/crm-auto-capture/index.ts`

---

ABBY's CRM intelligence layer produces **proactive coaching** for authors: a daily report, real-time nudges, hot-lead notifications, and re-engagement emails.

## Daily Intelligence Report

- **Edge function**: `abby-daily-report` (dispatched nightly by `abby-daily-report-dispatcher`).
- **Output**: HTML email rendered via `transactional-email-templates`, From address = `notify.authorsbureau.com` (system email — no per-author branding).
- **Sections**: New contacts, hot leads, sales last 24h, content opportunities, nudge prompts, top-performing assets.
- **Model**: `openai/gpt-5.2` for narrative summary; deterministic SQL for numbers.
- **Prompt verbatim**: see auto-extracted block in `03-node-activation-prompts.md` (or grep the function source).

## Nudge Engine (real-time cards on the dashboard)

- **Edge function**: `generate-nudges`
- **Triggers monitored** (9 total): new lead with no follow-up; lead opened email twice; lead clicked sales page twice; sales-page visit no purchase; webinar registration; podcast episode published with no email push; revenue dip vs 7-day avg; hot lead inactive; new sale (celebrate).
- **Output**: `abby_nudges` row + dashboard card. Author can dismiss, accept, or schedule.

## Daily Insight (in-dashboard tile)

- **Edge function**: `generate-daily-insight`
- **Output**: One short paragraph rendered in the dashboard hero "ABBY's read on today" tile.
- Uses the author's last 7 days of activity + open nudges as context.

## Lead Scoring (deterministic — no LLM)

| Event | Score change |
|---|---|
| Quiz completed | +10 |
| Email opened | +2 |
| Email link clicked | +5 |
| Sales page visited (1st time) | +5 |
| Sales page visited (2nd+) | +10 |
| Session registered | +15 |
| Session attended | +20 |
| Purchase made | +30 |
| No activity 7 days | -3 |
| Unsubscribed | -50 |

### Pipeline stages

| Score | Stage |
|---|---|
| 0–15 | New |
| 16–35 | Engaged |
| 36–60 | Warm |
| 61–80 | Hot |
| 81–100 | Customer |
| 100 | VIP |

Implemented in `crm-auto-capture` and read by all dashboard surfaces. Authoritative table: `crm_contacts.score`.

## Re-engagement copy

When a lead drops to Engaged from Warm/Hot for ≥ 14 days, ABBY can compose a re-engagement email through `generate-email-sequence` (single-step variant). Author approves before send.

## Hot-lead notifications

When a contact's score crosses **61** for the first time in 24 h, the Nudge Engine fires both:

1. A dashboard nudge card.
2. A transactional email to the author (system-branded, From = `notify.authorsbureau.com`).
