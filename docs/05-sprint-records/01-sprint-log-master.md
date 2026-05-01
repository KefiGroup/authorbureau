# 01 · AB Sprint Log — Master

_Version 3.0 · 2026-05-01_

**Source(s) of truth:**
- Project memory (`mem://sprints/*`, `mem://audits/*`)

---

Running log of every sprint. Pauline maintains; Lovable provides per-sprint summaries when this doc is updated.

| # | Sprint | Date | Focus | Key deliverables |
|---|---|---|---|---|
| 28 | ABBY Nurture Engine | 2025-Q4 | GHL replaced by native ABBY flow | Marketing Hub generate→review→go-live→nurture; `status='live'` direct to author_nodes |
| 30 | Daily.co removal | early 2026 | Drop video infra | Zoom links manual paste only |
| 33 | Counter consistency | early 2026 | Fix 22→26→24 drift | Single `node-readiness.ts` shared by 3 consumers |
| 34 | ABBY Email Engine | 2026-Q1 | Native email | 4-tab Marketing Hub; BP-01/02/05 hooks; `email_flows` schema |
| 36b | Buffer integration | 2026-Q1 | Social scheduling experiment | (rolled back in 37) |
| 37 | ABBY Social Designer | 2026-Q1 | Buffer removed; native composer | `compose-social-post` 2-step renderer; 6 templates × 5 platforms |
| 39 | Commerce Engine v1 | 2026-Q1 | MoR commerce shipped | `author_nodes` registry; 8% fee; dual webhook; `<BuyNowButton>` |
| 44 | Stripe-only payouts | 2026-04 | PayPal + Wise removed | Stripe Express only; admin manual fallback |
| 43 | Cross-platform email sync | 2026-04 | PublishNow→AB email sync | `sync-author-email`; `email_sync_log` audit |
| 44 | Stripe-only payouts | 2026-04 | PayPal + Wise removed | Stripe Express only; admin manual fallback |
| 45 | GHL fully removed | 2026-04 | Cleanup | All GHL refs deleted from code, DB, copy |
| 46 | Documentation Sprint v3 | 2026-05-01 | Initial 6-category /docs structure | 56 markdown files; Manus framework alignment |
| 47 | Documentation Corrections | 2026-05-01 | Master registry + cross-doc alignment | Master Architecture §3 (canonical registry); all 28 node docs regenerated; counter math reconciled; legacy filename divergences logged as bugs |

## Schema of this table

- **#** — sprint number
- **Sprint** — short name
- **Date** — completion date
- **Focus** — 1-line goal
- **Key deliverables** — what shipped (link to PRs / decisions if available)

When a sprint completes, add a new row here AND ensure the relevant docs in 01–06 are updated per the maintenance rule in `/docs/README.md`.
