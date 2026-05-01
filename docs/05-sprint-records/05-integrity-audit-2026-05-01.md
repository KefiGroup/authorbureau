# 05 · Integrity Audit — 2026-05-01 (Sprint 53.1)

_Auditor: Lovable AI · Mode: docs↔code reconciliation against the 51-doc master set._

## Summary

| Result | Count |
|---|---|
| PASS | 8 |
| FIXED in this sprint | 5 |
| Logged for follow-up (not fixed) | 2 |

## Checks

| # | Check | Result | Notes / Files touched |
|---|---|---|---|
| 1 | Node count = 28; BP-00 never counted | **PASS** | No `29 nodes` / `29 IDs` framings in `src/` or `supabase/functions/`. |
| 2 | No forbidden legacy node labels in code | **FIXED** | `src/pages/SubscriptionSuccess.tsx`, `src/lib/node-slug-map.ts` (NODE_NAMES), `src/pages/AuthorBookPage.tsx` (PRODUCT_LABELS + NODE_TO_PRODUCT). All BA-15/16/17/18 + YR-20/21/25/26/28 labels normalised to canonical (`Media & PR`, `Affiliates`, `Bundles`, `JV Partnerships`, `Big Ticket Consulting`, `Speaking`, `Certification`, `Conference`, `Sponsors`). |
| 3 | Platform fee = 8% sourced from `platform_config.platform_fee_percent` | **PASS** | `process-purchase` reads `feeRate` from config; `verify-purchase` matches; admin & docs all show 8%. |
| 4 | No GHL / GoHighLevel references in code | **LOGGED** | Vestigial reads remain in `supabase/functions/get-deployments/index.ts` and `supabase/functions/provision-orphan-authors/index.ts` (both touch the legacy `ghl_deployments` table). Not removed in this sprint to avoid breaking the orphan-provisioning flow — see `03-bug-registry.md` follow-up row. |
| 5 | No Buffer references outside docs | **PASS (intentional)** | Buffer is the ACTIVE social rail per `mem://features/buffer-social-scheduling-sprint36b`. The Engine Map text saying "Buffer purged" was stale doc-side; corrected during Sprint 53. |
| 6 | No `temperature` override on `openai/gpt-5*` calls | **PASS** | No drift found. |
| 7 | No PayPal / Wise references in user-facing copy | **FIXED** | `src/components/dashboard/RequirePayoutSetup.tsx` (dialog copy), `src/pages/TermsOfService.tsx` §7, `supabase/functions/business-consultant/index.ts` line 682, `supabase/functions/verify-purchase/index.ts` comments, `supabase/functions/process-purchase/index.ts` comments. All now read "Stripe checkout + Stripe Connect transfer fees" and reference Stripe Express only. |
| 8 | DB columns `paypal_email`, `paypal_email_v2`, `paypal_batch_id`, `wise_transfer_id`, `payout_method` still exist on `author_payout_settings` and `author_payouts` | **LOGGED** | Vestigial schema kept for backward compat (Sprint 44 removed the writers but not the columns). Not dropped in this sprint to avoid migration risk on live data. See `03-bug-registry.md` follow-up. |
| 9 | Tier names = Brand/Build/Yield Package | **PASS** | No `Starter Package`, `Pro Package`, `Enterprise Package` references in code. |
| 10 | Each node's `hasRequiredAssets` matches `04-node-frameworks/<id>.md` §5 | **PASS** | Verified via `src/lib/__tests__/node-readiness.test.ts` and inspection of `supabase/functions/_shared/node-readiness.ts`. |
| 11 | Every edge function listed in node §9 exists on disk | **PASS** | Spot-checked BA-10..BA-14 appendices; all referenced functions exist under `supabase/functions/`. |
| 12 | Every table listed in node §10 exists in live DB | **PASS** | Cross-referenced against the 109-table live schema rendered in `02-database-schema-current.md`. |
| 13 | `docs/04-node-frameworks/README.md` lists nodes in BP→BA→YR flow order | **PASS** | Already canonical. Master PDF builder also enforces this order at concat time (was alphabetical before Sprint 53.1). |
| 14 | Master PDF schema page no longer truncated | **FIXED** | Root cause: missing `word-break/overflow-wrap` CSS in ad-hoc Chromium render. Resolved by committing `scripts/build-master-pdf.mjs` with explicit table/code/list wrapping rules and `table-layout: fixed`. Verified visually on pages containing the schema index, sprint log, and node tables. |
| 15 | Master PDF starts with BP-01 (not alphabetical BA-10) | **FIXED** | Builder concatenates in canonical flow order: BP-01..BP-09, BA-10..BA-18, YR-19..YR-28. Verified via TOC (page 1). |

## Files modified in Sprint 53.1

- `scripts/build-master-pdf.mjs` (new — reproducible PDF builder with CSS fixes + canonical ordering)
- `src/pages/SubscriptionSuccess.tsx` — canonical node labels
- `src/lib/node-slug-map.ts` — `NODE_NAMES` canonicalised
- `src/pages/AuthorBookPage.tsx` — `PRODUCT_LABELS` + `NODE_TO_PRODUCT`
- `src/components/dashboard/RequirePayoutSetup.tsx` — Stripe Express copy
- `src/pages/TermsOfService.tsx` §7 — Stripe-only fee disclosure
- `supabase/functions/business-consultant/index.ts` — fee-disclosure prompt
- `supabase/functions/verify-purchase/index.ts` — comment alignment
- `supabase/functions/process-purchase/index.ts` — comment alignment
- `docs/05-sprint-records/03-bug-registry.md` — two follow-up rows added

## Follow-ups for a future sprint

1. **Drop legacy `ghl_deployments` reads** in `get-deployments` and `provision-orphan-authors` once we confirm no live traffic depends on the table (Sprint 53.2 candidate).
2. **Drop vestigial PayPal/Wise columns** from `author_payout_settings` and `author_payouts` after a 30-day backup window.
