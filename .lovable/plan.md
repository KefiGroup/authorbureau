
Goal

Fix BP-01 to BP-05 so every Brand Products / Marketing Hub button opens the correct product flow, keeps the correct book context, and sends published nodes into GHL activation instead of bouncing back to My Books Hub.

What I verified

- The publish handoff itself is mostly correct:
  - `SharedPublishStep` already links to `/marketing-hub`
  - `PublishSuccessScreen` already links to `/dashboard?section=marketing-hub&highlight=...`
- The real break is upstream:
  - `MarketingHub.tsx` still uses hardcoded `/node-builder/BP-01`, `/BP-02`, `/BP-03`, `/BP-05`
  - `BrandProductsHub.tsx` still launches BP nodes without book context
  - `NodeBuilder.tsx` redirects BP-01..BP-04 to dashboard sections but drops `bookId` / `bookTitle`
  - `UniversalBuilderStudio.tsx` correctly sends users to `my-books` whenever `bookId` is missing
- Status handling is also wrong:
  - `MarketingHub.tsx` only treats `live` as ready
  - `BrandProductsHub.tsx` does not understand `published_pending_ghl`
  - so a published Lead Magnet can still look “Not Started” and show a Build CTA instead of Activate / Connect

Why you are seeing the loop

After you publish Lead Magnet, the Marketing Hub row is still treated as pending/not-started. Its CTA sends you to a builder path with no `bookId`. That path reaches `UniversalBuilderStudio`, which has no book context, so it sends you back to My Books Hub. That is the loop.

BP-01 to BP-05 audit

| Node | Current issue | Fix |
|---|---|---|
| BP-01 Email Marketing | Marketing/Brand buttons use legacy route without book context | Route to book-aware dashboard builder |
| BP-02 Lead Magnet | Marketing Hub button goes to legacy route, then falls back to My Books Hub | Route to book-aware dashboard builder and treat `published_pending_ghl` as activation-ready |
| BP-03 Social Media | Path is inconsistent and not book-aware | Route to book-aware dashboard builder |
| BP-04 Website | Route is mostly okay, but status/badge semantics are wrong | Keep canonical route, fix status semantics and centralize helper |
| BP-05 Webinars | Still legacy and can drift from the rest of the system | Move to canonical dashboard builder if configured; otherwise preserve book context on legacy path |

Implementation plan

1. Create one shared BP routing helper
- Add a single source of truth for BP-01 to BP-05 routes.
- Build routes should be:
  - BP-01 → `/dashboard?section=email-marketing&builder=email-flows&bookId=...`
  - BP-02 → `/dashboard?section=lead-magnet&builder=lead-magnet&bookId=...`
  - BP-03 → `/dashboard?section=social-media&builder=social-media&bookId=...`
  - BP-04 → `/dashboard?section=microsite-manager`
  - BP-05 → `/dashboard?section=webinars&builder=webinar&bookId=...` if the webinar builder is already configured
- Do not change `UniversalBuilderStudio` redirect behavior; feed it the right context before entering it.

2. Make Brand Products and Marketing Hub book-aware
- In `BrandProductsHub.tsx` and `MarketingHub.tsx`, resolve the active book context before navigating.
- UX rule:
  - if the user has 1 book, route directly
  - if the user has multiple books, show a lightweight picker first
- Replace all hardcoded `/node-builder/BP-0X` links with the shared helper.

3. Fix legacy redirect forwarding
- Update `NodeBuilder.tsx` so old `/node-builder/BP-0X?...` routes preserve and forward `bookId`, `bookTitle`, and highlight params.
- This keeps old buttons safe while the hubs are being cleaned up.

4. Fix status semantics for post-publish states
- Update `MarketingHub.tsx` and `BrandProductsHub.tsx` to recognize:
  - `building`
  - `content_ready`
  - `published_pending_ghl`
  - `live`
- `published_pending_ghl` should not render as “Not Started”.
- New UX:
  - not started → Build
  - in progress → Continue
  - published_pending_ghl → Activate / Connect
  - live without marketing activation → Activate Now
  - live with marketing activation → Active

5. Fix the GHL activation handoff
- In `MarketingHub.tsx`, if BP-02/BP-04/BP-05 is `published_pending_ghl`, show an activation path instead of a build path.
- Activation should use the existing provisioning/deploy flow and only send users to Connect Settings if provisioning fails.
- Result: clicking the Lead Magnet campaign after publish should move toward GHL activation, not back to Book Hub.

6. Fix counts and badges
- Update brand badges / built counters so `published_pending_ghl` counts as built/saved work.
- If the left-side totals are still based only on `live`, update the stats logic as well so the sidebar reflects reality.

Files to update

- `src/components/dashboard/MarketingHub.tsx`
- `src/pages/BrandProductsHub.tsx`
- `src/pages/NodeBuilder.tsx`
- `src/config/abbyFrameworkConfig.ts` or a new shared route helper file
- optionally `supabase/functions/author-stats/index.ts` if counts still only include `live`

Acceptance checks

- From Marketing Hub, BP-02 no longer returns to My Books Hub.
- From Marketing Hub, a published Lead Magnet shows Activate/Connect, not Build.
- From Brand Products, BP-01/BP-02/BP-03 open the correct builder for the correct book.
- BP-04 opens the website flow without the false profile loop.
- BP-05 follows one canonical path.
- Left-side counts and BP badges reflect saved/published brand nodes correctly.
- End-to-end: Publish Lead Magnet → Go to Marketing Hub → open Lead Magnets → Activate to GHL works.
