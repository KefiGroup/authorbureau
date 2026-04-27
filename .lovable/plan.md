<final-text>## What I found

This does not look like the funnel row is being deleted.

I checked the database and the latest “missing” funnel is still there:
- `Be SUCKcessful Instant Digital Book`
- node `BP-09`
- slug `be-suckcessful-instant-book`
- status `draft`

There are currently 5 funnel rows for this author in the database, so the main failure is not creation itself — it is visibility/persistence in the dashboard after refresh.

## Root cause

The funnel UI is using the direct project database client for owner-only reads/writes:
- `FunnelsHub.tsx`
- `NodeFunnelFlow.tsx`
- `StageEditorDrawer.tsx`
- `funnel-hook.ts`
- parts of `AuthorSubpageResolver.tsx`

But this app’s sign-in/session is primarily established on the separate shared auth client (`src/lib/shared-backend.ts`, `Auth.tsx`, `SSO.tsx`).

That means:
- the funnel gets created by the backend function and appears optimistically in the UI
- then the dashboard re-queries `funnels` with the direct client
- on refresh or reload, RLS/auth can treat that client as signed out or mismatched
- result: the row “disappears” from the dashboard even though it still exists in the database

This same pattern is already acknowledged elsewhere in the codebase:
- `builder-autosave.ts`
- `publish-node.ts`
- `save-author-node` edge function

Those files already document the shared-auth vs direct-client mismatch as the reason direct owner-scoped database writes/reads become unreliable.

## Plan

1. **Move funnel owner operations behind a backend function**
   - Add a funnel management function that follows the same pattern as `save-author-node`:
     - accept shared auth JWT
     - decode/verify ownership server-side
     - use service-role access for the actual DB read/write
   - Support actions for:
     - list funnels for the signed-in author
     - read one funnel + overrides
     - save copy edits
     - save stage overrides
     - publish/pause funnel
     - regenerate funnel safely

2. **Refactor funnel UI to stop querying `funnels` directly from the browser**
   - Update `FunnelsHub.tsx`, `NodeFunnelFlow.tsx`, `StageEditorDrawer.tsx`, and `funnel-hook.ts`
   - Replace direct `.from("funnels")` reads/writes with the backend function
   - Keep optimistic UI only as temporary feedback, but always reconcile from the backend function response so refresh matches reality

3. **Keep public funnel viewing separate**
   - Public live pages can continue to read live funnel data publicly
   - Owner-only draft preview should also use the shared-auth-safe backend path so preview does not depend on the direct client having a session

4. **Audit the same pattern in nearby dashboard flows**
   - Check other “created but missing after refresh” areas that still use the direct client for owner-scoped RLS data
   - Patch the obvious repeats while touching this area, so this does not keep resurfacing in adjacent builders

5. **Validation**
   - Create funnel → refresh → confirm still visible
   - Edit funnel copy → refresh → confirm saved
   - Publish/pause → refresh → confirm status persists
   - Draft preview works for owner, hidden for public

## Technical details

Recommended architecture:

```text
Browser (shared auth JWT)
  -> backend function (ownership check)
    -> service-role DB read/write
      -> return canonical funnel state
```

Why this is the right fix:
- I cannot safely fix this by editing `src/integrations/supabase/client.ts`
- the existing codebase already uses backend-function proxies for this exact auth mismatch pattern
- the database rows are present, so the most reliable fix is to change the access path, not just add more frontend retries

## Expected outcome

After this change:
- funnel creation will survive refresh
- saved funnel edits will not “disappear”
- draft/live state will stay consistent
- the broader portal will be less prone to the same “it saved, then vanished” behavior
</final-text>