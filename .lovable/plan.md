1. Update the `author-stats` edge function so its readiness gate matches the frontend’s canonical node-readiness rules exactly.
   - File: `supabase/functions/author-stats/index.ts`
   - Keep the existing author-level fan-out logic.
   - Fix the local `hasRequiredAssets()` cases that are still stale:
     - `BA-14` should count as built when it has `activated: true`, episodes, and a show title, even without RSS yet.
     - `BA-15` should count object-shaped press releases and `target_media_outlets`, not only the older `media_list` / `outlets` fields.

2. Verify the specific root cause against Pauline Teo’s data after the change.
   - Current DB evidence shows:
     - `BA-14` is `live`, `activated: true`, has 10 episodes, and a show title.
     - `BA-15` is `live`, has a press release object, and 5 `target_media_outlets`.
   - Those two nodes are counted by the in-book hub but missed by `author-stats`, which is why the dashboard still shows `24/28` and `Build 6/9` instead of `26/28` and `Build 8/9`.

3. Deploy and validate the edge function.
   - Redeploy `author-stats`.
   - Call the deployed function and confirm `perBook` for Be SUCKcessful returns:
     - `brand: 8`
     - `build: 8`
     - `yield: 10`
     - `total: 26`

4. Re-check all UI surfaces that read from `useAuthorStats`.
   - Main dashboard multi-book picker
   - Build My Business / book selection cards
   - Any dashboard summary panels using `stats.products.perBook`
   - Confirm they now match the in-book Brand / Build / Yield tabs.

Technical note
- The mismatch is no longer about book attribution. That part was fixed.
- The remaining bug is duplicated readiness logic drifting between:
  - `src/lib/node-readiness.ts` / `useBookNodeProgress` / `useNodeLiveStats`
  - `supabase/functions/author-stats/index.ts`
- The edge function is using older BA-14 / BA-15 rules, so it undercounts exactly 2 Build nodes for this book.

If you approve, I’ll implement the edge-function fix and verify the returned per-book totals before finishing.