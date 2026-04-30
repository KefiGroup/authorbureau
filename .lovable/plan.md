## Section 1 — Author Dashboard Bug Fixes

### Verification (what I found in the code)

- **Pauline's account**: 2 books, 28 author_nodes, 2 saved business plans. So she is unambiguously a returning author.
- **Bug 1 (Meet Abby)**: `src/components/dashboard/ABBYFrameworkDashboard.tsx` shows `<MeetAbbySection>` whenever `!hasPlan`. `hasPlan` is loaded asynchronously via `abby-execute action:status` for **only the first book** (line 126), and only flips true after a separate fetch resolves *after* `hasBootstrapped` is set. Result: returning authors with multi-book accounts, slow networks, or a plan saved against the second book see the onboarding flash on every login.
- **Bug 2 (skeleton flash)**: `src/components/dashboard/book-hub/BookHubOverview.tsx` line 135 renders `<BookHubSkeleton/>` until **all** of these resolve serially: a `consultation-session` POST, a `generated_assets` SELECT, and a `business-consultant get-plan` POST. Three round-trips before any UI paints — that's the multi-second grey-card delay.
- **Bug 3 (BP-013 etc.)**: `src/components/dashboard/book-hub/JourneyStepper.tsx` lines 92–109 render the node code (e.g. `BP-01`) and immediately below it a circular badge containing the `sequence` integer (e.g. `3`, `4`, `6`). The DB and `NODE_CODE_MAP` are clean (`BP-01`, `BP-03`, `BP-09`); the malformed strings the user sees are the **stacked code + sequence circle reading as one token** (BP-01 + 3 = "BP-013", BP-03 + 4 = "BP-034", BP-09 + 6 = "BP-096"). The sequence badge is also redundant with the code itself.

### Fixes

**Bug 1 — Hide Meet Abby for returning authors**
- File: `src/components/dashboard/ABBYFrameworkDashboard.tsx`
- Change the gate at line 283 from `if (!hasPlan)` to `if (!hasPlan && bookCount === 0 && myBooks.length === 0)`.
- Rationale matches the spec: any author who already has a book is past onboarding. The Meet Abby section is preserved only for true first-time users (zero books).
- Returning authors with books fall through to the normal dashboard (`MonetizationUniverse` + book hub) immediately.

**Bug 2 — Eliminate Analysis-tab skeleton flash**
- File: `src/components/dashboard/book-hub/BookHubOverview.tsx`
- Two changes:
  1. Set `dataReady` to `true` immediately after the cheap `generated_assets` SELECT (and run the two edge-function fetches in parallel via `Promise.all`, not serially).
  2. Decouple `progress.loading` from the full-page skeleton — render the page shell (header, hero strip, market snapshot section) right away, and show a small inline loader only inside the "Your Next Steps" block while `progress.loading` is true.
- Net effect: first paint within ~150 ms instead of waiting for all three round-trips.

**Bug 3 — Strip the malformed BP-013 / BP-034 / BP-096**
- File: `src/components/dashboard/book-hub/JourneyStepper.tsx`
- Remove the `sequence` integer badge entirely (lines 96–108). Keep the icon/checkmark circle but drop the number — the `BP-01` / `BA-11` / `YR-25` code printed above already serves as the identifier and ordinal cue.
- Add a small visual separator (`mt-1` and a thin divider, or simply `mb-1` on the code span) so the code can never visually run into the badge in the future.
- Verified output: each row will display `BP-01` followed by an icon-only circle (✓ when completed, the node icon otherwise) — never a numeric digit that can concatenate with the code.

### Files touched

```text
src/components/dashboard/ABBYFrameworkDashboard.tsx     (1-line condition change)
src/components/dashboard/book-hub/BookHubOverview.tsx   (parallelize fetches, split skeleton)
src/components/dashboard/book-hub/JourneyStepper.tsx    (remove sequence badge)
```

No DB, edge function, or schema changes. No new dependencies.

### Verification after implementation

- Log in as Pauline → `/dashboard` should land directly on the multi-book hub, no Meet Abby section.
- Open Book Hub → Analysis tab → page shell appears within ~150 ms; only the Next Steps block shows a small spinner briefly.
- Inspect the Next Steps block → codes read cleanly as `BP-01`, `BP-03`, `BP-09` (no trailing digit).
