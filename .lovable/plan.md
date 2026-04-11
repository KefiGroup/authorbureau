

## Fix: "Author Profile" Dead Link in Website Blueprint

### Problem
Line 229 of `WebsiteBlueprintPage.tsx` has a hardcoded `<a href="/dashboard/profile">` link. Since `/dashboard/profile` is not a defined route, it falls through to the catch-all `/:authorSlug` route, which interprets "dashboard" as an author slug and shows an error page.

### Scope of Change
**One line in one file.** No other links are affected.

- The hardcoded `<a href="/dashboard/profile">` is the **only** instance of this bad path (confirmed by search).
- All other "profile" navigation in the dashboard already uses the correct `onNavigate("profile")` callback pattern (confirmed in `ABBYFrameworkDashboard.tsx`, `BusinessFramework.tsx`, etc.).
- No routes, components, or other navigation logic will be touched.

### Fix
In `src/components/dashboard/microsite/WebsiteBlueprintPage.tsx`, line 229:

**Before:**
```html
<a href="/dashboard/profile" className="font-bold text-secondary ...">Author Profile</a>
```

**After:**
```html
<button onClick={() => onNavigate?.("profile")} className="font-bold text-secondary ...">Author Profile</button>
```

This uses the same `onNavigate` prop already passed into the component and used everywhere else in the dashboard. The visual appearance stays identical — only the underlying element changes from an anchor to a button to avoid page navigation.

### Why This Won't Affect Other Links
- No routes are added, removed, or reordered in `App.tsx`.
- No other file references `/dashboard/profile`.
- The `onNavigate("profile")` pattern is already the standard used across 10+ places in the dashboard.

