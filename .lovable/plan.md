

# Plan — Fix grammar of "After this section, you can:" outcomes

## The bug

The label `After this section, you can:` is meant to be completed by a **verb phrase** (e.g. "articulate a crisp niche, elevate your environment, and track simple metrics"). Instead, Abby returns full sentences like `"You will articulate a crisp niche..."`, producing the broken read:

> After this section, you can: You will articulate a crisp niche...

## Fix (two layers — prompt + render-time sanitizer)

### 1. Prompt — `supabase/functions/generate-bp06-online-course/index.ts`

Tighten the `outcome` field spec so new generations are correct:

```jsonc
"outcome": "Verb phrase completing the sentence 'After this section, you can:' — start with a lowercase verb, no subject pronoun. Example: 'articulate a crisp niche, redesign your workspace, and track three weekly metrics.' Do NOT start with 'You will', 'You can', 'Readers will', etc."
```

### 2. Render-time sanitizer — covers existing drafts

Existing workbooks already in the DB still have the broken `outcome` strings. Add a tiny pure helper used by both the UI and the PDF so the fix is retroactive without a regeneration:

In a shared spot (top of `src/lib/workbook-pdf.ts`, also re-imported in `BP06Builder.tsx`):

```ts
export function normalizeOutcome(raw?: string): string {
  if (!raw) return "";
  let s = raw.trim();
  // Strip leading subject+modal phrases so the sentence flows from the label.
  s = s.replace(
    /^(you(['']| wi)?(ll)?|you can|you['']ll be able to|readers (will|can)|the reader (will|can)|by the end[^,]*,\s*you (will|can))\s+/i,
    "",
  );
  // Lowercase the first letter (verb), but leave acronyms/proper nouns alone.
  if (s.length > 1 && /^[A-Z][a-z]/.test(s)) s = s[0].toLowerCase() + s.slice(1);
  return s;
}
```

Then:
- `BP06Builder.tsx` line 317 → `<p className="text-sm">{normalizeOutcome(s.outcome)}</p>`
- `workbook-pdf.ts` line 272 → `drawCalloutBox(doc, y, "After this section, you can:", normalizeOutcome(s.outcome))`

Result: "After this section, you can: **articulate a crisp niche, elevate your environment, and track simple metrics that move your mission and money.**"

## Files touched

- `supabase/functions/generate-bp06-online-course/index.ts` — tighten the `outcome` field spec in the prompt.
- `src/lib/workbook-pdf.ts` — export `normalizeOutcome` helper; use it when rendering the callout.
- `src/components/dashboard/builders/bp06/BP06Builder.tsx` — import and use `normalizeOutcome` in the section card.

## Out of scope

- Re-running existing generations (not needed — sanitizer handles them).
- Other AI-returned text where the same pattern might appear (no other UI label has this issue today).

## Verification

1. Open the existing workbook → each section card reads "After this section, you can: **<verb phrase>**" with no "You will" stutter.
2. Download the PDF → the callout box reads cleanly the same way.
3. Generate a fresh workbook → new `outcome` values come back as verb phrases without needing the sanitizer.

