

# Pull PublishNow Bio and Build Test Microsite

## Overview
Create a lightweight backend function to pull the profile for `fasahath@gmail.com` from the PublishNow shared backend (using the updated service role key), populate the local author profile, and provide a preview link to the microsite.

## Steps

### 1. Create a test edge function `pull-shared-profile`
- Accepts `{ email }` in the request body (no user auth required -- admin/test use only)
- Queries the shared PublishNow backend's `author_profiles` table using the `SHARED_BACKEND_SERVICE_ROLE_KEY`
- Also queries shared backend's `books` table for any books linked to that author
- Returns the raw data so we can see exactly what's available

### 2. Call the function and inspect the data
- Invoke `pull-shared-profile` with `fasahath@gmail.com`
- Review what profile fields and books exist on PublishNow

### 3. Populate local database
- Upsert the profile data into the local `author_profiles` table for user `ffbc179a-1643-4326-9f3d-a6b7543e178f`
- Create book record(s) in the local `books` table with a slug but **without** setting `published_at` (keeping it as a draft so it's not live)

### 4. Provide the preview link
- The microsite will be accessible at the preview URL: `https://id-preview--c2e1ba1c-5e42-4849-98d6-5cc3568fa242.lovable.app/books/{slug}`
- Since you said not to publish, `published_at` will remain null -- but the `get-book` edge function currently requires `published_at IS NOT NULL` to serve the page, so I'll temporarily allow draft viewing via a query parameter (e.g., `?preview=true`) or set `published_at` just for testing

### 5. Clean up
- Remove the `pull-shared-profile` test function after use (or keep it for future testing)

## Technical Details

- The `pull-shared-profile` function reuses the same `SHARED_BACKEND_SERVICE_ROLE_KEY` and `SHARED_BACKEND_URL` as `sync-author-profile`
- It queries both `author_profiles` (by `user_email`) and `books` (by author user ID) from the shared backend
- The `get-book` edge function will be updated to support a `preview=true` flag that skips the `published_at` check, so you can view the microsite without publishing

