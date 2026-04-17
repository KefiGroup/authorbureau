

## Sprint 35b — Fix Broken Author Flows

Six bugs across BP-03/04/05/09 builders, Funnels Hub, and the sidebar counter. All native (no GHL). Plain-English ABBY voice throughout.

### Bug 1 — BP-04 "Edge Function" error
- **Edge function (`generate-bp04-website`)**: add detailed `console.log` for inputs (author_id, hasContext, prompt length), wrap LLM call with explicit error capture, switch model to `openai/gpt-5.2` (project standard) and tighten `max_completion_tokens` to 4000 to avoid timeout. Return user-safe error string in `error` field instead of raw exception.
- **Friendly error wrapper**: create `src/lib/abby-error.ts` with `toAbbyError(err)` that converts any technical/edge-function/network error into:
  > "ABBY hit a snag and needs a moment to recover. Please click 'Try Again' — this usually resolves itself. If it keeps happening, reach out to support."
- **All 28 builders**: replace inline `{error}` rendering with `{toAbbyError(error)}`. Try Again button already exists in most; verify presence and that it does NOT reset `step` to 0 mid-generation (only on retry click).

### Bug 2 — BP-03 stuck at 75%
Refactor `generate-bp03-social-media` into 3 sequential LLM calls invoked from one orchestrator function:
1. LinkedIn (5 posts, 150–200 words)
2. Instagram (5) + Facebook (5)
3. X/Twitter (5) + 3 outreach email templates

Drop the 30-day email sequence (handled by Sprint 34 Email Engine). Stream progress via incremental status updates written to `author_nodes.content_json.progress` (polled every 2s by client) so the UI shows: "Writing LinkedIn... ✓", "Now Instagram + Facebook...", "Almost there — outreach templates...".

Update BP-03 introduction copy to:
> "I'm going to create your social media starter kit for '${bookTitle}' — 20 ready-to-post pieces across LinkedIn, Instagram, Facebook, and X, plus 3 outreach email templates. Ready?"

Update `GENERATING_MESSAGES` array to match the 3-step flow.

### Bug 3 — BP-05 / BP-09 dead-end gate
Replace the "Complete Book Profile" redirect block in `BP05Builder.tsx` and `BP09Builder.tsx` with an inline `BookProfileQuickForm` component (3 fields: title, ideal reader, transformation). On submit, upsert into `author_context` and `books`, then proceed directly to ABBY's intro (no redirect). Skip entirely when all 3 fields already populated.

Apply same fix to BP-04 and BP-08 (same pattern present).

### Bug 4 — "'your book'" placeholder
Audit all 28 builders. Pattern is already mostly correct (`{detectedBookTitle || "your book"}`) but `useAuthorBook` may resolve `detectedBookTitle` async, leaving the literal showing. Fix:
- In each builder, gate the intro card render on `!isBookLoading` so the title is resolved before display.
- Add fallback chain: `detectedBookTitle || ctxBookTitle || bookTitle || "your book"`.
- Ensure the fallback string appears only when truly no book exists (in which case Bug 3's inline form should trigger instead).

### Bug 5 — My Funnels retroactive prompt
In `FunnelsHub.tsx`, when `funnels.length === 0`:
- Query `author_nodes` for any live BP-02/04/05/09.
- If found, render an ABBY card:
  > "You already have a live lead magnet at authorsbureau.com/${authorSlug}/free-gift. Want me to build a high-converting opt-in landing page for it? Takes about 30 seconds."
  > [Generate My Opt-In Page →]
- Button calls `generate-funnel` with `{ author_id, node_id: 'BP-02', funnel_type: 'lead_magnet' }`, then reloads the list.

### Bug 6 — Sidebar "0 built" flicker
In `DashboardSidebar.tsx`:
- Read `localStorage.getItem('ab_bp_built_count')` (with `{value, ts}` shape, 5-min TTL) at mount, hydrate `buildUnlocked` initial state.
- After live fetch (already done in parent), write fresh value back to localStorage.
- Apply same pattern to `buildAuthorityUnlocked` and `yieldUnlocked` keys.

### Files touched
- `supabase/functions/generate-bp04-website/index.ts` (logging, model, tokens)
- `supabase/functions/generate-bp03-social-media/index.ts` (3-step refactor)
- `src/lib/abby-error.ts` (new)
- `src/components/dashboard/builders/shared/BookProfileQuickForm.tsx` (new)
- `src/components/dashboard/builders/bp03/BP03Builder.tsx`
- `src/components/dashboard/builders/bp04/BP04Builder.tsx`
- `src/components/dashboard/builders/bp05/BP05Builder.tsx`
- `src/components/dashboard/builders/bp08/BP08Builder.tsx`
- `src/components/dashboard/builders/bp09/BP09Builder.tsx`
- All other BP/BA/YR builders: swap error rendering to `toAbbyError` (search-and-replace)
- `src/components/dashboard/FunnelsHub.tsx` (retro prompt)
- `src/components/dashboard/DashboardSidebar.tsx` (cached counters)

### Out of scope (per master rule)
BP-01, BP-02 (already-published quiz funnel), Marketing Hub, CRM, admin panel, Sprint 34/35 funnel infra. Untouched.

### Phasing
- **Phase A**: Bugs 1 + 4 (error wrapper + book title fix) — fastest unblock
- **Phase B**: Bugs 2 + 3 (BP-03 refactor + inline book form)
- **Phase C**: Bugs 5 + 6 (Funnels retro prompt + sidebar cache)

Approve to proceed with Phase A.

