
Goal: make Website behave like a single product flow: every “Build Website” button opens the right builder, recognizes existing book/site data, never loops back to Book Hub, and stays aligned with the current marketing publish flow.

What I found
- I do know what the issue is: BP-04 is still split across two architectures.
- Modern path: dashboard Website/My Website (`section=microsite-manager`, with a modern website builder already available as `builder=website`).
- Legacy path: `/node-builder/BP-04` -> `BP04Builder`.
- Brand Products and Marketing Hub still send users to the legacy BP-04 path.
- The legacy BP-04 flow is the one showing “Complete Book Profile”.
- `NodeBuilder.tsx`, `BP04Builder.tsx`, and `WebsiteBlueprintPage.tsx` still rely on local `user_id` lookups in places instead of the shared-session/email fallback pattern.
- `MarketingHub.tsx` also resolves profile/state differently, so Website status and CTA behavior can drift from reality.
- Minor UX bug: `WebsiteBlueprintPage` sends “Go to My Book Hub” to `"books"` instead of the real dashboard section `"my-books"`.

Implementation plan
1. Make Website a single canonical route
- Canonical build route: `/dashboard?section=microsite-manager&builder=website` (add `bookId` and `bookTitle` when known).
- Canonical manage route: `/dashboard?section=microsite-manager`.
- Redirect `/node-builder/BP-04` to the canonical build route instead of rendering `BP04Builder`.

2. Update all Website entry buttons
- Change Website CTAs in:
  - `src/pages/BrandProductsHub.tsx`
  - `src/components/dashboard/MarketingHub.tsx`
  - `src/config/abbyFrameworkConfig.ts`
- Rule:
  - “Build/Open Website Builder” -> canonical build route
  - “Manage/View Website” -> canonical manage route
- Remove any Website CTA that falls back to generic Book Hub unless it is an explicit Back action.

3. Unify identity resolution for Website surfaces
- Create one reusable local-profile resolver:
  - try local `author_profiles.user_id = current user`
  - if missing, fall back via `books.owner_email` -> local author profile
- Use it in:
  - `src/pages/NodeBuilder.tsx`
  - `src/components/dashboard/microsite/WebsiteBlueprintPage.tsx`
  - `src/components/dashboard/MarketingHub.tsx`
- This prevents shared-session users from being treated like they have no book/profile.

4. Remove the false “Complete Book Profile” gate
- Once BP-04 no longer enters through the legacy wizard, the bad Website gate disappears from the main journey.
- As a safety hardening step, update `src/hooks/useAuthorBook.ts` to use the same shared-session-aware identity logic so remaining legacy builders do not regress.

5. Keep the publish / marketing architecture clean
```text
Any Website CTA
 -> canonical dashboard website builder
 -> generate / review / edit
 -> publish
 -> deploy-bp04-to-ghl
 -> author_nodes updated
 -> Marketing Hub reads the same status
```
- Lead Magnet should continue using the same modern pattern:
```text
CTA -> dashboard builder -> publish function -> author_nodes -> Marketing Hub
```
- No database changes are needed.

6. UX cleanup
- Rename ambiguous Website CTA copy where needed:
  - “Build This Product” -> “Open Website Builder”
  - “My Website” -> management/review destination only
- If Website content already exists, land the user in review/manage context instead of a blank intro.
- Fix the My Website empty-state button from `"books"` to `"my-books"`.

Files to update
- `src/pages/NodeBuilder.tsx`
- `src/pages/BrandProductsHub.tsx`
- `src/components/dashboard/MarketingHub.tsx`
- `src/components/dashboard/microsite/WebsiteBlueprintPage.tsx`
- `src/config/abbyFrameworkConfig.ts`
- `src/hooks/useAuthorBook.ts`
- optionally a shared helper such as `src/lib/resolveLocalAuthorProfile.ts`

Acceptance checks
- From Book Hub -> Website opens the correct website builder, not Book Hub again.
- From Brand Products -> Website opens the same website builder.
- From Marketing Hub -> Website opens the same website builder.
- Existing book data is recognized immediately.
- Existing website content/status is recognized immediately.
- No “Complete Book Profile” prompt appears for this book.
- After publish, Website status is reflected consistently in My Website, Brand Products, and Marketing Hub.
