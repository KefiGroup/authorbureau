

## Diagnosis

The builder **Tabs render blank on reload** for BA-12 (Tiers), BA-13 (Curriculum/Pricing), and BA-14 (Episodes) because the back-compat shim only runs in `handleGenerate` (lines 75-84 BA-12, 76-85 BA-13, 75-83 BA-14). The reload path at line 51-55 calls `loadBuilderDraft(...)` and writes the result straight to state:

```ts
const __draft = await loadBuilderDraft(authorId, "BA-12");
if (__draft.content) {
  setContent(__draft.content);  // ← legacy shape, never normalised
  setStep(...);
}
```

Pauline's stored content_json (confirmed in DB) uses the legacy keys: `monthly_price_usd` / `benefits[]` (BA-12), `curriculum[]` (BA-13), `first_10_episodes[]` + `show_title` (BA-14). The Tabs read `content.tiers`, `content.weeks`, `content.episodes` → undefined → blank.

The reader-facing `MicrositePage` already normalises shapes defensively (PASS), which is why Pauline's public pages work but her builder tabs don't.

A second bug also confirmed: `handlePublish` in BA-12 reverted to `setStep(3)` BEFORE `await publishNodeToSite` (line 92). BA-13/14 likely mirror this. The previous "await publish first" fix was lost.

## Plan

### Fix 1 — Extract shared normalisers and apply on BOTH generate AND load

Create `src/components/dashboard/builders/ba12/normalise.ts`, `ba13/normalise.ts`, `ba14/normalise.ts` exporting a single `normaliseContent(raw)` function each. Move the existing inline shim logic from `handleGenerate` into these files verbatim, then call them from both call sites.

In each builder's `useEffect` loader:
```ts
if (__draft.content) {
  setContent(normaliseContent(__draft.content));   // ← new
  setStep(...);
}
```

In each `handleGenerate`:
```ts
const normalised = normaliseContent(data.content || {});
setContent(normalised);
```

The normalisers are pure and idempotent — running them on already-new-shape content is a no-op (the `?? raw.legacy_key` chains return the existing array).

### Fix 2 — Restore "await publish before advancing step" in BA-12/13/14

Reorder `handlePublish` to match the pattern that's already correct in BA-15/16/17/18:

```ts
const handlePublish = async () => {
  setError(null);
  try {
    await publishNodeToSite(authorId!, "BA-12", authorSlug);
    setContent((prev: any) => ({ ...prev, activated: true }));
    setStep(3);
    toast.success("Your Membership is live on your site.");
  } catch (e: any) {
    setError(e.message);
    toast.error(`Publish failed: ${e.message ?? "Unknown error"}`);
  }
};
```

(Remove the optimistic `setStep(3)` and the rollback `setStep(2)`.)

### Fix 3 — One-time autosave-on-load to heal the DB row

When the loader detects a legacy shape (i.e. `normaliseContent` actually changed something), fire-and-forget an autosave so the DB row is rewritten in the new shape. Detection is cheap:

```ts
const wasLegacy = !raw.tiers || !raw.weeks || !raw.episodes; // node-specific
if (wasLegacy) {
  void autosaveBuilderDraft({
    authorId, nodeId: "BA-12", nodeName: "Memberships",
    content: normalised, currentStep: __draft.currentStep ?? 2,
  });
}
```

After Pauline visits each affected builder once, the DB is permanently in the new shape and any future code can drop the shim safely.

## Files touched

**New**
- `src/components/dashboard/builders/ba12/normalise.ts` — `normaliseMembership(raw)`
- `src/components/dashboard/builders/ba13/normalise.ts` — `normaliseGroupCoaching(raw)`
- `src/components/dashboard/builders/ba14/normalise.ts` — `normalisePodcast(raw)`

**Update**
- `src/components/dashboard/builders/ba12/BA12Builder.tsx` — apply normaliser in `useEffect` loader + `handleGenerate`; reorder `handlePublish`; one-time heal autosave.
- `src/components/dashboard/builders/ba13/BA13Builder.tsx` — same three changes.
- `src/components/dashboard/builders/ba14/BA14Builder.tsx` — same three changes.

## Scope

- Pure frontend. No DB migration, no edge function changes, no schema changes.
- Pauline's existing rows render correctly on next page load AND get healed in DB on first visit.
- Future authors with brand-new generations are unaffected (normaliser is a no-op for new shape).

## Verification

1. Reload BA-12 builder → Tiers tab shows the Member tier with $27/mo and Pauline's benefits list (mapped from legacy `monthly_price_usd` + `benefits[]`).
2. Reload BA-13 builder → Curriculum tab shows 8 week cards; Pricing tab shows the suggested price input prefilled.
3. Reload BA-14 builder → Episodes tab shows 10 expandable episode cards.
4. Click Publish in any of the three → button awaits; success screen only renders after DB write succeeds.
5. Re-open the same builder a third time → no shim work needed (DB row is already healed); tabs render directly.

