# 01 · AB Count Business Rules (v2)

_Version: 2026-05-01 · Verified by Sprint 53 (audit + targeted rewrite)_

**Source(s) of truth:**
- `supabase/functions/_shared/node-readiness.ts`
- `src/lib/__tests__/node-readiness.test.ts`

---

## 1. The Universe — 28 nodes

There are exactly **28 revenue nodes** in the system: BP-01 → BP-09, BA-10 → BA-18, YR-19 → YR-28. Every counter denominates to **28**.

Canonical source: `src/components/dashboard/builders/builderNodeConfig.ts` and the master registry in [`01-architecture/01-master-architecture-reference.md`](../01-architecture/01-master-architecture-reference.md) §3.

> **Note on `BP-00`:** `generate-bp00-analysis` is an internal pre-step that writes the per-book `author_context` row consumed by every framework generator. It is NOT a node — no builder UI, no `author_nodes` row, no readiness gate, no Live status. See master reference §3a. Never count it.

## 2. Author-level vs Book-level scoping

Some nodes apply across the author's entire library (one email list, one podcast, one social presence). Others are book-specific (microsite, workbook, audiobook).

| Group | Count | IDs |
|---|---|---|
| Author-level | 16 | BP-01, BP-03, BA-14, BA-15, BA-16, BA-18, YR-19 through YR-28 |
| Book-level | 12 | BP-02, BP-04, BP-05, BP-06, BP-07, BP-08, BP-09, BA-10, BA-11, BA-12, BA-13, BA-17 |
| **Total** | **28** | |

Defined in `AUTHOR_LEVEL_NODES` set in `supabase/functions/_shared/node-readiness.ts`. The author-level / book-level split for `05-author-vs-book-level-registry.md` matches this table exactly.

## 3. Two-Gate Live Rule

A node only counts as **Live** on any UI counter when both gates pass:

1. **Status gate**: `author_nodes.status = 'live'`
2. **Readiness gate**: `hasRequiredAssets(nodeId, content_json)` returns `true`

If gate 2 fails, the dashboard shows the node as "in progress" even if the row says live. The diagnostic `warnIfStuckLive` logs a warning in dev / edge function logs whenever a row drifts.

## 4. Counter Consistency Contract

Every consumer of "X / 28 Live" MUST import `hasRequiredAssets` from the **single shared module**:

- Edge function: `supabase/functions/_shared/node-readiness.ts`
- Frontend: re-exported via `src/lib/node-readiness.ts`

Forking this rule into a second file is what caused the historical 22 → 26 → 24 counter bug (Sprint 33). Never duplicate.

## 5. Per-node Readiness Gates

Full table in `02-node-readiness-gates-full-spec.md`. Special-gate nodes (richer rules):

- BP-01, BP-03, BP-04, BP-06, BP-07, BP-09
- BA-10, BA-11, BA-12, BA-13, BA-14, BA-15, BA-17
- YR-19 through YR-28 (commerce + session-style sub-rule)

All other nodes use the **generic gate**: any non-empty `content_json` object passes. This is intentional — the builders for those nodes save substantial content_json on every save, so a stricter gate would create false negatives.

## 6. Commerce Nodes — informational only

`COMMERCE_NODES` enumerates nodes that bear paid offers. **It does NOT gate Live status.** Reader payments always flow to the platform Stripe account regardless of author Stripe Express setup. See `04-stripe-connection-rules.md`.

## 7. Change-Management Rule

Adding or changing a readiness rule requires:

1. Edit `supabase/functions/_shared/node-readiness.ts` only.
2. Add or update tests in `src/lib/__tests__/node-readiness.test.ts`.
3. Update `02-node-readiness-gates-full-spec.md` in the same PR.
4. Add a row to `05-sprint-records/04-decision-log.md` if the rule changes economics or counter math.
