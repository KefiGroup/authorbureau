

# Consolidated Plan: Smart Profile Sync from PublishNow

## Key Insight

PublishNow is the single source of truth. Authors Bureau's local `author_profiles` and `books` tables are a **read cache** for microsites and the directory. No "push back" is needed because:

- The **ProfileEditor** already writes directly to PublishNow's shared database (line 98-101 of ProfileEditor.tsx confirms this -- it upserts to the shared `supabase` client)
- The **pull-shared-profile** endpoint on PublishNow is already live and returns profiles, documents, book_projects, and platforms
- The **CROSS_PLATFORM_SECRET** is already set in Authors Bureau's secrets

All work is on the Authors Bureau side. Nothing changes on PublishNow.

## What Already Works

- `sync-author-profile` edge function calls `pull-shared-profile` with the shared secret
- Auto-sync triggers on dashboard load (AuthorDashboard.tsx, lines 29-62)
- Manual "Sync from PublishNow" button exists in DashboardOverview
- Profile mapping covers pen_name, bio, photo, social links, genres, credentials, location, speaker info

## What Needs Improvement

The current sync **blindly overwrites** every field. If a user edits their profile on Authors Bureau (which writes to the shared backend), then syncs, the local cache gets overwritten with whatever PublishNow returns -- which should be the same data, but timing issues could cause stale overwrites.

## Implementation Steps

### Step 1: Add `last_synced_at` column to `author_profiles`

Add a timestamp column to track when the last successful sync occurred. This is local to Authors Bureau only.

```sql
ALTER TABLE author_profiles 
ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
```

### Step 2: Update `sync-author-profile` edge function with smart merging

Instead of blind upsert, the function will:

1. Fetch the existing local profile first
2. Pull data from PublishNow via `pull-shared-profile`
3. For each field: only overwrite if the local value is empty/null OR if the remote data is newer (based on the remote profile's `updated_at` vs local `last_synced_at`)
4. Set `last_synced_at` to current time after successful sync
5. Return a summary of what changed (fields updated, books synced)

Logic per field:
- If local field is empty/null: always use remote value
- If local field has a value and remote differs: use remote (since PublishNow is the source of truth and ProfileEditor writes there directly)
- Skip fields where remote value is null/empty (don't erase local data with empty remote data)

### Step 3: Improve book sync logic

For books returned from `pull-shared-profile`:
- Match by slug (already done)
- Only update fields that are non-empty in the remote data
- Don't overwrite locally-enriched fields (like `ai_enriched`, `badges`, `rating`, `review_count`) that are Authors Bureau-specific
- Set `entry_mode` to "imported" for books synced from PublishNow

### Step 4: Update DashboardOverview sync feedback

Improve the toast notification to show:
- Number of profile fields updated
- Number of books imported/updated
- Clear indication if everything was already up to date

### Step 5: Clean up unused code

- Remove the `pull-shared-profile` edge function from Authors Bureau (it exists locally but is redundant -- we call PublishNow's version)
- Remove `SHARED_BACKEND_SERVICE_ROLE_KEY` secret reference since we only need `CROSS_PLATFORM_SECRET`

## Technical Details

### Files to Modify
- `supabase/functions/sync-author-profile/index.ts` -- smart merge logic
- `src/components/dashboard/DashboardOverview.tsx` -- improved sync feedback

### Database Migration
- Add `last_synced_at` column to `author_profiles`

### Files to Delete
- `supabase/functions/pull-shared-profile/index.ts` -- redundant local copy

### No Changes Needed
- `src/components/dashboard/ProfileEditor.tsx` -- already writes to shared backend
- PublishNow backend -- already ready
- `CROSS_PLATFORM_SECRET` -- already configured

