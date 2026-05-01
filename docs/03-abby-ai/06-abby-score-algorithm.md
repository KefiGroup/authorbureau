# 06 · ABBY Score Algorithm — Documented

_Version 3.0 · 2026-05-01_

**Source(s) of truth:**
- `supabase/functions/crm-auto-capture/index.ts`
- `crm_contacts.score` column

---

## Event scoring

| Event | Score change |
|---|---|
| Quiz completed | **+10** |
| Email opened | **+2** |
| Email link clicked | **+5** |
| Sales page visited (1st) | **+5** |
| Sales page visited (2nd+) | **+10** |
| Session registered | **+15** |
| Session attended | **+20** |
| Purchase made | **+30** |
| No activity for 7 days | **-3** |
| Unsubscribed | **-50** |

Scoring is **deterministic** — no LLM involvement. The `crm-auto-capture` edge function is the only writer to `crm_contacts.score`.

## Pipeline stages (read-side derivation)

| Score range | Stage label | Used in |
|---|---|---|
| 0 – 15 | New | dashboard, daily report |
| 16 – 35 | Engaged | dashboard, daily report |
| 36 – 60 | Warm | dashboard, daily report, hot-lead alert (entry threshold) |
| 61 – 80 | Hot | dashboard, daily report, hot-lead alert (active) |
| 81 – 99 | Customer | dashboard, retention nudges |
| 100 | VIP | dashboard, VIP CTA |

## Floor and ceiling

- Score is clamped to `[0, 100]` at write time.
- Scores below 0 are stored as 0 to keep stage maths simple.

## Decay

- The `-3 for no activity in 7 days` event is the only decay mechanism.
- Decay is applied by a daily cron (within `abby-daily-report-dispatcher`) so scores reflect freshness without runtime cost.

## Overrides

Admins may override a contact's stage via `crm_contact_tags` ("VIP", "Founder Circle", etc.) without changing the numeric score. Tags take precedence in UI badges but not in counters.
