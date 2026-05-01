# Audit: Business Rules vs Master Architecture v4.0

I've cross-read **`Authors_Bureau_-_Full_Master_Architecture_Plan-2.pdf`** (the 7-Engine native architecture) against our current `supabase/functions/_shared/node-readiness.ts` (the single source of truth all three counters import). The Manus alignment audit is correct — here's the verified picture against our actual code.

## What's already aligned ✅

- **28-node universe** (BP-01–BP-09, BA-10–BA-18, YR-19–YR-28) — matches.
- **16 author-level / 12 book-level scoping** (`AUTHOR_LEVEL_NODES` set) — matches.
- **Two-gate Live rule** (DB `status='live'` + content gate) — matches, with `warnIfStuckLive` diagnostic in place.
- **Counter consistency contract** (Book Hub tabs, dashboard card, MultiBookPicker all import the shared module) — matches.
- **Specific gates** for `BP-04`, `BA-13`, `BA-14`, `BA-15` — matches the architecture and is covered by `src/lib/__tests__/node-readiness.test.ts`.

## Where the rules don't yet match the architecture ⚠️

The architecture says each node is powered by a specific **Engine + Commerce hookup**. Today, 22 of the 28 nodes fall through to the generic gate (any non-empty `content_json` passes). That means a node can be marked Live with just `{title: "..."}` and inflate the X/28 counter without the engine actually being wired. The biggest exposure is the **Yield tier (YR-19–YR-28)** — our entire revenue tier — and any **Commerce Engine** node where Stripe isn't connected.

The other class of drift is **engine-level signals** that exist in the architecture but aren't checked: BP-01 (Email Engine wired), BP-03 (Buffer permanently removed — gate should check that ABBY generated the calendar, not that Buffer is connected), BA-11 (manual ACX submission, gate should check the script).

## Proposed business-rule refinements

All edits land in **one file** — `supabase/functions/_shared/node-readiness.ts` — which the frontend re-exports via `src/lib/node-readiness.ts`. New tests are added to `src/lib/__tests__/node-readiness.test.ts` to lock each rule.

### 1. Author-level Stripe gate for commerce nodes (HIGH)

Add a helper `requiresStripe(nodeId)` and a check that fails the gate when the node is commerce-bearing **and** the author has no `stripe_account_id`. This needs `content_json` callers to pass an optional `{ stripeConnected: boolean }` context — `useNodeLiveStats`, `useBookNodeProgress`, and `author-stats` already know the author, so they can supply it from `author_profiles.stripe_account_id`.

Commerce-bearing nodes (per architecture's Engine map): `BP-06, BP-07, BP-09, BA-10, BA-12, BA-13, BA-17, YR-19, YR-20, YR-21, YR-22, YR-23, YR-24, YR-25, YR-26, YR-27, YR-28`.

### 2. Per-node content gates (replace generic gate)

```text
BP-01 Email Marketing  → email_sequence_id AND ≥1 sequence step
                          (or legacy sequence_steps[] non-empty)
BP-03 Social Media     → posts_generated > 0 OR content_calendar_id
                          (Buffer signal explicitly NOT checked)
BP-06 Workbook         → title AND (pdf_url OR stripe_price_id)
BP-07 Home Study       → title AND (course_id OR stripe_price_id)
BP-09 Book Sales       → title AND (amazon_url OR stripe_price_id
                                    OR sales_page_url)
BA-10 Online Course    → title AND (course_id OR modules.length > 0
                                    OR stripe_price_id)
BA-11 Audiobook        → narration_script_url OR acx_guide_generated===true
                          (keep current isLive activated check intact)
BA-12 Membership       → title AND stripe_price_id (recurring)
BA-17 Bundles          → title AND stripe_price_id AND items.length ≥ 2
YR-19..YR-28           → title AND (stripe_price_id OR price_usd > 0);
                          session-style (YR-19, YR-22, YR-23, YR-24)
                          additionally need session_type OR booking_url
```

Existing gates for **BP-04, BA-13, BA-14, BA-15** stay exactly as-is — they're already validated by tests and battle-proven.

### 3. Test coverage

Extend `node-readiness.test.ts` with one `describe` block per new rule, each covering: empty-rejected, partial-rejected, happy-path-accepted, and (for commerce nodes) `stripeConnected:false` rejected. This is the same fixture pattern that's already there.

### 4. Caller updates (small, surgical)

- `src/hooks/useNodeLiveStats.ts` and `src/hooks/useBookNodeProgress.ts`: when loading the author profile, also select `stripe_account_id` and pass `{ stripeConnected: !!profile.stripe_account_id }` into `hasRequiredAssets`.
- `supabase/functions/author-stats/index.ts`: same one-line change against the service-role profile fetch.

No UI changes, no DB migrations. The lift is entirely in the rules module + its three callers + tests.

## Out of scope (intentionally)

- Renaming "Stripe" anywhere user-facing — already abstracted as "Payouts".
- Changing the BP-04 microsite gate — it just landed.
- The architecture's UX rules (dark navy + gold, ABBY tone) — those live elsewhere and aren't node-readiness concerns.
- Admin-only "engine health" dashboard — useful, but a separate sprint.

## Files changed

```text
supabase/functions/_shared/node-readiness.ts        (rules + helper)
src/hooks/useNodeLiveStats.ts                       (+stripeConnected)
src/hooks/useBookNodeProgress.ts                    (+stripeConnected)
supabase/functions/author-stats/index.ts            (+stripeConnected)
src/lib/__tests__/node-readiness.test.ts            (+~10 describe blocks)
```

## Expected impact

Authors who haven't connected payouts will see commerce nodes correctly drop from Live → content_ready until they finish setup — exactly what the architecture intends. The X/28 dashboard counter becomes a **truthful capability score** instead of a click-count, which is the whole reason the readiness module exists.

Approve to implement.
