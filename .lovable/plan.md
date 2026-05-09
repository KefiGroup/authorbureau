## Goal

Let the author choose the speaker-script runtime (45 / 90 / half-day / full-day) before generation, and make the AI actually fill that time with real content — not just relabel `timing_minutes`. Today the YR-22 script claims 240 min but contains only ~1,000 words of narration (≈8 min of speech).

## What changes

### 1. UI — runtime picker before download

`src/components/library/AssetRow.tsx` (script_docx branch only)

When the user clicks **Download speaker script (.docx)** for the first time (no `speaker_script` yet), open a small dialog instead of firing immediately:

```
Choose session length
○ Keynote          (45 min,  6-8 slides)
○ Workshop short   (90 min,  10-12 slides)
● Half-day         (240 min, 14-16 slides)   ← default for YR-22
○ Full-day         (420 min, 20-24 slides)

[ Generate script ]
```

If `speaker_script` already exists, skip the dialog and download immediately. Add a "Regenerate at different length" item inside the existing dropdown so authors can re-pick later.

The dialog passes `target_minutes` and `target_slide_count` through to the edge function.

### 2. Edge function — accept and enforce runtime

`supabase/functions/export-speaker-script/index.ts`
- Accept `target_minutes` and `target_slide_count` in the request body, forward them to `generate-speaker-script` when auto-generating.

`supabase/functions/generate-speaker-script/index.ts`
- Accept `target_minutes` (override `defaultRuntimeMinutes`) and `target_slide_count`.
- If `target_slide_count` is supplied AND differs from the existing slide count, **regenerate the slide deck first** by calling the node's own deck generator (BA-13 / YR-21 / YR-22 / YR-23 / YR-25 / YR-27 / YR-28) with a `slide_count` hint. That way 240-min and 45-min versions actually have a different number of slides, not the same 10 slides with stretched timings.
- Rewrite the prompt to **scale content depth with runtime**:
  - **Per slide**, require ALL of:
    - 8-12 sentences of `talking_points` for content slides (cover/agenda/CTA stay short)
    - 1-2 `book_callbacks` (named framework / story / stat from the book — not generic)
  - **For runtimes ≥ 90 min**, also require per content slide:
    - `exercise` block: `{ instructions, time_minutes, debrief_questions[] }`
    - `break_cue` on every ~60 min boundary
  - Spell out the word-count target in the system prompt: *"At ~130 wpm narration plus exercise/debrief overhead, a {target_minutes}-min session needs roughly {target_minutes * 130} words of `talking_points` + exercise text across all slides combined. Distribute this realistically — cover/agenda short, modules long."*
- Bump `max_completion_tokens` to 24000 for runtimes ≥ 240, keep 16000 below.

### 3. DOCX export — render the new fields

`supabase/functions/export-speaker-script/index.ts`
- Render new `exercise` block (heading "Exercise", instructions, "⏱ X min", debrief questions as bullets).
- Render `break_cue` as a centred italic divider.

### 4. Backfill

No migration. Existing `speaker_script` blobs stay valid (new fields are optional). Authors who want a denser version click "Regenerate at different length".

## Out of scope
- Changing pitch-deck visuals (`export-pro-slides` unchanged).
- Adding runtime picker to nodes that don't have a speaker-script row.
- Per-author speaking-pace tuning — 130 wpm is a reasonable global default.

## Files to touch
- `src/components/library/AssetRow.tsx` — add runtime dialog + regenerate menu item
- `supabase/functions/export-speaker-script/index.ts` — accept runtime args, render new fields
- `supabase/functions/generate-speaker-script/index.ts` — runtime-aware prompt, depth requirements, optional deck regen
- `src/components/ui/dialog` (existing) and `radio-group` (existing) — reused

## Verification
1. Generate a 45-min keynote for YR-22 → expect 6-8 slides, ~5,800 words narration, no exercises required.
2. Generate a 240-min half-day for YR-22 → expect 14-16 slides, ~31,000 words across narration+exercises, every module slide has an exercise + debrief, ≥3 break cues.
3. Re-render DOCX, convert to PDF, eyeball page count: 45 min ≈ 8-12 pages; 240 min ≈ 60+ pages.
