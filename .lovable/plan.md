

# Plan — Soften Workbook Gate to a Warning on Home Study Course

## Change

In `src/components/dashboard/builders/home-study/ProgramSetupStep.tsx`, replace the hard block (the full-screen "Build Your Workbook First" card that returns early when `workbookExists === false`) with a **dismissible amber warning banner** rendered above the existing "Let Abby Design Your Home Study Program" CTA. The author can proceed regardless.

## Behaviour

- **Workbook exists** → no banner, normal flow (unchanged).
- **Workbook missing** → show amber banner at top:
  - Title: "We recommend building your Workbook first"
  - Body: "Your Home Study sales page will cross-sell a companion Workbook. Without one, Abby will skip the cross-sell section. You can build the Workbook anytime and re-generate."
  - Two actions: secondary **"Build Workbook First"** (existing navigation) and a quiet **"Continue anyway"** affordance is implicit — the main "Let Abby Design This Program" CTA below remains enabled.
- **Loading state** (`workbookExists === null`) → keep current behaviour (render nothing while checking).

## Downstream impact

- `generate-bp07-home-study` edge function: no change required — it already runs without a workbook.
- Sales-copy prompt: when no workbook is present, Abby will naturally produce sales copy without the workbook cross-sell line; no prompt edit needed for this sprint.
- Memory update: revise `mem://business/product-development-sequence` to reflect that the Workbook is now **recommended, not required**, for Home Study. (Online Course gating is unchanged.)

## Files touched

- `src/components/dashboard/builders/home-study/ProgramSetupStep.tsx` — replace the gate block with the warning banner.
- `mem://business/product-development-sequence.md` — soften wording from "strictly gated" to "recommended sequence" for Workbook → Home Study; keep Online Course gating intact.

## Out of scope

- BP-08 / BP-09 sequencing (unchanged).
- Online Course gate on Workbook (unchanged — still required).
- Sales-copy prompt rewrite (defer until an author reports the cross-sell reads awkwardly).

