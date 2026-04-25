# Fix "Unauthorized" on My Library

## What's happening
The My Library page calls the `get-author-library` backend function. That function validates your login token using a method (`getClaims`) that relies on a locally-cached set of signing keys. After the recent platform key rotation, that cache is stale, so every request comes back as **403 / Unauthorized** with the error `unrecognized JWT kid ... for algorithm ES256` (visible in the auth logs).

Two other recently-edited functions use the same stale pattern and will hit the same error: `social-publish` and `generate-funnel`.

## The fix
Switch the three affected functions from the cache-based `auth.getClaims(token)` to `auth.getUser(token)`, which validates the token against the live auth service and is the standard pattern already used everywhere else in this project (e.g., `get-author-profile`, `get-author-book`).

Files to edit:
- `supabase/functions/get-author-library/index.ts`  ← what's breaking on screen
- `supabase/functions/social-publish/index.ts`
- `supabase/functions/generate-funnel/index.ts`

Then redeploy those three functions.

## Verification
After deploy, refresh the My Library page — the "Unauthorized" message will be replaced with your assets and the new "Marketing Packs" tab.
