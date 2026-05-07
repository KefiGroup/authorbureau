# Sprint 12 — Pro Decks + Speaker Scripts

Applies to all 9 slide-bearing nodes:
BP-05, BA-10, BA-13, BA-16, BA-18, YR-22, YR-25, YR-27, YR-28.

---

## Part A — Lift deck quality to your 3-layer bar

### A1. Standardise the slide arc (Layer 2)

Every deck the AI returns must follow this arc, regardless of node:

```text
1  Title / Cover
2  Problem / Hook (story or stat from the book)
3  Agenda
4..N-2  Content modules (4–6, sourced from real book frameworks)
N-1  Key Takeaways
N    CTA / Next Steps
```

Update each generator's user prompt to demand:
- Exact slide count = `agenda + hook + modules + takeaways + cta` (typically 8–12).
- Each slide MUST cite a real framework, principle, story, or stage name from the book context that ABBY already has (e.g. SUCKCESS 8 stages, "Messy-Beginning Principle").
- Forbid generic filler ("In this section we will…"), forbid recycling the same body across slides.

### A2. Per-slide content rules (Layer 1 + Layer 3)

Tighten the JSON shape ABBY must emit for every slide:

```json
{
  "title": "ONE headline idea (≤ 9 words, no colons-as-titles)",
  "headline": "Single big idea (1 sentence, ≤ 18 words)",
  "bullets": ["≤ 6 short bullets, each ≤ 12 words"],
  "evidence": "Specific story / stat / framework reference from the book",
  "speaker_notes": "2–4 sentences for the speaker view",
  "layout_hint": "hero|stat|quote|divider|bullets|split"
}
```

Also fix the field-name mismatch: today generators emit `notes`, but `export-pro-slides` reads `speaker_notes`. Generators will now emit `speaker_notes` (and `bullets[]` instead of `body` blob). Exporter will accept both for back-compat.

### A3. Repair pass

`ensureSlideField()` already top-ups missing decks. Extend it to also enforce:
- `min bullets = 3`, `max bullets = 6`
- Drop slides whose `evidence` is empty AND title is generic ("Introduction", "Overview").
- Re-call gateway only for the failing slides.

### A4. Exporter upgrade

`supabase/functions/export-pro-slides/index.ts`:
- Render `headline` as the dominant on-slide text when present.
- Render `bullets[]` as a real bullet rail (currently it splits `body` on `\n|•`).
- Keep current layout_hint heuristics as fallback.

---

## Part B — Speaker Script companion

### B1. Data shape

Persist alongside `slides` / `pitch_deck` on `author_nodes.content_json`:

```json
"speaker_script": {
  "deck_title": "...",
  "total_runtime_minutes": 90,
  "intro": "Opening hook for the whole session",
  "slides": [
    {
      "slide_index": 1,
      "title": "...",
      "timing_minutes": 4,
      "opening_hook": "Story / stat to open this slide",
      "talking_points": ["..."],          // verbatim narration, 4–8 sentences
      "transition_in": "How to arrive at this slide",
      "transition_out": "Bridge to next slide",
      "facilitation_prompts": ["Ask the room: ..."],
      "closing_anchor": "The one line they must remember"
    }
  ],
  "outro": "Final CTA + thank-you"
}
```

### B2. New edge function `generate-speaker-script`

Inputs: `{ author_id, book_id, node_id }`.

Steps:
1. Load `author_nodes` row → pick `slides` or `pitch_deck`.
2. Load author/book context via `buildAuthorContext` (same path generators use, so brand vocabulary + frameworks are reused).
3. Single gateway call (`openai/gpt-5`, default temp, 16k tokens) asking for the schema in B1, with hard rules:
   - Use the author's first-person voice when natural.
   - Each slide's narration must reference the same framework/story listed in the slide's `evidence`.
   - Sum of `timing_minutes` ≈ realistic runtime for the node (Half-Day = 240, Full-Day = 480, etc.).
   - No emdashes, no dollar amounts in narration body.
4. `parseAiJsonResilient` → merge into `content_json.speaker_script` via `upsertAuthorNode` WITHOUT touching `status` or `current_step` (so it never reverts a Live node to content_ready — bug we hit in Sprint 11).

Add the function to `supabase/config.toml` with `verify_jwt = false` (matches sibling generators).

### B3. New edge function `export-speaker-script`

DOCX output (uses the same `docx` Deno-compatible bundling pattern already used elsewhere; if not present, fall back to a simple HTML→docx via a small templater). Returns `{ base64, filename }` like `export-pro-slides`.

Document layout:
- Cover (book title, deck title, total runtime).
- Per slide: H2 = `Slide N · title`, runtime badge, then sections **Hook**, **Talking points**, **Facilitation**, **Transition out**, **Anchor**.
- Footer: "Prepared by ABBY for {pen_name}".

### B4. UI

1. **Builder side** — add a `Generate Speaker Script` action on every slide-bearing builder, in the same panel that already shows the deck readiness. Disabled until `slides`/`pitch_deck` exists. Calls `generate-speaker-script`, then refetches the node.
2. **Library side** — register a new asset row per slide-bearing node in `src/lib/nodeAssetRegistry.ts`:

   ```ts
   { key: "speaker_script", label: "Speaker script", type: "docx",
     formats: ["docx", "pdf"],
     probe: c => has(c, "speaker_script.slides"),
     sizeHint: c => {
       const n = arrLen(c, "speaker_script.slides");
       return n ? `${n} slides scripted` : undefined;
     } }
   ```

   `AssetRow.tsx` already routes `docx` through the existing exporter; add a `script` branch that calls `export-speaker-script`.

### B5. Backfill

One-shot script (post-deploy) for the test book `e5b857ac-…` to call `generate-speaker-script` for the 9 nodes so the Library rows light up immediately.

---

## Files to add / edit

**Edge functions**
- `supabase/functions/generate-speaker-script/index.ts` (new)
- `supabase/functions/export-speaker-script/index.ts` (new)
- `supabase/functions/export-pro-slides/index.ts` (read `headline`/`bullets`/`speaker_notes`)
- `supabase/functions/_shared/builder-helpers.ts` (`ensureSlideField` stricter rules)
- The 9 `generate-*` functions: prompt rewrite for arc + new slide schema (no logic refactor, only the prompt + JSON shape requested)
- `supabase/config.toml` (register the 2 new functions)

**Frontend**
- `src/lib/nodeAssetRegistry.ts` (add `speaker_script` row to the 9 nodes)
- `src/components/library/AssetRow.tsx` (route the new asset to `export-speaker-script`)
- A small reusable `GenerateSpeakerScriptButton` used inside each slide-bearing builder (BP05, BA10, BA13, BA16, BA18, YR22, YR25, YR27, YR28)

**Docs / memory**
- Update `docs/04-node-frameworks/{BP-05,BA-10,BA-13,BA-16,BA-18,YR-22,YR-25,YR-27,YR-28}.md` with the new deliverables list (Slide deck + Speaker script).
- Add a memory entry `mem://features/abby-speaker-script` describing the new shape and exporter.

---

## QA after build

1. Re-run all 9 generators on `Be SUCKcessful`.
2. Open YR-22 PPTX — verify arc, ≤6 bullets, real framework references, speaker notes pane populated.
3. Generate Speaker Script for YR-22 → DOCX opens with hook + transitions + timing per slide.
4. Confirm node `status` stays `live` (no re-activation needed — fix from Sprint 11 must hold for both new functions).
5. Spot-check 3 other nodes (BA-10, BA-18, YR-27) for the same arc + script integrity.
