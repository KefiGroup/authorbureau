## Why BP-03 and BP-06 still "loop forever"

The previous timeout patch was applied correctly — both builders already abort and surface an error after ~180–200s. The real problem is **upstream**: their AI generators are so slow they never finish inside that window, so the cosmetic "Step 1→2→3" animation just keeps cycling until the timeout fires. The passing builders prove the pattern:

| Builder | Model | AI calls | Result |
|---|---|---|---|
| BP-02 Lead Magnets | gemini-2.5-flash | small | PASS |
| BA-10 Course | gemini-2.5-flash | small | PASS |
| BP-05 Webinar | gpt-5 | 1 modest call | PASS |
| **BP-03 Social** | **gpt-5.2** | **3 sequential calls (12k + 20k + 12k tokens, 60 posts)** | FAIL |
| **BP-06 Workbook** | **gpt-5** | **1 huge call (12k tokens, full workbook)** | FAIL |

BP-03 chains three large reasoning-model calls back-to-back (easily 200s+ combined). BP-06 asks gpt-5 for a 12k-token workbook in one shot, which alone can exceed 180s. Both reliably outrun the client timeout.

## The fix

### 1. BP-03 Social Media (`supabase/functions/generate-bp03-social-media/index.ts`)
- **Run the three `callAI` calls in parallel** with `Promise.all` instead of sequentially. The three prompts (LinkedIn / Instagram+Facebook / Twitter+outreach) are independent — the only reason they were sequential was to update the progress label, which we can collapse into a single "Writing your 60-post calendar…" update before the parallel call.
- **Switch the model to `google/gemini-2.5-flash`** (same model the passing builders use) for much lower latency on large structured JSON.
- Keep the existing prompts, archetype manifest, JSON parsing, and 20-day output shape unchanged.

### 2. BP-06 Workbook (`supabase/functions/generate-bp06-workbook/index.ts`)
- **Switch the model from `openai/gpt-5` to `google/gemini-2.5-flash`** so the single workbook call completes well within the timeout.
- Keep the prompt, JSON keys/shapes, and `normalizeOutcome` post-processing unchanged.

### 3. Deploy + verify
- Deploy both edge functions.
- Confirm each returns a valid JSON payload that reaches the Review step (curl/log check), and that BP-03 still produces the full 20-day / 4-platform calendar and BP-06 still produces all workbook sections.

## Notes
- No client/UI changes are needed — the existing timeout + retry plumbing is correct; we're removing the cause, not the symptom.
- This deviates from the "gpt-5.2 for gen" memory rule for these two nodes specifically, but it matches what the already-passing generators (BP-02, BA-10) do. I'll flag this so the memory can be reconciled if you want consistency across all nodes.
- BP-05 (gpt-5) passes today, so it's left as-is unless you'd prefer the same speed treatment.

## Verification checklist
- BP-03 reaches Review with 20 LinkedIn + 20 IG + 20 FB + 20 X posts and 3 outreach emails for the VIP book.
- BP-06 reaches Review with the full workbook (all 5 sections) for the VIP book.
- Neither builder cycles past ~30–60s before showing Review.
