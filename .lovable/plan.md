# Fix BP-03 graphic ↔ caption mismatch

## What you're seeing

On the LinkedIn "Quote" card in the screenshot, the graphic reads:

> "Most people don't fail because they're incapable. **they fail because they don't START.**"

…but the actual caption underneath says:

> "Most people don't fail because they're incapable. **They fail because they're ashamed of being a beginner.** Early in my life, I 'sucked' at things…"

The first sentence matches; the second sentence on the image is invented.

## Why it happens

`supabase/functions/bp03-generate-all-graphics/index.ts` builds the image prompt like this:

```ts
const firstLine = (opts.caption || "").split(/\n+/)[0]?.slice(0, 160) || "";
…
Visual concept inspired by this caption opening: "${firstLine}".
```

Two real bugs fall out of that one line:

1. **The model is told to be "inspired by" the first line, not to render it verbatim.** Gemini Nano Banana then writes its *own* punchy quote on the image. That's why the second sentence drifts ("don't START" vs "ashamed of being a beginner").
2. **Only the first 160 chars of the FIRST PARAGRAPH are sent.** For multi-paragraph captions like this LinkedIn Quote post, the model never sees the real second sentence — so it can't render it even if instructed to.

There's also a staleness problem: when an author edits the caption in `PostEditorSheet`, the existing `graphics.{landscape,portrait,square}` URLs are *not* invalidated. The copy says "Tweak the caption, then regenerate the graphic" but nothing forces a re-render — so an edited caption can keep an old image indefinitely.

## Fix plan

### 1. Render the EXACT pull quote on the graphic
In `bp03-generate-all-graphics/index.ts`:
- Reuse the existing `extractPullQuote()` logic (port the small helper from `src/components/dashboard/builders/bp03/socialGraphic.ts` into the edge function, or inline an equivalent ~20 line version).
- Compute `pullQuote` from the **full caption** (not just first line, not sliced to 160 before sentence detection).
- Change the prompt from "inspired by this caption opening" to an explicit, non-negotiable instruction:
  > Render this EXACT text on the graphic, verbatim, with no paraphrasing, no added words, no removed words, no punctuation changes:
  > "{pullQuote}"
  > Author attribution line: — {authorName}
  > Book footer: {bookTitle}
- Keep the brand-kit block, archetype hint, and aspect-ratio guidance unchanged.

### 2. Invalidate stale graphics on caption edit
In the edit/save path used by `PostEditorSheet` (the social-post update mutation):
- When `content` changes, also write `graphics: {}` and `graphic_url: null` so the card shows "Generate graphic" instead of an out-of-date image.
- Calendar's "Generate graphic" / batch generator already handles empty `graphics`, so no other change needed.

### 3. (Small, same-file) Make the prompt instruction order explicit
Re-order the prompt so the literal text-to-render is the FIRST instruction, not buried after the visual brief — image models follow leading instructions far more reliably.

## Files in scope
- `supabase/functions/bp03-generate-all-graphics/index.ts` — pull-quote extraction + verbatim-render prompt.
- The post-update handler used by `PostEditorSheet.tsx` (likely a mutation in `SocialCalendarTab.tsx` or a sibling hook — to be confirmed during implementation) — invalidate `graphics` on caption edit.

## Out of scope
- Replacing AI graphics with the deterministic canvas renderer (`socialGraphic.ts`) wholesale. That's a bigger product call — happy to do it as a separate option if you'd rather have 100% predictable text and accept a less "designed" look.
- Carousel layout, brand palette, or the empty-state banner work from the previous sprint.

## Verification
- Re-generate the LinkedIn Quote post in the screenshot; the graphic must read exactly "Most people don't fail because they're incapable. They fail because they're ashamed of being a beginner." (or whatever the current first sentence is), no invented words.
- Edit a caption in PostEditorSheet → save → confirm the card flips back to "Generate graphic" and the new render matches the new text.
- Check 2–3 other posts (Lesson, Framework) across LinkedIn / Instagram / X to confirm verbatim rendering holds across archetypes and aspect ratios.
