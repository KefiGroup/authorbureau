

# Fix Profile Sync: Multiple Profiles Breaking ProfileEditor

## Root Cause Analysis

The diagnostic logs revealed three distinct issues:

### Issue 1 (Critical): ProfileEditor fails silently with multiple profiles
The `fetchProfile` function in `ProfileEditor.tsx` uses `.maybeSingle()` which **throws an error when more than one row is returned**. Since this user has 2 profiles in the shared backend, the query errors out silently, and the editor displays all empty fields. This is why the Authors Bureau dashboard (image-24) shows blank fields despite data existing.

### Issue 2 (Data Issue): Tagline is empty in the shared database
The raw logs confirm: `Raw tagline: ""` -- an empty string, not null. The PublishNow UI (image-25) shows "Author, Speaker, Entrepreneur" in the Tagline field, but this value is NOT stored in the `tagline` column. This is a PublishNow-side issue -- the tagline data needs to be saved/migrated to the `tagline` column on their end.

### Issue 3 (Already Fixed): Sync data is actually correct
The local database already has the correct data synced: `pen_name: "Fasa Husain"`, `linkedin_url: "https://www.linkedin.com/in/fasahath-husain/"`, `bio_short` filled. The sync IS working -- the problem is that the ProfileEditor can't display it due to Issue 1.

## Changes

### 1. Fix ProfileEditor query to handle multiple profiles (`src/components/dashboard/ProfileEditor.tsx`)

Change the `fetchProfile` function to use `.order("updated_at", { ascending: false }).limit(1).single()` instead of `.maybeSingle()`. This ensures:
- When multiple profiles exist, the most recently updated one is loaded
- Consistent behavior with the sync function's profile selection logic

### 2. Fix the save/upsert to target the correct profile

The current `upsert` uses `onConflict: "user_id"` which may not work correctly with multiple profiles. Change saves to use `.update()` targeting the specific profile row (by `id`), falling back to `.insert()` if no profile exists.

### 3. Note for PublishNow team

The tagline field on the shared backend's `author_profiles` table is empty for this user despite the PublishNow UI showing "Author, Speaker, Entrepreneur". PublishNow needs to ensure the tagline value is persisted to the `tagline` column when saved.

## Technical Details

### Files to modify
- `src/components/dashboard/ProfileEditor.tsx` -- fix `fetchProfile` to handle multiple profiles, and fix save logic to target the correct profile row

### What stays the same
- `sync-author-profile/index.ts` -- already handles multiple profiles correctly
- Database schema -- no changes needed
- Auth flow -- unchanged

