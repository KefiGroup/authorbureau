

## Fix premature gate rendering during loading

The v3.5 bundle is live, but `BookProfileGate` flashes/persists while `useBookContext` is still loading because `hasContext` defaults to `false` and `shouldGate` is evaluated before the edge function resolves.

### Root cause
In `src/hooks/useBookContext.ts`, the returned `shouldGate` is `!isLoading && !hasContext`. The math is correct, but every consumer (the 18 builders) renders `<BookProfileGate shouldGate={shouldGate} ... />` without checking `isLoading` first. On first mount `isLoading` flips false very briefly between query states, and even when correct, the builders gate visually on `shouldGate` alone — so any transient `hasContext: false` shows the gate.

### Changes

1. **`src/hooks/useBookContext.ts`** — make `shouldGate` strictly false while loading and explicitly return a loading-safe shape.
   - In the unauthenticated early-return: keep `shouldGate: false, isLoading: false` (already correct).
   - Add an explicit loading branch: when `isLoading` is true, return `shouldGate: false, isLoading: true` with safe defaults (no `hasContext`-derived flags leaking through).
   - Final return (after data resolves) keeps `shouldGate = !hasContext`.

2. **All 18 builders that consume `useBookContext` + `BookProfileGate`** — add an `isLoading` guard so the gate only renders after data resolves.
   - Builders to update (BP-01..BP-09, BA-10..BA-18):
     `src/components/dashboard/builders/bp01/BP01Builder.tsx` … `bp09/BP09Builder.tsx`
     `src/components/dashboard/builders/ba10/BA10Builder.tsx` … `ba18/BA18Builder.tsx`
   - Pattern in each: destructure `isLoading` from `useBookContext()`, then render gate as `{!isLoading && shouldGate && <BookProfileGate ... />}`. While loading, show nothing (or existing skeleton if one already exists) instead of the gate.

3. **No changes** to `BookProfileGate.tsx`, edge functions, or routing. The component already returns `null` when `shouldGate === false`; the bug is upstream consumer logic.

### Verification (after publish)
- Hard refresh on a builder route (e.g. BA-10) for Pauline's account.
- Console should show `[useBookContext] render` with `isLoading: true` first (no gate visible), then `isLoading: false, hasContext: true, shouldGate: false` (no gate, builder renders).
- Bundle hash should advance past `index-CI1iIzPP.js`.

### Out of scope
- Edge function logic, query keys, or further HOOK_VERSION bumps.
- Visual redesign of the loading state (uses existing skeletons where present, otherwise renders nothing during load).

