

# Use `primary_profile` from pull-shared-profile + Add Secondary Pen Names

## Summary

The `pull-shared-profile` endpoint now returns a dedicated `primary_profile` field that is guaranteed to be the correct identity. This eliminates the need for our sorting/merging workaround. We also need to update the profile mapper to handle new field names (`bio` instead of `short_bio`, `social_links` as a structured object, `profile_photo_url`).

## Changes

### 1. Simplify profile selection in `sync-author-profile/index.ts`

Replace the sorting + merging logic (lines 201-243) with:

```typescript
const sharedProfile = pulled?.primary_profile ?? pulled?.profiles?.[0] ?? null;
```

- Uses `primary_profile` directly (guaranteed single correct identity)
- Falls back to `profiles[0]` for backward compatibility
- Remove the sort/merge block and associated debug logging (no longer needed)

### 2. Update `mapProfileToLocal` for new field names

Based on the documentation, the profile object uses:
- `bio` (not `short_bio`) for the biography text
- `profile_photo_url` (not `profile_picture_url`) for the photo
- `social_links` object with keys: `twitter`, `instagram`, `goodreads`, `facebook`, `tiktok`, `youtube`, `website`
- `linkedin_url` and `amazon_author_url` as top-level fields

Update the mapper to check these field names as primary sources with existing names as fallbacks.

### 3. Add secondary pen names to AuthorProfile page (optional display)

On `src/pages/AuthorProfile.tsx`, after fetching dynamic books, also fetch secondary profiles from the sync response. Display an "Also writes as..." section below the author bio if secondary pen names exist.

This requires storing secondary pen names during sync. Add a `secondary_pen_names` JSONB column (or store in `extra_data`) on the local `author_profiles` table during sync:

```typescript
const secondaryNames = (pulled?.profiles ?? [])
  .filter(p => p.author_type === 'secondary')
  .map(p => p.pen_name);
```

### 4. Verify with a test call

After deploying, trigger a sync for `fasahath@gmail.com` and confirm:
- `primary_profile` is used (pen_name = "Fasa Husain")
- Tagline, LinkedIn, and other fields populate correctly
- No more profile sorting/selection ambiguity

## Files to modify

- `supabase/functions/sync-author-profile/index.ts` -- simplify selection to use `primary_profile`, update mapper field names
- `src/pages/AuthorProfile.tsx` -- (optional) display "Also writes as..." for secondary pen names

## What stays the same

- `ProfileEditor.tsx` -- reads from local DB, already fixed with `.order().limit(1)`
- Database schema -- no new columns needed (secondary pen names can go in existing `extra_data` JSONB)
- Auth flow -- unchanged

