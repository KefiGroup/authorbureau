

# Update Sync Mapper for New Top-Level Columns from PublishNow

## Problem

The `mapProfileToLocal` function in `sync-author-profile/index.ts` still extracts several fields from nested JSONB (`extra_data` and `social_links`), but PublishNow has promoted these to top-level columns. Since `pull-shared-profile` returns `SELECT *`, the data now arrives as direct fields -- but the mapper ignores them and looks in the wrong places.

## Affected Fields

| Field | Old location (JSONB) | New location (top-level) |
|-------|---------------------|------------------------|
| tagline | extra_data.tagline | p.tagline |
| short_bio | (derived from p.bio) | p.short_bio |
| location_city | extra_data.location_city | p.city |
| location_country | extra_data.location_country | p.country |
| linkedin_url | social_links.linkedin | p.linkedin_url |
| amazon_author_profile_url | social_links.amazon | p.amazon_author_url |

Twitter, Instagram, YouTube remain in `social_links` JSONB -- no change needed for those.

## Changes

### 1. Update `sync-author-profile/index.ts` -- `mapProfileToLocal` function

Rewrite the mapping to read from top-level columns first (the new schema), falling back to the old JSONB paths for backward compatibility:

- `p.tagline` directly (instead of `extra_data.tagline`)
- `p.short_bio` maps to `bio_short` (instead of truncating `p.bio`)
- `p.bio` maps to `bio_long` (keep as-is)
- `p.city` maps to `location_city` (instead of `extra_data.location_city`)
- `p.country` maps to `location_country` (instead of `extra_data.location_country`)
- `p.linkedin_url` directly (instead of `social_links.linkedin`)
- `p.amazon_author_url` maps to `amazon_author_profile_url` (instead of `social_links.amazon`)
- Twitter/Instagram/YouTube still read from `social_links` JSONB (unchanged)
- `extra_data.is_speaker` and `extra_data.speaker_fee_range` still read from `extra_data` (unchanged)

### 2. Update `ProfileEditor.tsx` -- Add "Religion" genre

Add "Religion" to the `GENRE_OPTIONS` array to match the expanded genre list on PublishNow.

### 3. No database migration needed

The local `author_profiles` table already has all the necessary columns (`tagline`, `bio_short`, `location_city`, `location_country`, `linkedin_url`, `amazon_author_profile_url`). This is purely a mapping/logic fix.

## Technical Details

### Files to modify
- `supabase/functions/sync-author-profile/index.ts` -- update `mapProfileToLocal` function (lines 43-78)
- `src/components/dashboard/ProfileEditor.tsx` -- add "Religion" to GENRE_OPTIONS (line 31-34)

### What stays the same
- `smartMerge` function -- works correctly regardless of field source
- Book sync logic -- unaffected
- ProfileEditor read/write logic -- already uses correct column names since it writes directly to the shared DB
- Authentication flow -- unchanged

