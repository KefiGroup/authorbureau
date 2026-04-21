

## Diagnosis

The `BA10Builder.tsx` "Build My Course" button is **already correctly wired**:

```tsx
<Button onClick={handleGenerate} disabled={isBookLoading}>
  <Sparkles /> Build My Course
</Button>
```

`handleGenerate()` calls `setStep(1)` and invokes the `generate-ba10-online-course` edge function. There is **no `navigate()` call** anywhere in this button's handler.

The only navigations to `/build-authority` in the visible page come from two unrelated UI elements:
1. The `<Link to="/build-authority">Back to Build Authority</Link>` rendered by `NodeBuilder.tsx` (line 131) above the builder.
2. The back-arrow `<Button>` inside `StepHeader` (`BABuilderShared.tsx` line 19) which uses the default `backTo = "/build-authority"`.

So the perceived "navigates to /build-authority" is almost certainly **one of these other controls being clicked**, OR `handleGenerate()` throws so fast that the user sees step 0 again and assumes the click did nothing / went elsewhere.

The pattern in BP-01 / BP-02 is the same as BA-10: `onClick={handleGenerate}` calling an internal generator. There is no different working pattern to copy.

## Plan

**Step 1 — Add a one-shot diagnostic to `handleGenerate` in `BA10Builder.tsx`** so we can see in DevTools exactly what happens on click:

```tsx
const handleGenerate = async () => {
  console.log("[BA-10] Build My Course clicked", { authorId });
  setStep(1); setError(null);
  try {
    const { data, error: fnErr } = await supabase.functions.invoke(
      "generate-ba10-online-course", { body: { author_id: authorId } }
    );
    console.log("[BA-10] generate response", { data, fnErr });
    if (fnErr || !data?.success) throw new Error(data?.error || fnErr?.message || "Generation failed");
    setContent(data.content);
    setPriceOverride(data.content?.suggested_price_usd || null);
    setStep(2);
    void autosaveBuilderDraft({ authorId: authorId!, nodeId: "BA-10", nodeName: "Online Course", content: data.content, currentStep: 2 });
  } catch (e: any) {
    console.error("[BA-10] generate error", e);
    setError(e.message);
    setStep(0);
  }
};
```

This is purely additive logging — no behavioral change.

**Step 2 — Make the failure visible to the user** so silent reverts to step 0 stop being mistaken for a navigation. Add an immediate `toast.error(...)` in the catch block:

```tsx
} catch (e: any) {
  console.error("[BA-10] generate error", e);
  setError(e.message);
  setStep(0);
  toast.error(`Generation failed: ${toAbbyError(e.message)}`);
}
```

**Step 3 — Verification (user action)**

1. Hard-refresh `/node-builder/BA-10`.
2. Open DevTools console.
3. Click **Build My Course**.
4. Report back what the console shows:
   - If `[BA-10] Build My Course clicked` appears followed by `[BA-10] generate error` → the button works, the edge function is failing. We then fix the edge function (likely `author_id`, `author_context`, or AI gateway issue).
   - If `[BA-10] Build My Course clicked` appears with no error and `setStep(2)` runs but the URL changes to `/build-authority` → there is a parent-level navigation guard, and we'll inspect it.
   - If no `[BA-10] Build My Course clicked` log appears at all → the user is clicking a different element (the `Back to Build Authority` link or `StepHeader` back arrow). We then visually distinguish those controls so they are not mistaken for the primary CTA.

**Step 4 — Targeted fix based on Step 3 output.** No speculative rewrites until we see the actual failure mode.

## Files touched (Step 1 + Step 2 only — diagnostic + UX safety)

- `src/components/dashboard/builders/ba10/BA10Builder.tsx` — add 3 console logs and 1 `toast.error` inside the existing `handleGenerate`. No structural changes, no navigation changes, no removal of existing logic.

## Not touched

- Any other BA / BP / YR builder.
- `StepHeader` / `BABuilderShared`.
- `NodeBuilder.tsx`.
- The `generate-ba10-online-course` edge function (only after Step 3 confirms it as the failure point).

