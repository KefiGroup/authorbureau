

# Fix: Show Full BP-02 Content in Review Tabs

## Problem
The BP-02 Review step renders only surface-level data (lead magnet titles, opt-in headline, thank-you message). The rich generated content — quiz questions, scoring tiers, headline variants, nurture emails, and social posts — is invisible. Authors can't review what's being sent to readers.

## Solution
Expand the Review tabs to display all generated content sections. No new tabs — add sections within existing tabs and add one new "Quiz" tab.

## Changes — `src/components/dashboard/builders/bp02/BP02Builder.tsx`

### 1. Add a "Quiz" tab (5 tabs total)
Insert a new tab between "Magnets" and "Opt-In":
- **Quiz tab**: Shows quiz title, all 8-10 questions with their 4 options and point values, and the 5 scoring tiers with descriptions, tips, and product recommendations.

### 2. Expand "Magnets" tab
Below each lead magnet card, show:
- `best_channel` and `channel_reason`
- `contact_gate` details (gate moment, headline, fields collected)

### 3. Add headline variants to "Opt-In" tab
Below the opt-in preview card, show the 3 headline variants (Identity, Outcome, Curiosity) with their reasoning.

### 4. Expand "Details" tab with nurture + social
Add two collapsible sections:
- **Nurture Sequence**: All 5 emails showing subject line, purpose, send delay, and body outline
- **Social Media Posts**: All 4 platform posts with captions and CTAs

### 5. Add quiz result intro to "Thanks" tab
Show `result_intro` text and `book_cta` below the existing thank-you content.

## File Changed

| File | Change |
|---|---|
| `src/components/dashboard/builders/bp02/BP02Builder.tsx` | Add Quiz tab, expand Magnets/Opt-In/Thanks/Details with full content rendering |

No edge function or database changes needed — the data is already generated and stored correctly.

