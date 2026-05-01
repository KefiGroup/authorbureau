# 01 · AB Sprint Log — Master

_Version 3.1 · 2026-05-01_

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
| 43 | Cross-platform email sync | 2026-04 | PublishNow→AB email sync | `sync-author-email`; `email_sync_log` audit |
| 44 | Stripe-only payouts | 2026-04 | PayPal + Wise removed | Stripe Express only; admin manual fallback |
| 45 | GHL fully removed | 2026-04 | Cleanup | All GHL refs deleted from code, DB, copy |
| 46 | Documentation Sprint v3 | 2026-05-01 | Initial 6-category /docs structure | 56 markdown files; Manus framework alignment |
| 47 | Documentation Corrections | 2026-05-01 | Master registry + cross-doc alignment | Master Architecture §3 (canonical registry); all 28 node docs regenerated; counter math reconciled; legacy filename divergences logged as bugs |
| 48 | Canonical Labels — TS Guard Rail (Half A1) | 2026-05-01 | Edge-side single source of truth for node labels | `_shared/canonical-node-labels.ts`; `upsertAuthorNode` warns on label drift |
| 49 | Canonical Labels — DB Guard Rail (Half A2) | 2026-05-01 | Database enforces 28-node registry | `node_registry` table seeded with 28 rows; FKs from `author_nodes` + `purchases`; BEFORE trigger blocks unknown node IDs |
| 50 | Canonical Labels — Folder Renames (Half B) | 2026-05-01 | Generator paths match canonical labels | 5 folders renamed (bp06→workbook, bp07→home-study, bp08→special-editions, bp09→book-sales, ba17→bundles); 5 client invoke sites updated; two-phase deploy |
| 51 | Canonical Labels — Final Cleanup | 2026-05-01 | Remove all hardcoded NODE_NAME drift; add parity tests | 18 generators now use `getCanonicalNodeLabel(NODE_ID)`; `get-microsite-page` resolves slugs from `node_registry`; vitest + Node parity scripts |
| 52 | Cross-Surface Alignment Audit | 2026-05-01 | Final cleanup of Abby prompts, generator prompt bodies, docs | business-consultant labels corrected (BA-11 Audiobook, BA-17 Bundles, BP-09 Book Sales, YR-28 Sponsors); BP-09 generator + slide exporter no longer hardcode "Live Audience Conversion Toolkit"; 5 framework docs + engine map refreshed; bug rows 11+12 closed |
| 53 | Documentation High-Integrity Rewrite | 2026-05-01 | Audit + targeted rewrite of all 51+ docs; ZIP + Master PDF deliverables | All 28 node-framework docs regenerated via `scripts/build-node-framework-docs.mjs` v3.2 with 5-section technical appendix (content_json schema, edge function paths, DB tables, ABBY prompt pointers, UI source files); engine map Buffer drift purged from active-services list; sprint-log duplicate row 44 deduped; ZIP archive `authors-bureau-docs.zip` + `AB_Master_Documentation.pdf` published to `/mnt/documents/` |

## Schema of this table

- **#** — sprint number
- **Sprint** — short name
- **Date** — completion date
- **Focus** — 1-line goal
- **Key deliverables** — what shipped (link to PRs / decisions if available)

When a sprint completes, add a new row here AND ensure the relevant docs in 01–06 are updated per the maintenance rule in `/docs/README.md`.
