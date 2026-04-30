## Goal

Confirm the YR-27 / BA-18 renderer patches actually display the missing fields in the wild, then activate the dormant content-quality infrastructure by routing generators through the new `persist-node-content.ts` helper.

## Steps

### 1. Verify renderer fixes (browser, ~3 calls)

- Navigate to `https://authorsbureau.com/pauline-teo/fundraising` and screenshot — confirm donation tier cards now show "Supporter" / "Champion" names + benefit text, and the impact line interpolates cleanly.
- Navigate to `https://authorsbureau.com/pauline-teo/partners` and screenshot — confirm JV partner cards now show `profile_type` headings with `why_good_fit` / `examples` / `revenue_model` populated.
- If anything still looks off, patch `src/pages/MicrositePage.tsx` and re-verify.

### 2. Wire YR + BA generator edge functions to `persist-node-content.ts`

The helper already exists at `supabase/functions/_shared/persist-node-content.ts` (validates JSON, scrubs, scores, logs to `content_quality_log`, then writes `generated_assets` + `author_nodes.content_json`). Right now nothing calls it.

For each generator function below, replace the direct `generated_assets` upsert + `author_nodes` update with a single `persistNodeContent({...})` call:

- `supabase/functions/generate-yr27-fundraising`
- `supabase/functions/generate-yr28-sponsors`
- `supabase/functions/generate-yr25-certification`
- `supabase/functions/generate-yr26-conference`
- `supabase/functions/generate-yr24-retreat`
- `supabase/functions/generate-ba18-partners`
- `supabase/functions/generate-ba16-affiliates`
- `supabase/functions/generate-ba15-press`

(Will read each first to confirm the exact write pattern; some may already share a helper.)

Deploy the touched functions and smoke-test one (YR-27) by re-generating Pauline's fundraising page, then querying `content_quality_log` to confirm a row was written.

### 3. Defer (next round, not this sprint)

- Backfill scoring across all existing `generated_assets` rows — needs a one-off script and a decision on whether to score historical/archived rows.
- Audit remaining low scorers (BP/BA-1x) — the YR/BA renderer fixes may already lift several of them; re-score after step 2 before deciding what to regenerate.

## Technical notes

- Generators currently write through different paths (some via `_shared/save-generated-asset.ts`, some directly). Step 2 standardises on `persist-node-content.ts` which wraps both.
- `persist-node-content.ts` logs violations to `content_quality_log` with `source = 'generator'` so they're distinguishable from the `db_trigger` rows produced by `author_nodes_scrub_content`.
- No schema changes — the table + trigger landed in the previous sprint's migrations.

## Out of scope

- New generator prompts or model changes
- UI changes to the admin Content Quality Log page
- Renderer rewrites beyond field-mapping fixes uncovered during step 1
