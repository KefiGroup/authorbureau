
## Plan: Fix `useBookContext` to Use the Same Auth Source as the Rest of the App

### Root cause (definitive)

There are **two Supabase clients** in this app, each with its own session storage:

| Client | Source | Used by |
|---|---|---|
| Shared backend | `@/lib/shared-backend` | `useAuth()` → `NodeBuilder`, profile queries, the entire signed-in UI |
| Project-local | `@/integrations/supabase/client` | `useAuthReady()` → **only** `useBookContext` |

The user signs in against the **shared backend** (Pauline's session lives there). `useAuth().user` is populated, the page renders, the name appears, `author_profiles` loads.

But `useBookContext` calls `useAuthReady()`, which calls `getSession()` on the **project-local** client. That client has no session for Pauline, so `user` is `null`, `enabled: !!user?.id` is `false`, and `queryFn` never runs. This also explains why the `[useBookContext] mount` log appears to be missing in the user's testing — under React 18 strict-mode/StrictEffects + a fast unmount path, a quickly-discarded child render with no state change can be visually swallowed; but regardless of log visibility, the gate is wrong.

This matches every observed symptom:
- `author_profiles` loads (shared client has session)
- User name renders (shared client has session)
- `author_context` is never queried (project-local hook sees no user → query disabled)
- All previous "fixes" inside `useBookContext` were correct but irrelevant — the gate upstream of them never opens

### Change

**File:** `src/hooks/useBookContext.ts`

Switch the auth source from project-local to the same client the rest of the app uses:

1. Replace `useAuthReady` (project-local) with `useAuth` (shared backend) for the `user` reference:
   - Remove: `import { useAuthReady } from "@/hooks/useAuthReady";`
   - Add: `import { useAuth } from "@/hooks/useAuth";`
   - Change: `const { user, isReady } = useAuthReady();` → `const { user } = useAuth();`

2. Keep the rest of v3.2 intact:
   - `enabled: !!user?.id`
   - `queryKey: ["book-context-v3.2", user?.id ?? "anon"]`
   - `staleTime: 0`, `gcTime: 0`, `refetchOnMount: "always"`
   - All three resolution tiers (`author_context` → direct `books` → `get-author-book` fallback)
   - Mount + `queryFn START` console logs

3. The internal `supabase.from("author_context")` call inside `fetchBookContext` already uses the project-local client — that is correct because `author_context` lives in the project-local DB and RLS policies there allow service role / matching `author_id`. The query works without the user being authenticated against the project-local client because it filters by `author_id` resolved from `author_profiles`, not by `auth.uid()`. (No RLS change needed.)

### Pass/fail verification

After Publish → Update + hard refresh on `/node-builder/BA-10`:

1. Console shows `[useBookContext] mount { hasUser: true, userId: "ef23c521-..." }`
2. Console shows `[useBookContext] queryFn START for user: ef23c521-...`
3. Console shows `[useBookContext] author_context lookup { authorId: "92326a2f-...", ctx: { book_title: "Be SUCKcessful" }, ... }`
4. Network shows a request to `author_context?author_id=eq.92326a2f-...`
5. ABBY intro text on BA-10, BA-12, BP-06, BP-07 reads `based on "Be SUCKcessful"` (not `your book`)

### Out of scope
- Consolidating the two Supabase clients (architectural cleanup; explicitly tracked in memory as a known constraint)
- Edge function, schema, RLS, or onboarding changes
- `useAuthReady` itself (still correct for components that genuinely need project-local auth)

### What only the user can do
- Click **Publish → Update**
- Sign back in (currently on `/auth`)
- Hard refresh (`Cmd/Ctrl+Shift+R`)
- Open BA-10 / BA-12 / BP-06 / BP-07 and confirm the intro text and network trace
