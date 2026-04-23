

# Plan — Fix Workbook sales-page language, rewrite Abby's prompt, deliver what's promised

## Three real problems on the live page

### Problem 1 — Outcome copy still leaks "You will…"

The screenshots show: **"After this section, you can: You will own a personal crisis-response playbook…"** and **"You will hold a clear 12-month vision…"**

`normalizeOutcome()` (in `src/lib/workbook-pdf.ts`) is supposed to strip those leading subject+modal phrases, but the regex misses cases like "You will own…" because of how the alternation `you(['']| wi)?(ll)?` is composed. The regex matches `you` then optionally tries to match `'` OR ` wi`, then optionally `ll` — so "You will" doesn't reliably get caught.

**Fix:** rewrite the regex with a cleaner alternation list:
```ts
/^(you['']?ll|you will|you can|you['']ll be able to|you['']re going to|readers (will|can)|the reader (will|can)|by the end[^,]*,\s*you (will|can))\s+/i
```
…and add a runtime fallback that, even after stripping, drops a leading "be able to " if Abby produced "you will be able to articulate…".

We also fix the **public sales page** — the same outcomes render via `MicrositePage.tsx` → `WorkbookSalesPage`, which currently prints `s.outcome` raw. Pipe it through the same `normalizeOutcome` import.

### Problem 2 — The sales page promises deliverables the workbook doesn't actually contain

The sales page lists:
- SUCKCESS Framework Canvas and 90-Day Planner
- Crisis-Response Playbook and Energy Protocol Tracker
- Niche and Money Metrics Canvas with weekly dashboards
- Signature Story Template and 12-Month Futurecast Guide

But the PDF (see `renderSection` in `workbook-pdf.ts`) only renders:
- section title + description
- exercise prompts with **6 ruled lines** under each
- a callout "After this section, you can…"

There are **no canvas grids, no tracker tables, no 90-day calendar, no story template** — just ruled lines. The author is selling artifacts that don't exist in the file.

**Fix — add a real "Deliverables Pack" in the workbook itself:**

After the 5 sections, insert a new **"Your Toolkit"** chapter with one templated page per item in `what_youll_get[]`. Each artifact gets a designed worksheet:

| Artifact pattern Abby names | Template rendered in PDF |
|---|---|
| `… Canvas` / `… Map` | 4-quadrant canvas grid (2×2), each quadrant labelled and lined for handwriting |
| `… Planner` / `90-Day Planner` | 12-week grid (3 cols × 4 rows) with weekly milestone slots |
| `… Tracker` / `… Dashboard` | Weekly tracking table — 7 days × N rows of metrics |
| `… Playbook` / `… Protocol` | Numbered framework template — Trigger / Response / Recovery rows |
| `… Story Template` / `… Outline` | 5-part story template (Hook / Hardship / Helper / Hinge / Hope) with response space |
| `… Futurecast Guide` / `Vision …` | 12-month vision page with 4 quarter blocks + evidence list |
| Anything else | Default lined worksheet titled with the artifact name |

Implementation: in `src/lib/workbook-pdf.ts` and `src/lib/workbook-docx.ts`, add a `renderToolkit(content)` function that loops `content.what_youll_get` and dispatches to the correct template using lightweight string matching on the deliverable name. Add four helpers: `drawCanvasGrid()`, `draw90DayPlanner()`, `drawWeeklyTracker()`, `drawStoryTemplate()`. Each helper just draws boxes / lines / labels — no AI, no extra prompts.

This means **whatever Abby names in `what_youll_get`, the PDF actually contains a corresponding template page**. Promise = delivery.

### Problem 3 — Abby's prompt is too shallow

Current prompt asks for `what_youll_get: ["Deliverable 1", ...]` as freeform strings. Abby invents pretty names but never grounds them in the workbook's actual structure.

**Rewrite Abby's prompt** (`supabase/functions/generate-bp06-online-course/index.ts`) so each deliverable is **a structured object** that ties back to the sections, and so the outcome copy is enforced server-side:

```jsonc
"what_youll_get": [
  {
    "name": "SUCKCESS Framework Canvas",
    "type": "canvas",                      // canvas | planner | tracker | playbook | story | vision | worksheet
    "purpose": "One sentence: what the reader uses it for",
    "linked_section": 1                    // which section it complements
  },
  // …4 total, one per major section
]
```

The PDF generator switches on `type` to pick the right template (canvas grid, 90-day planner grid, weekly tracker, etc.) — no string-matching guesswork.

**Also tighten the prompt:**
- Add an explicit **language rule** for `outcome`: *"Must be a verb phrase. Must NOT begin with 'You', 'Readers', 'By the end', or any subject pronoun. Start with a lowercase action verb. Wrong: 'You will own a playbook.' Right: 'own a personal crisis-response playbook and baseline habits that make you stronger under stress.'"* Plus 2 worked examples in the prompt.
- Add a rule for `transformation_promise`: *"One sentence, second-person ('you'), present-tense action verb, ≤ 30 words."*
- Add a rule for `who_its_for`: *"Start with 'For…'. ≤ 60 words."*
- Add a rule for `tagline`: *"≤ 8 words, punchy, no period."*
- Bump `max_completion_tokens` from 8000 → 12000 to fit the structured deliverables.

### Bonus: keep the existing live workbook working

Existing `content_json` only has `what_youll_get: string[]`. The new toolkit renderer must **handle both shapes** — if items are strings it falls back to the keyword matcher; if they're objects it uses the explicit `type`.

## Files touched

1. `src/lib/workbook-pdf.ts`
   - Fix `normalizeOutcome` regex.
   - Add `renderToolkit()` + helpers (`drawCanvasGrid`, `draw90DayPlanner`, `drawWeeklyTracker`, `drawStoryTemplate`, `drawVisionPage`, `drawPlaybookTable`).
   - Wire `renderToolkit` into `buildWorkbookPdf` between `renderSection` loop and `renderActionPlan`.
   - Update `estimateWorkbookPageCount` to include 1 page per deliverable.

2. `src/lib/workbook-docx.ts`
   - Mirror `renderToolkit` in DOCX (simpler — tables for grids, paragraphs for prompts).
   - Re-uses `normalizeOutcome` (already imported).

3. `src/pages/MicrositePage.tsx` → `WorkbookSalesPage`
   - Import `normalizeOutcome` from `@/lib/workbook-pdf`.
   - Wrap `s.outcome` rendering with `normalizeOutcome(s.outcome)`.
   - When `what_youll_get[i]` is an object, render `item.name` instead of stringifying.

4. `supabase/functions/generate-bp06-online-course/index.ts`
   - Rewrite the user prompt with the new structured `what_youll_get`, language rules, and worked examples.
   - Bump `max_completion_tokens` to 12000.
   - Add a server-side post-processor: walk `content.sections[*].outcome`, pass through the same `normalizeOutcome` regex (Deno-compatible copy) before save — belt-and-braces so already-saved nodes can't show "You will…".

## Out of scope

- Re-running BP-06 generation on existing live workbooks — the user can click "Regenerate" if they want the new toolkit. Existing workbooks still render correctly because the renderer falls back to string matching on `what_youll_get[]`.
- Cover image upload for KDP (PublishNow.io still owns that step).
- Pricing changes, Stripe Connect logic — already fixed last sprint.
- Home-study and special-edition pages — separate fix when the user reports them.

## Verification

1. Hard-refresh `/pauline-teo/workbook`.
2. **Outcomes:** every "After this section, you can:" line starts with a lowercase verb. None start with "You will", "You can", or "Readers will".
3. **Toolkit pages:** download the PDF — between the last section and the action plan there are 4 new **Toolkit** pages, each named after a `what_youll_get` item (Canvas, Tracker, Playbook, Template) with a proper grid/table.
4. **Sales page deliverables:** the sales page list still matches the toolkit pages 1-to-1.
5. Generate a brand-new workbook for a different book. Inspect `content_json.what_youll_get` — items are objects with `name`, `type`, `purpose`, `linked_section`. PDF renders matching templated pages.
6. Open the existing workbook in DOCX — same toolkit pages render with table-based templates.

