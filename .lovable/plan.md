
The mount of BP-03 now reads `author_profiles` for the active session UID and finds nothing, so it shows "Please set up your author profile first."

What I need to verify before changing anything:
1. Confirm Pauline's `author_profiles` row now has `user_id = 5fd84779-8ac5-49f6-9524-0d7f1dcd4f33` (the cloud session UID we relinked to in the last migration).
2. Confirm her `books` row(s) have `author_id = 5fd84779-...` and the BP-03 row in `author_nodes` is keyed to the matching `author_profiles.id`.
3. Check `BP03Builder.tsx` mount logic to see whether it looks up the profile by `user_id` (cloud UID) or by some other key, and how it derives `authorId` for the `author_nodes` query.

Suspected cause:
- The previous relink updated `author_profiles.user_id` to the cloud UID and `books.author_id` to the cloud UID, but `author_nodes.author_id` is `author_profiles.id` (the profile UUID `92326a2f-...`), not the user UID. If BP-03 derives `authorId` from `author_profiles.id` correctly, the profile lookup should succeed — so the "set up profile first" message means the profile lookup itself is failing for this session.
- Most likely either:
  a) The session is currently signed in as a different account than `5fd84779-...` (e.g., the shared-backend UID `ef23c521-...`), so `author_profiles.user_id = auth.uid()` no longer matches.
  b) The relink left an orphaned/duplicate row, and BP-03's `.maybeSingle()` is returning null.

Fix plan (single, minimal):
1. Use `supabase--read_query` to:
   - `select id, user_id, pen_name, author_slug from author_profiles where pen_name ilike '%pauline%' or author_slug ilike '%pauline%'`
   - `select id, title, author_id, owner_email from books where owner_email = 'paulinet77@gmail.com'`
   - `select id, author_id, node_id, status, jsonb_array_length(content_json->'posts') as posts from author_nodes where node_id = 'BP-03' and author_id = '92326a2f-3ed0-4873-a8cf-7a0b1350995a'`
2. Read `BP03Builder.tsx` mount block to confirm exactly which column it queries against and how `authorId` is set for `author_nodes`.
3. Based on findings, do ONE of:
   - If profile `user_id` is correct but session is different → ask Pauline which account she's logged in as and align (no code change needed beyond the prior migration; may need a second relink to whichever UID is the real active session).
   - If there are duplicate `author_profiles` rows for Pauline → migration to consolidate to a single row keyed on the active cloud UID.
   - If BP-03 mount is using the wrong column (e.g., querying by `id` instead of `user_id`) → fix that single query in `BP03Builder.tsx`.

Scope guard:
- No changes to generation, edge functions, other builders, or RLS.
- At most: one consolidation migration on `author_profiles` + (only if needed) one query fix in `BP03Builder.tsx`.

Validation:
1. Hard refresh BP-03 → must NOT show "Please set up your author profile first."
2. Must land on Step 4 (Activate) with the 5 saved posts.
3. Navigate away and back → still Step 4.
