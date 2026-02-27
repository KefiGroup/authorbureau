

## Plan: Fix Studio Link Flash by Using Published URLs Directly

### Problem
The sister links in the dashboard sidebar pass `/ai-writing-studio` and `/ai-publishing-studio` as `targetPath` to `redirectToPublishNow()`. The SSO redirect builds a URL using the published domain (`publishnowinterface.lovable.app/#/sso`) with a `redirect` param pointing to those legacy paths. On arrival, PublishNow then internally redirects from `/ai-writing-studio` to `/writing`, causing a visible flash.

### Fix — 2 lines in `DashboardSidebar.tsx`

**File:** `src/components/dashboard/DashboardSidebar.tsx` (lines 27-28)

Update the `sisterLinks` paths from legacy routes to the current published routes:

```
// Before
{ label: "AI Writing Studio", icon: PenLine, path: "/ai-writing-studio" },
{ label: "AI Publishing Studio", icon: BookMarked, path: "/ai-publishing-studio" },

// After
{ label: "AI Writing Studio", icon: PenLine, path: "/writing" },
{ label: "AI Publishing Studio", icon: BookMarked, path: "/publishing" },
```

### Why this is safe
- The SSO flow itself is unchanged — `redirectToPublishNow()` still generates a token, builds the URL `publishnowinterface.lovable.app/#/sso?token=...&redirect=/writing`, and opens it in a new tab.
- The only difference is the `redirect` query param value now points to the final route (`/writing`, `/publishing`) instead of the legacy alias (`/ai-writing-studio`, `/ai-publishing-studio`).
- No other files reference these paths.

### No other changes needed
- `publishnow-redirect.ts` — untouched, it's a generic utility.
- SSO handoff backend — untouched, it just passes the redirect param through.

