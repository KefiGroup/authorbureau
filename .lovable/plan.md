## Sprint 53.2 — 100% Code-Doc Reconciliation Pass

Goal: produce a definitive pass/fail matrix proving (or disproving) that every claim in the 51-page master documentation is backed by live code, deployed edge functions, real DB tables, and routable UI paths — and remediate every drift found.

### Scope (the full surface)
- 152 edge functions in `supabase/functions/`
- 110 public DB tables + DB functions/triggers
- 28 node framework docs (BP-01 → YR-28) + 6 doc sections (architecture, business-rules, abby-ai, node-frameworks, sprint-records, user-experience)
- All UI routes registered in `src/App.tsx` / router
- All secrets, storage buckets, and connectors

### Phase 1 — Build the inventories (read-only)
1. **Edge function inventory**: parse every `supabase/functions/*/index.ts` for name + http verbs + auth requirement + `verify_jwt` setting in `supabase/config.toml`.
2. **DB inventory**: dump tables, columns, RLS status, policies, triggers, functions via `supabase--read_query`.
3. **UI route inventory**: parse `src/App.tsx` and any nested router files.
4. **Doc claim extraction**: for each of the 51 docs, regex-extract every reference to:
   - edge function names (anything matching `[a-z][a-z0-9-]+` after "edge function", "function", or in code blocks)
   - table names (after `public.` or in SQL blocks)
   - node IDs (BP-/BA-/YR-)
   - UI routes (anything matching `/[a-z-]+`)
5. Persist all inventories to `/tmp/recon/` as JSON.

### Phase 2 — Cross-reconciliation (read-only)
For each documented claim, mark **PASS / FAIL / DRIFT** in a matrix:
- Doc says function X exists → does `supabase/functions/X/` exist? Is it deployed?
- Doc says table Y has columns Z → does live schema match?
- Doc says route /R exists → is it in the router?
- Doc references node N → is N in `builderNodeConfig.ts` AND `node_registry`?
- Forbidden-term sweep: `rg -i "ghl|paypal|wise|29 nodes|BP-00 through|Live Audience Conversion|Affiliate Programme Kit|Speaking Kit|Mastermind Kit|Upsells & Bundles|Sponsors & Exhibitors"` across `src/`, `supabase/functions/`, and `docs/`.
- Reverse direction: every deployed function / live table that is NOT mentioned in any doc → flagged as "undocumented".

Output: `docs/05-sprint-records/06-reconciliation-matrix-2026-05-01.md` with full pass/fail table + counts.

### Phase 3 — Remediate every FAIL/DRIFT
Categorise findings into three buckets and act on each:

1. **Doc-side drift** (doc claims something that is no longer true) → edit the doc to match reality.
2. **Code-side drift** (code violates a documented rule, e.g. legacy term in a string, wrong fee value, missing canonical label) → fix the code.
3. **Genuine gap** (documented feature missing from code, or undocumented function) → log as a follow-up sprint item in `docs/05-sprint-records/01-sprint-log-master.md`. Do NOT silently build new features in this sprint — only fix what should already exist.

For Phase 3 specifically I will:
- Patch any remaining legacy strings (`PayPal`, `Wise`, `GHL` outside vestigial DB column names) found in `src/` or `supabase/functions/`.
- Update doc files where reality has moved (e.g. add Buffer to Engine Architecture Map if missing, update node label drift, fix table/column references).
- Append an "Undocumented surface" appendix to the matrix listing every edge function and table that exists but is not referenced anywhere in `/docs/`.

### Phase 4 — Re-verify and rebuild artifacts
1. Re-run forbidden-term sweep — must return zero hits in `src/` and `supabase/functions/`.
2. Re-run inventory diff — pass/fail matrix must show 100% PASS or explicit "deferred to follow-up sprint" with reason.
3. Rebuild `AB_Master_Documentation_v3.7.pdf` and `authors-bureau-docs-v3.7.zip` using the existing `scripts/build-master-pdf.mjs` so the user gets a fresh, fully-aligned package.
4. Update memory index with the new reconciliation rule (matrix must be re-run before any future sprint claims "fully aligned").

### Deliverables
- `docs/05-sprint-records/06-reconciliation-matrix-2026-05-01.md` — full pass/fail matrix with counts per category.
- `/mnt/documents/AB_Master_Documentation_v3.7.pdf` — fresh master PDF with all corrections applied.
- `/mnt/documents/authors-bureau-docs-v3.7.zip` — fresh ZIP archive.
- Updated `docs/05-sprint-records/01-sprint-log-master.md` with Sprint 53.2 entry + any follow-up gaps logged.
- Concise summary in chat: counts of PASS / FAIL-fixed / DRIFT-fixed / deferred-with-reason.

### Honesty guardrails
- I will NOT claim "100% aligned" unless the matrix shows zero unexplained FAILs.
- Every undocumented edge function will appear in the appendix even if it's healthy — silence is not alignment.
- Every deferred item will have a written reason (e.g., "vestigial DB column, removal scheduled for Sprint 54 to avoid migration risk").

### Technical notes
- All Phase 1 + 2 work is read-only (`rg`, `code--view`, `supabase--read_query`).
- Phase 3 edits stay within `docs/`, `src/`, and `supabase/functions/`. No DB schema changes in this sprint — any required migrations are logged as follow-ups.
- PDF rebuild uses the existing `scripts/build-master-pdf.mjs` (already canonical-ordered BP-01 → YR-28).
- Estimated tool calls: ~60-100 (heavy on `rg` and `read_query`, light on edits).
