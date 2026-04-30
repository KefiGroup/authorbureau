# Sprint 45 — GHL Total Removal

GoHighLevel was deprecated when the native ABBY Nurture Engine shipped, but the cleanup pass never ran. Three live builders still call `deploy-*-to-ghl`, the `published_pending_ghl` status string is still treated as "live" in five places, and 33 dead edge functions plus 12 orphan DB columns remain. Below is a single sweep that removes all of it safely.

## Database snapshot (live data check)

```text
author_nodes.status = 'published_pending_ghl' .... 0 rows
author_nodes.ghl_resource_id NOT NULL ............ 1 row  (legacy stub, safe to null)
author_profiles.ghl_sub_account_id NOT NULL ...... 1 row  (legacy stub, safe to null)
ghl_deployments ................................. 0 rows (empty table)
```

No production GHL state to migrate. Removal is non-breaking.

## Step 1 — Frontend: stop calling GHL

**`src/components/dashboard/builders/bp01/BP01Builder.tsx`, `bp04/BP04Builder.tsx`, `bp05/BP05Builder.tsx`**
Replace the `deploy-bpXX-to-ghl` invocation block with the native activate path already used by every other builder: write `status='live'` + `activated_at` + `microsite_url` (computed by the existing `author_nodes_autofill_delivery_url` trigger) directly to `author_nodes`. The existing `trigger_generate_asset_pack` will fire the native ABBY nurture flow on status change to `live` — no extra wiring needed.

**`src/components/dashboard/builders/shared/SharedPublishStep.tsx`**
Drop the `isPendingGhl` branch and the `published_pending_ghl` status path. Treat success purely as `status='live'`.

**`src/pages/RevenueFullDashboard.tsx`**
Remove the `sync-ghl-metrics` invocation. Stripe + native commerce events already provide the same metrics through `author-stats` and `verify-purchase`.

**`src/pages/AuthorBookPage.tsx`** (line 356)
`.in("status", ["live", "published_pending_ghl"])` → `.eq("status", "live")`.

**`src/hooks/useNodeLiveStats.ts`** (lines 26, 71) and **`src/hooks/useBookNodeProgress.ts`** (line 132)
Remove `published_pending_ghl` from the score map and from `isLiveStatus` checks.

**`src/components/dashboard/marketing-hub/SequencesTab.tsx`, `FunnelsHub.tsx`, `BusinessPlanCard.tsx`, `BusinessPlanActions.tsx`, `MarketingHub.tsx`, `ProfileEditor.tsx`, `FullPlanDialog.tsx`, `ABBYFrameworkDashboard.tsx`, `DashboardLayout.tsx`, `book-hub/JourneyStepper.tsx`, `book-hub/BookHubOverview.tsx`, `builders/shared/BuilderIntroBlock.tsx`, `builders/shared/PublishSuccessScreen.tsx`, `builders/shared/ProductDistinctionCard.tsx`, `bp02/BP02Builder.tsx`, `pages/Pricing.tsx`, `pages/AuthorSite.tsx`, `pages/ReaderContentViewer.tsx`, `pages/author-site/AuthorWhatsInsideSection.tsx`, `lib/cross-builder-registry.ts`**
Remove every remaining textual mention of "GHL", "GoHighLevel", `ghl_*` field reads, or "Funnel" copy that is GHL-rooted. Replace with the native equivalents (`microsite_url`, `payment_link`, "marketing assets", "campaign").

## Step 2 — Edge functions: delete dead deploy-to-GHL functions

Delete these 18 edge function folders (no frontend caller, no cross-function caller):

```text
supabase/functions/deploy-bp01-to-ghl/
supabase/functions/deploy-bp02-to-ghl/
supabase/functions/deploy-bp03-to-ghl/
supabase/functions/deploy-bp04-to-ghl/
supabase/functions/deploy-bp05-to-ghl/
supabase/functions/deploy-bp06-to-ghl/
supabase/functions/deploy-bp07-to-ghl/
supabase/functions/deploy-bp08-to-ghl/
supabase/functions/deploy-bp09-to-ghl/
supabase/functions/deploy-ba12-to-ghl/
supabase/functions/deploy-ba13-to-ghl/
supabase/functions/deploy-ba15-to-ghl/
supabase/functions/deploy-ba16-to-ghl/
supabase/functions/deploy-ba17-to-ghl/
supabase/functions/deploy-ba18-to-ghl/
supabase/functions/deploy-yr19-to-ghl/  …  yr20, yr21, yr22, yr23, yr24, yr26, yr28
supabase/functions/ghl-deploy-campaign/
supabase/functions/ghl-provision-author/
supabase/functions/provision-ghl-subaccount/
supabase/functions/sync-ghl-metrics/
```

(28 folders total.) Use `supabase--delete_edge_functions` to also remove them from the deployed runtime.

## Step 3 — Edge functions: scrub remaining GHL field writes

These functions stay (they're for Thinkific / Audiobook / Transistor / microsite / author-stats), but they still set `ghl_resource_id` or read `published_pending_ghl`:

- `deploy-ba10-to-thinkific`, `deploy-yr25-to-thinkific`, `deploy-ba11-audiobook`, `deploy-ba14-to-transistor` — drop `ghl_resource_id` and `ghl_subaccount_id` reads; rely on `payment_link` / `third_party_url`.
- `author-stats`, `list-my-books`, `get-microsite-page` — remove `published_pending_ghl` from the `IN (…)` filters and from response payloads.
- `microsite-action` — remove `ghl_contact_id` field write (use `crm_contacts.id` already returned).

## Step 4 — Database migration

```sql
-- Drop dead column set
ALTER TABLE public.author_nodes      DROP COLUMN IF EXISTS ghl_resource_id;
ALTER TABLE public.author_profiles   DROP COLUMN IF EXISTS ghl_api_key,
                                     DROP COLUMN IF EXISTS ghl_provision_status,
                                     DROP COLUMN IF EXISTS ghl_provisioned_at,
                                     DROP COLUMN IF EXISTS ghl_provisioning_attempts,
                                     DROP COLUMN IF EXISTS ghl_provisioning_failed,
                                     DROP COLUMN IF EXISTS ghl_sub_account_id,
                                     DROP COLUMN IF EXISTS ghl_sub_account_name,
                                     DROP COLUMN IF EXISTS ghl_campaign_ids,
                                     DROP COLUMN IF EXISTS ghl_form_ids,
                                     DROP COLUMN IF EXISTS ghl_pipeline_ids,
                                     DROP COLUMN IF EXISTS ghl_workflow_ids;
DROP TABLE IF EXISTS public.ghl_deployments;

-- Collapse the dead status onto 'live' (zero rows today, future-proofing)
UPDATE public.author_nodes SET status = 'live' WHERE status = 'published_pending_ghl';
```

`src/integrations/supabase/types.ts` will regenerate automatically after the migration, removing the orphan typings (lines 600, 629, 658, 916, 974, 1032, 3064–3092).

## Step 5 — Secrets cleanup

After the code changes ship, delete these runtime secrets from the project (no remaining caller):

- `GHL_AGENCY_KEY`
- `GHL_SUBACCOUNT_KEY`
- `GHL_API_KEY`
- `GHL_WHITELABEL_DOMAIN`

(Done via the Lovable Cloud secrets panel — no code change.)

## Step 6 — Memory updates

- Update **Core › Terminology** rule: drop "Hide GHL branding" (no longer relevant).
- Mark `mem://architecture/abby-nurture-engine-sprint28` and `mem://architecture/third-party-connector-registry-v2` to note GHL is removed entirely (no longer "deprecated", but **deleted**).
- Add new memory `mem://sprints/sprint-45-ghl-removal` documenting which fields/functions were deleted, so any future migration that finds residual `ghl_*` references knows they are intentional dead weight.

## Out of scope (for safety)

- Renaming the `ABBY` engine's "nurture" terminology — unchanged.
- Touching the `microsite_url` autofill trigger — already correct.
- Stripe Connect / Buffer / Thinkific connectors — unaffected.
- Email queue (`pgmq`) — unaffected.

## Verification after deploy

1. `rg -i "ghl|gohighlevel" src/ supabase/functions/` returns zero hits.
2. `supabase/functions/` contains no `deploy-*-to-ghl`, no `ghl-*`, no `sync-ghl-metrics`.
3. `psql -c "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND column_name LIKE '%ghl%';"` returns zero rows.
4. BP-01, BP-04, BP-05 builders activate successfully and the node lands on `status='live'` with a populated `microsite_url`.
5. Book Hub badges show ✅ Live for all previously live nodes (no regressions vs. Bug 4–6 fixes).
