# Author Onboarding Audit — Live Walkthrough

**Test identity:** Bob Battista
**Test manuscript:** Hemispheric Intelligence — AI Done Right and Left (4.2 MB PDF, staged at `/tmp/test-manuscript.pdf`, will be copied into the project's `manuscripts` storage bucket via the standard upload flow)
**Auth model:** Email + 6-character code (no Google). PublishNow.io SSO handoff spot-checked separately.

## Phase 1 — Pre-flight fixes (before the walkthrough)

These two issues are already confirmed from static analysis and would block or confuse a real author. Fix them first so the audit reflects the corrected experience:

1. **`src/pages/Auth.tsx`** — Add explicit "New here? Just enter your email — we'll create your account and send a 6-character code" helper text above the email field. No new tab, no extra step; just a one-line clarifier so non-technical authors don't bounce thinking they need a separate sign-up form.
2. **`src/components/dashboard/ManuscriptUpload.tsx` (line ~77)** — Replace the direct `supabase.auth.getSession()` call with the standard `getActiveToken()` + `fetchWithTimeout()` pattern (per the Shared Backend Token Standard memory). This is the most likely cause of the upload-hang symptom.

## Phase 2 — Live walkthrough (fresh account, real manuscript)

Run the journey end-to-end on the preview, using a fresh email alias (`bob+audit-{timestamp}@authorsbureau.com`):

1. **`/auth`** — Enter email, receive code, sign in. Verify zero console/network errors, helper copy renders, button states work, redirects land on `/dashboard`.
2. **`/dashboard` first paint** — Verify the New User Onboarding card appears, reads the user's name from profile, and the "Upload your manuscript" CTA is the obvious next step. No Gotrue lock timeout warnings.
3. **Manuscript upload** — Upload `Hemispheric_Intelligence...pdf`. Verify progress indicator, success toast, file lands in the `manuscripts` bucket under the user's id, and the `books` row is created with `owner_email` matching the auth email.
4. **ABBY analysis (BP-00)** — Watch the consultation run. Verify the `business-consultant` edge function fires, the `generated_assets` row of type `business_plan` is written, and the dashboard transitions out of the "Upload" state into the 28-node grid.
5. **28-node seeding** — Query `author_nodes` and confirm all 28 rows exist with the canonical labels from `builderNodeConfig.ts` (BA-15 = Media & PR, BA-18 = JV Partnerships, YR-25 = Certification, YR-27 = Fundraising, YR-28 = Sponsors, etc.). Confirm Brand Package nodes are unlocked and others show "Upgrade to Unlock".
6. **BP-01 activation (Email Marketing)** — Open BP-01, click Generate, verify the email sequence is produced from the actual book content (not a generic template), then click Activate / Go Live. Confirm the node card flips to "Live ✓" and no spinner hangs.

## Phase 3 — 8-Level QA scoring

After the walkthrough, run each level explicitly and report pass/fail with evidence:

1. **Console / Network** — Zero red errors, zero failed requests, on every page touched.
2. **Interactive elements** — Every button, link, input is functional and disabled states are correct.
3. **Empty / loading states** — Every screen has a sensible empty/loading state, no blank screens.
4. **Database integrity** — `auth.users`, `profiles`, `books`, `manuscripts`, `generated_assets`, `author_nodes` all in sync for the test account.
5. **Mobile (375px)** — Spot check `/auth`, `/dashboard`, ManuscriptUpload, BP-01 detail at 375×812.
6. **Auth boundaries** — Incognito hits to `/dashboard` redirect to `/auth`. Logged-in hits to `/auth` redirect to `/dashboard`.
7. **Error handling** — Force a bad upload (e.g. wrong file type) and confirm the error toast is human-readable, not a stack trace.
8. **Navigation** — No dead ends; every screen has a way back to the dashboard.

## Phase 4 — Fix any failures and re-test

Any failure found in Phase 3 gets a surgical fix in the same loop, then the affected level is re-run. Final deliverable is a single pass/fail report per level with the exact evidence (screenshots, DB rows, network IDs) and a list of files changed.

## Files expected to change in Phase 1

- `src/pages/Auth.tsx` (helper copy)
- `src/components/dashboard/ManuscriptUpload.tsx` (auth token standardization)

Additional files may change in Phase 4 depending on what fails. No database migrations are anticipated unless the audit uncovers a missing column or RLS gap.

## What I will NOT do

- No Google Auth changes (already removed from scope).
- No changes to `src/integrations/supabase/client.ts` or `types.ts`.
- No changes to GHL / Marketing Hub / Commerce paths — out of scope for onboarding audit.
- No database schema changes unless a Phase 3 failure forces one (in which case I'll surface it for approval before running).

Approve to proceed; I'll execute Phase 1 → 4 in one continuous pass and deliver the scored report.