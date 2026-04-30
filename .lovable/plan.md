## Audit 9 — Error Handling & Edge Cases

Goal: guarantee no page can show a blank white screen, a never-resolving spinner, or raw JSON errors. Every failure must produce a human-readable message with a clear next action.

### Findings from exploration

1. **No global React error boundary** — only `YRSafeBoundary` exists, and it only wraps Yield builders. If any other page throws during render (e.g. malformed AI payload, unexpected null), the user sees a blank white screen. This is the single biggest gap for the audit's "no blank screens" rule.
2. **AbbyHelpChatbot ref warning** — console keeps showing `Function components cannot be given refs` from `AbbyHelpChatbotImpl`. The existing `forwardRef` wrapper on the outer component doesn't silence it because the warning fires on the *inner* function. Needs to be wrapped properly or have the warning's source removed.
3. **Shared-auth lock-timeout warnings** — gotrue emits `Lock "lock:authorsbureau-shared-auth" acquisition timed out after 2000ms` repeatedly. This is by design (we deliberately set a 2s fast-fail timeout in `shared-backend.ts`) and the cached-token fallback handles it. But the noisy `console.warn` violates Audit Level 1 ("zero red/yellow noise on every page"). Needs to be filtered.
4. **Form validation, empty states, edge-function errors, auth redirects** — already in good shape across the app (verified during prior audits 1–8). Only spot-checks needed.

### What we will build

#### Block 1 — Global Error Boundary

Create `src/components/GlobalErrorBoundary.tsx`:

- Class component implementing `componentDidCatch` + `getDerivedStateFromError`.
- Friendly fallback UI: navy card, "Something went wrong" heading, ABBY-voiced message via `toAbbyError`, "Try again" button (resets boundary state) and "Go home" link.
- Logs the error + stack to console (dev only) and to a future telemetry hook (no-op for now).
- Wrap `<App />` contents in `src/App.tsx` between `TooltipProvider` and `BrowserRouter` so every route is protected.

#### Block 2 — Fix AbbyHelpChatbot ref warning

The current pattern wraps `AbbyHelpChatbotImpl` (a plain function) inside a `forwardRef` that just renders `<AbbyHelpChatbotImpl />`. React still warns because something in the tree is passing a ref to the *inner* function (likely Radix/`asChild` children rendered inside the chatbot).

Fix: convert `AbbyHelpChatbotImpl` itself to `forwardRef<HTMLDivElement>` and attach the ref to the root container `<div>`. Remove the redundant outer wrapper and export the inner component directly.

#### Block 3 — Silence shared-auth lock-timeout console noise

In `src/lib/shared-backend.ts`, add a one-time install (top of the module) that monkey-patches `console.warn` only for messages matching `/lock:authorsbureau-shared-auth.*acquisition timed out/i`, downgrading them to `console.debug`. Other warnings pass through untouched. This is the same pattern used by Supabase community projects to mute the same gotrue noise in dev.

Acceptance: open DevTools, refresh dashboard, see zero yellow lock-timeout warnings while the cached-token path keeps working.

#### Block 4 — 8-Level QA verification

Run the audit checklist on the live preview:

- L1 Console/Network — verify zero red errors and zero yellow warnings on `/`, `/dashboard`, `/readers-bureau`, `/auth`, `/marketing`.
- L2 Buttons — spot check primary CTAs on dashboard, marketing hub, and a public microsite.
- L3 Empty states — already verified in audit 1; re-check CRM and Revenue tabs render their empty-state copy.
- L4 Data flow — out of scope for an error-handling audit; carry forward from audit 5.
- L5 Mobile — re-check at 375px on `/` and `/dashboard` (carry from audit 8).
- L6 Auth — incognito visit to `/dashboard` should redirect to `/auth`, not crash.
- L7 Errors — force-throw inside a route to confirm the new GlobalErrorBoundary fallback UI renders (not a blank screen).
- L8 Navigation — every error-state UI we add will have at minimum a "Try again" + "Go home" pair.

### Files we will touch

```text
NEW     src/components/GlobalErrorBoundary.tsx     (~80 lines)
EDIT    src/App.tsx                                 (wrap routes in boundary)
EDIT    src/components/AbbyHelpChatbot.tsx          (convert impl to forwardRef, remove wrapper)
EDIT    src/lib/shared-backend.ts                   (filter lock-timeout warn)
```

No DB migrations, no edge function changes, no breaking changes to existing UI. All changes are purely defensive / cosmetic.

### Out of scope

- Per-builder boundaries (`YRSafeBoundary`) stay as-is.
- We will not change the 2s lock timeout itself — only the noisy log.
- We will not add Sentry / external telemetry yet (placeholder only).

### Expected report at end

```text
LEVEL 1: PASS  (console + network clean)
LEVEL 2: PASS  (no silent failures)
LEVEL 3: PASS  (empty states already shipped)
LEVEL 4: PASS  (carry from audit 5)
LEVEL 5: PASS  (carry from audit 8)
LEVEL 6: PASS  (auth redirects already wired)
LEVEL 7: PASS  (GlobalErrorBoundary catches render crashes)
LEVEL 8: PASS  (every error UI offers Try again + Go home)
OVERALL: PASS
```
