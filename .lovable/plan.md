

## Plan: Consolidate CRM identity to Cloud auth UID

### Step 1 — Data migration (SQL)
Run as a migration (UPDATE requires migration tool, not read_query):

```sql
-- Merge ef23c521 contacts into 5fd84779
UPDATE crm_contacts
SET author_id = '5fd84779-8ac5-49f6-9524-0d7f1dcd4f33'
WHERE author_id = 'ef23c521-9cce-4d86-9128-dc687748b65b';

-- Mirror to dependent CRM tables so tags/activity stay linked
UPDATE crm_contact_tags
SET author_id = '5fd84779-8ac5-49f6-9524-0d7f1dcd4f33'
WHERE author_id = 'ef23c521-9cce-4d86-9128-dc687748b65b';

UPDATE crm_activity_log
SET author_id = '5fd84779-8ac5-49f6-9524-0d7f1dcd4f33'
WHERE author_id = 'ef23c521-9cce-4d86-9128-dc687748b65b';
```

Then verify with read_query:
```sql
SELECT author_id, COUNT(*) FROM crm_contacts GROUP BY author_id;
```
Expected: `5fd84779…` = 27, `ef23c521…` = 0.

### Step 2 — Align `author_profiles.user_id` (one-time)
Currently `author_profiles.user_id = ef23c521…` (shared id) but the active session uses `5fd84779…` (cloud id). To make every future writer/reader trivially agree, update Pauline's profile:

```sql
UPDATE author_profiles
SET user_id = '5fd84779-8ac5-49f6-9524-0d7f1dcd4f33'
WHERE id = '92326a2f-3ed0-4873-a8cf-7a0b1350995a';
```

This way `submit-funnel`'s existing resolver (`author_profiles.user_id` for `funnel.author_id`) returns the cloud UID without code changes — matching what the browser session uses.

### Step 3 — Code change in `submit-funnel`
With Step 2 done, no code change is strictly required: the existing resolver already reads `author_profiles.user_id` and writes `crm_contacts.author_id` to that value. After Step 2 it will be `5fd84779…` automatically.

I will still add a small safety log line confirming the resolved `author_user_id` so the next audit shows it explicitly.

### Step 4 — Revert `author-crm-data` resolver
The canonical-key resolver added last round is now unnecessary (and could confuse future debugging). Simplify back to `.eq('author_id', userId)` on `crm_contacts`, since `userId` from the browser token = `5fd84779…` = the new canonical key.

### Step 5 — Live verification
1. Reload `/dashboard?section=crm` → expect 27 contacts visible.
2. Submit one fresh quiz lead → expect row written under `5fd84779…` and visible immediately.
3. Confirm log line `author_user_id=5fd84779…` in `submit-funnel`.

### Files touched
- Migration (SQL only, no schema change — data UPDATE on 3 tables + 1 profile row)
- `supabase/functions/submit-funnel/index.ts` (add 1 log line)
- `supabase/functions/author-crm-data/index.ts` (revert resolver to direct `userId` match)

### Risk
- Updating `author_profiles.user_id` is safe because no FK from `auth.users.id` enforces it (it's a plain uuid column). All other tables key off `author_profiles.id` (`92326a2f…`), which is unchanged.
- `leads.author_id` continues to use `92326a2f…` (profile id) — unchanged.

