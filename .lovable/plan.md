## Audit results: BP-02 vs BP-06

**BP-02 (gold standard) — has all 4 safeguards:**
1. `const { isReady: isAuthReady } = useAuthReady();` imported and used
2. `useState(-1)` for `step` (renders skeleton, not "Intro", during hydration)
3. Resume effect gated: `if (!isAuthReady) return;` and deps `[authorId, isAuthReady, activeBookId]`
4. Edge-first hydration via `loadBuilderDraft`, with direct `author_nodes` read only as fallback
5. Restores `_currentStep` from saved content (not just live/draft)

**BP-06 — only partially compliant:**
- Uses `useState(0)` (flashes Intro before resume completes)
- Does NOT import `useAuthReady` — effect fires the moment `authorId` exists, before Safari finishes session restore
- Effect deps are `[authorId, activeBookId]` (missing `isAuthReady`)
- Does call `loadBuilderDraft` first (good), but only restores to step 2 or 3 — never to step 0/1
- No skeleton state while loading

The global `useAuth.tsx` fix already prevents the dashboard-redirect bug, but BP-06 can still flash the Intro screen for a frame on Safari refresh, and any builder still doing direct `author_nodes` reads first will miss drafts when RLS races.

## Plan

### Phase 1 — Bring BP-06 up to BP-02 standard
Edit `src/components/dashboard/builders/bp06/BP06Builder.tsx`:
- Import `useAuthReady`, destructure `isReady: isAuthReady`
- Change `useState(0)` → `useState(-1)` for `step`
- Gate resume effect with `if (!isAuthReady) return;`
- Add `isAuthReady` to dep array
- After draft/node lookup, if no saved content set `setStep(0)` explicitly (so skeleton clears)
- Render a small skeleton/null when `step === -1`

### Phase 2 — Define the canonical template
Create one tiny shared helper or inline pattern (no new abstraction file needed) so each builder has:
```ts
const { isReady: isAuthReady } = useAuthReady();
const [step, setStep] = useState(-1);
useEffect(() => {
  if (!isAuthReady || !authorId) return;
  let cancelled = false;
  (async () => {
    const draft = await loadBuilderDraft(authorId, "<NODE-ID>", activeBookId);
    if (cancelled) return;
    if (draft.content) {
      setContent(draft.isLive ? { ...draft.content, activated: true } : draft.content);
      setStep(draft.isLive ? LIVE_STEP : Math.max(draft.currentStep, 2));
      return;
    }
    // ...optional legacy author_nodes fallback...
    setStep(0);
  })();
  return () => { cancelled = true; };
}, [authorId, isAuthReady, activeBookId]);
```
Render `if (step === -1) return <BuilderSkeleton />;` before the main JSX.

### Phase 3 — Roll out to the remaining 25 builders
Apply the template to:
- BP-01, BP-03, BP-04, BP-05, BP-07, BP-08, BP-09
- BA-10, BA-11, BA-12, BA-13, BA-14, BA-15, BA-16, BA-17, BA-18
- YR-19, YR-20, YR-21, YR-22, YR-23, YR-24, YR-25, YR-26, YR-27, YR-28

For each: keep node-specific generation/publish logic untouched — only standardise the auth-gate, initial step state, deps, and skeleton.

### Phase 4 — Verify
- Manual Safari refresh test on one node per category (e.g. BP-04, BA-14, YR-22)
- Confirm no console errors, no Intro-flash, draft resumes to correct step
- Confirm live nodes still resume to the Live step

### Out of scope
- CRM/Library/Hub pages (already fixed by the global `useAuth.tsx` change in the previous turn — leave alone unless a specific one regresses)
- No DB migrations, no edge function changes

Approve to proceed with Phase 1 + 2 first; once BP-06 looks clean, roll Phase 3 across the remaining builders.