

## Issue confirmed

The BA-11 → BA-18 generator edge functions throw on the catch path with `status: 500`. The browser's fetch then surfaces a generic `Edge Function returned a non-2xx status code` and the response body (which contains the real `{success:false, error}` payload) is discarded. The user sees an opaque HTTP 500 immediately even though the underlying error could be anything (stale auth user, AI gateway 429, missing book, malformed AI JSON…).

BA-10 was already fixed to return `status: 200` with a `{success:false, error, diagnostics}` body plus an auth-user preflight. BA-11 → BA-18 still use the old shape via `_shared/builder-helpers.ts`.

## Fix — apply BA-10's resilience pattern to all 8 BA generators

### 1. Add a shared `failResponse()` helper
Update `supabase/functions/_shared/builder-helpers.ts`:
- Export `failResponse(error, diagnostics?)` returning `status: 200` with `{success:false, error, diagnostics}` and CORS headers (mirrors BA-10).
- Export `verifyAuthUser(supabase, userId)` that calls `supabase.auth.admin.getUserById` and returns `{ok:true}` or `{ok:false, code, message}` so each generator can short-circuit before spending AI tokens.

### 2. Update each generator (BA-11, BA-12, BA-13, BA-14, BA-15, BA-16, BA-17, BA-18)
For each `supabase/functions/generate-ba{N}-*/index.ts`:
- Wrap `req.json()` in try/catch — return `failResponse("Invalid request body")` instead of throwing.
- After loading `author_profiles`, run `verifyAuthUser(supabase, author.user_id)`. If missing, return:
  ```
  failResponse("Your author account needs to be re-linked before Abby can save this. Please contact support.",
    { code: "AUTH_USER_MISSING", author_profile_id, stale_user_id })
  ```
- Replace **all** `throw new Error(...)` paths inside the try block with `return failResponse(message, diagnostics?)`.
- In the AI-gateway response check, branch on `429` → friendly rate-limit message, `402` → friendly credits message, else generic.
- In the catch block, **return `failResponse(message)` with `status: 200`** (not `status: 500`). The prior-state restore logic stays unchanged.

### 3. No frontend change required
The existing call sites already read `data.success` and `data.error` from the body. Once the function returns `status: 200`, the frontend will surface the real ABBY-voiced error via the existing `toAbbyError()` flow.

### 4. Deploy + smoke-test
- Deploy all 8 functions in one batch.
- Pull `generate-ba11-audiobook` logs immediately after the user retries from the UI to capture the real underlying cause (likely AI-gateway timeout or AI returning non-JSON for that specific prompt — visible only once we stop swallowing it behind 500).
- If the real cause turns out to be the audiobook prompt itself (gpt-5 occasionally returns markdown-wrapped JSON), add `response_format: { type: "json_object" }` to the BA-11 AI call to match BA-10.

## Files touched

- `supabase/functions/_shared/builder-helpers.ts` — add `failResponse` + `verifyAuthUser`
- `supabase/functions/generate-ba11-audiobook/index.ts`
- `supabase/functions/generate-ba12-membership/index.ts`
- `supabase/functions/generate-ba13-group-coaching/index.ts`
- `supabase/functions/generate-ba14-podcast/index.ts`
- `supabase/functions/generate-ba15-media-pr/index.ts`
- `supabase/functions/generate-ba16-affiliate/index.ts`
- `supabase/functions/generate-ba17-upsells/index.ts`
- `supabase/functions/generate-ba18-jv-partnerships/index.ts`

No DB migrations. No new dependencies. No changes to publish flow, BuyNowButton, or commerce edge functions.

## Verification

1. From `/node-builder/BA-11`, click "Prepare My Audiobook"
   - If auth user is healthy → AI runs to completion or surfaces a specific error like "ABBY took too long" / "rate-limited" — never bare HTTP 500
   - If auth user is stale → see the same friendly "needs to be re-linked" message BA-10 produces
2. Repeat for BA-12 → BA-18 — same behaviour
3. Check `generate-ba11-audiobook` logs after the retry to confirm the real cause is now captured (and apply prompt-level fix if AI-side)
4. Confirm successful path still writes `author_nodes.content_json` and (for BA-12) `membership_content`

