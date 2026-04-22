
## Diagnosis from the direct backend check

The direct backend log check already points to a gateway/auth transport problem, not a bug inside `resolveUser`:

- `get-manuscript-source` has **no edge function logs at all**.
- The browser is seeing a **raw HTTP 401**, not the function’s `{ success: false, error: "Unauthorized" }` envelope.
- `supabase/config.toml` does **not** include `[functions.get-manuscript-source] verify_jwt = false`.
- `ManuscriptOptimizationStep.tsx` is calling the function with `supabase.functions.invoke(...)`, not the project-standard `getActiveToken()` + `fetchWithTimeout()` pattern.

Taken together, that means the request is most likely being rejected **before the function body runs**, so none of the `console.log` lines inside `resolveUser` can fire. The two likely causes are:

1. **Gateway rejection**: `get-manuscript-source` is missing the `verify_jwt = false` config used by the other shared-session functions.
2. **Missing/wrong Authorization header from the client**: `supabase.functions.invoke()` uses the project-local client session, but this BA-11 flow must use the **shared-session token** from `getActiveToken()`.

## Implementation plan

### Phase 1 — Fix gateway-level auth for `get-manuscript-source`

Update `supabase/config.toml` to add:

```toml
[functions.get-manuscript-source]
  verify_jwt = false
```

Then explicitly deploy `get-manuscript-source`.

Why: this lets the function receive requests even when the browser token comes from the shared auth backend, so auth can be validated in code instead of being blocked at the gateway.

### Phase 2 — Fix client token transport in Manuscript step

Refactor `src/components/dashboard/builders/audiobook/ManuscriptOptimizationStep.tsx` to stop using:

```ts
supabase.functions.invoke("get-manuscript-source", ...)
```

and instead use the project-standard pattern already used by `useAuthorBook`:

- `getActiveToken()`
- `fetchWithTimeout()`
- explicit `Authorization: Bearer <token>` header
- explicit `res.json()` handling

Target shape:

```ts
const token = await getActiveToken();
const res = await fetchWithTimeout(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-manuscript-source`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ bookId }),
  }
);
const data = await res.json();
```

Why: this guarantees the shared-session token is actually sent to the backend.

### Phase 3 — Keep `resolveUser` simple, but verify it only after the request reaches runtime

Once Phases 1 and 2 are in place, test again and inspect logs for `get-manuscript-source`.

Expected log sequence after the fix:
- a boot/request entry appears for `get-manuscript-source`
- then one of:
  - `Resolved via JWT decode`
  - `Resolved via local auth`
  - `Resolved via shared backend`

If it still fails after the request is entering runtime, then patch `resolveUser`. But first priority is to make sure the request actually reaches the function.

### Phase 4 — Re-verify BA-11 auth path consistency

After Manuscript is fixed, audit the rest of BA-11 for the same shared-token transport issue:

- `VoiceSelectionStep.tsx` currently also uses `supabase.functions.invoke("elevenlabs-tts-audiobook", ...)`
- `ChapterProductionStep.tsx` currently sends an invalid `Authorization` header using the publishable key instead of the active user token

These should be switched to the same explicit token pattern in the same pass, or at minimum verified immediately after Manuscript is unblocked so the user doesn’t hit the next auth failure one step later.

## Files to update

- `supabase/config.toml`
- `src/components/dashboard/builders/audiobook/ManuscriptOptimizationStep.tsx`

Likely follow-up hardening in same BA-11 auth pass:
- `src/components/dashboard/builders/audiobook/VoiceSelectionStep.tsx`
- `src/components/dashboard/builders/audiobook/ChapterProductionStep.tsx`

## Verification checklist

1. Call `get-manuscript-source` again and confirm it no longer returns raw gateway 401.
2. Confirm `edge_function_logs("get-manuscript-source")` now shows runtime entries.
3. Click **Optimize for Audio** and confirm manuscript content is returned.
4. Confirm chapters are generated and **Next: Voice** unlocks.
5. Immediately test voice preview and first chapter generation to catch the same token-transport bug in later BA-11 steps.

## Scope

No database migration required. No RLS changes required. This is an auth transport + function config fix.
