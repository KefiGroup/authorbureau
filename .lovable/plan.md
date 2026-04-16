

# Fix: Author CRM Page Not Showing Contacts

## Root Cause

**The "My Contacts" page is completely non-functional for authors.** All CRM data (contacts, tags, activity logs) lives in the project-local (Cloud) database, but authors authenticate via the shared backend. The RLS policy on `crm_contacts` requires `auth.uid() = author_id`, and since the author has no Cloud session, `auth.uid()` is null — every read and write is silently blocked.

This affects: viewing contacts, adding contacts manually, importing CSV, deleting contacts, viewing/adding tags, viewing/adding activity notes.

## Fix Approach

Create a new edge function `author-crm-data` that handles all CRM operations with service role (bypassing RLS), after validating the author's shared-backend JWT. Then update `AuthorCRMPage` to call this edge function instead of directly querying the project-local client.

## Technical Details

### 1. New edge function: `supabase/functions/author-crm-data/index.ts`
- Accepts actions: `list`, `add`, `delete`, `add-tag`, `delete-tag`, `list-activities`, `add-note`, `import-csv`
- Validates the caller's JWT via the shared backend to get the user ID
- Uses service role on the project-local DB for all operations
- Scopes all queries to `author_id = caller_user_id`

### 2. Update `src/components/dashboard/AuthorCRMPage.tsx`
- Remove import of `supabase` from `@/integrations/supabase/client`
- Replace all direct Supabase calls with `fetch()` calls to the `author-crm-data` edge function
- Use `getActiveToken()` for authentication (consistent with platform standard)

### 3. Update `src/components/dashboard/crm/ContactForm.tsx`
- Same pattern — route through the edge function instead of direct client calls

### Files Changed
- `supabase/functions/author-crm-data/index.ts` (new)
- `src/components/dashboard/AuthorCRMPage.tsx` (rewrite data layer)
- `src/components/dashboard/crm/ContactForm.tsx` (if it also uses project-local client)

