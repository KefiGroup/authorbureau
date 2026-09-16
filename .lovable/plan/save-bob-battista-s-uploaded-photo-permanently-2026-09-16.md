# Save Bob Battista's Uploaded Photo Permanently

The uploaded `Bob.jpg` (800×800 headshot) will be saved in two durable places so it never depends on the chat upload again, and Bob's profile will be pointed at it.

## Steps

1. **Keep a copy in the project (repo)**
   - Create a CDN-backed asset pointer from the upload: `lovable-assets create --file /tmp/user-uploads/Bob.jpg --filename bob-battista-headshot-new.jpg > src/assets/bob-battista-headshot-new.jpg.asset.json`
   - This gives a permanent, version-controlled pointer in the GitHub repo (`KefiGroup/authorbureau`).

2. **Update Cloud storage (used by the live site)**
   - Upload `Bob.jpg` to the public `author-photos` bucket as `restored/bob-battista-v2.jpg` via the storage upload tool.

3. **Point the database at the new file**
   - Update `author_profiles.photo_url` for Bob Battista to the new storage URL.
   - Update any `books.author_photo_url` rows for his books to the same URL.

4. **Verify**
   - Confirm the new storage URL returns HTTP 200.
   - Load Bob's public author page in the browser and confirm the headshot displays.

## Technical details

- Upload source: `/tmp/user-uploads/Bob.jpg` (already mounted from chat).
- Bucket: `author-photos` (public, already exists).
- DB update via the migration tool: `UPDATE public.author_profiles SET photo_url = ... WHERE pen_name ILIKE '%battista%'` (and matching `books.author_photo_url`).
- The earlier restored file (`restored/bob-battista.jpg`) stays in place as an extra backup; nothing is deleted.
