# 03 · AB Bug Registry

_Version 3.0 · 2026-05-01_

**Source(s) of truth:**
- Project memory + sprint history

---

Every bug ever found. Never delete entries — keep as history.

| # | Date found | Severity | Description | Sprint fixed | Status |
|---|---|---|---|---|---|
| 1 | 2026-Q1 | High | "X / 28 Live" counter drifted between 22, 26, 24 across screens | 33 | Fixed — single `node-readiness.ts` source |
| 2 | 2026-Q1 | High | Buffer API intermittently failed silently; posts not published | 37 | Fixed — Buffer removed; manual posting |
| 3 | 2026-04 | High | `temperature` overrides on `openai/gpt-5*` returned AI gateway 400 | Manus audit 2026-04-23 | Fixed — temperature param removed from all gpt-5* calls |
| 4 | 2026-04 | Medium | BA-14 marked Live with 0 episodes (just clicked Activate) | Manus audit 2026-04-23 | Fixed — strict isLive: RSS+1ep OR activated+2ep+title |
| 5 | 2026-04 | Medium | YR-25/27/28 generators failed silently | Manus audit 2026-04-23 | Verified working after fixes |
| 6 | 2026-04 | Critical | PayPal + Wise payout flows had auth edge-cases | 44 | Fixed — both rails removed; Stripe-only |
| 7 | 2026-04 | Medium | Author Stripe disconnect blocked publishing | 44 | Fixed — Stripe is payout-only, never gates publish |
| 8 | 2026-04 | Low | Microsite copy occasionally rendered em-dashes | ongoing | DB trigger `scrub_microsite_jsonb` strips on write |
| 9 | 2026-Q1 | Medium | Lead-magnet copy contained banned phrases ("next-step", "exercise") | ongoing | Copy validator runs pre-persist |
| 10 | 2026-04 | Low | Email change in PublishNow didn't sync to AB `books.owner_email` | sprint 43 | Fixed — `sync-author-email` edge function |
| 11 | 2026-05-01 | Low | Generator file paths use legacy names that don't match the node they serve (`generate-bp06-online-course` serves Workbook, `generate-bp07-coaching` serves Home Study, `generate-bp08-mastermind` serves Special Editions, `generate-bp09-speaking` serves Book Sales, `generate-ba17-upsells` serves Bundles) | open | Documented in Master Architecture §3; rename deferred to avoid breaking deployed function URLs |
| 12 | 2026-05-01 | Low | Generator `NODE_NAME` constants diverge from canonical labels: BP-09 = "Live Audience Conversion Toolkit" (canonical "Book Sales"), BA-16 = "Affiliate Programme" (canonical "Affiliates"), BA-17 = "Upsells & Bundles" (canonical "Bundles"), YR-20 = "Big Ticket Offers" (canonical "Big Ticket Consulting") | open | Documented in Master Architecture §3; fix in next generator pass — must align with `builderNodeConfig.ts` per Core memory rule |
| 13 | 2026-05-01 | Low | Counter math diverged across docs (some said 16+12=28, others implicitly 16+13=29 by including BP-00) | sprint 47 | Fixed — `01-count-business-rules-v2.md` and `05-author-vs-book-level-registry.md` now state 28 counted + 1 uncounted = 29 IDs |
| 14 | 2026-05-01 | Low | BA-13 readiness gate code comment claims "BA-13 is a paid offer" but rule does not enforce a commerce signal | open | Documented as known divergence in `02-node-readiness-gates-full-spec.md`; either tighten rule or remove comment in next sprint |

## Adding new entries

When fixing a bug:

1. Add a row to this table.
2. Reference the sprint number that fixed it.
3. Update `02-business-rules/` or `04-node-frameworks/` if the fix changes a documented rule.
4. Add a row to `04-decision-log.md` if the fix involved an architectural choice.
