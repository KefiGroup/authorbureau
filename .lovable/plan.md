
I am clear on the intent.

Intent summary:
- Marketing Hub is the control layer, not the content-creation layer.
- Node builders create the assets.
- Marketing Hub should only surface real backend state and route each CTA to the exact next action:
  - Build/Edit asset → `/node-builder/{nodeId}`
  - Review contacts → `/my-contacts` or `?contactId=...`
  - Manage connections → `/account-settings?tab=connections`
  - Social posting view → Marketing Hub Social Calendar backed by real `social_posts`
- It should never fake campaign state, never infer activation from unrelated data, and never bounce users back to generic dashboard/book hub paths.

What I found in the code:
1. The top active-count is not aligned with BP-03 intent.
   - `MarketingHub.tsx` only counts a campaign as active when `author_nodes.marketing_activated_at` exists.
   - But BP-03 builder activation (`BP03Builder.tsx`) sets the node to `live` and writes `social_posts`; it does not set `marketing_activated_at`.
   - Result: BP-03 can be truly activated for its intended use, yet the top counter still shows `0`.

2. BP-03 “Refresh Calendar” cannot work as designed right now.
   - `SocialCalendarTab.tsx` refresh only re-runs the same read queries.
   - It does not rebuild or hydrate `social_posts`.
   - So if BP-03 is live but calendar rows are missing, refresh can never fix the problem.

3. Marketing Hub activation is incomplete for BP-03.
   - `handleActivate()` in `MarketingHub.tsx` only updates `author_nodes.marketing_activated_at`.
   - BP-03 actually needs calendar rows in `social_posts`.
   - So “Activate Campaign” in Marketing Hub does not perform the real BP-03 activation side effect.

4. There is hard-coded/synthetic state in Marketing Hub.
   - `MarketingHub.tsx` injects a fake BP-01 row when an author has an `author_slug`.
   - That violates the “single source of truth” rule and can make statuses/counts look real when they are not.

5. Auth/profile resolution is inconsistent.
   - Marketing Hub uses local client + shared fallback.
   - BP-03 builder uses `getActiveToken()` + edge function.
   - `NodeBuilder.tsx` resolves author profile only from local backend.
   - This mismatch can make links appear broken or load builders without the correct `authorId`.

6. Some CTAs use hard redirects instead of the app’s routing conventions.
   - `window.location.href` is used in Social Calendar and Settings.
   - That is less reliable than routed navigation and does not follow the query-parameter/dashboard navigation pattern.

Implementation plan:
1. Rebuild Marketing Hub state around real backend truth
   - Remove synthetic BP-01 status injection.
   - Derive each campaign from real tables only:
     - BP-01 / BP-02 / BP-05 from `author_nodes` plus real `email_flows`/funnel artifacts where relevant
     - BP-03 from `author_nodes` + `social_posts`
     - Contacts from `crm_contacts` / `leads`
     - Settings from `author_email_settings`
   - Make the top count reflect actual activated outcomes, not button availability.

2. Normalize BP-03 activation semantics
   - Treat BP-03 as active when its node is live and its calendar payload exists in the intended form.
   - Align Marketing Hub logic with BP-03 builder logic so both use the same definition of “active”.

3. Add a real BP-03 calendar repair path
   - Extend the existing BP-03 backend flow with a repair/hydrate action that rebuilds `social_posts` from saved node content when the node is already live/content-ready.
   - Wire “Refresh Calendar” to this repair path instead of a plain re-fetch.
   - Keep it idempotent so repeated clicks do not duplicate posts.

4. Fix Marketing Hub BP-03 CTA behavior
   - If BP-03 is not built: CTA goes to `/node-builder/BP-03`
   - If BP-03 is ready but not activated: CTA goes to the BP-03 activate step or triggers the proper activation flow
   - If BP-03 is live but posts are missing: CTA repairs the calendar
   - If BP-03 is live and posts exist: CTA opens `?tab=social-calendar`

5. Standardize auth/profile loading
   - Use the project’s shared-token pattern for Marketing Hub data loading and BP-03-related actions.
   - Ensure Node Builder and Marketing Hub resolve the same author profile consistently before querying `author_nodes` or `social_posts`.

6. Replace fragile CTA navigation
   - Replace `window.location.href` with routed navigation.
   - Keep all Marketing Hub buttons pointed to the exact intended destination, never generic dashboard/book hub fallbacks.

7. Detailed QA after implementation
   - Verify BP-03 activated in builder shows posts in Social Calendar
   - Verify top campaign count increases when BP-03 is truly active
   - Verify “Refresh Calendar” repairs missing posts
   - Verify “Open Social Media Kit” goes to `/node-builder/BP-03`
   - Verify Contacts and Settings CTAs land on the correct deep links
   - Verify no campaign status is inferred from hard-coded or unrelated fields

Technical notes:
- Main files to update:
  - `src/components/dashboard/MarketingHub.tsx`
  - `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx`
  - `src/pages/NodeBuilder.tsx`
  - `src/components/dashboard/builders/bp03/BP03Builder.tsx`
  - `supabase/functions/bp03-node-state/index.ts`
- No schema change is obviously required from this audit; this looks like a logic/alignment issue across UI + backend behavior.
- The biggest bug is not styling or links alone: it is that BP-03 has two different activation models today, and Marketing Hub is using the wrong one.
