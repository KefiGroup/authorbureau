
Implement the approved rebuild-forcing change first, then stop and verify the bundle hash before touching anything else.

### Confirmed current state
- `src/main.tsx` still imports `App` from `./App.tsx` and only has the old comment cache marker.
- `src/App.tsx` does not yet import anything from `main.tsx`.
- `useBookContext` is already on `v3.5-2026-04-20-gate-diagnostic` with the logging and defensive title resolution in place.
- All four builders already use `shouldGate && !overrideGate` from `useBookContext()`:
  - `BA10Builder.tsx`
  - `BA12Builder.tsx`
  - `BP06Builder.tsx`
  - `BP07Builder.tsx`
- `BookProfileGate` already receives `shouldGate` as a prop and returns `null` when `shouldGate === false`.

### Primary implementation
1. Update `src/main.tsx`
   - Add:
     ```ts
     export const BUILD_TIMESTAMP = "2026-04-20T10:18:00Z";
     ```
   - Keep the existing render flow intact.

2. Update `src/App.tsx`
   - Import:
     ```ts
     import { BUILD_TIMESTAMP } from "./main";
     ```
   - Change `App` to a block-body component and log:
     ```ts
     console.log("Build:", BUILD_TIMESTAMP);
     ```
   - Do not change routing or providers.

### Publish verification
After implementation:
1. Publish the update.
2. Hard refresh.
3. Confirm both:
   - bundle hash changes from `index-CPacRwTL.js`
   - console shows `Build: 2026-04-20T10:18:00Z`

4. Then verify the existing `useBookContext` logs:
   - edge response contains `bookTitle: "Be SUCKcessful"`
   - render log shows `hasContext: true`
   - render log shows `shouldGate: false`

5. Confirm BA-10, BA-12, BP-06, and BP-07 no longer show the Add Your Book gate.

### Required escalation if hash still does not change
If the publish still serves `index-CPacRwTL.js`, stop normal debugging and perform only the cache-escalation steps below. Do not make unrelated code changes.

1. Clear build caches if accessible
   - remove `node_modules/.vite`
   - remove `.vite`

2. Force resolver churn on the app entry
   - rename `src/App.tsx` to `src/AppRoot.tsx`
   - update `src/main.tsx` import to `./AppRoot.tsx`
   - then rename it back and restore the import if needed as part of the same forced-refresh sequence

3. Add a second explicit runtime dependency
   - create `src/build-info.ts` with:
     ```ts
     export const BUILD_ID = "v3.5-${Date.now()}";
     ```
   - import `BUILD_ID` in both `src/main.tsx` and `src/App.tsx`
   - log it alongside `BUILD_TIMESTAMP`

### Success criteria
The only success condition for this pass is a new published bundle hash. Once that changes, the already-implemented v3.5 hook diagnostics can be trusted and the gate behavior can be re-validated.

### Out of scope
- No builder logic changes unless a rebuilt bundle still proves a specific builder is ignoring `shouldGate`
- No edge function changes
- No broader client architecture cleanup
