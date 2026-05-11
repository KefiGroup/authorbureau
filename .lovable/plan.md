## Problem
Hitting browser **Reload** on any admin tab (e.g. `/admin?tab=daily-audit`) drops you back on the **Overview** tab instead of staying on the tab you were viewing.

## Root cause
The fix shipped earlier added `useSearchParams` to `AdminDashboard.tsx`, but the URL never actually receives the `?tab=…` segment in a way that survives a full page reload:

1. **Tab clicks don't push real history.** `setTab` calls `setSearchParams(sp, { replace: true })`. With `replace: true`, react-router rewrites the entry in place. Combined with the auth-loading early-return (`if (loading) return null;`), the URL update sometimes runs **before** the router/history has settled (auth re-hydration races with the first render), so the new query string is dropped on the floor. Reload then sees plain `/admin`.
2. **Initial-mount sync wipes the tab.** The `useEffect` that syncs `searchParams → tab state` runs on mount with `searchParams.get("tab") === null` (because step 1 lost it), and forces state back to `"overview"`. So even when the URL *did* contain `?tab=daily-audit`, the effect can clobber it during the auth-loading flicker.
3. **Email/audit deep-links** (e.g. `SystemHealthCard`'s `<a href="/admin?tab=errors">`) work the first time, but the moment any other interaction re-renders the dashboard, the same sync effect can revert to Overview.

## Fix
Make tab state the **single source of truth driven by the URL**, and make every tab change a real history push so reloads always restore correctly.

### Changes in `src/pages/AdminDashboard.tsx`

1. **Remove the `useState` mirror of `tab`.** Derive `tab` directly from `searchParams.get("tab")` on every render:
   ```ts
   const tab: Tab = (VALID_TABS.includes(searchParams.get("tab") as Tab)
     ? (searchParams.get("tab") as Tab)
     : "overview");
   ```
   No more `useState`, no more sync `useEffect` — eliminates the clobber path.

2. **`setTab` becomes a pure URL update, with `replace: false`** so the browser keeps a real history entry (and back/forward also work):
   ```ts
   const setTab = useCallback((next: Tab) => {
     const sp = new URLSearchParams(searchParams);
     if (next === "overview") sp.delete("tab"); else sp.set("tab", next);
     setSearchParams(sp);   // push, not replace
   }, [searchParams, setSearchParams]);
   ```

3. **Guard the early-return so it doesn't unmount the dashboard during auth re-hydration.** Replace `if (loading) return null;` with a lightweight loading shell that keeps the same `<AdminDashboard>` tree mounted (so the URL-derived `tab` stays consistent and there's no flash of "Overview").

4. **Drop the now-redundant `useEffect` that synced URL → state** (lines 64-69). With `tab` derived from `searchParams`, react-router already triggers a re-render when the URL changes — no manual sync needed.

### Verification
- Click **Daily Audit**, **Errors**, **Books**, **Audit**, **Admins** in turn → URL updates to `/admin?tab=…` for each.
- Press browser **Reload** on each → page returns to the same tab, not Overview.
- Click an audit-warning email link `/admin?tab=errors` from a fresh tab → opens directly on Errors and stays there.
- Browser **Back/Forward** moves between previously-visited admin tabs.

## Out of scope
- No changes to data-fetching logic, edge functions, or to any tab component (`DailyAuditTab`, `ErrorsTab`, etc.).
- No changes to `/admin/payouts` and `/admin/content-quality` (separate routes, unaffected).
