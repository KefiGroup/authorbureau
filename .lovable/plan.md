# Sprint 52 — Cross-Surface Alignment Audit & Cleanup

A full sweep of `/docs`, edge function prompts, and generator internals against canonical truth (`builderNodeConfig.ts` + `_shared/canonical-node-labels.ts`) found 4 classes of drift remaining after Sprints 48–51. None of them break runtime, but they will cause Abby to recommend the wrong product, mislabel revenue streams, and confuse anyone reading the docs.

## Findings (4 categories)

### 1. Abby prompt label drift (HIGH — violates Core memory rule)

`supabase/functions/business-consultant/index.ts` — the consultation framework Abby uses to recommend revenue streams contains **two outright wrong labels** and **several legacy "Kit" phrasings**:

| Where | Says | Must say (canonical) |
|---|---|---|
| BA-11 (line ~3235) | "Home Study Course" | **Audiobook** |
| YR-28 (line ~3256) | "Sponsors & Exhibitors" | **Sponsors** |
| BA-17 (line ~3241) | "Upsells" | **Bundles** |
| BP-09 (line ~3229) | "Book Sales Strategy" | **Book Sales** |
| Phase 2 sections (~2059, 2181, 2473, 2757) | "Speaking Kit", "Affiliate Programme Kit", "JV Partnership Kit", "Mastermind Kit" | Use canonical node labels |

Direct violation of the Core memory rule: *"All ABBY prompts (business-consultant, …) MUST use these exact labels: BA-11 = Audiobook, … YR-28 = Sponsors."*

### 2. Generator prompt-body legacy phrases (MEDIUM)

Sprint 51 fixed `NODE_NAME` constants but missed prompt strings inside generators:

- `generate-bp09-book-sales/index.ts` lines 49 & 65 — still say `"Live Audience Conversion Toolkit"` in the user prompt and JSON skeleton (`kit_title`).
- `export-bp09-slides/index.ts` line 29 — fallback `kitTitle` defaults to `"Live Audience Conversion Toolkit"`.

### 3. Documentation stale paths & labels (MEDIUM)

Sprint 50 renamed 5 generator folders, but several docs were never updated:

- `docs/04-node-frameworks/BP-06.md`, `BP-07.md`, `BP-08.md`, `BP-09.md`, `BA-17.md` — all five `**Edge function:**` lines still point to legacy paths (`generate-bp06-online-course`, `generate-bp07-coaching`, etc.). The "Filename note: legacy" copy is now obsolete.
- `docs/01-architecture/03-engine-architecture-map.md` line 87 — Course Builder Engine still lists `generate-bp06-online-course`, `generate-bp07-coaching`.
- `docs/05-sprint-records/03-bug-registry.md` rows 11 & 12 — both bugs are now resolved (Sprint 50 + 51) but still marked "open".

### 4. Sprint log gap (LOW — process hygiene)

`docs/05-sprint-records/01-sprint-log-master.md` ends at Sprint 46. **Sprints 47, 48, 49, 50, 51 are missing.** Violates the `mem://process/docs-sprint-maintenance` rule ("Every sprint must update /docs/ before completion").

## What is already aligned (verified clean)

- ✅ Node count = 28 everywhere; no "29 nodes" framing in active docs.
- ✅ Platform fee = 8% consistently; "92% to author" copy locked.
- ✅ GHL fully removed from active surfaces; only intentional "removed" mentions remain.
- ✅ Tier names = Brand/Build/Yield Package; no Starter/Pro/Enterprise drift.
- ✅ Stripe-only payout rail; no PayPal/Wise references.
- ✅ Canonical labels parity test (4/4) and slug parity script (28/28) both green.
- ✅ All other 23 generators correctly resolve labels via `getCanonicalNodeLabel()`.

## Implementation Plan

### Step 1 — Fix Abby business-consultant prompts
- `BA-11 Home Study Course` → `BA-11 Audiobook`
- `YR-28 Sponsors & Exhibitors` → `YR-28 Sponsors`
- `BA-17 Upsells` → `BA-17 Bundles`
- `BP-09 Book Sales Strategy` → `BP-09 Book Sales`
- Replace Phase 2 "Kit" section titles with canonical-label phrasing (e.g., "Complete Speaking Activation", "Complete Affiliate Activation").

### Step 2 — Clean generator prompt bodies
- `generate-bp09-book-sales/index.ts`: replace both `Live Audience Conversion Toolkit` strings with `${NODE_NAME} kit` (where `NODE_NAME` is already the canonical "Book Sales").
- `export-bp09-slides/index.ts`: change fallback to `"Book Sales"`.

### Step 3 — Refresh docs to match Sprint 50/51 reality
- Update `Edge function:` line in `BP-06/07/08/09.md` and `BA-17.md` to canonical paths.
- Remove "Filename note: legacy …" sentences from those 5 framework files.
- Update `engine-architecture-map.md` line 87 to canonical paths.
- Mark bug-registry rows 11 & 12 as `Fixed` with sprint reference.

### Step 4 — Backfill sprint log
Add rows 47, 48, 49, 50, 51 to `01-sprint-log-master.md` with one-line summaries pulled from the Sprint 51 memory entry and the master architecture reference v3.3.

### Step 5 — Verify
- Re-run `bunx vitest run src/lib/__tests__/canonical-labels-parity.test.ts`
- Re-run `node scripts/check-slug-parity.mjs`
- Final `rg` sweep for: `Live Audience Conversion`, `Affiliate Programme Kit`, `JV Partnership Kit`, `Sponsors & Exhibitors`, `BA-11 Home Study`, `generate-bp06-online-course`, `generate-bp07-coaching`, `generate-bp08-mastermind`, `generate-bp09-speaking`, `generate-ba17-upsells`. All must return zero hits in `src/`, `supabase/functions/`, and active `docs/` (historical sprint records may keep mentions).

### Step 6 — Deploy & document
- Deploy `business-consultant`, `generate-bp09-book-sales`, `export-bp09-slides` (3 functions).
- Update `mem://architecture/canonical-node-labels` to add Sprint 52 to the title and note "prompt bodies + docs aligned".
- Update `docs/01-architecture/01-master-architecture-reference.md` to v3.4 with a Sprint 52 note.

## Files Touched (~13)

Edge functions (3): `business-consultant`, `generate-bp09-book-sales`, `export-bp09-slides`

Docs (8): `04-node-frameworks/{BP-06,BP-07,BP-08,BP-09,BA-17}.md`, `01-architecture/03-engine-architecture-map.md`, `01-architecture/01-master-architecture-reference.md`, `05-sprint-records/01-sprint-log-master.md`, `05-sprint-records/03-bug-registry.md`

Memory (2): `mem://architecture/canonical-node-labels`, `mem://index.md`

## Risk
Very low. All changes are string-only (no schema, no API contract changes). Only behavioral risk is Abby producing slightly different consultation copy — which is the intended fix.
