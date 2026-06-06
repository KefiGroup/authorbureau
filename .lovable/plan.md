# Audit Findings & Fix Plan — 28-Node Looping

## What the audit reported
- 9/28 nodes working (incl. pre-built BP-01/BP-04/BA-11), 3 confirmed looping (BP-07, BP-09, BA-12), 17 untested but predicted to loop (BA-13–18, YR-19–28).
- The audit's hypothesis: looping builders "were not converted to `invokeGenerator`."

## What the code actually shows (verified)
That hypothesis is **incorrect**. Every looping builder already calls `invokeGenerator` (BP-07 line 146, BP-09 line 102, BA-12 line 79, plus BA-13–18 and YR-19–28). The client error/retry handling is also correct (e.g. BA-12 catches the error, returns to step 0, shows "Try Again").

The real differentiator is the **AI model and token budget** in each edge function:

```text
RELIABLY WORKING            -> google/gemini-2.5-flash   (fast, ~20-90s)
  BP-02, BP-03, BP-06, BA-10

STILL LOOPING / UNTESTED    -> openai/gpt-5*  (slow, often >200s)
  BP-07  gpt-5     (8192 tok)
  BP-09  gpt-5.2   (12000 tok)
  BA-12  gpt-5-mini
  BA-13..BA-18     gpt-5-mini
  YR-19..YR-28     gpt-5   (16000-24000 tok)  <- slowest, highest risk
```

Because `invokeGenerator` aborts at 200s, a slow `gpt-5` call makes the "Generating" screen cycle its cosmetic status messages for 3+ minutes and then fail — which the user experiences as an endless loop. The two nodes that pass on `gpt-5` (BP-05, BP-08) only do so because they finish just under the limit; they are borderline.

## The fix
Switch the slow content generators from `openai/gpt-5*` to `google/gemini-2.5-flash` — exactly the change that already fixed BP-03 and BP-06. This is a one-line model swap per function; the Lovable AI Gateway is OpenAI-compatible so request/response parsing and `max_completion_tokens` stay unchanged (BP-06 already runs gemini with `max_completion_tokens: 12000`).

### Functions to update
- **Confirmed looping:** `generate-bp07-home-study`, `generate-bp09-book-sales`, `generate-ba12-membership`
- **Untested, same slow model:** `generate-ba13-group-coaching`, `generate-ba14-podcast`, `generate-ba15-media-pr`, `generate-ba16-affiliate`, `generate-ba17-bundles`, `generate-ba18-jv-partnerships`
- **Yield (slowest, 16k–24k tokens):** `generate-yr19-coaching`, `generate-yr20-big-ticket`, `generate-yr21-speaking`, `generate-yr22-corporate`, `generate-yr23-mastermind`, `generate-yr24-retreats`, `generate-yr25-certification`, `generate-yr26-conference`, `generate-yr27-fundraising`, `generate-yr28-sponsors`
- **Borderline (also swap for safety/consistency):** `generate-bp05-webinars`, `generate-bp08-special-editions`

### Guardrails
- Do **not** add any `temperature` override (project rule: gpt-5 forbids it; gemini keeps default — keeping bodies unchanged satisfies both).
- Keep each function's existing prompt, JSON schema, and `max_completion_tokens`. Only the `model` string changes.
- Leave already-working nodes untouched: BP-01/02/03/04/06, BA-10/11. Leave `generate-bp00-analysis` (internal pre-step) and image generators as-is.

## Verification
After deploying, test the representative broken nodes end-to-end with `curl_edge_functions` against the audit book (`dee3e31e-...`, author Pauline Teo):
- BP-07, BP-09, BA-12 (the 3 confirmed loops)
- BA-13 and YR-19 (representatives of the untested set)

Confirm each returns `{ success: true, content: ... }` well under the timeout, so the builder reaches the Review step instead of cycling.

## Expected result
All remaining generators complete in ~20–90s and reach Review reliably — ending the looping across BP-07/09, BA-12–18, and YR-19–28, consistent with the nodes that already work.
