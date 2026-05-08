## Why Veronica's profile shows "Please set up your author profile first"

Her profile **does exist** — I confirmed it in the database:

```
pen_name: Veronica Tan
slug: veronica-tan
user_id: 96dd5490-aa66-4641-a2b5-b96c0f2e8b83
```

The empty message is a **lookup failure**, not a missing profile. It's the same family of bug as the "portal cannot save the book" issue from earlier — a cross-backend mismatch.

### Root cause

`src/pages/NodeBuilder.tsx` (lines 88-107) tries to find the author profile by querying the database **directly from the browser**:

```ts
supabase.from("author_profiles").select("id").eq("user_id", user.id) // local Cloud
// then fallback:
sharedSupabase.from("author_profiles").select("id").eq("user_id", user.id) // shared backend
```

Veronica's profile row lives in **Lovable Cloud** (this project's DB), but her **session token is issued by the shared PublishNow backend**. Lovable Cloud's RLS sees a JWT whose `auth.uid()` doesn't match anyone in its `auth.users`, so the row is silently filtered out. The shared-backend fallback also returns nothing because the row isn't there. Result: `authorId = null` → "Please set up your author profile first."

This will happen for **every author whose account was created on PublishNow**, which is the standard Route 1 onboarding path. So yes — this is a permanent issue until the lookup is fixed.

### Fix

Stop doing the browser-direct lookup. Route it through an edge function that uses the service role (the same pattern we already use everywhere else for cross-backend reads, e.g. `save-author-profile`, `get-author-book`).

1. **`src/pages/NodeBuilder.tsx`** — replace the two `from("author_profiles")` queries with a call to `save-author-profile` with `action: "fetch"` (it already exists, already handles the dual-token resolver, and returns the profile). Use `profile.id` as `authorId`.

2. **Quick sanity sweep** — confirm no other top-level page does the same browser-direct `author_profiles` lookup. If found, route them through the same edge function. (The 28 builder files themselves all receive `authorId` as a prop from `NodeBuilder`, so fixing `NodeBuilder` fixes all of them at once.)

3. **No DB changes, no migrations, no schema changes.** Pure client → edge-function refactor.

### Expected outcome

- Veronica (and every other PublishNow-originated author) lands on any node builder and sees the builder UI immediately.
- The "Please set up your author profile first" screen only ever appears for accounts that genuinely have no `author_profiles` row.
