# Sprint 49 — Half A: Database-Level Node Hardening

**Goal:** Make label/ID drift on `author_nodes` (and `crm_contacts.last_node_id`) **structurally impossible** at the database layer, complementing the TS-layer guard rail shipped in Sprint 48.

**Out of scope (deferred to Sprint 50):** Renaming mismatched edge function directories.

---

## What we're building

### 1. New table: `public.node_registry` (28 rows, seed-only)

Single SQL source of truth for every node, mirrored from `supabase/functions/_shared/canonical-node-labels.ts`.

| Column | Type | Notes |
|---|---|---|
| `node_id` | text PK | e.g. `BP-09` |
| `canonical_label` | text NOT NULL | e.g. `Speaking Engagements` |
| `category` | text NOT NULL CHECK in (`brand`,`build`,`yield`) | |
| `archetype` | `node_archetype` NOT NULL | A/B/C/D |
| `microsite_slug` | text NULL | e.g. `speaking`; NULL for non-microsite nodes |
| `display_order` | int NOT NULL | 1..28 for stable ordering |
| `created_at` | timestamptz default now() | |

- RLS enabled. SELECT open to `authenticated` + `anon` (it's reference data). No INSERT/UPDATE/DELETE policies for non-admins.
- Seeded once via migration with all 28 rows, values copied from `canonical-node-labels.ts` and the slug `CASE` block in `compute_node_microsite_url`.

### 2. Foreign keys

- `author_nodes.node_id` → `node_registry.node_id` (`ON UPDATE CASCADE`, `ON DELETE RESTRICT`).
- `crm_contacts.last_node_id` → `node_registry.node_id` (`ON UPDATE CASCADE`, `ON DELETE SET NULL`).

Pre-flight: migration runs a `SELECT DISTINCT node_id FROM author_nodes WHERE node_id NOT IN (SELECT node_id FROM node_registry)` check. If anything orphaned exists, the migration aborts and surfaces the bad rows so we can clean them before adding the FK.

### 3. Trigger: force canonical label on `author_nodes`

```text
BEFORE INSERT OR UPDATE ON public.author_nodes
  → set NEW.node_name = (SELECT canonical_label FROM node_registry WHERE node_id = NEW.node_id)
```

DB-level mirror of the `upsertAuthorNode` guard rail from Sprint 48. Belt + suspenders: even raw SQL writes or future bypasses cannot poison `node_name`.

### 4. Refactor: `compute_node_microsite_url`

Replace the giant hardcoded `CASE` statement with a lookup against `node_registry.microsite_slug`. Behavior identical, but slug source-of-truth moves into the registry.

### 5. Seed parity test (read-only)

A short SQL `SELECT` migration step verifies row count = 28 and that every `(node_id, canonical_label)` pair matches the TS map exported in `_shared/canonical-node-labels.ts`. We capture the TS values into the migration as inline literals so the migration itself is the contract.

---

## Files touched

- **New migration** (one file): create `node_registry`, RLS, seed 28 rows, pre-flight orphan check, add 2 FKs, create trigger function `author_nodes_force_canonical_name()`, attach `BEFORE INSERT/UPDATE` trigger, replace `compute_node_microsite_url`.
- **No app code changes.** TS guard rail from Sprint 48 stays as-is and remains the first line of defense.
- **Docs:**
  - `docs/01-architecture/01-master-architecture-reference.md` — add "DB-Level Node Registry" subsection.
  - `mem://architecture/canonical-node-labels` — append note that DB-level FK + trigger now enforce canonical labels independently of the TS layer.

---

## Risk assessment

- **Pre-flight orphan check** prevents the FK migration from failing mid-way on bad data.
- **Trigger is `BEFORE` + idempotent** — overwriting `node_name` to its canonical value is safe even if the caller already passed the canonical value.
- **`compute_node_microsite_url` refactor** is behavior-preserving; covered by existing microsite URL generation paths (no caller changes).
- **No edge function redeploys required.** `_shared/builder-helpers.ts` still passes the canonical name; trigger is now redundant for compliant callers.
- Rollback: drop trigger, drop FKs, drop table — single revert migration if needed.

---

## Acceptance criteria

1. `node_registry` exists with exactly 28 rows; row count assertion passes in migration.
2. `author_nodes.node_id` and `crm_contacts.last_node_id` have FKs to `node_registry`.
3. Inserting a row into `author_nodes` with a wrong `node_name` results in the canonical label being stored (verified via test insert in migration tail or manual check).
4. Inserting `author_nodes` with an unknown `node_id` (e.g. `BP-99`) is rejected by FK.
5. `compute_node_microsite_url('<author>', 'BA-15')` still returns `/<slug>/press` etc. — slugs unchanged.
6. Existing Sprint 48 TS guard rail untouched and still active.
7. Docs + memory updated.

---

## What this does NOT solve (Sprint 50 candidates)

- Edge function folder names that don't match canonical IDs (e.g. `generate-yr20-big-ticket` vs label "VIP Day"). Cosmetic developer-experience issue; no longer a data-integrity risk once Half A ships.
- A typed `node_id` enum at the Postgres level (would require app-wide column type migration; FK-to-registry gives 95% of the same safety with zero app churn).
