
# Discrepancy Audit — 10 May 2026

I cross-checked the three surfaces (daily ops email, Admin → Errors, Pauline's dashboard) against the live database. Here is what's real, what's misleading, and what's actually broken.

---

## 1. Daily Audit email — never delivered (real bug)

The email **did NOT actually send today**. Database state for `daily-audit-report` over the last 24h:

| status | count |
|---|---|
| pending | 3 |
| sent | 0 |

All three triggers (05:00 SGT cron, 21:00 UTC re-run, and the 08:18 manual re-run I fired earlier) are stuck in `pending` in `email_send_log`. The screenshot inbox you posted is the **previous day's** report that landed at 8:18 AM yesterday — today's never moved out of the queue.

**Likely cause:** `process-email-queue` worker / pg_cron job not draining the queue this run. This is the same class of issue documented in the email troubleshooting guide (queue not processing).

**Footer bug (cosmetic):** The email says "Audit runs daily at 07:00 UTC" but the actual cron is `0 21 * * *` (21:00 UTC = 05:00 SGT). Wrong text in the template.

---

## 2. Admin → Errors panel — looks empty but counter says "3 error" (UX bug, not a data bug)

Admin Errors screen shows:
- **Last 7 days: 3 error**
- **Table: "No errors match these filters"**

DB confirms: 3 errors in the last 7 days, **all with `resolved_at` set** (resolved). The default filter is "Unresolved", so the table is correctly empty — but the top counter is **counting resolved + unresolved together**, which makes the page look contradictory.

The daily email's "Errors (24h) — 3 error, 0 unresolved" line is the accurate framing. The Admin counter pills should also subtract resolved.

---

## 3. Pauline's dashboard "22 / 28 streams built" — undercounts by 4 vs the database

Be SUCKcessful actually has these statuses in `author_nodes`:

| Bucket | DB live | Dashboard says |
|---|---|---|
| Brand (BP-01..09) | 7 live + BP-08 draft + BP-09 content_ready | **7/9** ✓ |
| Build (BA-10..18) | **9 live** | **7/9** ✗ (off by 2) |
| Yield (YR-19..28) | **10 live** | **8/10** ✗ (off by 2) |
| Total | **26 live** | **22/28** ✗ |

**Why:** The dashboard counter routes through `author-stats` → `hasRequiredAssets()` (the canonical readiness module). 4 nodes are flagged `status='live'` in the DB but don't pass the readiness gate (missing a required deliverable / asset). The contradiction is that the same audit email reports **"Stuck-live nodes — All live nodes have valid deliverables (OK)"** — so the stuck-live check and `hasRequiredAssets()` disagree. One of them is wrong.

This is the exact "22 → 26 → 24 counter drift" class of bug called out in `node-readiness.ts` line 15. We need to identify which 4 nodes are the offenders and reconcile the two checks.

---

## 4. Canonical node-label drift (small but real)

DB has these names that don't match the canonical labels in memory:
- BA-14 stored as **"Podcast Tour"** → canonical is **"Podcast"**
- BA-16 stored as **"Affiliates"** → canonical map should confirm

Per the Sprint 48–52 enforcement memory, all node labels must come from `builderNodeConfig.ts`. These two have drifted in the DB.

---

## 5. Content-quality violations — Pauline's microsite has emdashes (real)

24h: **53 emdash violations + 2 missing_cta** (audit reported 67 because its 24h window is offset). Per the public-microsite rule, **emdashes are forbidden**. This is content on Pauline's live microsite that needs scrubbing.

---

## Summary — what's actually broken vs. cosmetic

| # | Issue | Severity | Type |
|---|---|---|---|
| 1 | Daily audit email stuck in pending queue (not delivered today) | High | Real bug |
| 2 | Dashboard 22/28 counter conflicts with stuck-live OK check | High | Real bug (data integrity) |
| 3 | 53 emdash violations on Pauline's live content | Medium | Content cleanup |
| 4 | Admin Errors counter includes resolved errors | Low | UX |
| 5 | Daily email footer says "07:00 UTC" (actual: 21:00 UTC) | Low | Copy fix |
| 6 | DB node names "Podcast Tour" / "Affiliates" drift from canonical | Low | Data hygiene |

---

## Proposed next steps (one sprint)

1. **Drain the email queue** — investigate why `process-email-queue` isn't moving `daily-audit-report` rows from pending → sent; re-run today's audit so you actually receive it.
2. **Reconcile readiness vs. stuck-live** — write a short diagnostic that lists the 4 BA/YR nodes on Be SUCKcessful where `status='live'` but `hasRequiredAssets()` returns false, then fix whichever of the two checks is wrong (single source of truth: `node-readiness.ts`).
3. **Fix Admin Errors counter** to count unresolved only (or label it "Total / Unresolved").
4. **Fix daily email footer text** to "05:00 SGT (21:00 UTC)".
5. **Backfill canonical node names** in `author_nodes` for BA-14 and BA-16.
6. **Run emdash scrubber** on Be SUCKcessful microsite content.

Want me to proceed with all six, or prioritize 1 + 2 first (the two real bugs) and queue the rest?
