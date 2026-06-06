# Fix plan: stop the remaining node builder loops

## Goal
Apply the same anti-loop fix across every remaining node builder so long-running generation requests fail cleanly instead of leaving the UI stuck in the rotating “Generating” state.

## What I’ll change

### 1. Standardize generation calls in the remaining builders
Update the remaining builders to use one shared timeout-safe generator path instead of the current mix of:
- manual `fetchWithTimeout(...)`
- `invokeWithTimeout(...)`
- older one-off request logic

Target builders:
- BP-07, BP-08, BP-09
- BA-11 through BA-18
- YR-19 through YR-28

### 2. Use one consistent timeout/error contract
Refactor these builders to use the shared helper pattern already introduced for the earlier fixes so they all:
- enforce a real client-side timeout
- surface a friendly Abby error
- return to a recoverable state with a retry button
- avoid silent hanging while the cosmetic loading messages keep cycling

### 3. Preserve in-progress generation behavior where it already exists
For builders that already use the shared in-flight registry (`startGeneration` / `getGeneration`), keep that behavior while swapping the underlying request to the shared timeout-safe helper.

### 4. Align timeout values for heavy generators
Replace the mixed 90s / 180s / ad hoc request handling with a consistent timeout strategy for these long-running builders so the remaining nodes behave the same way as the already-fixed ones.

### 5. Verify the node set matches the audit screenshot
I’ll verify coverage against the reported remaining nodes:
- BP-07 Home Study
- BP-08 Special Editions
- BP-09 Book Sales
- BA-11 to BA-18
- YR-19 to YR-28

## Why this is the right fix
The current issue is not just “one bad node.” The remaining builders still use inconsistent generation codepaths, so some nodes can still sit in step 1 with no clean timeout/error handoff. The fix is to finish the rollout of the shared timeout-safe generation pattern across the rest of the builder set.

## Technical notes
- I found remaining builders still using custom request code rather than the shared helper.
- Several BA/YR builders rely on `invokeWithTimeout(...)` with shorter 90s limits, while BP-07/08/09 use manual `fetchWithTimeout(...)`.
- That inconsistency is the gap: the app needs one generator invocation pattern for all long-running builders.
- I’ll keep this scoped to the looping issue only, not broader architecture changes.

## Expected result
After this pass, the remaining node builders should:
- either reach Review successfully
- or fail with a visible error and retry path
- but no longer appear to loop endlessly in the generating screen

If you approve, I’ll implement the shared fix across the full remaining node set now.