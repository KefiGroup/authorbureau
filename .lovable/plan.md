## Sprint 54 — Close Final Reconciliation Drift

Closes the two items deferred from Sprint 53.2's 100% reconciliation pass. Verified via live DB + code search:

- `ghl_deployments` table **already dropped** — code references will throw if invoked.
- `author_payout_settings` has 4 vestigial PayPal/payout columns; all rows confirmed clean (zero non-Stripe values).
- Both target edge functions (`get-deployments`, `provision-orphan-authors`) have **zero callers** in `src/` or `supabase/functions/`.

### 1. Database migration — drop vestigial columns

Single migration on `public.author_payout_settings`:

```
ALTER TABLE public.author_payout_settings
  DROP COLUMN IF EXISTS payout_method,
  DROP COLUMN IF EXISTS paypal_email,
  DROP COLUMN IF EXISTS paypal_email_v2;
```

Safe because:
- `SELECT count(*) ... WHERE paypal_email IS NOT NULL OR payout_method <> 'stripe'` returned **0**.
- Code-wide `rg` for these column names returned **no hits**.
- Aligns schema with the locked "Stripe Express only" payout rail.

### 2. Remove dead edge functions

Delete (code + deployed):
- `supabase/functions/get-deployments/` — only reads the dropped `ghl_deployments` table; no callers.
- `supabase/functions/provision-orphan-authors/` — one-off backfill script for 3 named legacy users; references dropped table in its `AUTHOR_ID_TABLES` list; no callers.

Use `supabase--delete_edge_functions` to remove them from the deployed runtime, and remove their entries from `supabase/config.toml`.

### 3. Documentation updates

- Update `docs/05-sprint-records/01-sprint-log-master.md` — add Sprint 54 entry summarizing the cleanup.
- Update `docs/05-sprint-records/06-reconciliation-matrix-2026-05-01.md` — flip the two "Deferred — Sprint 54" rows to "Resolved — Sprint 54".
- Regenerate the Master Documentation artifacts:
  - `AB_Master_Documentation_v3.8.pdf`
  - `authors-bureau-docs-v3.8.zip`

### 4. Verification

After applying:
- Re-run `rg "ghl_deployments|paypal_email|payout_method"` → expect zero hits.
- Confirm `author_payout_settings` schema has only Stripe-relevant columns.
- Confirm `supabase/config.toml` function count drops from 69 → 67.

### Out of scope

- No UI changes (already cleaned in Sprint 53.2).
- No changes to commerce, payout transfer logic, or RLS policies.
- No touching the 28-node framework, prompts, or ABBY engines.

### Deliverables

- 1 migration (3-column drop)
- 2 edge functions deleted (code + runtime + config.toml)
- 2 docs updated, 2 artifacts regenerated (v3.8 PDF + ZIP)
