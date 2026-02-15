

# Point Authors Bureau at the Shared PublishNow Backend

## Problem

The `.env` file and `src/integrations/supabase/client.ts` are auto-managed by Lovable Cloud. They always point at this project's own backend (`tubpbslfrxyfhldkcyyq`). But Authors Bureau needs to use the shared PublishNow backend (`wuftdpnekscrsghqtssd`) for everything -- auth, database, edge functions, and storage.

## Solution

Create a dedicated shared backend client file, then update every import across the codebase to use it instead of the auto-managed one.

---

## Step 1: Create `src/lib/shared-backend.ts`

New file exporting:
- `SHARED_BACKEND_URL` constant (`https://wuftdpnekscrsghqtssd.supabase.co`)
- `SHARED_ANON_KEY` constant (the PublishNow anon key)
- `sharedSupabase` -- a Supabase client created with `createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY, { auth: { storage: localStorage, persistSession: true, autoRefreshToken: true } })`

Also re-export `sharedSupabase as supabase` so most files only need to change their import path, not the variable name.

## Step 2: Update all 18 files that import from `@/integrations/supabase/client`

Each file changes one line -- the import source swaps from `@/integrations/supabase/client` to `@/lib/shared-backend`.

| File | What it uses |
|---|---|
| `src/hooks/useAuth.tsx` | Auth, `has_role` RPC, `check-subscription` |
| `src/hooks/usePlatformAccess.ts` | Auth session + fetch URLs |
| `src/pages/SSO.tsx` | `setSession` + fetch URL |
| `src/pages/Auth.tsx` | Auth sign-in/sign-up |
| `src/pages/AdminDashboard.tsx` | DB queries, `platform-access` |
| `src/pages/Join.tsx` | DB queries |
| `src/pages/DynamicBookMicrosite.tsx` | DB queries |
| `src/pages/BookMicrosite.tsx` | DB queries |
| `src/components/dashboard/DashboardHeader.tsx` | Auth session + fetch URL |
| `src/components/dashboard/ProfileEditor.tsx` | DB queries, storage |
| `src/components/dashboard/SpeakingProfile.tsx` | DB queries |
| `src/components/dashboard/CourseBuilder.tsx` | DB queries |
| `src/components/dashboard/CoachingCRM.tsx` | DB queries |
| `src/components/dashboard/BookEnricher.tsx` | `enrich-book-data` edge fn |
| `src/components/dashboard/AIToolkit.tsx` | `ai-author-tools` edge fn |
| `src/components/dashboard/MyBooks.tsx` | DB queries |
| `src/components/dashboard/DashboardOverview.tsx` | `create-checkout`, `customer-portal` |
| `src/components/DualModeBookForm.tsx` | `scrape-amazon-book`, DB queries |
| `src/components/DynamicMeetOurAuthors.tsx` | DB queries |
| `src/components/ServiceInquiryForm.tsx` | DB queries, `send-service-inquiry-email` |

## Step 3: Replace `import.meta.env.VITE_SUPABASE_URL` in fetch calls

4 files use the env var directly in `fetch()` URLs. These will import `SHARED_BACKEND_URL` instead:

- `src/hooks/usePlatformAccess.ts` (2 fetch calls)
- `src/pages/SSO.tsx` (1 fetch call)
- `src/components/dashboard/DashboardHeader.tsx` (1 fetch call)
- `src/components/dashboard/AIToolkit.tsx` (1 constant assignment)

## Step 4: Replace `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY` usage

`src/components/dashboard/AIToolkit.tsx` uses this env var as a Bearer token in its fetch call. This will be replaced with `SHARED_ANON_KEY`.

---

## What does NOT change

- `src/integrations/supabase/client.ts` -- left untouched (auto-managed)
- `.env` -- left untouched (auto-managed)
- Edge function code in `supabase/functions/` -- these run on this project's own backend and are unaffected
- No new database tables or migrations needed

## Summary

| File | Action |
|---|---|
| `src/lib/shared-backend.ts` | **Create** -- shared URL, key, and client |
| 18 component/page/hook files | **Modify** -- change import path |
| 4 files with `import.meta.env` in fetch URLs | **Modify** -- use `SHARED_BACKEND_URL` / `SHARED_ANON_KEY` constants |

