## What I found
The current `/dashboard` is rendering `ABBYFrameworkDashboard`, and that component does **not** include the summary block for published books / live site items / nodes built. That summary still exists only inside `MyBooks.tsx` via `PortfolioSummaryBar`, which is why the overview feels incomplete even when the book data exists.

## Plan
1. Restore a portfolio summary section to the main dashboard overview (`ABBYFrameworkDashboard`) so `/dashboard` shows the author’s book and build status immediately.
2. Drive that summary from the existing trusted stats sources already in use (`useMyBooks` + `useAuthorStats`) so it reflects:
   - books listed / published on site
   - live microsites
   - books analyzed
   - nodes/products built
3. Make the overview resilient so the summary does not disappear during transient auth/cache races; it should use the same trusted count logic already added for the missing-book bug.
4. Keep the rest of the current dashboard layout intact; only reintroduce the missing summary instead of redesigning the page.

## Technical details
- Read from:
  - `src/components/dashboard/ABBYFrameworkDashboard.tsx`
  - `src/hooks/useMyBooks.ts`
  - `src/hooks/useAuthorStats.ts`
- Reuse or adapt:
  - `src/components/dashboard/my-books/PortfolioSummaryBar.tsx`
- Likely implementation:
  - insert the summary near the top of the overview
  - feed it canonical values from `stats` and trusted book counts
  - avoid showing false zeroes while auth/session restoration is still settling

## Outcome
After this change, the dashboard overview will again show the missing summary of book presence and build progress, instead of only the journey card / calendar / subscription blocks.