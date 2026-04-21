

## Goal
Lock the canonical flow end-to-end and unlock every node for testing:

**Sidebar → My Books → pick book (or auto-pick) → Brand/Build/Yield tab → click any node card → Builder**

## What's Already Working
- Sidebar items navigate to `/my-books?intent=brand|build|yield` ✅
- `/brand-products`, `/build-authority`, `/yield-revenue` redirect to `/my-books?intent=…` ✅
- `MyBooks.tsx` reads `?intent=`, auto-jumps to the book if only one is analyzed, shows a "pick a book" banner if multiple ✅
- BookHub renders the three category tabs ✅

## What's Broken (Why You See "Coming Soon")
1. **`abbyFrameworkConfig.ts`** marks ~14 of the 28 nodes with `status: "coming-soon"` (e.g. Lead Magnets, Webinars, Audiobook, Memberships, Group Coaching, Podcast, etc.).
2. **`PortfolioStepView.tsx`** at line 148 forces those into `"coming-soon"` state regardless of anything else.
3. **`SmartProductCard.tsx`** then renders a disabled "Coming Soon" button (line 275-278), so the card can't be clicked.
4. **Tier gating** on `tierRequired: "Build"|"Yield"` nodes shows a "Lock — Upgrade to X" button instead of opening the builder.

## Changes (Minimal, Surgical)

### 1. Flip every node to `available` — `src/config/abbyFrameworkConfig.ts`
Search/replace `status: "coming-soon"` → `status: "available"` and `status: "planned"` → `status: "available"` across all 28 node definitions in the brand/build/yield arrays. (~14 edits.)

### 2. Bypass tier-lock for testing — `src/components/dashboard/PortfolioStepView.tsx`
In `getNodeState` (line 164), comment out the locked branch so every accessible node falls through to `"available"` / `"recommended"`:
```ts
// if (node.tierRequired && !hasTierAccess(node.tierRequired)) return "locked";
```
This makes BA and YR nodes clickable even on the Brand tier (matches your "all three must be testable" answer).

### 3. Belt-and-braces in `SmartProductCard.tsx`
Confirm that `state: "available"` cards render the primary "Build Now" button that calls `onBuild` → which already routes to `/node-builder/{nodeId}` via `PortfolioStepView`'s click handler. No change expected; included only if testing reveals a stuck state.

### 4. Sanity check the click handler in `PortfolioStepView.tsx`
Verify `onBuild` for every card navigates to `/node-builder/${node.id}` (e.g. `BP-02`, `BA-12`, `YR-19`) so the Universal Builder loads. If a card uses `navigateTo: "section-name"` and routes to `/dashboard?section=…` instead, normalize it to the `/node-builder/{ID}` path so all 28 nodes share one entry point.

## Files Touched
- `src/config/abbyFrameworkConfig.ts` — flip statuses to `available`
- `src/components/dashboard/PortfolioStepView.tsx` — disable tier-lock branch, normalize click handler to `/node-builder/{ID}`

## Result
- Sidebar Brand/Build/Yield → My Books (auto-jumps if 1 book, picker if many)
- Inside the book, every BP, BA, YR card is clickable
- Clicking opens the Universal Builder for that node
- One mental model, one path, no dead ends

