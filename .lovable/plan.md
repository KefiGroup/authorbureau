

## Diagnosis

The setup is correct on paper:
- `supabase/config.toml` line 144-145: `[functions.get-manuscript-source]  verify_jwt = false` ✓
- Client uses `getActiveToken()` + explicit `Authorization: Bearer <token>` ✓
- Function has 3 fallbacks in `resolveUser` with logs at every step ✓
- Identical JWT-decode pattern works in `check-subscription` (logs confirm `Resolved via JWT decode` for Pauline's exact token, same browser, same minute)

**Yet `get-manuscript-source` has zero logs** — not even a "booted" entry. Combined with the user still seeing 401, this means the request is **not reaching the function runtime at all**. The two realistic causes:

1. **The function was not redeployed after `config.toml` was updated.** `verify_jwt` is read by the gateway at deploy time, not at request time. Updating `config.toml` without redeploying leaves the gateway still enforcing JWT verification with the local project's signing key — which rejects the shared-backend token at the edge with a raw 401, before `serve()` runs.
2. **The function was deployed but the gateway cache hasn't picked up the new config.** Same fix: an explicit redeploy forces the gateway to re-read the function manifest.

The fact that `check-subscription` works under the exact same conditions (and has been deployed for a long time) confirms it's not the code, the secrets, or the token — it's the deploy state of this one function.

## Plan

### Phase 1 — Force redeploy `get-manuscript-source`

Use `supabase--deploy_edge_functions` to explicitly redeploy `get-manuscript-source`. This re-reads `supabase/config.toml`, applies `verify_jwt = false` at the gateway, and bumps the function manifest.

### Phase 2 — Direct test via `curl_edge_functions` BEFORE asking the user to click

Call the function directly with the user's browser session token (auto-attached by `curl_edge_functions`) and a known book id. Three possible outcomes:

- **`{ success: true, characterCount: ~100589 }`** → fix confirmed; tell the user to retry.
- **`{ success: false, error: "..." }` with HTTP 200** → function runtime reached, auth worked, ownership/lookup failed → patch the specific failure.
- **HTTP 401 still** → gateway still rejecting; pull `edge_function_logs("get-manuscript-source")` (which should now have boot entries even on rejection) and inspect; if still empty, the function manifest is broken — recreate by deleting `deno.lock`-style stale state or renaming the function entry.

### Phase 3 — If runtime is reached but `resolveUser` still returns null

Read the `console.log` lines from the now-populated logs and pinpoint which path failed:
- JWT decode failed → token format issue (check first 20 chars of token in a temporary log)
- Local + shared both errored → log the actual error messages

Apply the targeted fix in the same turn (no extra round-trip).

### Phase 4 — End-to-end on Be SUCKcessful

After the curl test succeeds:
1. Click **Optimize for Audio** → ~20 chapters parsed from the 100,589-char manuscript.
2. **Next: Voice** unlocks.
3. Voice preview plays.
4. Chapter 1 generates audio.

## Files touched

- **No new code changes expected in Phase 1** — just a redeploy.
- Only if Phase 3 reveals a runtime bug will `supabase/functions/get-manuscript-source/index.ts` be patched.

No DB migrations. No RLS changes. No new secrets.

