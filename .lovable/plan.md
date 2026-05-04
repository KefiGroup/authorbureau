## Plan — Complete builder refresh-safety parity (all 4 follow-ups)

Roll the BP-02 gold standard across the remaining gaps identified in the audit.

### #1 — BA-11 (Audiobook Studio) — fix step persistence
File: `src/components/dashboard/builders/ba11/BA11Builder.tsx`
- Add `_currentStep: <step>` into the `content` blob of all 3 `autosaveBuilderDraft` calls.
- In the resume effect, prefer `(draft.content as any)?._currentStep` over `Math.max(draft.currentStep, 2)` so refresh restores the actual step.

### #2 — BP-04 and BP-05 — wire `loadBuilderDraft` into resume
Files: `bp04/BP04Builder.tsx`, `bp05/BP05Builder.tsx`
- Import `loadBuilderDraft` (saves already use the registry).
- In the resume effect, call `loadBuilderDraft(authorId, "BP-04"/"BP-05", bookId)` first; consume `content._currentStep` to restore step. Keep the existing direct DB read as a labelled legacy fallback only.

### #3 — BP-03 — migrate persistence to the registry
File: `bp03/BP03Builder.tsx`
- Replace direct `supabase.from("author_nodes").select/update/upsert` calls with `loadBuilderDraft` / `autosaveBuilderDraft`.
- Each save embeds `_currentStep`; resume consumes it.
- Preserve all generation/publish business logic untouched — only swap the persistence layer.

### #4 — Skeleton flash polish on 24 Tier 2/3 builders
Files: BP-01, BP-04, BP-05, BP-07, BP-08, BP-09, BA-10, BA-11, BA-12, BA-13, BA-14, BA-15, BA-16, BA-17, BA-18, YR-19 → YR-28.
- Switch the step `useState(0)` to `useState(-1)`.
- Add a tiny early-return guard: `if (step === -1) return <div className="p-8"><Skeleton className="h-64 w-full rounded-xl" /></div>;` (mirrors BP-02 / BP-06).
- Cosmetic only — prevents a brief flash of step 0 before hydration completes.

### Order of execution
1. BA-11 (highest user-visible bug)
2. BP-04, BP-05 (load wiring)
3. BP-03 (architectural cleanup)
4. Skeleton rollout across 24 files (mechanical)

### Out of scope
- No DB / edge-function / `useAuth` changes.
- No changes to generation, publish, or UI logic — only persistence/hydration.
- BP-02 and BP-06 are already at parity; no edits.

### Verification
After edits I'll spot-check one file per phase (BA-11, BP-04, BP-03, one YR) to confirm shape. `lov-build` runs automatically. Manual smoke test: open BA-11 → start audiobook → leave → return → refresh → should stay on the same step.

Approve to proceed.