

## Issues Found

### 1. Onboarding modal shows at the wrong time
The condition on line 181 of `AuthorDashboard.tsx` is `if (!user || !stats.analyzedCount) return;` — meaning the modal only appears **after** the user has already completed their ABBY analysis. This is backwards. The onboarding should show when the user has books but has **not yet** analyzed them.

### 2. "Start My ABBY Analysis" button not clickable
The `AbbyHelpChatbot` floating button sits at `z-[9999]` (line 373 of `AbbyHelpChatbot.tsx`). The modal is at `z-[10000]`. While the modal overlay itself is above the chatbot, the chatbot's expanded panel (also `z-[9999]`) or the floating button can intercept pointer events in the bottom-right corner where the "Start My ABBY Analysis" button may overlap. The fix is to ensure the chatbot is hidden when the onboarding modal is open.

## Plan

### Step 1: Fix the trigger condition
In `AuthorDashboard.tsx` line 181, change the condition from:
```
if (!user || !stats.analyzedCount) return;
```
to:
```
if (!user || !stats.bookCount || stats.analyzedCount > 0) return;
```
This shows the onboarding when the user has at least one book but has not yet analyzed any. Once they complete analysis, it won't show again (and `has_seen_journey_onboarding` will also be set to true).

### Step 2: Hide chatbot when onboarding modal is open
Pass `showJourneyOnboarding` state down or use a simple approach: in `AbbyHelpChatbot.tsx`, add a check — if the onboarding modal is open, don't render the floating button. The cleanest approach is to add a prop or check for the modal's presence in the DOM. Alternatively, add `pointer-events-none` to the chatbot container when the modal is visible by passing a prop from `AuthorDashboard.tsx`.

### Step 3: Ensure button has proper z-index inside modal
Add `relative z-10` to the "Start My ABBY Analysis" button container (the golden card at line 271) to ensure it stays above any other layers within the modal.

## Files to modify
- `src/pages/AuthorDashboard.tsx` — fix trigger condition, pass hide prop to chatbot
- `src/components/AbbyHelpChatbot.tsx` — accept and respect a `hidden` prop
- `src/components/dashboard/ABBYJourneyOnboarding.tsx` — add relative z-index to the CTA button area

