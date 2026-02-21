

## Add Shared Backend Service Role Key and Update Sync Function

### Step 1: Add the Secret
Add a new secret called `SHARED_BACKEND_SERVICE_ROLE_KEY` with the value you copied from the PublishNow.io Supabase dashboard (Settings > API > Service Role Key).

### Step 2: Update the Edge Function
Modify `supabase/functions/sync-author-profile/index.ts` to use the service role key instead of the anon key when querying the shared backend. This bypasses RLS and allows the function to read author profiles directly.

### Technical Details

**File to modify:** `supabase/functions/sync-author-profile/index.ts`

Changes:
1. Read `SHARED_BACKEND_SERVICE_ROLE_KEY` from environment variables
2. Use it in the `Authorization` header (as `Bearer <service_role_key>`) or as the `apikey` when querying the shared backend's REST API
3. Query `author_profiles` by `user_email` using the service role key, which bypasses RLS entirely
4. Remove the multi-strategy fallback logic since service role access makes it unnecessary

**Key code change:**
```typescript
const SERVICE_ROLE_KEY = Deno.env.get("SHARED_BACKEND_SERVICE_ROLE_KEY");

// Use service role key to bypass RLS on shared backend
const headers = {
  apikey: SHARED_ANON_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

const url = `${SHARED_BACKEND_URL}/rest/v1/author_profiles?user_email=eq.${encodeURIComponent(email)}&select=*`;
const res = await fetch(url, { headers });
```

### Step 3: Deploy and Test
The edge function will be redeployed automatically. Refreshing the dashboard will trigger the sync and should now successfully pull Pauline's profile data (bio, photo, etc.) from PublishNow.io.

