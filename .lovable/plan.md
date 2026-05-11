## Plan

1. Update the admin page to read the `?tab=` query parameter on load and keep the URL in sync when tabs change.
2. Preserve existing direct routes like `/admin/content-quality` while making audit links such as `/admin?tab=errors` and `/admin?tab=daily-audit` open the correct admin tab instead of falling back to Overview.
3. Verify all current audit destinations still map correctly:
   - Errors -> `/admin?tab=errors`
   - Stuck-live nodes -> `/admin?tab=books`
   - Daily audit email/dashboard -> `/admin?tab=daily-audit`
   - Content quality -> `/admin/content-quality`

## Technical details

- Add router search-param handling in `src/pages/AdminDashboard.tsx`.
- Use the existing React Router pattern already used elsewhere in the app (`useSearchParams` / URL sync).
- Keep the change scoped to navigation behavior only; no backend or audit logic changes.