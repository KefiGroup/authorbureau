

# Plan — Remove `temperature` Override from BP-05 → BP-09 Generators

## Diagnosis (verified in code)

All five Brand-Products generators call `openai/gpt-5` with `temperature: 0.7`, which the Lovable AI Gateway rejects with HTTP 400 for any `gpt-5*` model. Per Core memory: *"NEVER pass `temperature` override on `openai/gpt-5*` calls — only default (1) is supported."* This is exactly the bug we fixed across the 10 YR generators.

Confirmed offending lines:

| Function | File | Line |
|---|---|---|
| BP-05 Webinars | `supabase/functions/generate-bp05-webinars/index.ts` | 132 |
| BP-06 Workbook | `supabase/functions/generate-bp06-online-course/index.ts` | 78 |
| BP-07 Home Study | `supabase/functions/generate-bp07-coaching/index.ts` | 73 |
| BP-08 Special Editions | `supabase/functions/generate-bp08-mastermind/index.ts` | (in body) |
| BP-09 Speaking/Sales Kit | `supabase/functions/generate-bp09-speaking/index.ts` | (in body) |

User-visible symptoms match: BP-05 surfaces "ABBY hit a snag…" (toast from the AI gateway 400); BP-06 silently returns to Introduction (the generator throws and the builder resets without showing the toast).

## Fix

Delete the `temperature: 0.7,` line in each of the five files. Leave everything else (model, messages, `max_completion_tokens` where present) untouched. No prompt changes, no schema changes, no DB changes.

For BP-07 the body becomes:
```ts
body: JSON.stringify({
  model: "openai/gpt-5",
  messages: [...],
  max_completion_tokens: 8192,
}),
```

Same shape for the other four (without `max_completion_tokens` where it isn't currently present).

## Files touched

- `supabase/functions/generate-bp05-webinars/index.ts` — remove `temperature: 0.7,`
- `supabase/functions/generate-bp06-online-course/index.ts` — remove `temperature: 0.7,`
- `supabase/functions/generate-bp07-coaching/index.ts` — remove `temperature: 0.7,`
- `supabase/functions/generate-bp08-mastermind/index.ts` — remove `temperature: 0.7,`
- `supabase/functions/generate-bp09-speaking/index.ts` — remove `temperature: 0.7,`

Five 1-line deletions. All functions auto-redeploy.

## Out of scope

- BP-01 → BP-04, BA-10 → BA-18, YR-19 → YR-28 — already correct.
- AI prompts, JSON schemas, DB schema, RLS, builders, save-author-node — unchanged.
- Memory update — Core rule already documents this constraint; no addition needed.

## Verification

1. Open BP-05 Webinars builder → click Generate → completes successfully, returns webinar plan, status flips to `content_ready`.
2. Open BP-06 Workbook → Generate → returns workbook structure, no silent reset.
3. Open BP-07 Home Study Course → Generate → returns 3-week plan.
4. Open BP-08 Special Editions → Generate → returns 3 editions + bundle.
5. Open BP-09 Speaking/Sales Kit → Generate → returns event types + pricing tiers.
6. Sidebar Brand Products counter increases as each node hits `content_ready` (e.g. 4 → 9 once all five generate for Pauline).
7. No more `AI gateway error: 400` entries in `generate-bp0*` edge function logs.

