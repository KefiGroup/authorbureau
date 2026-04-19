
Goal: fix the 3 remaining audit failures by standardizing identity resolution across UI and edge functions, then logging the exact IDs used for reads/writes.

What the audit shows
- The issue is not “everything must use `author_profiles.id`”.
- The real issue is inconsistent identity resolution across shared-auth vs cloud-auth code paths.
- Current storage pattern is split:
  - `leads.author_id` uses `author_profiles.id` (`92326a2f...`)
  - `funnels.author_id` uses `author_profiles.id` (`92326a2f...`)
  - `author_nodes.author_id` uses `author_profiles.id` (`92326a2f...`)
  - `crm_contacts.author_id` uses auth `user_id` (`ef23c521...`)
- So the fix is: resolve both IDs once, then query each table with the correct one.

Confirmed mismatches in current code
1. CRM
- `microsite-action` already writes:
  - `crm_contacts.author_id = authorUserId`
  - `leads.author_id = author_id` (profile id)
- `author-crm-data` reads:
  - `crm_contacts` by auth user id
  - `leads` by profile id
- But `AuthorCRMPage` still uses `totalCount` only, so it can show the empty CRM state even when `recentLeads` exists.
- It also uses `sharedSupabase.auth.getSession()` directly instead of the project-standard token resolver.

2. My Funnels
- `FunnelsHub` uses `useAuthReady()`, which is tied to the cloud client.
- The rest of the dashboard auth is primarily driven by shared auth via `useAuth()`.
- That means Funnels can resolve “no user / no profile” even though the author is signed in, so it never reaches the correct `author_profiles.id` and then never loads `funnels.author_id = profile.id`.

3. Review & Publish
- `builder-draft-state` does query `author_nodes` by profile ids, but those profile ids are derived from `resolveAllUserIds()`.
- That resolver only starts from `identity.userId`; it does not have the stronger profile resolution fallback already used elsewhere.
- If the incoming token resolves to the “other” backend user id, profile lookup can fail and `author_nodes` returns nothing.

Build plan
1. Add canonical author resolution to the affected edge functions
- Reuse the stronger pattern already present in other functions:
  - resolve token
  - resolve `author_profile_id`
  - resolve canonical `author_user_id`
  - fall back by email when needed
- Apply this to:
  - `author-crm-data`
  - `builder-draft-state`

2. Add explicit audit logs in `microsite-action`
- Log the exact IDs used for each write:
  - `crm_contacts.author_id`
  - `leads.author_id`
  - `lead_activities.author_id`
- Include email + node_id so the reviewer’s test lead can be traced exactly.

3. Fix CRM empty-state logic
- In `author-crm-data`, return both canonical IDs and counts in logs/response for audit.
- In `AuthorCRMPage`:
  - switch token fetching to `getActiveToken()` / `fetchWithTimeout()`
  - use `effectiveTotal` instead of `totalCount` for the empty-state gate
  - keep showing `recentLeads` when `crm_contacts` is still empty

4. Fix My Funnels auth source
- Update `FunnelsHub` to stop depending on cloud-only auth restoration.
- Use the same authenticated user source as the rest of the dashboard.
- Resolve `author_profiles.id` first, then query:
  - `funnels.author_id = author_profile_id`
  - `author_nodes.author_id = author_profile_id`

5. Fix Review & Publish identity resolution
- Update `builder-draft-state` to resolve the author profile directly, not indirectly through weak user-id derivation.
- Query node-backed live items with canonical `author_profile_id`.
- Keep product-table queries on the correct user-keyed IDs where needed.

Exact query rules after fix
```sql
-- CRM contacts
select * from crm_contacts
where author_id = :author_user_id
order by created_at desc;

-- CRM fallback leads
select id, email, name, created_at, abby_score, quiz_stage, source, stage
from leads
where author_id = :author_profile_id
order by created_at desc
limit 10;

-- My Funnels
select *
from funnels
where author_id = :author_profile_id
order by created_at desc;

-- Live funnel-capable nodes
select node_id, microsite_url, status
from author_nodes
where author_id = :author_profile_id
  and node_id in ('BP-02','BP-04','BP-05','BP-09')
  and status = 'live';

-- Review & Publish live items
select node_id, node_name, personalised_name, status, microsite_url, created_at, current_step
from author_nodes
where author_id = :author_profile_id
  and status in ('content_ready', 'live', 'published')
order by created_at desc;
```

Files to update
- `supabase/functions/microsite-action/index.ts`
- `supabase/functions/author-crm-data/index.ts`
- `supabase/functions/builder-draft-state/index.ts`
- `src/components/dashboard/AuthorCRMPage.tsx`
- `src/components/dashboard/FunnelsHub.tsx`

Production verification after deploy
1. Submit a fresh BP-02 quiz lead and inspect logs:
- confirm `leads.author_id = 92326a2f...`
- confirm `crm_contacts.author_id = ef23c521...`

2. Call CRM data load and confirm:
- `authorProfileId = 92326a2f...`
- contacts query uses `ef23c521...`
- leads query uses `92326a2f...`
- `effectiveTotal > 0`

3. Open My Funnels and confirm the profile resolution returns `92326a2f...` and the existing BP-02 funnel renders.

4. Open Review & Publish and confirm `author_nodes` query returns the 4 live BP products.

Technical note
- I would not change `crm_contacts` to use `author_profiles.id` unless you explicitly want a schema migration.
- The safer Sprint 37 fix is to make every code path resolve both IDs correctly and use the right one per table.
