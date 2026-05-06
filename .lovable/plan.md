# Stop the "ABBY hit a snag" banner from reaching users

## Why it happens today

`toAbbyError()` in `src/lib/abby-error.ts` is a *catch-all*. Whenever an edge function fails for a reason it doesn't recognise (timeout in an upstream API, AI gateway 5xx, JSON parse error, missing context, etc.), the fallback string "ABBY hit a snag…" is shown. So the banner is not one bug — it's the visible symptom of *any* unhandled edge-function failure across 28 builders.

To make it rare, we need to (a) prevent the failures, (b) recover automatically when they do happen, and (c) only show the snag banner as a true last resort.

## The plan — 4 layers of defence

### Layer 1 — Server-side resilience (eliminate most failures)

For all `generate-*` and `publish-*` edge functions:

1. **Auto-retry the AI gateway** on `429`, `408`, `500`, `502`, `503`, `504` and network errors — exponential backoff, max 2 retries. Most "snags" today are transient gateway hiccups.
2. **Retry JSON parse failures** once with a "your previous reply was not valid JSON, return JSON only" follow-up message. Today a single bad token kills the whole call.
3. **Validate inputs early** and return a *coded* error (`MANUSCRIPT_MISSING: …`, `BOOK_NOT_FOUND: …`) so `toAbbyError()` shows the specific message instead of the generic one. The pass-through for `^[A-Z_]+:` is already wired — we just need every function to use it consistently.
4. **Always log to `system_error_log`** via `_shared/log-error.ts` with severity `error`, so admins see the underlying cause without waiting for a user report.

### Layer 2 — Client-side auto-recovery

In `useBuilderGeneration` and `useBuilderPublish`:

1. **Silent retry once** on network/timeout/5xx before surfacing anything to the UI. The user never sees the first transient failure.
2. **Distinguish recoverable vs terminal errors.** Recoverable → toast + auto-retry. Terminal (validation, auth, payment) → inline message with a clear next action.
3. **Preserve work.** Already partially done — make sure local draft state is autosaved *before* any generate/publish call so a failed call never loses input.

### Layer 3 — Better friendly messaging

Tighten `toAbbyError()` so the generic fallback is genuinely the last resort:

- Add explicit branches for: AI gateway 5xx ("ABBY's brain is briefly offline, retrying…"), JSON parse ("ABBY's reply got mangled, click Try Again"), missing book context, missing manuscript, Stripe-required, library-asset upload failures.
- The remaining unmatched cases get a shorter, less alarming line ("ABBY couldn't finish that step. Click Try Again.") and a "Report this" link that pre-fills support email with the node ID and timestamp.

### Layer 4 — Visibility & monitoring

1. **Admin Errors tab** already exists (`src/components/admin/ErrorsTab.tsx`). Make every builder funnel its caught errors through `log-error` so the tab becomes the early-warning system.
2. **Daily ABBY health digest** — extend the existing `abby-daily-report` to surface the top 5 error signatures from the last 24h so the team catches a regression before users do.
3. **Soft circuit-breaker.** If a single edge function returns 5xx more than N times in 5 minutes, the client shows a maintenance banner ("ABBY is briefly catching her breath") instead of letting every user trigger the same failure.

## Files that will change

- `src/lib/abby-error.ts` — finer-grained branches, softer fallback copy.
- `src/hooks/useBuilderGeneration.ts`, `src/hooks/useBuilderPublish.ts` — silent single retry on transient failures, recoverable-vs-terminal split.
- `supabase/functions/_shared/builder-helpers.ts` — `callAiGateway()` wrapper with retry + JSON-repair, `failResponse()` standardised on coded errors.
- All `supabase/functions/generate-*` and `publish-*` index.ts — switch to the new helper (mechanical change, no logic rewrite).
- `supabase/functions/abby-daily-report/index.ts` — append top error signatures.
- `src/components/admin/ErrorsTab.tsx` — small UX pass: group by signature, show count + last seen.

## Out of scope (not changing)

- The Global Error Boundary fallback — already friendly.
- Builder UI flows — no visual redesign.
- Node gating, publishing, or commerce logic.

## Expected outcome

- Most transient AI gateway and JSON failures recover invisibly (estimate ~70–80% of current snags).
- Remaining failures show a *specific*, actionable message — never the generic one — except in genuinely unknown cases.
- Admin gains live visibility so regressions are caught in hours, not weeks.
