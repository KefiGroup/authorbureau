

## Plan: Replace GoTrue admin lookup with `pull-shared-profile` endpoint

### Problem
The `lookupUserByEmail` helper uses the GoTrue admin API with `SHARED_BACKEND_SERVICE_ROLE_KEY`, which is returning 401 (invalid key). Instead of fixing the key, we can use the existing `pull-shared-profile` endpoint that both platforms already authenticate with `CROSS_PLATFORM_SECRET`.

### Changes to `supabase/functions/save-book/index.ts`

1. **Replace `lookupUserByEmail` helper** with a new `resolveUserViaSharedProfile` function that calls `pull-shared-profile` with `platform_secret` + `email`, returning the user ID and profile data (pen_name, bio, photo_url).

2. **Update platform_secret path (lines 82-101)**: Replace the `SHARED_BACKEND_SERVICE_ROLE_KEY` check and `lookupUserByEmail` call with `resolveUserViaSharedProfile`. Extract `userId` from the response's `primary_profile`. Also use the returned profile data to pre-populate author metadata (name, bio, photo), reducing the need for the later metadata fallback section.

3. **Update JWT dual-ID resolution path (lines 134-151)**: Replace the `lookupUserByEmail` call with `resolveUserViaSharedProfile` using `cloudUser.email`. This path also used `SHARED_BACKEND_SERVICE_ROLE_KEY`.

4. **Update author metadata fallback (lines 176-196)**: For platform pushes, use the profile data already returned by `pull-shared-profile` instead of calling `getUserById` with the service role key. This eliminates the last usage of `SHARED_BACKEND_SERVICE_ROLE_KEY` in the function.

5. **Remove unused code**: Remove the old `lookupUserByEmail` function and the `SHARED_ANON_KEY` constant (if no longer referenced by any remaining path).

### New helper function

```typescript
async function resolveUserViaSharedProfile(
  platformSecret: string,
  email: string
): Promise<{ userId: string; profile: any } | null> {
  const res = await fetch(
    "https://wuftdpnekscrsghqtssd.supabase.co/functions/v1/pull-shared-profile",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform_secret: platformSecret, email }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.primary_profile) return null;
  return { userId: data.primary_profile.user_id, profile: data.primary_profile };
}
```

### Key benefit
Eliminates all dependency on `SHARED_BACKEND_SERVICE_ROLE_KEY` in this function, using only the `CROSS_PLATFORM_SECRET` that both platforms already share and trust.

