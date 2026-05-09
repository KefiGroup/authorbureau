## Goal

Make sure that, for every node that ships with a slide deck, the **deck length itself** scales with the runtime the author picks — not just the speaker-script word count. Today the script expands talking points to fit (e.g.) 240 minutes, but the underlying deck is still the 10 slides the generator originally produced. That mismatch means a half-day "training" still looks like a 10-slide keynote in the .pptx.

## Nodes in scope (slide-bearing)

| Node | Field | Default count | Deck role |
|------|-------|---------------|-----------|
| BP-05 Webinars | `slides` | 10 | Webinar |
| BA-10 Online course | `slides` | 12 | Course overview |
| BA-13 Group coaching | `slides` | 7 | Pitch |
| BA-16 Affiliate | `pitch_deck` | 6-8 | Pitch |
| BA-18 JV | `pitch_deck` | 6-8 | Pitch |
| YR-22 Corporate training | `slides` | 10 | Training |
| YR-23 Mastermind | `slides` | 10-12 | Pitch |
| YR-25 Certification | `slides` | 10 | Pitch |
| YR-27 Fundraising | `pitch_deck` | 8-10 | Pitch |
| YR-28 Sponsors | `pitch_deck` / `sponsor_deck` | 8-10 | Pitch |

**Out of scope:** BP-09 (workshop deck is locked at exactly 14 slides and corporate at 10 by spec — its prompt already forbids changing the count). We will NOT resize BP-09.

## What changes

### 1. New helper edge function: `resize-slide-deck`

Generic, AI-driven. Body: `{ author_id, book_id, node_id, target_slide_count, target_minutes }`.

- Loads the node, finds the slide field via the same `pickSlides` logic already in `generate-speaker-script`.
- If `|current - target| < 2` OR `node_id === 'BP-09'` → no-op, return existing slides.
- Otherwise calls Lovable AI (`openai/gpt-5-mini`, JSON mode) with a system prompt that:
  - Preserves the cover, agenda, and CTA slides verbatim.
  - **Expanding**: splits each content/module slide into deeper sub-topics (one sub-topic per new slide), pulling from the book's frameworks supplied via `buildAuthorContext`.
  - **Contracting**: merges adjacent module slides, keeping the strongest framework callbacks.
  - Keeps the same slide schema (`title`, `body`/`bullets`, `notes`, `layout_hint`, `headline`, `evidence` — whichever the original used).
- Persists the new array back to `content_json[<field>]` and stores `content_json.deck_runtime_minutes` + `content_json.deck_target_slide_count` for visibility.
- Returns `{ success, slides, slides_count, field }`.

### 2. Wire it into the speaker-script flow

In `generate-speaker-script/index.ts`, after `pickSlides` and before building `slidesPayload`:

- If `targetSlideCount` differs from `slides.length` by ≥2 (and node ≠ BP-09), `await fetch(.../resize-slide-deck)` with the resolved minutes + count, then re-load the node.
- Then proceed with the existing script generation against the (possibly new) deck.

### 3. Allow runtime picker for ALL slide-bearing nodes (not just YR-22)

`AssetRow.tsx` already shows the runtime dialog whenever `script_docx` is requested for the first time. Two small adjustments:

- Update `defaultRuntimeForNode` so each node's default matches its current generator default (BP-05 → 60, BA-10 → 90, BA-13 → 60, BA-16/18 → 30, YR-22 → 240, YR-23 → 90, YR-25/27/28 → 45). These already exist in `defaultRuntimeMinutes` inside `generate-speaker-script` — mirror them.
- Add a 5th option to `RUNTIME_OPTIONS`: **"Short pitch · 30 min · ~6 slides · no exercises"** for the affiliate/JV/sponsor pitch decks where 45 min is too long.
- Update the dialog copy: "ABBY will also reshape the slide deck itself to match — expanding or contracting slides — so the deck and the speaker script stay in sync."

### 4. Surface deck length in the asset row

When `content_json.deck_runtime_minutes` is set, the deck `sizeHint` becomes `"${n} slides · ${m} min"` instead of just `"${n} slides"`. Adds a small piece of `pluck` logic in `nodeAssetRegistry.ts`'s `sizeHint` callbacks for the affected nodes, or simpler: read the field directly inside `AssetRow` when rendering the badge.

### 5. Regenerate-deck side effect

Because the deck array is replaced in-place, the existing `.pptx` exporter (`export-pro-slides`) automatically picks up the new slides next time the author downloads. No changes needed to the exporter.

## Files touched

- **NEW** `supabase/functions/resize-slide-deck/index.ts`
- `supabase/functions/generate-speaker-script/index.ts` — call resize step, refresh node row after.
- `src/components/library/AssetRow.tsx` — extra runtime option, copy update, per-node defaults, deck size hint with minutes.
- `src/lib/nodeAssetRegistry.ts` — optional: extend `sizeHint` to include runtime when known.

## Validation

1. Pick YR-23 mastermind (currently 10 slides). Choose **Half-day (240 min)**.
   - `resize-slide-deck` should bump deck to ~16 slides.
   - Speaker script should reference all 16.
   - `.pptx` download should contain 16 slides, .docx should contain 16 sections + exercises + 2 break cues.
2. Pick BA-16 affiliate (currently 6 slides). Choose **30-min pitch**.
   - Resize is a no-op (within tolerance).
   - Script stays short, no exercise blocks.
3. Pick BP-09 (workshop locked at 14). Choose any runtime.
   - Resize MUST be skipped (logged: `bp09_deck_locked`).
   - Script still scales talking points but slide count stays 14.
4. Manual `.pptx` open in PowerPoint to confirm new slides have proper cover/CTA preserved and module slides carry framework names from the book.

## Out of scope

- Restyling slides visually.
- Per-slide image regeneration.
- Per-author speaking pace tuning.
- BP-09 deck restructuring (locked by node spec).