## Problem

When you click the "Back" link/button from any node builder page, the destination is inconsistent across nodes. Two reasons:

1. **NodeBuilder.tsx** (the page wrapper) renders a top-level `Back to {Brand Products | Build Authority | Yield Revenue}` link above every builder.
2. **Each individual builder** *also* renders its own back button inside its header. There are 4 different header components in use:
   - `BuilderHeader` (BP-01, BP-02, BP-03, BP-05, BP-06, BP-07, BP-08, BP-09, BP-04) → goes to `/brand-products`
   - `BABuilderShared.StepHeader` (BA-10, BA-11) → defaults to `/build-authority`
   - `YRBuilderShared.StepHeader` (YR nodes) → defaults to `/yield-revenue`
   - Inline custom headers (BA-12, BA-13, BA-14, BA-15, BA-16, BA-17, BA-18) with their own `ArrowLeft` button → `/build-authority`

Result: the user sees two back affordances on most nodes (the wrapper link + the in-builder header back button), and on a few nodes only one — they look and behave slightly differently per node, which is what feels "inconsistent."

In addition, there are stray secondary "back" buttons inside step content (e.g. BP-03 line 1027, BP-02 line 1708) that send the user to a hub instead of the previous step.

## Goal

One consistent Back affordance on every node builder page, always returning to the correct hub for that node's category.

## Plan

**1. Single source of truth: keep the wrapper Back link in `NodeBuilder.tsx`.**
   - It already maps the category correctly (BP → Brand Products, BA → Build Authority, YR → Yield Revenue).
   - Polish: render it inside a consistent container (same max-width and padding the builders use) so it doesn't appear to "float" away from each builder's header.

**2. Remove the duplicate in-builder back buttons** so every node has exactly one back control in the same place:
   - `src/components/dashboard/builders/shared/BuilderHeader.tsx` — drop the `onBack` button rendering (keep prop optional but unused) so BP-01/02/03/04/05/06/07/08/09 stop showing a second back link.
   - `src/components/dashboard/builders/ba-shared/BABuilderShared.tsx` `StepHeader` — remove the `ArrowLeft` Button (BA-10, BA-11).
   - `src/components/dashboard/builders/yr-shared/YRBuilderShared.tsx` `StepHeader` — remove the `ArrowLeft` Button (all YR nodes).
   - Inline custom headers in BA-12, BA-13, BA-14, BA-15, BA-16, BA-17, BA-18 — remove the leading `ArrowLeft` Button while keeping the title.

**3. Fix stray "back" links inside step content that point to the wrong place:**
   - `BP-03` line 1027 ("Back" → `/brand-products`) — remove; the wrapper link covers it.
   - `BP-02` line 1708 ("Go back to Brand Products") — remove; the wrapper link covers it.
   - Leave intra-step navigation (`onBack={() => setStep(2)}`) untouched — those are step-to-step controls, not page back.

**4. No changes** to:
   - `Complete Book Profile` buttons (those are a separate flow with `?returnTo=`).
   - `PublishSuccessScreen` / `SharedPublishStep` CTA buttons.

## Result

Every node builder will show exactly one back link at the top: **"← Back to Brand Products / Build Authority / Yield Revenue"**, depending on the node's category, in the same position with the same styling.

## Files touched

- `src/pages/NodeBuilder.tsx` (container polish)
- `src/components/dashboard/builders/shared/BuilderHeader.tsx`
- `src/components/dashboard/builders/ba-shared/BABuilderShared.tsx`
- `src/components/dashboard/builders/yr-shared/YRBuilderShared.tsx`
- `src/components/dashboard/builders/ba12/BA12Builder.tsx`
- `src/components/dashboard/builders/ba13/BA13Builder.tsx`
- `src/components/dashboard/builders/ba14/BA14Builder.tsx`
- `src/components/dashboard/builders/ba15/BA15Builder.tsx`
- `src/components/dashboard/builders/ba16/BA16Builder.tsx`
- `src/components/dashboard/builders/ba17/BA17Builder.tsx`
- `src/components/dashboard/builders/ba18/BA18Builder.tsx`
- `src/components/dashboard/builders/bp02/BP02Builder.tsx` (remove stray back link)
- `src/components/dashboard/builders/bp03/BP03Builder.tsx` (remove stray back link)