## What "the registry pattern" means (BP-02 reference)

BP-02 is refresh-safe because every persistence touchpoint funnels through one shared library:

1. **Hydrate**: `loadBuilderDraft(authorId, "BP-02", activeBookId)` first; `author_nodes` direct read only as legacy fallback.
2. **Persist step**: every `autosaveBuilderDraft({...})` call sets `content._currentStep = step` AND `currentStep: step` so refresh can restore the exact tab/step.
3. **Persist sub-assets** (e.g. social pack, publishChannels) by re-saving the whole `content` blob via `autosaveBuilderDraft` — never via direct `from("author_nodes").update(...)`.
4. **Auth gate** (already done last turn): `useAuthReady` + `[authorId, isAuthReady, activeBookId]` deps so Safari doesn't lose the session race.
5. **Skeleton state**: `useState(-1)` for `step`; render a "Loading…" placeholder until hydration sets it to a real value.

## Audit results

| Bucket | Builders | Gap |
|---|---|---|
| **Already at BP-02 parity** | BP-02, BP-06 (last turn), BP-07 | none |
| **Has registry but no `_currentStep`** | BP-08, BP-09, BA-10–18, YR-19–28 (24 builders) | save calls don't write `_currentStep`; resume can't restore the exact step |
| **Missing registry entirely** | BP-01, BP-03, BP-04, BP-05 | direct DB reads/writes; should be migrated to `loadBuilderDraft` / `autosaveBuilderDraft` |

(BP-03 already writes `_currentStep` but uses a different persistence path; treat as Tier 1 — verify only.)

## Plan

### Phase A — Polish BP-06 to full BP-02 parity (small)
File: `src/components/dashboard/builders/bp06/BP06Builder.tsx`
- All five existing `autosaveBuilderDraft` calls currently send `currentStep: 2` and a bare `content` blob. Update each to:
  - `content: { ...content, _currentStep: <correct step> }`
  - `currentStep: <correct step>`
- Update the resume effect (line ~136) to honour `savedContent._currentStep` like BP-02 does, instead of always clamping to step 2.
- Result: refresh on the Publish step (3) stays on step 3, not step 2.

### Phase B — Add `_currentStep` to the 24 "registry-but-no-step" builders
For each of: BP-08, BP-09, BA-10, BA-11, BA-12, BA-13, BA-14, BA-15, BA-16, BA-17, BA-18, YR-19, YR-20, YR-21, YR-22, YR-23, YR-24, YR-25, YR-26, YR-27, YR-28.

Mechanical edit per file:
- In every `autosaveBuilderDraft({ ..., content: X, currentStep: N, ... })` call:
  - Wrap `content` so it carries `_currentStep: N` (`content: { ...X, _currentStep: N }`).
- In the resume effect, replace
  ```ts
  setStep(draft.isLive ? LIVE : Math.max(draft.currentStep, 2));
  ```
  with
  ```ts
  const saved = (draft.content as any)?._currentStep;
  setStep(
    draft.isLive ? LIVE :
    typeof saved === "number" ? saved :
    Math.max(draft.currentStep, 2),
  );
  ```
- Where the file uses `useState(0)` for `step`, switch to `useState(-1)` and add a `if (step === -1) return <Loading />;` guard (matches BP-02).

I'll script the `_currentStep` injection across these 24 files (regex-safe; each call is small) and hand-verify one file per group (BP-08, BA-12, YR-22) by viewing the result.

### Phase C — Migrate the 4 holdouts to the registry
Files: `bp01/BP01Builder.tsx`, `bp03/BP03Builder.tsx`, `bp04/BP04Builder.tsx`, `bp05/BP05Builder.tsx`.

For each:
1. Import `autosaveBuilderDraft, loadBuilderDraft` from `@/lib/builder-autosave`.
2. Replace the existing direct `supabase.from("author_nodes").select(...)` resume with a `loadBuilderDraft(...)` first call (keep the direct read as a labelled `// legacy fallback` block, mirroring BP-02 lines 158-186).
3. Replace any direct `from("author_nodes").update/upsert(...)` writes with `autosaveBuilderDraft({...})` calls that include `_currentStep`.
4. Keep all node-specific generation/publish logic untouched — only swap the persistence calls.

These four are larger files; I'll touch them one at a time and avoid changing UI/business logic. BP-03 already writes `_currentStep` so it's mostly a swap-of-the-resume call (verify-only is possible).

### Phase D — Smoke verify
After edits, view one file per phase to confirm shape, then:
- `lov-build` runs automatically.
- Manual test (you): open BP-06 → generate → leave → come back → refresh; should land on the same step. Repeat for one BA and one YR builder.

### Out of scope
- No DB schema, no edge function, no `useAuth.tsx` changes.
- No changes to publish/generate logic — only to persistence/hydration.
- CRM/Library/Hub pages — already covered by the global `useAuth` fix.

### Rollout order
A → B → C, in three sequential turns of edits, so any regression is easy to bisect.

Approve to proceed.