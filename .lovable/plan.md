## Goal
Store the Meta Business ID (`103240310640406`) and finish wiring up the Meta OAuth credentials so Facebook + Instagram **Connect** buttons work.

## What gets saved
Open the secure secrets form and add three values:

1. **`META_APP_ID`** — from your Meta App at developers.facebook.com/apps → Settings → Basic
2. **`META_APP_SECRET`** — same screen
3. **`META_BUSINESS_ID`** — already known: `103240310640406` (you'll paste it in the form)

## Why all three
- `META_APP_ID` + `META_APP_SECRET` are required by `social-connect-start` and `social-connect-callback` for the OAuth token exchange (already referenced in the edge function code).
- `META_BUSINESS_ID` isn't needed for OAuth, but storing it now means future Graph API calls scoped to your Business Manager (e.g. listing all owned Pages, ad accounts, IG business accounts) won't need a re-prompt.

## After you save the secrets
- No code changes are needed — the edge functions already read `META_APP_ID` / `META_APP_SECRET` from `Deno.env`.
- I'll redeploy `social-connect-start` and `social-connect-callback` so they pick up the new env vars.
- You'll then be able to click **Connect Facebook** / **Connect Instagram** in `/connect-settings` and complete the OAuth flow against `https://authorsbureau.com/auth/social-callback`.

## Prerequisite reminder (Meta dashboard, one-time)
In your Meta App → **Facebook Login → Settings → Valid OAuth Redirect URIs**, make sure this exact URL is listed:
```
https://authorsbureau.com/auth/social-callback
```
(no trailing slash, no `www`). Without it, Meta will reject the callback the same way LinkedIn did.