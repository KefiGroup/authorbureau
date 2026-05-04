## Scope

Three bugs from the audit report, strictly within BA-10 → BA-12.

## Bug 1 — BA-10 refresh-safety (Critical)

**File:** `src/components/dashboard/builders/ba10/BA10Builder.tsx`

The hydration `useEffect` (line ~43) reads the draft and restores `_currentStep`, but its dependency array is `[authorId, isAuthReady]` — missing `bookId`. When the active book changes (or the URL `bookId` param hydrates after first render), the effect doesn't re-run, so the builder stays on Step 0 with stale state.

**Fix:** Add `bookId` to the dependency array so the effect re-fires when the book context changes, re-loading the correct draft and restoring the saved step.

## Bug 2 — Step 4 label inconsistency (Minor, platform-wide)

**File:** `src/components/dashboard/builders/shared/CategoryBuilderShared.tsx` (line 8)

The shared `STEPS` array used by all BA-/YR- builders reads:
```
["Introduction", "Generating", "Review", "Activate"]
```
But the actual action button on Step 3 says **"Publish to My Site"** (confirmed in both BA-10 line 240 and BA-12 line 224).

**Fix:** Change the stepper label from `"Activate"` to `"Publish"` so the stepper word matches the button verb. (Using "Publish" rather than "Publish to My Site" keeps the stepper compact on mobile.)

## Bug 3 — BA-12 intro CTA click interception (Minor)

**File:** `src/components/dashboard/builders/ba12/BA12Builder.tsx` (line 134)

The "Design My Membership" button on the Step 0 intro card sits in the same screen region as the floating ABBY chat widget. Per the audit, the chat widget overlay can intercept clicks on this CTA.

**Fix:** Add `relative z-20` to the intro CTA's wrapping element so it sits above the chat widget's overlay layer. Pure CSS change, no behavioural impact.

## Out of scope

BA-11 (no confirmed bugs in the report), node-count discussion, and any other nodes. Nothing else will be touched.

## Verification

After changes:
1. Open BA-10 with a draft → refresh → should land on Step 2 (Review), not Step 0.
2. Open any BA-/YR- node → stepper Step 4 reads "Publish".
3. Open BA-12 intro → click "Design My Membership" → fires reliably even with chat widget visible.
