

# Fix: Add `/admin-auth` Route

## Problem
- `/admin` route already exists (line 129) — no issue there.
- `/admin-auth` is missing. The current route is `/admin-login` (line 128), which is incorrect.

## Fix
**One-line change in `src/App.tsx`** (line 128):

Change:
```tsx
<Route path="/admin-login" element={<AdminAuth />} />
```
To:
```tsx
<Route path="/admin-auth" element={<AdminAuth />} />
```

Both `AdminAuth` and `AdminDashboard` are already imported. No other files need changes.

## Verification
After deploy, confirm `authorsbureau.com/admin-auth` loads the admin sign-in page (not 404).

