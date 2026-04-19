
The auth resolver in `author-crm-data` is now resolving the browser token to the shared-backend UID `ef23c521…` (via JWT decode fallback), not the Cloud UID `5fd84779…`. Because `author_profiles.user_id` was previously consolidated to `5fd84779…`, the lookup `author_profiles.user_id = ef23c521…` returns nothing, so `authorProfileId` is null and CRM contacts can't be keyed.

The user wants a one-line data fix: re-point Pauline's `author_profiles.user_id` to the shared-backend UID that the function actually resolves to.

Note: previous data work also moved `crm_contacts.author_id` to `5fd84779…`. After this profile flip, the CRM resolver path is:
- token → `ef23c521…` (shared UID)
- `author_profiles.user_id = ef23c521…` → profile `92326a2f…` ✓
- `authorContactKey` (used to query `crm_contacts.author_id`) — must also resolve to `5fd84779…` so the 27/28 contacts still match.

I need to confirm in the function code which value `authorContactKey` ends up being (profile.user_id vs profile.id vs resolved cloud id) before we flip the profile, otherwise we'll re-break CRM read.

## Plan

### Step 1 — Verify resolver key (read-only)
Open `supabase/functions/author-crm-data/index.ts` and confirm what `authorContactKey` is set to after auth resolves. Specifically check whether contacts are queried by:
- `author_profiles.user_id` (would become `ef23c521…` after the flip — breaks read), or
- `author_profiles.id` (`92326a2f…` — unaffected), or
- the resolved Cloud UID (`5fd84779…` — matches migrated data).

### Step 2 — Run the data fix
If Step 1 confirms the contact key won't regress, run via insert tool:
```sql
UPDATE author_profiles
SET user_id = 'ef23c521-9cce-4d86-9128-dc687748b65b'
WHERE id = '92326a2f-3ed0-4873-a8cf-7a0b1350995a';
```

### Step 3 — If Step 1 shows contacts are keyed by `user_id`
Also re-point `crm_contacts.author_id` (and dependent CRM tables previously migrated) from `5fd84779…` back to `ef23c521…` in the same migration, so the read path stays consistent end-to-end.

### Step 4 — Verify
- Re-query `author_profiles` row to confirm `user_id = ef23c521…`.
- Reload My CRM and confirm contacts render (expect 27–28).
- If empty, inspect function logs to see resolved `authorContactKey` and adjust.

### Files touched
- None (data-only migration via insert tool).

### Expected outcome
`author-crm-data` resolves browser token → `ef23c521…` → matches `author_profiles.user_id` → returns Pauline's profile id and contacts list populates in My CRM.
