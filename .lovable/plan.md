## Goal

Fix the truncated `AB_Master_Documentation.pdf` and run a documentation↔code integrity audit. **All aggregated docs (PDF, ZIP TOC, master architecture appendices) must list nodes in canonical flow order: BP-01 → BP-09, BA-10 → BA-18, YR-19 → YR-28** — never alphabetical (which incorrectly placed BA-10 first).

## Root cause of truncation

The previous PDF was rendered ad-hoc through headless Chromium with no committed stylesheet. Wide list items / table cells (the database schema page, file-path lists, code blocks) had no `word-break` rule, so anything past the right margin was clipped. Confirmed by re-rendering page 10 — `author_profiles` shows as `autho`, `(29 cols)` shows as `(29 col`.

## Part A — PDF rebuild (deterministic, committed)

1. **New file** `scripts/build-master-pdf.mjs`:
   - Concatenates all `/docs/**/*.md` in a hardcoded canonical order: README → 01-architecture → 02-business-rules → 03-abby-ai → 04-node-frameworks (README first, then **BP-01..BP-09, BA-10..BA-18, YR-19..YR-28**) → 05-sprint-records → 06-user-experience.
   - Pipes through `pandoc` (gfm) → standalone HTML, then injects a stylesheet that explicitly fixes truncation:
     - `table { table-layout: auto } th, td { word-break: break-word; overflow-wrap: anywhere; max-width: 0 }`
     - `pre, code { white-space: pre-wrap; word-break: break-all }`
     - `a, li { word-break: break-word; overflow-wrap: anywhere }`
   - Renders to PDF via `chromium --headless --print-to-pdf` at A4 with 18mm margins.
   - Outputs both `AB_Master_Documentation.pdf` (canonical) and `AB_Master_Documentation_v3.6.pdf` (versioned) into `/mnt/documents/`.
   - Warns if any `.md` exists on disk but is not in the canonical order list.

2. **Mandatory visual QA inside the loop**: render pages 1, 9, 10, 11, 12, 60, 120, 180, last to PNG; AI inspects each; if any clipping is found, tighten CSS and re-run. Repeat until clean.

3. **Reorder the node-frameworks index** (`docs/04-node-frameworks/README.md`) so it lists BP-01..YR-28 in canonical flow, not alphabetical.

4. Bump `docs/README.md` to v3.6, add Sprint 53.1 row to `docs/05-sprint-records/01-sprint-log-master.md`.

## Part B — Documentation↔Code Integrity Audit

For each of the 51 docs, run targeted greps and existence checks. Output a single new doc `docs/05-sprint-records/05-integrity-audit-2026-05-01.md` with one row per check (PASS / DRIFT / FIXED).

Checks:

| # | Check | Authoritative source |
|---|---|---|
| 1 | Node count = 28; BP-00 never counted | `01-master-architecture-reference.md` + `mem://architecture/node-count-canonical` |
| 2 | No forbidden legacy node labels in code | `mem://architecture/canonical-node-labels` |
| 3 | Platform fee = 8% sourced from `platform_config.platform_fee_percent` | `04-stripe-connection-rules.md` |
| 4 | No GHL / GoHighLevel / HighLevel references in `src/` or `supabase/functions/` | Sprint 45 + Engine Map |
| 5 | No Buffer references outside `/docs/` and Sprint 36b memory | Engine Map |
| 6 | No `temperature` override on `openai/gpt-5*` calls | `mem://architecture/lovable-ai-gateway-standard` |
| 7 | No PayPal / Wise / Payoneer references in code | `mem://features/automated-payouts-stripe-only` |
| 8 | Each node's `hasRequiredAssets` matches the §5 gate text in `04-node-frameworks/<id>.md` | `supabase/functions/_shared/node-readiness.ts` |
| 9 | Every edge function listed in node §9 exists on disk | `supabase/functions/<name>/index.ts` |
| 10 | Every table listed in node §10 exists in live DB | `information_schema.tables` |
| 11 | Every UI source path listed in node §12 exists | filesystem |
| 12 | `verify_jwt = false` for documented public functions | `supabase/config.toml` |
| 13 | `canonical-labels-parity.test.ts` and `node-readiness.test.ts` pass | vitest |
| 14 | `docs/04-node-frameworks/README.md` lists nodes in flow order, not alphabetical | grep |

## Part C — Apply DRIFT remediations

Only edits surfaced by Part B:
- Stale comments in edge functions referencing removed services → strip.
- Doc rows where appendix and code disagree → update doc to match code (code is the source of truth) AND log as a bug-registry entry only if the code itself is inconsistent with a Core memory rule.
- Reorder the node frameworks README to BP→BA→YR canonical order.

## Part D — Repackage + deliver

After Parts A–C land:

1. Re-run `node scripts/build-node-framework-docs.mjs` (regenerates 28 node docs).
2. Re-run `node scripts/package-docs.mjs` → updates `authors-bureau-docs.zip` + emits `authors-bureau-docs-v3.6.zip`.
3. Re-run `node scripts/build-master-pdf.mjs` → fresh `AB_Master_Documentation.pdf` (canonical) + `_v3.6.pdf`.
4. Visual QA on PDF pages 1, 9, 10, 11, 12, 60, 120, 180, last — confirm no clipping AND that the first node section that appears is BP-01, not BA-10.
5. Emit `<lov-artifact>` tags for the PDF + ZIP.

## Out of scope

- No app behaviour changes unless Part B surfaces a true bug (raise in `03-bug-registry.md`, do not silently change behaviour).
- No memory changes (existing rules are correct).

## Risk

Low. Part A is pure rendering; Part B is read-only audit; Part C is targeted text edits and config alignment. No DB migrations, no edge function deploys.

## Deliverables

- `scripts/build-master-pdf.mjs` (new, committed, reproducible)
- `docs/04-node-frameworks/README.md` (reordered to BP→BA→YR flow)
- `docs/05-sprint-records/05-integrity-audit-2026-05-01.md` (new audit log)
- `docs/README.md` bumped to v3.6
- `docs/05-sprint-records/01-sprint-log-master.md` Sprint 53.1 row
- `/mnt/documents/AB_Master_Documentation.pdf` (canonical, no truncation, BP-01 first)
- `/mnt/documents/AB_Master_Documentation_v3.6.pdf`
- `/mnt/documents/authors-bureau-docs-v3.6.zip`