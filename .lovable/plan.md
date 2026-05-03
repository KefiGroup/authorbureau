## Goal
Stop the recurring generic "ABBY hit a snag" failures by removing the two main sources of intermittent breakage:
1. browser-side auth/session race conditions
2. browser-side direct writes to protected backend tables

## What I found
- The screenshot is from **BP-02 Lead Magnets**, not BA-11.
- The red message is a generic fallback from `toAbbyError()`, so it hides the real root cause.
- The project still has a mixed architecture:
  - many places already use `getActiveToken()` / `getSharedSession()` correctly
  - some critical paths still use direct `supabase.auth.getSession()` calls
  - some builders still write directly to `author_nodes` from the browser instead of using the existing safe backend proxy
- That mixed approach is why the issue feels random: sometimes auth is restored in time, sometimes it is not, and the user only sees the same generic Abby message.

## Permanent fix plan

### 1) Harden BP-02, since that is the flow currently failing
Refactor `BP02Builder.tsx` so all author-node persistence uses the existing safe backend helpers instead of direct browser writes.

Changes:
- Replace direct `author_nodes` insert/update calls for:
  - auto-save after generation
  - Save Draft
  - Review → Publish-step transition save
  - Publish flow where possible
- Route these through:
  - `autosaveBuilderDraft(...)`
  - `loadBuilderDraft(...)`
  - `publishNodeToSite(...)`
  - and a small helper for BP-02 cross-node pushes if needed

Outcome:
- no more intermittent silent RLS / identity mismatches in BP-02
- the exact screen in the screenshot becomes stable

### 2) Finish auth standardization in high-risk UI paths
Replace remaining direct `supabase.auth.getSession()` session lookups in active Abby flows with the shared token/session helpers.

Priority files:
- `src/hooks/useAbbyPlan.ts`
- `src/hooks/useMarketResearch.ts`
- `src/hooks/useBuilderGeneration.ts`
- `src/components/dashboard/social-media/ApproveStep.tsx`
- any other builder-facing flow still depending on direct session reads during mount or save/publish

Use:
- `getActiveToken()` when the code needs a bearer token
- `getSharedSession()` / `useAuthReady()` when the code needs restored user state

Outcome:
- fewer lock-contention timeouts causing null sessions
- fewer transient auth failures during refresh, mount, and step transitions

### 3) Add one reusable safe write helper for builder node updates
Create a small frontend helper around `save-author-node` so builders stop hand-writing save/update logic.

Helper responsibilities:
- save draft content for a node
- optionally save current step
- optionally save a secondary node payload (for BP-02 pushing into BP-03 / BP-04 style cases)
- return structured errors

Outcome:
- one canonical browser-to-backend path
- easier to migrate remaining builders later
- prevents the current regression pattern from coming back

### 4) Improve Abby error handling so failures are actionable, not generic
Keep the friendly Abby tone, but preserve meaningful messages for known failure classes.

Changes:
- extend `toAbbyError()` mappings for:
  - auth/session missing
  - unauthorized / forbidden
  - backend save failure
  - publish failure
  - timeout / aborted request
- in BP-02 and BA-11 flows, keep the raw error in console logging while showing a clearer user message

Example result:
- instead of only "ABBY hit a snag..."
- show something like "Your session was still restoring. Please retry in a moment." or "ABBY could not save this draft securely."

Outcome:
- support/debugging becomes faster
- users stop seeing the same vague message for unrelated problems

### 5) Verify the fix on the most failure-prone flows
After implementation, verify these flows end-to-end:
- BP-02 generate → review → save draft → publish-step navigation → publish
- BA-11 voice preview → manuscript load → chapter generation
- one social-media approve/save flow
- refresh mid-flow and confirm the session restores without false failures

## Technical details
```text
Current problem pattern
Browser UI
  -> direct getSession() during auth restore
  -> direct author_nodes writes from browser
  -> intermittent null token / protected write failure
  -> generic toAbbyError() message

Target pattern
Browser UI
  -> getActiveToken()/getSharedSession()
  -> save-author-node / publishNodeToSite helpers
  -> structured error handling
  -> stable save/publish behavior
```

## Files likely to change
- `src/components/dashboard/builders/bp02/BP02Builder.tsx`
- `src/hooks/useAbbyPlan.ts`
- `src/hooks/useMarketResearch.ts`
- `src/hooks/useBuilderGeneration.ts`
- `src/components/dashboard/social-media/ApproveStep.tsx`
- `src/lib/abby-error.ts`
- possibly one new shared helper in `src/lib/`

## Expected result
This will not just patch one screen. It will remove the architectural reason Abby keeps "hitting a snag" across builders: session-race reads and direct protected writes from the browser.