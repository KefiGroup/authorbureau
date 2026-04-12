
Fix the theme saver by removing the false-success client write and routing theme changes through the same secure profile-save path already used elsewhere.

1. What I found
- This does not look like a React or Safari rendering bug.
- `src/components/dashboard/SiteThemePicker.tsx` reads and writes `author_profiles.site_theme` directly with the browser client.
- The dashboard auth flow is not using that same direct local write path for protected profile updates.
- Result: the picker can read the row, but the write can fail as a silent no-op under RLS/auth mismatch, so the UI shows a success toast while the stored value stays `classic-elegant`.

2. Main fix
- Update `SiteThemePicker` to stop writing `site_theme` directly to `author_profiles`.
- Save theme changes through the existing backend profile-save function (`save-author-profile`) using the same token pattern as `ProfileEditor`.
- Send a partial payload with only `site_theme`, so no other profile fields are touched.

3. Make the UI truthful
- Do not treat the click as a confirmed save.
- Either:
  - save first, then set the selected theme from the confirmed response, or
  - optimistically select, then immediately refetch and roll back if the stored value does not match.
- Only show the success toast after the saved theme is confirmed.
- Show a destructive toast if persistence fails.

4. Fix the related microsite settings path
- `src/components/dashboard/microsite/WebsiteBlueprintPage.tsx` also writes `author_profiles` directly for slug/domain.
- Refactor those saves to use the same backend profile-save path so this same bug does not keep appearing in nearby website settings.

5. Keep preview refresh behavior
- The preview iframe cache-busting is already in place.
- Keep that logic, but trigger preview refresh only after the theme save is confirmed, so Safari is reloading real updated data instead of reloading the old theme.

6. Verification after implementation
- Change from Classic Elegant to another theme.
- Confirm the selected theme card stays selected immediately after save.
- Refresh the dashboard and verify the theme does not jump back to Classic.
- Verify the right-side site preview changes.
- Open the public author page and confirm the same theme is live.
- Recheck slug/domain saves after the shared refactor.

Technical details
- Files to update:
  - `src/components/dashboard/SiteThemePicker.tsx`
  - `src/components/dashboard/microsite/WebsiteBlueprintPage.tsx`
  - optionally `supabase/functions/save-author-profile/index.ts` to return the updated profile/theme for stronger confirmation
- Do not loosen database write rules.
- Preferred design: make the backend profile-save function the single write path for `author_profiles` settings.
