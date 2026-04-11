

## Why It Shows 28 Nodes

The number "28" is **hardcoded** in `MeetAbbySection.tsx` (line 44). It always displays "28 Revenue Streams Available" regardless of what Abby actually recommended for your book. The "X of 28 Products Built" counter on line 52 also uses the hardcoded 28 as the denominator.

Your consultation with Abby may have recommended a subset of nodes (e.g., 12 or 18), but the UI ignores the `streamsMapped` value from your plan summary and just shows the total framework size.

## Plan

### 1. Use actual recommended count instead of hardcoded 28

**File: `src/components/dashboard/framework-dashboard/MeetAbbySection.tsx`**

- Add `streamsMapped` to the display: change the first stat card from hardcoded `28` to `planSummary.streamsMapped` with label "Streams Recommended"
- Change the "Products Built" denominator from `28` to `planSummary.streamsMapped` so it reads e.g. "0 of 12" instead of "0 of 28"

### 2. Ensure streamsMapped is correctly populated from the business plan

**File: `src/components/dashboard/ABBYFrameworkDashboard.tsx`**

- Verify line 110: `streamsMapped: planData.plan.products?.length || 0` — if the plan data doesn't store individual product recommendations, fall back to the tier-based defaults (Brand=9, Build=18, Yield=28) rather than 0
- Add a fallback: if `streamsMapped` is 0 or undefined, derive it from the user's subscription tier

### 3. Update the Monetization Map header

**File: `src/components/dashboard/book-hub/ABBYFrameworkVisual.tsx`**

- Line 157: when `totalRecommended` is 0 but the user has a plan, show the tier-based count instead of "0 of 28"

## Technical Details

- The `planSummary.streamsMapped` field already exists and is populated at line 110 of `ABBYFrameworkDashboard.tsx`
- The subscription tier is already available via `useAuth()` and can be used for the fallback mapping: `{ brand: 9, build: 18, yield: 28 }`
- No database or edge function changes needed — this is purely a UI display fix

