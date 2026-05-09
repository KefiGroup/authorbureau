## Plan

1. Fix BP-03 activation so Library upload happens through the backend
- Replace the browser-side storage upload used by BP-03 Activate with a backend-owned upload path that writes the TXT asset using a service-role client.
- Keep the existing `library_asset` contract intact so BP-03 still stores the canonical asset metadata on `content_json` before publish.
- Preserve the current user-facing behavior: if upload fails, activation is blocked and the user sees a clear error.

2. Wire the backend upload into the BP-03 Activate flow
- Update the BP-03 builder so Activate calls the backend upload/register path instead of `uploadAndRegisterLibraryAsset()` directly from the browser.
- Continue passing the active `book_id` and the generated TXT payload so the saved asset stays book-scoped and shows in My Library.
- Reuse existing auth/token helpers and keep the rest of the activation sequence unchanged: upload asset -> persist node live -> write scheduled social posts.

3. Fix Funnel stage cards so override-backed stages render as Ready everywhere
- Remove the remaining direct browser read path for funnel stage overrides in the visual flow used by My Funnels cards.
- Make the flow component consume the already edge-fetched override data, or fetch overrides through the same edge-function client used elsewhere, so shared-auth/RLS never hides saved override rows.
- Keep the current readiness rule: a stage is `Ready` if it has a saved override row or all required base fields are present.

4. Validate deploy targets and refresh paths
- Ensure the affected frontend paths all use the corrected data source after save/reload, especially the card-level `NodeFunnelFlow` inside `FunnelsHub`.
- Re-deploy the affected backend function(s) and verify the production path matches the fixed implementation.

## Technical details

- Likely frontend files:
  - `src/components/dashboard/builders/bp03/BP03Builder.tsx`
  - `src/lib/publish-library-asset.ts` or a new BP-03/backend upload helper
  - `src/components/dashboard/FunnelsHub.tsx`
  - `src/components/dashboard/builders/shared/NodeFunnelFlow.tsx`
  - possibly `src/lib/funnels-api.ts`
- Likely backend files:
  - `supabase/functions/render-library-asset/index.ts` or a dedicated upload/register function if needed
- Database schema changes are probably not required unless the existing storage policies prove incomplete for non-admin author reads.

## Expected outcome

- BP-03 Activate no longer fails with `storage.objects` RLS errors and successfully writes the social kit into My Library.
- Funnel stages backed by `funnel_stage_overrides` show `Ready` instead of `Not set` in My Funnels after reload.
- Existing good fixes remain intact: BP-03 stays book-scoped and generated content quality is unchanged.