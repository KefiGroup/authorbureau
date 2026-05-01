# Sprint 51 — Final Root-Cause Cleanup

After Sprints 48-50, the **data layer** is structurally safe (TS guard rail + DB FK + DB trigger + canonical folder names). But a focused audit found **three remaining classes of latent bugs** that the DB trigger silently masks today and that will bite the moment a label is renamed or someone reads the wrong file as the source of truth.

This sprint closes all three classes so future label/slug/folder changes flow through **one** edit, not five.

---

## What's actually still wrong

### Class 1 — 15 generators still hardcode `NODE_NAME` strings

Sprint 48 introduced `getCanonicalNodeLabel(NODE_ID)` and only 3 generators were converted (BA-16, BP-09, BA-17, YR-20). The other **15 still hardcode** the label. Five of those hardcoded strings are **already wrong vs the canonical label** — the DB trigger silently overwrites them on write, hiding the bug:

| File | Hardcoded `NODE_NAME` | Canonical (`canonical-node-labels.ts`) |
|---|---|---|
| `generate-ba14-podcast/index.ts` | `"Podcast"` | `"Podcast Tour"` |
| `generate-yr21-speaking/index.ts` | `"Keynote Speaking"` | `"Speaking"` |
| `generate-yr25-certification/index.ts` | `"Certification Programme"` | `"Certification"` |
| `generate-yr27-fundraising/index.ts` | `"Fundraising Campaign"` | `"Fundraising"` |
| `generate-yr28-sponsors/index.ts` | `"Sponsors & Exhibitors"` | `"Sponsors"` |

These wrong strings are still used in **prompt templates, log lines, returned JSON, and email subjects** sent back to the client — only the DB column is corrected. So today's authors can see "Sponsors & Exhibitors" in a generated asset while the dashboard counter says "Sponsors". That is a real, visible inconsistency.

The other 10 generators have correct hardcoded names but are landmines: rename a label and you must remember to grep+replace 10 files.

### Class 2 — Two slug maps that can silently drift

- `src/lib/node-slug-map.ts` (`NODE_SLUG_MAP`) — used by client router, `WebsiteBlueprintPage`, `AuthorBookPage`, microsite success screens.
- `node_registry.microsite_slug` (DB) — used by `compute_node_microsite_url` and `get-microsite-page` edge function (via `SLUG_TO_NODE` re-import of the TS map — actually the edge function imports the TS map by URL, see below).

Today they happen to match across all 28 nodes. There is no test or seed-parity check that enforces it. Sprint 49's parity assertion only ran inside the migration; nothing prevents a future PR from editing one side without the other.

### Class 3 — Edge function `get-microsite-page` re-imports the client TS map

`supabase/functions/get-microsite-page/index.ts` reads `SLUG_TO_NODE` from a TS file. Edge functions cannot import from `src/`, so this is duplicated somewhere — let me verify and document the actual import path, then make it canonical (read from `node_registry`) instead of duplicating.

---

## What we will change

### Step 1 — Convert the 15 remaining generators

For each of the 15 files, replace:
```ts
const NODE_NAME = "<hardcoded string>";
```
with:
```ts
import { getCanonicalNodeLabel } from "../_shared/canonical-node-labels.ts";
const NODE_NAME = getCanonicalNodeLabel(NODE_ID);
```

Files touched (15):
BP-01, BP-02, BP-03, BP-04, BP-05, BP-06, BP-07, BP-08, BA-10, BA-11, BA-12, BA-13, BA-14, BA-15, BA-18, YR-19, YR-21, YR-22, YR-23, YR-24, YR-25, YR-26, YR-27, YR-28.

(BA-16, BP-09, BA-17, YR-20 already migrated in Sprint 48.)

After this, **5 user-visible label drifts fix themselves automatically** (BA-14, YR-21, YR-25, YR-27, YR-28) — the prompts, logs, and return payloads will all start using the canonical label.

### Step 2 — Make the DB registry the single slug source of truth

- Add a tiny shared helper `supabase/functions/_shared/node-registry-slugs.ts` that **fetches** slugs from `node_registry` once per cold start (cached in module scope) instead of duplicating the TS map.
- Refactor `get-microsite-page/index.ts` to use this helper.
- Keep `src/lib/node-slug-map.ts` for the client (it can't query the DB at module load), but add a **build-time check** (`scripts/check-slug-parity.mjs`) that compares the TS map against the DB seed in the migration file and fails the build on drift. Run it from `npm test` / CI.

### Step 3 — Add a vitest parity test

Add `src/lib/__tests__/canonical-labels-parity.test.ts` that loads:
- `builderNodeConfig.ts` META[]
- `_shared/canonical-node-labels.ts` CANONICAL_NODE_LABELS

…and asserts they have the same 28 keys and matching labels. This was previously a runtime-only check.

### Step 4 — Update docs + memory

- `docs/01-architecture/01-master-architecture-reference.md` — version bump to 3.3, add Sprint 51 row, remove the "Sprint 50 candidates" deferred bullet from Sprint 49 plan, update the source-of-truth list to add the parity test + slug helper.
- `mem://architecture/canonical-node-labels` — append Sprint 51 section confirming all 28 generators now use `getCanonicalNodeLabel`, slug single-source-of-truth, and parity test.

---

## What we will NOT change (and why)

- **Folder names** — already canonical after Sprint 50.
- **DB schema** — already hardened in Sprint 49.
- **`builderNodeConfig.ts`** — it IS the UI source of truth; nothing to change.
- **The `category` mismatch** (`build` = Brand Products, `bridge` = Build Authority) — historical, intentional, documented; renaming would touch 100+ files for zero functional gain.

---

## Risk

- **15 generator file edits** — mechanical, one-line change per file, all behind the same import. Low risk. Each generator has the same `_shared/builder-helpers.ts` `upsertAuthorNode` guard rail backstopping any mistake.
- **Slug helper refactor** — only `get-microsite-page` is touched. Cached lookup is a 1-row SELECT on a 28-row table, negligible cost.
- **Parity tests** — pure additions, can only catch bugs, never cause them.
- **No DB migration needed.**

---

## Acceptance criteria

1. `rg 'const NODE_NAME\s*=\s*"' supabase/functions/generate-*` returns **zero** hits.
2. All 28 generators import and use `getCanonicalNodeLabel(NODE_ID)`.
3. New vitest parity test passes for all 28 nodes (label match between UI map and edge map).
4. New `scripts/check-slug-parity.mjs` runs cleanly and is wired into the test script.
5. `get-microsite-page` resolves slugs via `node_registry`, no TS-map import.
6. Master architecture doc updated to v3.3 with Sprint 51 entry.
7. Memory file `canonical-node-labels` updated with Sprint 51 section.

---

## After this sprint

Adding or renaming a node becomes a **3-file change**:
1. `builderNodeConfig.ts` (UI)
2. `_shared/canonical-node-labels.ts` (edge)
3. Migration row in `node_registry`

The parity test catches you if you forget step 2; the FK + trigger catch you if you forget step 3. There is no fourth place to forget.
