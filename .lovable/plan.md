

# Plan — Fix BP-06/07/08/09 Silent Generation Failures

## Real diagnosis

The user reports "button click not registering." That's incorrect — the click handler runs every time. The actual failure chain (verified in edge logs + code):

1. `handleGenerate` calls `supabase.functions.invoke(...)`.
2. The Supabase JS SDK's `invoke()` uses an unconfigurable ~60s fetch timeout.
3. After the temperature fix, `openai/gpt-5` for BP-06/07/08/09 succeeds — but takes 60–90+ seconds because none of these four functions cap `max_completion_tokens`, so gpt-5 burns enormous reasoning-token budgets on a complex JSON spec.
4. The SDK's fetch aborts before the function returns. The `catch` runs, `setStep(0)` flips back to Introduction, `setError(...)` is set — but the resulting message is generic ("Failed to fetch" / "Failed to send a request to the Edge Function") and easy to miss in the small destructive panel.
5. Edge logs confirm: BP-05 returned **200 in 81,042 ms** on the most recent attempt; BP-06 has zero invocations recorded recently because the user gave up before any reached completion.

This is the same SDK-timeout pattern already solved elsewhere in the codebase via `fetchWithTimeout` + `getActiveToken` (see `src/lib/marketing-hub-state.ts`, `src/lib/publish-node.ts`, `src/lib/builder-autosave.ts`).

## Fix — two layers

### Layer 1: server-side, cap the AI budget

In **all four** edge functions, add `max_completion_tokens: 8000` to the Lovable AI Gateway request body (matching the working BP-05/BP-07 pattern). Also adopt the proven `failResponse` helper used by the YR generators so failures return a typed JSON error the client can surface:

- `supabase/functions/generate-bp06-online-course/index.ts`
- `supabase/functions/generate-bp08-mastermind/index.ts`
- `supabase/functions/generate-bp09-speaking/index.ts`
- `supabase/functions/generate-bp05-webinars/index.ts` (already has it, leave alone)

This typically halves wall-clock time for gpt-5 — bringing BP-06/07/08/09 from 70–110s down to 30–55s.

### Layer 2: client-side, replace the SDK call with an explicit 180s fetch

In each of the four builders, swap:

```ts
const { data, error: fnErr } = await supabase.functions.invoke("generate-bp06-online-course", { body: { author_id: authorId } });
```

for an explicit `fetchWithTimeout` call to the function URL with a 180-second budget and the active JWT, matching `src/lib/marketing-hub-state.ts`:

```ts
import { fetchWithTimeout, getActiveToken } from "@/lib/get-active-token";

const token = await getActiveToken();
const res = await fetchWithTimeout(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-bp06-online-course`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ author_id: authorId }),
  },
  180_000,
);
const data = await res.json();
if (!res.ok || !data?.success) throw new Error(data?.error || `Request failed (${res.status})`);
```

Builders to update:
- `src/components/dashboard/builders/bp06/BP06Builder.tsx` (line 88)
- `src/components/dashboard/builders/bp07/BP07Builder.tsx`
- `src/components/dashboard/builders/bp08/BP08Builder.tsx`
- `src/components/dashboard/builders/bp09/BP09Builder.tsx`

### Layer 3: make the error visible (small UX fix)

Today, when the catch runs, the error panel only renders inside the Introduction step. That's fine for visibility — but `toAbbyError("Failed to fetch")` returns a generic "ABBY hit a snag" line. Add a slightly louder toast on failure so users don't miss it after a 90s wait:

```ts
} catch (e: any) {
  const msg = toAbbyError(e?.message || "Generation failed");
  setError(msg);
  setStep(0);
  toast.error(msg);
}
```

(`sonner` toast is already imported in BP06; same import exists in BP07/08/09.)

## Files touched

- `supabase/functions/generate-bp06-online-course/index.ts` — add `max_completion_tokens: 8000`.
- `supabase/functions/generate-bp08-mastermind/index.ts` — add `max_completion_tokens: 8000`.
- `supabase/functions/generate-bp09-speaking/index.ts` — add `max_completion_tokens: 8000`.
- `src/components/dashboard/builders/bp06/BP06Builder.tsx` — swap `supabase.functions.invoke` for `fetchWithTimeout` (180s) + add toast on catch.
- `src/components/dashboard/builders/bp07/BP07Builder.tsx` — same swap + toast.
- `src/components/dashboard/builders/bp08/BP08Builder.tsx` — same swap + toast.
- `src/components/dashboard/builders/bp09/BP09Builder.tsx` — same swap + toast.

## Out of scope

- Switching to a polling/job-queue architecture (overkill — 8k token cap brings runtimes well inside a 180s explicit fetch).
- Builder UI redesign, schema, RLS, prompt content, BP-05 (already working).
- Memory update — `mem://architecture/shared-backend-token-standard` already mandates `fetchWithTimeout`; this just brings the four builders into compliance.

## Verification

1. Open BP-06 → click **Build My Workbook** → spinner runs 30–60s → lands on Review step with a populated workbook.
2. Open BP-07 → click Generate → lands on Review with home-study course content.
3. Open BP-08 → click Generate → lands on Review with 3 special editions.
4. Open BP-09 → click Generate → lands on Review with speaking kit.
5. If the AI gateway ever fails, the user sees both the inline destructive panel **and** a red toast — no more silent return to Introduction.
6. Sidebar Brand Products counter advances to 9 of 9 once Pauline finishes all four.
7. `function_edge_logs` shows POST 200 with `execution_time_ms` < 90,000 for all four functions.

