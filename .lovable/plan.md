

# Fix Missing Tagline (and other fields) in Profile Sync

## Root Cause

The edge function logs show that on the very first sync, `tagline` was NOT in the list of updated fields (`pen_name, bio_short, bio_long, photo_url, website_url, genres, credentials, linkedin_url`). This means the `pull-shared-profile` endpoint is either:

1. Returning the tagline under a different field name (e.g., `headline` instead of `tagline`)
2. Not returning it at all for this profile
3. The profile on PublishNow stores tagline in a field the mapper doesn't check

Since we can't directly call `pull-shared-profile` to inspect the response, we need to add diagnostic logging to the sync function.

## Changes

### 1. Add raw profile debug logging (`sync-author-profile/index.ts`)

After profile selection (line 229), log the raw keys and specific fields of the selected profile so we can see exactly what `pull-shared-profile` returns:

```typescript
// After sharedProfile is selected, before mapping
if (sharedProfile) {
  console.log("Raw profile keys:", Object.keys(sharedProfile).join(", "));
  console.log("Raw profile tagline:", JSON.stringify(sharedProfile.tagline));
  console.log("Raw profile short_bio:", JSON.stringify(sharedProfile.short_bio));
  console.log("Raw profile city:", JSON.stringify(sharedProfile.city));
  console.log("Raw profile country:", JSON.stringify(sharedProfile.country));
  console.log("Raw profile amazon_author_url:", JSON.stringify(sharedProfile.amazon_author_url));
  console.log("Raw profile headline:", JSON.stringify(sharedProfile.headline));
}
```

Also log the mapped output:
```typescript
const mapped = sharedProfile ? mapProfileToLocal(sharedProfile) : {};
console.log("Mapped output:", JSON.stringify(mapped));
```

### 2. Add fallback field name for tagline

The PublishNow profile page might store the tagline as `headline` or `title_tagline`. Update `mapProfileToLocal` to also check these fallback names:

```typescript
const tagline = p.tagline || p.headline || p.extra_data?.tagline;
```

### 3. Deploy and trigger sync

After deploying, trigger a sync to capture the raw profile data in logs. This will tell us exactly which field names need mapping.

## Files to modify

- `supabase/functions/sync-author-profile/index.ts` -- add debug logging + tagline field name fallback

## What this achieves

- Immediate: adds `headline` fallback which may fix the issue
- Diagnostic: raw profile logging will reveal the exact field names returned by `pull-shared-profile`, allowing us to fix any remaining mismatches
