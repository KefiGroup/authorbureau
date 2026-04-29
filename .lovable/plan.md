## Finish Audit #1 — Phase 2 Walkthrough + Phase 3 Scoring

Phase 1 (pre-flight fixes) and the BP-00 / dead-column repairs are already shipped. This plan closes out what's left: the live walkthrough on Pauline's account and the scored 8-level report.

### Test identity
- Email: `support@paulineteo.com` (already signed in per auth logs at 21:50:41)
- Books: 2 existing (audit re-uses them, no destructive changes)
- `author_context` confirmed healthy (5 frameworks, valid `parsed_at` for both books)

### Phase 2 — Live walkthrough (browser-driven)
1. **Auth page (`/auth`)** — Verify the new "New here?" helper copy renders, no `Function components cannot be given refs` warning interferes with submission. Confirm the gotrue lock-timeout warnings already in console don't block sign-in.
2. **Dashboard first paint (`/dashboard`)** — Confirm the page loads without errors, the user's name resolves, and the 28-node grid renders (account is already past onboarding).
3. **28-node integrity** — Spot-check 5 canonical labels in the UI against `builderNodeConfig.ts`: BA-15 Media & PR, BA-18 JV Partnerships, YR-25 Certification, YR-27 Fundraising, YR-28 Sponsors.
4. **BP-01 (Email Marketing)** — Open the node, click Generate, verify the sequence is book-specific (not generic), then click Activate / Go Live. Confirm the card flips to Live and no spinner hangs.
5. **One Yield-tier node spot-check** — Open YR-25 to verify the gating UX renders correctly (either unlocked for superadmin or "Upgrade to Unlock" copy).

### Phase 3 — 8-level pass/fail scoring
Each level gets PASS / FAIL / PARTIAL with evidence (screenshot, DB row, network ID, console excerpt):

1. **Console / Network** — Zero red errors on each page touched. Note: existing `forwardRef` warnings and gotrue lock-timeout warnings are pre-existing and will be flagged separately, not as Phase 2 regressions.
2. **Interactive elements** — Every button/link/input on the pages touched is functional with correct disabled states.
3. **Empty / loading states** — Every screen has a sensible empty/loading state.
4. **Database integrity** — Cross-check `auth.users`, `author_profiles`, `books`, `author_context`, `author_nodes`, `generated_assets` for Pauline. Already partially verified.
5. **Mobile (375px)** — Spot-check `/auth`, `/dashboard`, BP-01 detail at 375×812.
6. **Auth boundaries** — Incognito hit to `/dashboard` redirects to `/auth`; logged-in hit to `/auth` redirects to `/dashboard`.
7. **Error handling** — Trigger one bad action (e.g. open a node that requires data we know is missing) and confirm error toast is human-readable.
8. **Navigation** — No dead ends; every screen has a back-to-dashboard path.

### Phase 4 — Surgical fixes for any failures
Any failure in Phase 3 gets a minimal fix in the same loop, then the affected level is re-tested. Likely candidates based on what's already in console:
- The `forwardRef` warning on `Footer` (used in `Auth.tsx`) and `AbbyHelpChatbot` — wrap with `React.forwardRef` if either component is ever passed a ref. Low-risk one-line fixes.
- The persistent gotrue lock-timeout warnings — already mitigated by `getActiveToken()`'s 2s race, but if they cause user-visible delays during the walkthrough, audit any remaining direct `supabase.auth.getSession()` callers.

### Deliverable
A single message at the end with:
- 8-level scorecard (PASS / FAIL / PARTIAL + evidence per level)
- List of files changed in Phase 4 (if any)
- Known pre-existing issues surfaced but not fixed (with recommendation)

### What I will NOT do
- No destructive changes to Pauline's books or nodes.
- No schema migrations unless Phase 3 surfaces a missing column (will surface for approval first).
- No Google Auth, no GHL, no Commerce changes — out of scope.

Approve and I'll execute Phase 2 → 4 in one continuous pass and deliver the report.