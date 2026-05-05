# Permanent fix plan for the node intro flash

## Diagnosis
This is a coding / state-hydration race condition, not an LLM issue and not primarily a token quota issue.

Do I know what the issue is? Yes.

### What is actually happening
On refresh, most builders first render their default state:
- `step = 0`, or
- `intro = true`

Then, only after async auth/session restoration and draft loading complete, they jump to the saved step.

That is why you briefly see the Introduction screen for 2–3 seconds before the builder snaps back to the real saved page.

## Why it happens across all nodes
I found the same pattern repeated across the builder files:
- `src/components/dashboard/builders/ba10/BA10Builder.tsx`
- `src/components/dashboard/builders/ba11/BA11Builder.tsx`
- `src/components/dashboard/builders/ba12/BA12Builder.tsx`
- `src/components/dashboard/builders/ba13/BA13Builder.tsx`
- `src/components/dashboard/builders/ba14/BA14Builder.tsx`
- `src/components/dashboard/builders/ba15/BA15Builder.tsx`
- `src/components/dashboard/builders/ba16/BA16Builder.tsx`
- `src/components/dashboard/builders/ba17/BA17Builder.tsx`
- `src/components/dashboard/builders/ba18/BA18Builder.tsx`
- `src/components/dashboard/builders/bp01/BP01Builder.tsx`
- `src/components/dashboard/builders/bp04/BP04Builder.tsx`
- `src/components/dashboard/builders/bp05/BP05Builder.tsx`
- `src/components/dashboard/builders/bp07/BP07Builder.tsx`
- `src/components/dashboard/builders/bp08/BP08Builder.tsx`
- `src/components/dashboard/builders/bp09/BP09Builder.tsx`
- `src/components/dashboard/builders/yr19/YR19Builder.tsx`
- `src/components/dashboard/builders/yr20/YR20Builder.tsx`
- `src/components/dashboard/builders/yr21/YR21Builder.tsx`
- `src/components/dashboard/builders/yr22/YR22Builder.tsx`
- `src/components/dashboard/builders/yr23/YR23Builder.tsx`
- `src/components/dashboard/builders/yr24/YR24Builder.tsx`
- `src/components/dashboard/builders/yr25/YR25Builder.tsx`
- `src/components/dashboard/builders/yr26/YR26Builder.tsx`
- `src/components/dashboard/builders/yr27/YR27Builder.tsx`
- `src/components/dashboard/builders/yr28/YR28Builder.tsx`

## Root causes
### 1. Builders render before their saved state is hydrated
Most builders initialize to intro state immediately, then run async resume logic in `useEffect`.

### 2. The loading gate is attached to the wrong condition
Many builders only show their loading placeholder when this is true:
- `isAuthReady && authorId && !hydrated`

But on the first render, `isAuthReady` is often still `false`, so the loading gate does not activate yet. The intro page renders instead.

### 3. Two auth-readiness systems are involved
- `NodeBuilder.tsx` uses `useAuth()`
- many builders use `useAuthReady()`

Those can settle at slightly different times, which creates a gap where the builder mounts but has not restored its own session-dependent draft state yet.

### 4. BA-11 has an extra bug
In `src/components/dashboard/builders/ba11/BA11Builder.tsx`, the loading guard is accidentally placed inside `persistDraft()`, so it never protects the page render at all.

## Evidence from the code
- `src/pages/NodeBuilder.tsx` mounts the correct builder after user/author resolution.
- `src/hooks/useAuthReady.ts` restores auth asynchronously.
- `src/lib/builder-autosave.ts` loads saved builder state asynchronously via `loadBuilderDraft()`.
- Example builder pattern:
  - `BA10Builder.tsx`: starts at `step = 0`, then later updates from `loadBuilderDraft()`.
  - `BA11Builder.tsx`: starts with `intro = true`, then later flips to saved state.
- BP-03 is a useful reference because it already uses a dedicated `isResuming` state and avoids showing the intro while resuming.

## Implementation plan
### 1. Introduce one canonical builder hydration gate
Create a shared pattern so builders do not render intro/review/publish UI until resume is finished.

Target outcome:
- if the builder is still restoring auth or draft state, show a neutral loading skeleton/card
- only render Introduction if resume truly found no saved state
- only render Review/Publish/Live when the saved state has been loaded

### 2. Standardize all affected builders to the same resume contract
Replace the current ad hoc pattern:
- default `step = 0`
- async `useEffect`
- `hydrated` boolean
- gate requiring `isAuthReady`

With a safer pattern like:
- `isResuming = true` initially
- run resume logic once
- render loading until resume finishes
- then render either saved step or true intro

### 3. Fix BA-11 specifically
Move the misplaced loading guard out of `persistDraft()` and into the component render path.

Also keep BA-11’s existing resume normalization logic, because that part is already needed for draft/live audiobook states.

### 4. Reduce auth timing drift
Align builder hydration with the app’s canonical auth readiness so builders do not mount in a half-restored state.

Possible implementation:
- either use one shared readiness source everywhere, or
- make builder loading state independent of `isAuthReady` so it stays hidden until resume explicitly completes.

### 5. Roll the fix across all nodes
Apply the same permanent pattern to all builders that currently use the flash-prone `hydrated + isAuthReady` combination.

### 6. Verify with refresh testing
Check that on refresh:
- saved builders reopen directly on the correct step
- no intro flash appears first
- nodes with no saved state still open on Introduction normally
- BA-11 still resumes properly for live/distributed audiobook states

## Technical details
Recommended permanent approach:

```text
Builder mounts
  -> show loading shell immediately
  -> restore auth/draft state
  -> if saved content exists, jump directly to saved step
  -> else show true intro
```

This is better than trying to make `step=0` invisible after the fact.

## Files most likely to change
- `src/pages/NodeBuilder.tsx`
- `src/hooks/useAuthReady.ts` or shared builder resume helper if needed
- `src/components/dashboard/builders/ba11/BA11Builder.tsx`
- the 24 other builders using the same hydration pattern
- possibly a new shared helper/component for builder loading state

## Expected result
After this fix, refreshing any node should:
- stop showing the Introduction screen first
- resume directly on the saved step
- behave consistently across all 28 nodes instead of only some of them

<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>

<lov-actions>
<lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>