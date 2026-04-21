
## Goal
Make these builders follow the exact BP-01 / BP-02 intro-state pattern so they stop getting stuck on “Checking your book profile…” or showing the wrong gate:

- BA-10, BA-11, BA-12, BA-13, BA-14, BA-15, BA-16, BA-17, BA-18
- BP-03, BP-04, BP-06, BP-07, BP-08, BP-09

BP-01 and BP-02 stay untouched.

## What the audit found
The current “gold standard” is not the newer gate pattern. BP-01 and BP-02 work because their Step 0 logic is simple:

1. read book state from one hook result
2. do not show the gate while the hook is loading
3. only show the gate when loading is finished and there is definitively no book context
4. otherwise render Abby’s introduction immediately with the resolved title

The broken builders diverge by mixing in extra layers:
- `shouldGate`
- `overrideGate`
- `BookProfileGate`
- `BookProfileQuickForm`
- extra local `bookTitle` / `hasContext` state
- duplicate `author_context` / `books` lookups alongside the hook

That duplicated state is what is keeping them stuck.

## Implementation plan

### 1. Copy the BP-01 / BP-02 Step 0 branching contract into every broken builder
For each target builder, make the introduction branch match the working pattern:

```ts
if (isBookLoading) {
  show subtle loading state inside the Abby card
} else if (!hasBook && hasContext === false) {
  show the simple “Complete Book Profile” CTA
} else {
  show Abby intro immediately using detected book title
}
```

That means:
- no gate during loading
- no `shouldGate` branch
- no `overrideGate`
- no “proceed anyway” branch
- no extra quick-form branch inside these builders

### 2. Use a single source of truth for title + book presence in each broken builder
In those builders, remove the duplicated intro-state logic and rely on the same minimal contract BP-01/BP-02 rely on:
- hook-provided `hasBook`
- hook-provided loading state
- resolved `detectedBookTitle`
- a single boolean for “has context” used only after loading finishes

Concretely, strip out:
- local `hasContext` bookkeeping driven by competing effects
- redundant `author_context`/`books` lookups that exist only to decide the intro gate
- `BookProfileGate` and `BookProfileQuickForm` in the affected builders

Keep the existing profile/draft/node-loading logic that is unrelated to the intro gate.

### 3. Make the Abby intro copy use the same fallback order as BP-01 / BP-02
For all target builders, standardize the intro text to use:

```ts
detectedBookTitle || bookTitle || "your book"
```

with the intro rendering only after the loading branch clears.

This prevents the placeholder leak and ensures the title appears as soon as the hook resolves.

### 4. Preserve each builder’s existing non-intro behavior
Do not touch:
- generation logic
- review tabs
- publish/activate behavior
- autosave/draft restore
- BP-01 / BP-02 files

Only Step 0 intro/gate logic and the redundant state feeding it will change.

### 5. Special handling by file group
- `BP-03`: keep saved-kit resume logic (`isResuming`), but once Step 0 renders, its book-loading/gate/introduction must follow the BP-01/BP-02 pattern exactly.
- `BP-04`, `BP-08`, `BP-09`: remove the quick-form/gate divergence and use the same simple CTA branch as BP-01/BP-02.
- `BP-06`, `BP-07`, `BA-10` to `BA-18`: remove `shouldGate` / `overrideGate` / `BookProfileGate`-driven Step 0 logic and replace it with the gold-standard branch.

## Files to update
- `src/components/dashboard/builders/ba10/BA10Builder.tsx`
- `src/components/dashboard/builders/ba11/BA11Builder.tsx`
- `src/components/dashboard/builders/ba12/BA12Builder.tsx`
- `src/components/dashboard/builders/ba13/BA13Builder.tsx`
- `src/components/dashboard/builders/ba14/BA14Builder.tsx`
- `src/components/dashboard/builders/ba15/BA15Builder.tsx`
- `src/components/dashboard/builders/ba16/BA16Builder.tsx`
- `src/components/dashboard/builders/ba17/BA17Builder.tsx`
- `src/components/dashboard/builders/ba18/BA18Builder.tsx`
- `src/components/dashboard/builders/bp03/BP03Builder.tsx`
- `src/components/dashboard/builders/bp04/BP04Builder.tsx`
- `src/components/dashboard/builders/bp06/BP06Builder.tsx`
- `src/components/dashboard/builders/bp07/BP07Builder.tsx`
- `src/components/dashboard/builders/bp08/BP08Builder.tsx`
- `src/components/dashboard/builders/bp09/BP09Builder.tsx`

## Hook safeguard
Also verify `useBookContext` still guarantees:
- `shouldGate === false` while `isLoading === true`
- no builder gate can render during loading
- loading state is shown inside the Abby card, not as a false gate

## Verification after implementation
Check each target node from a fresh load:
1. no permanent “Checking your book profile…”
2. no false “Add Your Book” / “Complete Book Profile” gate
3. intro appears with `Be SUCKcessful`
4. BP-03 no longer hangs on “Loading your book details…”
5. BP-04, BP-08, BP-09 use the same intro behavior as BP-01/BP-02
6. BP-01 and BP-02 remain unchanged
