

## Plan: Diagnose and Fix the Stale `shouldGate` State

### Verified gate wiring (all 4 builders + BookProfileGate)

Confirmed via code inspection — no builder changes needed:

| File | Gate condition | Passes `shouldGate` to `BookProfileGate`? |
|---|---|---|
| `BA10Builder.tsx` | `shouldGate && !overrideGate` ✅ | Yes ✅ |
| `BA12Builder.tsx` (line 95) | `shouldGate && !overrideGate` ✅ | Yes (line 99) ✅ |
| `BP06Builder.tsx` | `shouldGate && !overrideGate` ✅ | Yes ✅ |
| `BP07Builder.tsx` (line 119) | `shouldGate && !overrideGate` ✅ | Yes (line 123) ✅ |

`BookProfileGate.tsx` line 41: `if (shouldGate === false) return null;` — returns null based on `shouldGate`, not `hasBook`. ✅

### Where the bug must be

The hook flow is:
1. `fetchBookContext()` calls the edge function, reads `json.bookTitle`, returns `{ ..., hasContext: !!json.bookTitle }`.
2. `useBookContext()` computes `shouldGate = !isLoading && !hasContext`.
3. Each builder renders the gate when `shouldGate && !overrideGate`.

Edge function returns `bookTitle: "Be SUCKcessful"` correctly. So one of two things is happening:

**A.** Browser is serving a stale React Query result from before the v3.4 key bump.
**B.** Hook's response parsing is dropping `bookTitle` at runtime.

### Fix

**File:** `src/hooks/useBookContext.ts`

1. Add render-time log right after `useQuery`:
   ```ts
   console.log("[useBookContext] render", {
     userId: user?.id, isLoading, data,
     hasContext: !!data?.hasContext,
     shouldGate: !isLoading && !data?.hasContext,
   });
   ```

2. Inside `fetchBookContext`, log raw edge response:
   ```ts
   const json = await res.json();
   console.log("[useBookContext] edge response:", json);
   ```

3. Make `hasContext` defensive — fall back to `book.title`:
   ```ts
   const resolvedTitle =
     (json.bookTitle && String(json.bookTitle).trim()) ||
     book?.title || null;
   return {
     bookTitle: resolvedTitle ?? "your book",
     bookId: book?.id || null,
     book,
     hasContext: !!resolvedTitle,   // any usable title clears the gate
     missingFields: json.missingFields ?? [],
     isComplete: !!json.isComplete,
   };
   ```

4. Bump `HOOK_VERSION` to `v3.5-2026-04-20-gate-diagnostic` and `queryKey` to `["book-context-v3.5", user?.id ?? "anon"]` — discards any persisted v3.4 empty cache on first render of new bundle.

### Why this resolves both possibilities

- New query key invalidates stale cached results from earlier versions (covers A).
- Defensive `hasContext` lifts the gate even if `bookTitle` is missing but `book.title` is present (covers B).
- Diagnostic logs give a definitive read of what the hook receives, so any remaining issue can be pinpointed.

### No changes to builders or BookProfileGate

Verified all 4 builders gate on `shouldGate` and pass it to `BookProfileGate`, which returns null when `shouldGate === false`. No edits needed there.

### Pass/fail verification

After Publish + hard refresh on `/node-builder/BA-10`:

1. Console: `[useBookContext] edge response: { bookTitle: "Be SUCKcessful", book: {…} }`
2. Console: `[useBookContext] render { …, hasContext: true, shouldGate: false }`
3. Gate is gone; intro reads `based on "Be SUCKcessful"`
4. Same on BA-12, BP-06, BP-07

If logs show `data: undefined` after settle → React Query not refetching; add `queryClient.clear()` on app boot.
If logs show `hasContext: true` but gate still renders → stale closure in one builder; patch that builder.

### Out of scope
- Edge function changes (returns correct payload)
- RLS, schema, onboarding changes
- Other hooks or builders

### What only the user can do
- Click **Publish → Update**
- Hard refresh (`Cmd/Ctrl+Shift+R`)
- Open BA-10 and share new console output if gate still shows

