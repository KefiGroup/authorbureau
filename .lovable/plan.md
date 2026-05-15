## Goal
Make it obvious when the dialog is showing the **consultation summary** (the locked teaser) vs the **full 28-node plan**, so authors stop wondering "why is this so short?"

## Change (single file)

**`src/components/dashboard/FullPlanDialog.tsx`**

1. Add a small `isSummaryPlan(plan)` heuristic: returns `true` when the loaded plan contains the lock markers from the consultation teaser (e.g. `🔒 Build Authority`, `🔒 Yield Revenue`, or fewer than ~6 node codes like `BP-`, `BA-`, `YR-` overall). The expanded plan always lists all 28 node codes, so the count is a reliable signal.
2. When `isSummaryPlan` is `true`, render a dismissable banner directly under the dialog header (above the section nav):

   > **You're viewing the consultation summary.**  
   > Build Authority and Yield Revenue are locked previews. Click **Generate Full 28-Node Plan** above to expand every node with pricing and revenue estimates.

   - Amber/gold accent (`bg-amber-500/10`, `border-amber-500/30`, `text-amber-100`) to match the existing "Generate Full 28-Node Plan" button.
   - Includes an inline arrow/icon pointing up toward the generate button.
3. When `isSummaryPlan` is `false` (full plan loaded), render a subtle success chip instead: `✓ Full 28-Node Plan` next to the dialog title.
4. After the user clicks **Generate Full 28-Node Plan** and the new content saves, the banner auto-disappears because `plan` state updates and the heuristic flips.

## Out of scope
- No edge-function changes (`business-consultant` summary/expand prompts untouched).
- No auto-trigger of `expand-plan` (that was option A, which the user rejected).
- No PDF export changes — the disclaimer + footer in `generateExportHtml` stays as-is.
- No changes to `BusinessPlanCard` / `SavedBusinessPlan` outside the dialog.

## Verification
- Open dialog on a book that only has the summary → amber banner visible, "Generate Full 28-Node Plan" button still works.
- Click Generate, wait for expand → banner disappears, `✓ Full 28-Node Plan` chip appears.
- Open dialog on a book that already has the expanded plan saved → no banner, chip shows immediately.
