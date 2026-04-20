
## Plan: Drop `isReady` Guard from `useBookContext` Query

### Root cause
`useAuthReady` returns `isReady = false` in the node builder context even though `user` is fully populated and authenticated. The `enabled: isReady && !!user` condition in `useBookContext` therefore never flips to `true`, so `queryFn` never runs and `author_context` is never queried.

Other parts of the app prove the user is available: `author_profiles` loads, the user's name renders, subscription is checked. Only the book-context query is gated incorrectly.

### Change

**File:** `src/hooks/useBookContext.ts`

Single edit in the `useQuery` config:

- Before: `enabled: isReady && !!user`
- After: `enabled: !!user?.id`

Also update the early-return guard so it no longer hides the loading state behind `isReady`:

- Before: `if (!isReady || !user) { ... isLoading: !isReady ... }`
- After: `if (!user) { ... isLoading: false ... }`

Keep all other v3.2 logic intact:
- `queryKey: ["book-context-v3.2", user?.id ?? "anon"]`
- `staleTime: 0`, `gcTime: 0`, `refetchOnMount: "always"`
- All three resolution tiers (`author_context` → direct `books` → `get-author-book` edge fallback)
- Diagnostic mount + `queryFn START` logs

### Pass/fail verification

After Publish → Update + hard refresh:

1. Console shows `[useBookContext] mount { isReady: false, hasUser: true, ... }` — confirms the bug, but
2. Console shows `[useBookContext] queryFn START for user: ef23c521-...` — proves the gate is removed
3. Network shows `author_context?author_id=eq.92326a2f-...` — the query now fires
4. ABBY intro on BA-10, BA-12, BP-06, BP-07 reads `based on "Be SUCKcessful"`

### Out of scope
- `useAuthReady` itself (separate investigation — the hook works for auth checks elsewhere; only this query consumer needs to relax the gate)
- Edge function, schema, or onboarding changes

### What only the user can do
- Click **Publish → Update**
- Hard refresh (`Cmd/Ctrl+Shift+R`)
- Confirm the four builders show the real title
