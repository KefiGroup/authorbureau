

# Fix BP-02 Step Persistence on Refresh

## Problem
When the user reaches the Publish step (step 3) and refreshes, the builder resets to Review (step 2). This is because:
- The node status `content_ready` always maps to step 2
- The node status `live` maps to step 4
- **There is no intermediate status or saved step** for "user has reviewed content and is on the Publish screen"

## Solution
Save the current step into `content_json` whenever the user advances beyond Review. On reload, restore the saved step instead of always defaulting to step 2 for `content_ready`.

### Changes in `BP02Builder.tsx`

1. **Save step on navigation**: When the user clicks "Next: Publish" (advancing from step 2 to step 3), persist the step to the database by updating `content_json` with `{ ...content, _currentStep: 3 }`.

2. **Restore step on load**: In the initialization effect (line 136), after loading the node:
   - If status is `content_ready` and `content_json._currentStep === 3`, set step to 3 (Publish) instead of 2.
   - Otherwise keep current behavior (step 2 for `content_ready`, step 4 for `live`).

3. **Also save on draft save**: The `handleSaveDraft` function should include the current step in the saved content.

### Files to Edit

| File | Change |
|---|---|
| `src/components/dashboard/builders/bp02/BP02Builder.tsx` | Save `_currentStep` into `content_json` on step transitions and draft saves. Restore it on load. |

No database or edge function changes needed.

