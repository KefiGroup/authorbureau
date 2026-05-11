# Force one canonical OAuth redirect URL (LinkedIn + Meta)

## Goal
Make every social OAuth flow use **one fixed redirect URL per platform**, regardless of which domain (`authorsbureau.com`, `www.authorsbureau.com`, `authorbureau.lovable.app`, lovable preview, etc.) the author clicked **Connect** from. This way you only ever register **one URL** in the LinkedIn and Meta app dashboards, and the "redirect_uri does not match" error cannot recur.

## Canonical URL
```
https://authorsbureau.com/auth/social-callback
```
Used for LinkedIn, Facebook, and Instagram.

## Code change (1 file)

**`supabase/functions/social-connect-start/index.ts`**

Replace:
```ts
function getRedirectUri(origin: string) {
  return `${origin}/auth/social-callback`;
}
```
with:
```ts
// Canonical redirect URL — must EXACTLY match the value registered in the
// LinkedIn and Meta app dashboards. We deliberately ignore the caller's
// origin so multi-domain (apex / www / lovable.app preview) all use one
// pre-registered URL.
const CANONICAL_REDIRECT_URI = "https://authorsbureau.com/auth/social-callback";
function getRedirectUri(_origin: string) {
  return CANONICAL_REDIRECT_URI;
}
```

The `_origin` parameter stays so the existing call sites don't need to change. `social-connect-callback` already accepts the request from any origin (it's a server-side token exchange), so no change needed there.

## What happens at runtime
1. Pauline clicks **Connect LinkedIn** on `www.authorsbureau.com`.
2. Edge function builds the LinkedIn auth URL with `redirect_uri=https://authorsbureau.com/auth/social-callback` (the canonical URL — even though she's on www).
3. LinkedIn matches it against the one registered URL → consent screen shown.
4. After consent, LinkedIn redirects to `https://authorsbureau.com/auth/social-callback?code=…&state=…`.
5. The frontend route reads `code` + `state`, calls `social-connect-callback`, which writes the row in `social_connections`.
6. We bounce her back to `/dashboard?section=connect-settings` (already in the callback route).

The fact that she started on `www.` doesn't matter — the callback page is the same React app served on both domains.

## What you need to do in the provider dashboards

These are **one-time** registrations and cannot be done from code. After I deploy the change, you (Pauline / your dev) need to:

### LinkedIn (https://www.linkedin.com/developers/apps)
1. Open the app whose Client ID matches our `LINKEDIN_CLIENT_ID` secret.
2. **Auth** tab → **Authorized redirect URLs for your app** → add **exactly** (no trailing slash):
   ```
   https://authorsbureau.com/auth/social-callback
   ```
3. Save.

### Meta — Facebook & Instagram (https://developers.facebook.com/apps)
1. Open the app whose App ID matches what we'll set as `META_APP_ID`.
2. Add the **Facebook Login** and **Instagram** products if not already added.
3. **Facebook Login → Settings → Valid OAuth Redirect URIs** → add:
   ```
   https://authorsbureau.com/auth/social-callback
   ```
4. **App Domains** (under Basic Settings) → add `authorsbureau.com`.
5. **App Mode** → switch to **Live** (or add Pauline as a test user in Dev mode).
6. Save.

## Secrets needed for Meta
Currently in our project we have `LINKEDIN_CLIENT_ID` + `LINKEDIN_CLIENT_SECRET`, but **no** `META_APP_ID` / `META_APP_SECRET`. Without them, Facebook & Instagram Connect buttons keep returning the existing "Setup needed" toast.

After the code change deploys, I'll prompt you to enter `META_APP_ID` and `META_APP_SECRET` once you've created the Meta app and registered the redirect URL above.

## Acceptance check
1. Click **Connect LinkedIn** from `www.authorsbureau.com` → LinkedIn consent screen (no "redirect_uri" error).
2. Approve → land back on `/dashboard?section=connect-settings` with LinkedIn marked **Connected**.
3. Repeat from `authorbureau.lovable.app` preview → same canonical URL is used → also works (no extra LinkedIn URL registration needed).
4. Once Meta app + secrets are in place, same flow works for Facebook and Instagram.

## Out of scope
- No DB migration.
- No frontend changes.
- No change to `social-connect-callback` or `social-publish`.
