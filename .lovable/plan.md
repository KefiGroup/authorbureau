

## Problem

The dashboard queries `author_profiles` and `books` using the `supabase` client from `@/lib/shared-backend` (the PublishNow database at `wuftdpnekscrsghqtssd`). But the actual data lives in the **local Lovable Cloud database** (`tubpbslfrxyfhldkcyyq`) — that's where `sync-author-profile` writes to. The shared backend returns 400/404 because those tables aren't exposed there the same way.

The user's auth session is from the shared backend, so direct client queries to the local DB also won't work (RLS `auth.uid()` won't match).

## Solution

Create a lightweight edge function `dashboard-state` on the local project that:
1. Accepts the shared backend JWT
2. Resolves the user (same pattern as `sync-author-profile`)
3. Queries `author_profiles` and `books` using the service role client
4. Returns profile status + book count

Then update `DashboardOverview.tsx` to call this edge function instead of direct table queries.

## Implementation Steps

1. **Create `supabase/functions/dashboard-state/index.ts`**
   - Accept shared backend token, resolve user via `sharedClient.auth.getUser(token)`
   - Query `author_profiles` for `directory_status, pen_name, bio_short, bio_long, photo_url, tagline, genres` where `user_id` matches
   - Query `books` count by `author_id` and `owner_email`
   - Return `{ profile, bookCount }` as JSON

2. **Update `src/components/dashboard/DashboardOverview.tsx`**
   - Replace direct `supabase.from("author_profiles")` and `supabase.from("books")` queries with a single `fetch()` call to the `dashboard-state` edge function (using `import.meta.env.VITE_SUPABASE_URL`)
   - Apply the same pattern in both `fetchState` (initial load) and `handleSyncFromPublishNow` (post-sync refresh)

## Technical Details

The edge function pattern mirrors `sync-author-profile`: authenticate via shared backend token, then use `cloudAdmin` (service role) for local DB queries. This bypasses the RLS mismatch where the user's `auth.uid()` from the shared backend doesn't exist in the local auth system.

