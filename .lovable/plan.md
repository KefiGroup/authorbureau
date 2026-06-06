## What the audit got wrong vs. what's real

The report came from an external agent using a **different (incorrect) 28-node map**. Verified against this project's canonical config (`builderNodeConfig.ts`):

- **BUG-BUILD-03 (node ID mismatch) — NOT A BUG.** In this project BP-05 *is* Webinars and BP-06 *is* Workbook by design. `NodeBuilder.tsx` routes every node to the correct builder. Nothing to fix; the auditor expected a different architecture.

Confirmed in the database for the tested book (`dee3e31e…`, "Invest Like Buffett", author Pauline Teo):
- The book **already has** an `author_context` analysis row, so `context_blocked` should not fire for it.
- **No server-side errors logged** (`system_error_log`) in 10 days, and no 5xx in edge logs. The generators are **not crashing** — they hang or run long, and the UI has no timeout.

## Real root cause of the "infinite loop"

Each builder's "Generating" step shows a `setInterval` animation that rotates messages every 3s (BP-02: 5 messages; BP-03: "Step 1/2/3 of 3"). This rotation is **cosmetic**. The actual AI call uses `supabase.functions.invoke(...)` with **no client-side timeout and no abort**. If the function is slow or the connection stalls, the promise never settles, so the animation rotates forever with no error and no retry. That is exactly the "loops forever / never reaches Review" symptom (BUG-01, BUG-02, BUG-05).

## Fix plan

### 1. Add a timeout + error/retry to every AI generation call (fixes BUG-01, BUG-02, BUG-05)
- Create a small shared helper `invokeGeneratorWithTimeout(fnName, body, { timeoutMs })` (wrapping the existing `fetchWithTimeout` + `getActiveToken` pattern already used in `funnels-api.ts`), default ~200s, that calls the edge function and rejects clearly on timeout/abort.
- Replace the bare `supabase.functions.invoke("generate-bpXX-…")` calls in the builders with this helper so a hang becomes a visible, catchable error.
- On error: leave the "Generating" step, show a clear message ("This took too long or failed — please try again") with a **Retry** button. BP-02 already has a Try Again affordance on step 0; apply the same pattern to BP-03 and BP-05 (and the same generator-call sites in other builders that use the identical pattern).
- Apply the same timeout to `AnalyseBookGate` (`generate-bp00-analysis`) so the "Analyse this book" button surfaces a real error instead of silently reverting (BUG-02).

### 2. Fix wrong book name in BP-02 intro (BUG-BUILD-04)
- The intro line uses `detectedBookTitle || bookTitle`. `detectedBookTitle` comes from `useAuthorBook()`, which is **not book-scoped** and returns the author's default book ("Be SUCKcessful"), causing cross-book contamination when a `bookId` is in the URL.
- Change the precedence to prefer the per-book resolved `bookTitle` (already resolved via `resolveBookTitle(authorId, activeBookId, …)`) and only fall back to `detectedBookTitle` when no `activeBookId` is present.

### 3. Category badge audit (BUG-BUILD-06)
- `BuilderHeader` renders only the node-ID chip with the correct category color (no "Yield" text), so the green "Yield" badge the auditor saw is the **global dashboard/account tier badge**, not a per-node bug. Confirm by reading the dashboard header; if it's showing the account `subscription_tier`, leave as-is (correct behavior). No node-builder change expected here — verify only.

### Scope note
Fixes 1–2 are the substantive work and unblock all 28 nodes since they share the same generation pattern. I'll apply the timeout/retry to the shared call sites rather than rewriting each builder.

## Verification
- Trigger BP-02 / BP-03 / BP-05 generation; confirm it either completes to Review or, on a forced failure/timeout, shows an error + Retry (no endless rotation).
- Open BP-02 for the "Invest Like Buffett" book via Book Hub; confirm the intro names that book, not "Be SUCKcessful".
- Confirm BP-05/BP-06 still load Webinars/Workbook respectively (unchanged, correct).
