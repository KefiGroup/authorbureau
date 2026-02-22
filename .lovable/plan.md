

# Fix Profile Sync: Wrong Profile Being Selected

## Problem

The `sync-author-profile` edge function calls `pull-shared-profile` which returns **2 profiles** for `fasahath@gmail.com`. The sync blindly picks `profiles[0]` (line 201), which is an older profile ("Fasa's Wandering Mind"). The actual profile the user edited on PublishNow ("Fasa Husain" with tagline "Author, Speaker, Entrepreneur" and LinkedIn URL) is `profiles[1]` and is being completely ignored.

This means the tagline, LinkedIn URL, and correct pen name never get synced.

## Current local state

| Field | Local Value | Expected (from PublishNow) |
|-------|------------|---------------------------|
| pen_name | Fasa's Wandering Mind | Fasa Husain |
| tagline | null | Author, Speaker, Entrepreneur |
| linkedin_url | null | https://www.linkedin.com/in/fasahath-husain/ |
| bio_short | (filled from old profile) | (should match PublishNow) |

## Fix

### 1. Update `sync-author-profile/index.ts` -- Smart profile selection (line 201)

Instead of blindly picking `profiles[0]`, select the **most recently updated profile** from the array. This ensures the profile the user most recently edited on PublishNow is the one that gets synced.

Replace:
```typescript
const sharedProfile = pulled?.profiles?.[0] ?? null;
```

With logic that:
1. If only 1 profile, use it (no change in behavior)
2. If multiple profiles, pick the one with the most recent `updated_at` timestamp
3. Fallback to the first profile if no timestamps exist

### 2. Add debug logging

Add a log line showing which profile was selected and why (e.g., "Selected profile 1 of 2 (most recent: 2026-02-22)") to make future debugging easier.

### 3. Merge data from all profiles (optional enhancement)

As a secondary improvement, after selecting the primary profile, scan other profiles for any fields that the primary profile is missing. This way if one profile has a LinkedIn URL and another has a tagline, both get captured.

## Files to modify

- `supabase/functions/sync-author-profile/index.ts` -- lines 201-202: add smart profile selection logic

## What stays the same

- `mapProfileToLocal` -- already correctly maps the new top-level columns
- `smartMerge` -- works correctly once it receives the right data
- `ProfileEditor` -- no changes needed
- Database schema -- no changes needed

