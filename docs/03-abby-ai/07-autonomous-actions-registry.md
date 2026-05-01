# 07 · ABBY Autonomous Actions Registry

_Version: 2026-05-01 · Verified by Sprint 53 (audit + targeted rewrite)_

**Source(s) of truth:**
- `mem://features/abby-performance-coach-and-nudge-engine`
- `mem://architecture/abby-nurture-engine-sprint28`
- Edge function inventory: `supabase/functions/`

---

Every "ABBY does this automatically" behaviour, mapped to its trigger and the side-effect it produces.

| Trigger | ABBY action | Edge function / mechanism | Side effects |
|---|---|---|---|
| New author signs up | Seeds 28 `author_nodes` rows with status `draft` | DB trigger on `auth.users` insert | Author dashboard shows the full node grid |
| Author uploads manuscript | Runs BP-00 analysis | `generate-bp00-analysis` | Writes `generated_assets.business_plan` |
| Author lacks manuscript | Falls back to `parse-published-book` | `parse-published-book` | Same persistence |
| Author activates a node | Generates that node's content + sets `status='content_ready'` | `generate-<node-id>` | Writes `author_nodes.content_json`; cross-builder push registry fires |
| Author hits "Go Live" | Sets `status='live'` | builder UI + `bp03-node-state` etc. | Marketing Hub picks it up; readers see it |
| Lead completes quiz | Creates / updates CRM contact + scores +10 | `crm-auto-capture` | New `crm_contacts` row or score bump |
| Lead opens email | Score +2 | `crm-auto-capture` (Resend webhook) | `crm_activity_log` row |
| Lead clicks email link | Score +5 | `crm-auto-capture` | activity row |
| Sales page visited | Score +5 / +10 | client beacon → `crm-auto-capture` | activity row |
| Lead crosses score 61 | Hot-lead nudge + transactional email | `generate-nudges` | `abby_nudges` row + email |
| New sale | Celebrate nudge + revenue stat refresh | `process-purchase` + `generate-nudges` | nudge + `author_revenue_snapshots` |
| Daily 06:00 cron | Generates Daily Intelligence Report | `abby-daily-report-dispatcher` → `abby-daily-report` | email to author + dashboard tile |
| Daily 06:05 cron | Decays inactive scores by −3 | `abby-daily-report-dispatcher` | `crm_contacts.score` updates |
| Author publishes podcast episode | Auto-pushes to email list (via opt-in) | `generate-nudges` watcher | optional Email Engine campaign |
| Author goes live on a Brand product | Auto-Nurture engine starts the sequence | Marketing Hub watcher | enrols list, schedules sends |
| Cross-builder push registered | Asset auto-flows to dependent builder | `scripts` registry + `cross_builder_pushes` | downstream builder pre-fills |
| Reader completes lead magnet | Enrols in BP-01 sequence + score +10 | `enroll-subscriber` | enrolment + activity |
| Email send fails / bounces | Adds to `suppressed_emails` | `auth-email-hook` + Resend webhook | future sends skip |
| Author connects Stripe Express | Switches future payouts to automatic | `payments--enable_stripe_payments` flow | `author_payout_settings` |
| Admin approves book | Unlocks public visibility + AI deep analysis | `admin-books` action | `books.published_at` set |

## Guardrails

- ABBY never sends external messages without the author having activated the relevant node.
- All autonomous email writes route through `send-transactional-email` so unsubscribe + author-branded headers are uniform.
- All nudges are dismissible; nothing forces an author into a workflow.
