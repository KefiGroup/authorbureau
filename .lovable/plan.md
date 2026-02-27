

## Plan: Fix SSO redirect URL to use published domain

### Problem
The SSO redirect in `src/lib/publishnow-redirect.ts` points to `publishnowinterface.lovable.app` (the Lovable preview domain) instead of the published `publishnow.io` domain. This causes a visible flash through the Lovable domain before landing on the final site.

### Change — 1 line in `publishnow-redirect.ts`

**File:** `src/lib/publishnow-redirect.ts`, line 3

```
// Before
const PUBLISHNOW_SSO_URL = "https://publishnowinterface.lovable.app/#/sso";

// After
const PUBLISHNOW_SSO_URL = "https://publishnow.io/#/sso";
```

### Why this is safe
- `publishnow.io` is the published custom domain for the same app — it serves the same code and SSO endpoint.
- The rest of the codebase already uses `publishnow.io` consistently (Footer, Join page, ProfileEditor fallback, etc.).
- No other files reference the Lovable preview domain.

