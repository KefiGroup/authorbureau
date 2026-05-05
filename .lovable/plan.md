## What’s actually causing the recurring BA-11 snag

This is **not primarily an LLM problem**.

It is mainly a **token/auth + code-path problem** in BA-11 production, with one separate UI bug:

1. **Primary root cause: token/auth mismatch in chapter generation**
   - `ChapterProductionStep.tsx` still calls `supabase.functions.invoke("ba11-audiobook-generate")`.
   - The deployed `ba11-audiobook-generate` function still uses a **custom JWT decoder** instead of the shared resolver.
   - Live logs show repeated requests with:
     - `auth header present: true`
     - `jwt decode: { ok: false, email: undefined }`
   - That means the request is reaching the function, but the function rejects the token **before any ElevenLabs call happens**.
   - So the recurring “ABBY hit a snag” is coming from **auth handling in code**, not from the model itself.

2. **Secondary root cause: regenerate buttons become unclickable during batch mode**
   - In `ChapterProductionStep.tsx`, individual chapter buttons are disabled by `batchActive`.
   - That matches your report that regeneration becomes unavailable and you can only move by using the previous button / navigation workaround.

3. **Remaining BA-11 risk area: inconsistent auth patterns across audiobook flows**
   - Some BA-11 paths already use the durable shared-token pattern (`getActiveToken()` + `fetchWithTimeout()`), for example manuscript retrieval and voice preview.
   - Other BA-11 paths still use direct client calls / custom token parsing.
   - That inconsistency is why this bug keeps resurfacing in a different place each time.

## Files implicated

- `src/components/dashboard/builders/audiobook/ChapterProductionStep.tsx`
- `supabase/functions/ba11-audiobook-generate/index.ts`
- `supabase/functions/_shared/resolve-user.ts`
- `src/components/dashboard/audiobook/DistributeAudiobookModal.tsx`
- `supabase/functions/distribute-audiobook/index.ts`
- `src/components/dashboard/builders/audiobook/AudiobookSetupStep.tsx`

## Do I know what the issue is?

Yes.

The permanent bug is: **BA-11 production still relies on an old auth path that cannot reliably recognize the project’s active user token, so chapter generation fails before audio synthesis starts.**

## Permanent fix plan

### 1) Replace BA-11 generation with the platform-standard auth path
Update `ChapterProductionStep.tsx` to stop using `supabase.functions.invoke()` for chapter generation.

Instead:
- use `getActiveToken()`
- retry briefly while session restore finishes
- call the function with `fetchWithTimeout()`
- support one forced token refresh retry if the first call returns auth-style failure
- preserve the current chapter state if a single request fails

This aligns BA-11 production with the same durable pattern already used in manuscript retrieval and voice preview.

### 2) Refactor `ba11-audiobook-generate` to use the canonical resolver
Replace the custom `decodeJwtSub()` logic in `supabase/functions/ba11-audiobook-generate/index.ts` with the shared helper from `supabase/functions/_shared/resolve-user.ts`.

Implementation goals:
- accept both Cloud and shared-backend sessions consistently
- resolve `{ id, email }` using the shared helper
- return a specific auth error only if both identity signals are missing
- use the resolved user id for storage paths
- keep the service-role upload, but stop depending on raw JWT parsing

This removes the fragile part shown in live logs.

### 3) Make BA-11 errors explicit instead of surfacing as a generic snag
Keep returning clear backend messages for:
- auth/session restore problems
- missing `bookId`
- missing voice
- ElevenLabs upstream failure
- storage upload failure

On the client, surface these through `toAbbyError()` without collapsing everything into the default generic copy.

### 4) Fix the unclickable regenerate buttons
Adjust `ChapterProductionStep.tsx` so a batch run does not hard-disable all chapter controls indefinitely.

Planned behavior:
- disable only the row currently generating
- allow retry/regenerate for failed chapters after a batch pass
- make batch progress state separate from row action state
- ensure a failed chapter returns to a clickable state immediately

### 5) Audit the rest of BA-11 for the same auth drift
While implementing, I’ll harden the remaining audiobook actions that still use older direct-call patterns so this doesn’t reappear elsewhere:

- `DistributeAudiobookModal.tsx`
- `distribute-audiobook/index.ts`
- `AudiobookSetupStep.tsx` reads that currently depend on the project client

Goal: make BA-11 use **one auth pattern everywhere**, instead of mixing shared-token fetches with direct client invocations.

### 6) Add regression guardrails
I’ll add lightweight regression coverage for the exact failure modes that keep recurring:
- shared token present but custom JWT decode would fail
- chapter generation auth retry on refresh
- post-failure button remains clickable
- batch generation does not lock manual regeneration
- published/resumed BA-11 still preserves production state

## Technical details

```text
Current failure path
UI: supabase.functions.invoke("ba11-audiobook-generate")
 -> Function receives Authorization header
 -> Custom decodeJwtSub() cannot resolve user
 -> 401-style failure before ElevenLabs
 -> UI shows generic snag toast

Target path
UI: getActiveToken() + fetchWithTimeout()
 -> Function uses shared resolveUser()
 -> Resolved user id/email works for both auth sources
 -> ElevenLabs runs
 -> audio uploads to canonical storage path
 -> UI stores durable chapter URL and keeps controls usable
```

## Expected outcome after implementation

- The repeated BA-11 production snag should stop recurring from token mismatch.
- If ElevenLabs genuinely fails, you’ll see a real upstream error instead of the same vague snag.
- Regenerate buttons will remain usable after failures.
- BA-11 will use one consistent authentication approach across manuscript, voice preview, production, and distribution.

<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>

<lov-actions>
<lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>