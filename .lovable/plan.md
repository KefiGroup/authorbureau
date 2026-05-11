# Fix "Unauthorized" when connecting LinkedIn / Facebook / Instagram

## Root cause
`supabase/functions/social-connect-start/index.ts` validates the caller's JWT with `supabase.auth.getClaims(token)` against the Authors Bureau project's anon client. Pauline's session token is issued by the **shared PublishNow backend**, so that call returns an error and the function responds `401 Unauthorized` — which surfaces as the red "Could not start connection / Unauthorized" toast.

Every other edge function in this project resolves the user via `_shared/resolve-user.ts` (Cloud token → shared-backend token → JWT decode). `social-connect-start` is the only social function that skipped it. This violates the Edge Function User Resolver rule.

## Change (1 file)

**`supabase/functions/social-connect-start/index.ts`**

Replace the auth block:

```ts
// before
const authHeader = req.headers.get("Authorization");
if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: authHeader } },
});
const { data: claims, error: claimsErr } = await supabase.auth.getClaims(
  authHeader.replace("Bearer ", ""),
);
if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
const userId = claims.claims.sub as string;
```

with the canonical resolver:

```ts
import { resolveUser } from "../_shared/resolve-user.ts";

const resolved = await resolveUser(req.headers.get("Authorization"));
if (!resolved.id) return json({ error: "Unauthorized" }, 401);
const userId = resolved.id;
```

Everything else (state encoding, redirect URL, LinkedIn/Meta param building) stays unchanged. The function already runs with `verify_jwt = false`, so no config change.

## Why this is the right fix
- Matches the project-wide Edge Function User Resolver rule (memory).
- Same pattern used by `social-connect-callback`, `social-publish`, `enroll-subscriber`, etc.
- Restores cross-backend auth without weakening security — `resolveUser` still rejects unknown / invalid tokens.

## Acceptance check
1. As Pauline, open Connect Settings.
2. Click **Connect** on LinkedIn → browser redirects to `linkedin.com/oauth/...` instead of showing the red Unauthorized toast.
3. Same for Facebook Page and Instagram Business (those will instead surface the existing "needs_setup" toast if `META_APP_ID` is missing — that's a separate, expected message, not 401).
4. After connecting LinkedIn, the BP-03 Activate button enables and the dashboard nudge banner disappears.

## Out of scope
- No changes to `social-connect-callback`, `social-publish`, `social-scheduler`.
- No DB migration.
- No frontend changes — the previous `getActiveToken({ forceRefresh: true })` + `fetchWithTimeout` work stays.
