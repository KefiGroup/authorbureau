
What’s actually happening

- This does not look like a general React rendering failure.
- It looks like two browser-sensitive frontend state issues:
  1. The dashboard only reads `?section=` on first render. So when the My Website card sends you to `/dashboard?section=profile&mode=edit`, the URL changes but the visible dashboard panel can stay on “My Website”, which makes the click feel dead.
  2. The theme picker saves the theme, but the preview iframe reloads with the same URL, so Safari can keep showing the cached author page and the preview appears unchanged.

Fix plan

1. Sync dashboard state with the URL
- File: `src/pages/AuthorDashboard.tsx`
- Add URL-to-state synchronization so `activeSection` updates whenever `searchParams` change after mount.
- Replace in-place `searchParams` mutation with a fresh `URLSearchParams` object before calling `setSearchParams(...)` for safer cross-browser behavior.

2. Make “Author Profile” always open the in-page editor
- Files:
  - `src/components/dashboard/microsite/WebsiteBlueprintPage.tsx`
  - `src/components/dashboard/ProfileEditor.tsx`
- Keep the microsite CTA as an internal dashboard action to `?section=profile&mode=edit`.
- In `ProfileEditor`, auto-enter edit mode whenever `mode=edit` is present after loading, even if the profile has not been created yet. That way the link always lands in the editable screen, not a passive view.
- Clear the `mode` param immutably after opening edit mode.

3. Make theme changes visibly refresh in Safari
- File: `src/components/dashboard/microsite/WebsiteBlueprintPage.tsx`
- Change the preview iframe URL to use a cache-busting token/version in the `src` whenever theme or slug changes.
- Use the full preview URL pattern for the author page so the iframe is forced to fetch a fresh public page instead of reusing a cached document.

4. Small safety audit in the same microsite screen
- While touching `WebsiteBlueprintPage.tsx`, verify nearby dashboard actions use the correct canonical section IDs so there are no other silent no-op links in this panel.

What will stay unchanged

- No route order changes in `src/App.tsx`
- No backend/database changes
- Public author/book/product routes stay as they are
- The separate “Edit on PublishNow” option inside the profile page remains available

Files to update

- `src/pages/AuthorDashboard.tsx`
- `src/components/dashboard/microsite/WebsiteBlueprintPage.tsx`
- `src/components/dashboard/ProfileEditor.tsx`

Verification checklist

- In Safari, click “Author Profile” from My Website:
  - no new tab
  - no error page
  - dashboard switches to Author Profile
  - edit form opens immediately
- Change the site theme:
  - selected theme updates
  - preview iframe visibly refreshes right away
  - public author page reflects the saved theme
- Recheck sidebar “Author Profile”, “My Website”, and public author links to confirm other navigation still works
