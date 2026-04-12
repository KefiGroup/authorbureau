
Fix the “Author Profile” CTA so it behaves like a true “update my profile” link, not a public-page link or external redirect.

What I found
- The exact CTA in your screenshot comes from `src/components/dashboard/microsite/WebsiteBlueprintPage.tsx`.
- The current source already removed the old `/dashboard/profile` path, so the remaining problem is that this CTA still isn’t acting like a guaranteed direct route into the profile updater.
- Right now the experience is still too indirect for what you expect: clicking “Author Profile” should take you straight to editing, not to a broken/public path or an external flow.

Implementation
1. Make the CTA a real dashboard route
   - Update the “Author Profile” action in `WebsiteBlueprintPage.tsx` to navigate to:
     `/dashboard?section=profile&mode=edit`
   - Use router navigation as the primary behavior so it always lands on the dashboard profile screen.

2. Open the editor immediately
   - Update `src/components/dashboard/ProfileEditor.tsx` to read the `mode=edit` flag.
   - When that flag is present, open the inline editor automatically instead of showing the read-only profile view first.

3. Keep both edit paths, but separate them clearly
   - The microsite CTA becomes “go update my profile now” and opens the in-app editor.
   - The existing “Edit on PublishNow” button stays available inside the profile page as a separate optional path.

4. Clean up the edit-state URL
   - After save/cancel, remove the `mode=edit` flag so the profile page goes back to its normal URL/state.

5. Verify without touching unrelated navigation
   - Confirm the CTA opens the inline editor in the same app.
   - Confirm no 404 page, no mistaken public author route, and no automatic PublishNow tab.
   - Confirm sidebar “Author Profile,” public author pages, and other dashboard links still behave the same.

Why this won’t affect other links
- Scope stays limited to the single CTA in `WebsiteBlueprintPage.tsx` plus edit-mode handling in `ProfileEditor.tsx`.
- No route order changes in `src/App.tsx`.
- No changes to public author URLs (`/:authorSlug`), book URLs, or the explicit PublishNow button.

Technical details
- Files:
  - `src/components/dashboard/microsite/WebsiteBlueprintPage.tsx`
  - `src/components/dashboard/ProfileEditor.tsx`
- Target route:
  - `/dashboard?section=profile&mode=edit`
- No backend or database changes needed.
