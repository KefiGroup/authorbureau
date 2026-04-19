
Goal: fix the 3 remaining production failures by correcting identity resolution and data sources, not by adding more backfills.

What I verified from the live database
- Pauline profile mapping:
  - `author_profiles.id` = `92326a2f-3ed0-4873-a8cf-7a0b1350995a`
  - `author_profiles.user_id` = `ef23c521-9cce-4d86-9128-dc687748b65b`
- Funnel exists:
  - `funnels.author_id = 92326a2f-3ed0-4873-a8cf-7a0b1350995a`, `node_id = BP-02`, `slug = free-gift`, `status = live`
- CRM rows exist:
  - `crm_contacts.author_id = ef23c521-9cce-4d86-9128-dc687748b65b`
- Leads rows exist:
  - `leads.author_id = 92326a2f-3ed0-4873-a8cf-7a0b1350995a`
- Important: there is no `brand_products` table in this database. Review & Publish is currently not querying it because it does not exist.

Root causes
1. Fix 3 — My Funnels
- `FunnelsHub.tsx` uses `supabase.auth.getUser()` immediately on mount.
- If the cloud auth session has not restored yet, it exits early and never runs the funnel query.
- The SQL itself is correct; the auth timing is wrong.

Current SQL in FunnelsHub
```sql
select id, author_slug
from author_profiles
where user_id = :auth_user_id
limit 1;

select *
from funnels
where author_id = :author_profile_id
order by created_at desc;

select node_id, microsite_url, status
from author_nodes
where author_id = :author_profile_id
  and node_id in ('BP-02','BP-04','BP-05','BP-09')
  and status = 'live';
```

2. Fix 1 — CRM
- `AuthorCRMPage.tsx` has two different identity paths:
  - main CRM count/list comes from `author-crm-data`, which uses `crm_contacts.author_id = auth user id`
  - fallback “recent leads” uses direct client queries to `author_profiles` + `leads`, which require local cloud auth to already be ready
- So the page can show empty even though `leads` has rows, because the fallback is still client-side and session-sensitive.
- The fix should move the leads fallback into the edge function so both sources are resolved server-side from one identity.

Current SQL / server query path for CRM
```sql
select *
from crm_contacts
where author_id = :author_user_id
order by created_at desc;
```

Current client fallback SQL
```sql
select id
from author_profiles
where user_id = :auth_user_id
limit 1;

select id, email, name, created_at, abby_score, quiz_stage
from leads
where author_id = :author_profile_id
order by created_at desc
limit 10;
```

3. Fix 5 — Review & Publish
- `ReviewProductsPage.tsx` does not read live BP node state at all.
- It only calls `builder-draft-state` action `list-drafts`, which intentionally filters product tables to `draft` / `ready_for_review` and builder draft assets.
- That means it cannot ever show already-live BP node items, so “0 products” is expected from the current code.
- Also, there is no `brand_products` table in this project, so verification should use `author_nodes` and published product tables instead.

Current SQL logic in `builder-draft-state`
```sql
select id, title, book_id, created_at, status, description, price
from <product_table>
where author_id in (:all_user_ids)
  and status in ('draft', 'ready_for_review');

select id, book_id, asset_type, content, created_at, updated_at
from generated_assets
where author_id in (:all_user_ids)
  and asset_type like 'builder_draft_%';
```

Build plan
1. Fix My Funnels auth timing
- Update `src/components/dashboard/FunnelsHub.tsx`
- Replace raw `supabase.auth.getUser()` mount flow with `useAuthReady()`
- Only load profile/funnels/live nodes after `isReady === true` and `user` exists
- Keep the existing author_id query logic (`author_profiles.id`) because the DB row is already correct

2. Fix CRM so it reads both contacts and leads reliably
- Update `supabase/functions/author-crm-data/index.ts`
- Resolve both identities server-side:
  - `author_user_id` from auth token
  - `author_profile_id` from `author_profiles`
- Extend the `list` response to also return `recentLeads` from `leads`
- Optionally return `effectiveTotal = max(crm_contacts count, recentLeads count)` for empty-state decisions
- Update `src/components/dashboard/AuthorCRMPage.tsx`
- Stop querying `author_profiles` / `leads` directly from the client for fallback
- Render the edge-function-provided `recentLeads` whenever contacts are empty so the reviewer can see fresh quiz captures immediately

Proposed server-side SQL for CRM
```sql
select id
from author_profiles
where user_id = :author_user_id
limit 1;

select *
from crm_contacts
where author_id = :author_user_id
order by created_at desc
limit :page_size offset :offset;

select id, email, name, created_at, abby_score, quiz_stage, source, stage
from leads
where author_id = :author_profile_id
order by created_at desc
limit 10;
```

3. Fix Review & Publish to include actual live/published items
- Update `supabase/functions/builder-draft-state/index.ts`
- Extend `list-drafts` into a complete review feed that returns:
  - current draft / ready_for_review items from product tables + builder drafts
  - live/content_ready node-backed products from `author_nodes` using `author_profiles.id`
  - published rows from real product tables where applicable
- Update `src/components/dashboard/ReviewProductsPage.tsx`
- Render those returned live/published rows instead of showing empty
- Use status mapping:
  - `content_ready` => “Ready for Review”
  - `live` / `published` => “Published”

Proposed SQL for node-backed review items
```sql
select node_id, node_name, personalised_name, status, microsite_url, created_at, current_step
from author_nodes
where author_id = :author_profile_id
  and status in ('content_ready', 'live')
order by created_at desc;
```

Technical notes
- This aligns with project memory:
  - node state lives in `author_nodes`
  - profile ID vs auth user ID must stay distinct
  - auth-sensitive UI should use the auth-ready pattern
- No schema migration is needed for these 3 fixes.

Files to update
- `src/components/dashboard/FunnelsHub.tsx`
- `src/components/dashboard/AuthorCRMPage.tsx`
- `src/hooks/useAuthReady.ts` only if a small helper is needed; otherwise reuse as-is
- `supabase/functions/author-crm-data/index.ts`
- `supabase/functions/builder-draft-state/index.ts`
- `src/components/dashboard/ReviewProductsPage.tsx`

Post-fix production verification
1. `/dashboard?section=my-funnels` shows Pauline’s `free-gift` funnel
2. Submit a fresh BP-02 quiz lead and confirm it appears in My CRM via the `recentLeads` / CRM response
3. `/dashboard?section=review-publish` shows node-backed live/published items instead of 0
4. Capture the exact request/response payloads for:
   - `author-crm-data`
   - `builder-draft-state`
   - funnel page data load
5. Re-run the SQL checks above to confirm the same author_id mapping is being used by the code paths
