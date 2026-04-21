

## Goal

Make every broken builder use the exact same book-resolution path BP-01 / BP-02 / BP-05 use, since those are confirmed working for Pauline (`'Be SUCKcessful'`). Stop using the divergent `useBookContext` hook in the failing builders.

## Root cause (confirmed by audit)

| Builder | Hook used | Status for Pauline |
|---|---|---|
| BP-01, BP-02, BP-05 | `useAuthorBook` | ✅ Resolves `'Be SUCKcessful'` |
| BA-10 … BA-18, BP-03, BP-04, BP-06, BP-07, BP-08, BP-09 | `useBookContext` | ❌ Falls through to `'your book'` |

Both hooks ultimately call the same `get-author-book` edge function, but `useBookContext` adds extra layers (`shouldGate`, aggressive refetch with `staleTime: 0`, different default-state shape) that the local `useEffect`s in the failing builders are not synchronizing with correctly. The local `author_context` lookup in each broken builder runs once with `authorId` (= `author_profiles.id`), and when it returns nothing it falls back to `detectedBookTitle` from `useBookContext` — which at that render is still `"your book"` (the literal default), so the `!== "your book"` guard fails and `bookTitle` state is never populated. The effect re-run when `detectedBookTitle` later resolves does not always rehydrate cleanly because of the way `useBookContext` invalidates its own cache.

## Fix — one surgical change per builder

For each of the 15 broken builders, replace the `useBookContext` import + call with `useAuthorBook` — identical signature, identical destructuring, no other code changes:

```ts
// before
import { useBookContext } from "@/hooks/useBookContext";
const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading } = useBookContext();

// after
import { useAuthorBook } from "@/hooks/useAuthorBook";
const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading } = useAuthorBook();
```

Files updated:
- `BA10Builder.tsx`, `BA11Builder.tsx`, `BA12Builder.tsx`, `BA13Builder.tsx`, `BA14Builder.tsx`, `BA15Builder.tsx`, `BA16Builder.tsx`, `BA17Builder.tsx`, `BA18Builder.tsx`
- `BP03Builder.tsx`, `BP04Builder.tsx`, `BP06Builder.tsx`, `BP07Builder.tsx`, `BP08Builder.tsx`, `BP09Builder.tsx`

## Why this works

- `useAuthorBook` is the proven gold-standard hook — it's what `BP-01` (Pauline's working node) uses.
- The destructured shape (`hasBook`, `bookTitle`, `isLoading`) is identical to `useBookContext`, so no consumer code changes.
- `useAuthorBook`'s 5-min cache is shared across all builders — once BP-01 has resolved Pauline's book, every other builder gets the cached `'Be SUCKcessful'` instantly on mount. No re-fetch, no race, no fall-through.
- The local `author_context` lookups in each builder still run as a fast-path, but when they miss (wrong key), the fallback now correctly receives the resolved title from `useAuthorBook` instead of the `"your book"` placeholder.

## Out of scope (logged)

- BP-03 has additional `useBookContext` references inside its sub-components — only the top-level builder hook changes here.
- `useBookContext` is left in place for any other (non-builder) consumers; this plan does not delete the hook.

## Verification after deploy

For Pauline (`paulinet77@gmail.com`):
1. `/node-builder/BA-10` … `/node-builder/BA-18` — Abby intro reads `'Be SUCKcessful'`, no gate.
2. `/node-builder/BP-03`, `BP-04`, `BP-06`, `BP-07`, `BP-08`, `BP-09` — same: `'Be SUCKcessful'` in intro, no gate.
3. `/node-builder/BP-01`, `BP-02`, `BP-05` — unchanged (already working).

