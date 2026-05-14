# Fix "Failed to load ghosts" + Veronica still flagged

## Root cause

Two separate issues are stacked:

1. **The toast you saw** (`Failed to load ghosts — Edge Function returned a non-2xx status code`) was from the *first* mount of the Authors tab right after the new edge function deployed. Subsequent calls now return HTTP 200 (verified via direct curl). So the toast itself is transient.

2. **The real, persistent bug**: `SHARED_BACKEND_SERVICE_ROLE_KEY` is set, but the edge-function log shows:
   ```
   [admin-list-ghost-authors] shared listUsers error: Invalid API key
   ```
   Meaning the value currently stored is **not** a valid service-role JWT for the PublishNow backend (`wuftdpnekscrsghqtssd`). It's likely the anon key, an expired key, or a key from the wrong project.

   Because `shared.auth.admin.listUsers()` fails, `sharedEmails` stays empty, `reconciled_out` is 0, and Veronica (a real PublishNow user) is still returned as a "ghost". This is exactly the bug we set out to fix last turn — the code is correct, the secret is wrong.

## Plan

### Step 1 — Rotate `SHARED_BACKEND_SERVICE_ROLE_KEY`

You need to provide the **service-role** key from the PublishNow Supabase project (project ref `wuftdpnekscrsghqtssd`). It's the key labelled `service_role` (NOT `anon`) in that project's API settings, and the JWT payload should contain `"role":"service_role"`.

I'll use the `update_secret` tool to take the new value from you securely — nothing gets pasted into chat or code.

### Step 2 — Harden the edge function so this fails loudly next time

Right now if the shared key is missing or invalid, we just `console.error` and return zero shared users — meaning every PublishNow author silently re-appears as a ghost. Change `admin-list-ghost-authors` to:

- Detect "Invalid API key" / missing key explicitly
- Return HTTP 200 with a `warning` field (e.g. `"shared_backend_unavailable"`) so the response stays parseable, but the UI can show a clear banner instead of falsely listing real authors as ghosts

### Step 3 — Surface the warning in `GhostAuthorsCard.tsx`

If the response includes `warning === "shared_backend_unavailable"`, render an amber inline notice ("Couldn't reach PublishNow auth — ghost list may include real authors. Check SHARED_BACKEND_SERVICE_ROLE_KEY.") instead of the normal "0 ghosts" success state. Suppress the misleading list when the reconciliation step failed.

### Step 4 — Verify

- Re-curl `/admin-list-ghost-authors` and confirm `shared_user_count` is in the thousands and `reconciled_out >= 1`
- Reload the Authors tab and confirm Veronica no longer appears in the ghost list
- Confirm the badge shows `0`

## Technical notes

- No DB migration needed.
- Files touched: `supabase/functions/admin-list-ghost-authors/index.ts`, `src/components/admin/GhostAuthorsCard.tsx`.
- Secret update is done via the secrets tool (will prompt you for the value).
