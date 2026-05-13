
## What's wrong today

`/pauline-teo/be-suckcessful/audiobook` (and every BA-11 audiobook microsite) currently renders through `GenericPage` in `src/pages/MicrositePage.tsx`. That's the same generic template used for ~15 other node types, so the audiobook just gets:

- Title + a single grey "narrator" line, then **the entire 3,760-character book description dumped as one wall of text** with no headings, callouts, or breathing room.
- Sample-player + chapter list jammed below the text wall, then a bare "$14.99 / Buy Audiobook" pair.
- Cover floats alone in the right column; nothing visual reinforces it after the hero.
- Cream background with no rhythm — every section blends into the next.

The DB row already carries everything we need to do better — narrator credit, studio mood ("warm-storyteller"), chapter count (33), free-chapter count, distribution channels (`platform`, `acx`, `spotify`, `apple`), price, and a description that's already structured into pull-quote opener → bullet highlights → SUCKCESS framework → "who this is for" checklist → closing line. The renderer just isn't parsing any of it.

## Sprint 65 — Dedicated `AudiobookPage` (BA-11)

Build an editorial, audio-first microsite layout — same pattern as the existing `OnlineCoursePage` / `MembershipPage` specialisations in `MicrositePage.tsx`.

### Section flow (top → bottom)

```text
┌───────────────────────────────────────────────────────────────┐
│ HERO (split, navy → cream gradient)                           │
│  • Cover (left, tilted, with #1 badge already on artwork)     │
│  • "Audiobook Edition" eyebrow + serif title + 1-line tagline │
│  • Meta strip: 33 Chapters · ~5h listen · Narrated by Sarah   │
│  • Channel chips: Spotify · Apple · Audible/ACX · Web Player  │
│  • Primary CTA: ▶ Play Sample   Secondary: Buy $14.99         │
└───────────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────────┐
│ LISTEN-NOW BAND (cream)                                       │
│  AudiobookPreviewPlayer at full width, framed as              │
│  "Hear Chapter 1 free · Unlock the rest for $14.99"           │
└───────────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────────┐
│ EDITORIAL BODY (max-w-3xl, parsed from description)           │
│  • Pull-quote opener (first paragraph, large serif italic)    │
│  • "Inside this audiobook, you'll hear:" — 7 bullet cards     │
│    parsed from the existing "• heading\nbody" structure       │
│  • SUCKCESS Framework callout — 8 letter chips with one-liner │
│    extracted automatically from the "S, U, C, K, C, E, S, S"  │
│    block already in the description                           │
└───────────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────────┐
│ "WHO THIS AUDIOBOOK IS FOR" (alt navy band)                   │
│  Two-column ✔ checklist parsed from the existing checklist    │
│  block. Closes with the "If you've lived through storms…"     │
│  line as a centered serif quote.                              │
└───────────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────────┐
│ NARRATOR CARD (cream)                                         │
│  Headphones icon · "Narrated by Sarah, AI Storyteller voice"  │
│  Mood: Warm Storyteller · Studio: Authors Bureau              │
│  Tiny disclosure line about AI narration.                     │
└───────────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────────┐
│ FINAL BUY PANEL (centred)                                     │
│  Big price · 3 trust bullets (Lifetime access · Listen on     │
│  any device · 7-day refund) · Buy Audiobook CTA               │
│  Terms / Privacy footer line                                  │
└───────────────────────────────────────────────────────────────┘
```

### Copy treatment (purely presentational — no DB writes)

The existing description string already encodes structure with two markers:
- `•` (bullet) followed by a heading line, then a `\n` + body line
- `✔` (checkmark) lines for the "Who this is for" block
- `S, … U, … C, …` lines for the SUCKCESS framework

A small `parseAudiobookDescription(text)` helper inside the new component slices the string into:
1. `intro` — text before the first `•`
2. `highlights[]` — every `•` block, split into `{title, body}`
3. `framework` — the SUCKCESS letter rows, split into `{letter, label}`
4. `audience[]` — every `✔` line
5. `closing` — text after the last `✔`

If a section comes back empty we just hide it (matches the public-microsite "empty fields hide cleanly" rule). Existing authors who have shorter descriptions simply see fewer bands — no copy is invented.

### Channel chips

`content.channels` already lists `["platform","acx","spotify","apple"]`. Map to small chip components with the right brand glyph (lucide icons or inline svg), labelled "Listen on Spotify", "Listen on Apple Books", "Coming to Audible (via ACX)", "Web Player". Hidden when the array is empty.

### Visual + design-system rules respected

- Tokens only — `v.cardBg`, `v.accent`, `v.headingText`, `v.bodyText`, `v.mutedText`, `v.secondaryBg`, `theme.headingFont`, `theme.bodyFont` (same vars `GenericPage` already pulls from `useAuthorTheme`).
- Public microsite rules upheld: no nav header, single "Powered by Authors Bureau" footer (already in the layout), no em-dashes in any new copy strings, empty fields hide.
- One-paragraph max line-width = `max-w-3xl` for editorial body so we never get that 80-character text wall again.
- Subtle navy → cream alternating bands give the page rhythm without breaking the existing palette.
- Reuses `<AudiobookPreviewPlayer>` and `<BuyNowButton>` exactly as today — commerce path untouched.

### Wiring

In `src/pages/MicrositePage.tsx`, the existing dispatcher already special-cases `BA-10`, `BA-12`, `BP-05`, etc. Add one more branch:

```ts
if (nodeId === "BA-11") return <AudiobookPage ... />;
```

so BA-11 stops falling through to `GenericPage`. New component lives inline in the same file (matches the file's existing convention) or, if preferred for readability, in `src/pages/microsite/AudiobookPage.tsx` — flag this preference if you want it split out.

### Verification

1. Visit `/pauline-teo/be-suckcessful/audiobook` — confirm the new section flow renders, the description wall is gone, the SUCKCESS framework chips appear, and the buy CTA still launches Stripe via `BuyNowButton`.
2. Visit a second author's BA-11 (any other live audiobook) — confirm bands hide cleanly when their description has fewer markers.
3. Confirm no em-dashes in any new copy strings (`rg "—" src/pages/microsite/AudiobookPage.tsx` returns nothing).
4. Confirm sample player still plays Chapter 1 and the locked chapters still show "BUY TO UNLOCK".
5. Lighthouse: H1 still unique, alt text on cover, semantic `<section>`s.

## Files touched

- `src/pages/MicrositePage.tsx` — one extra dispatcher branch + the new `AudiobookPage` component (or a new file `src/pages/microsite/AudiobookPage.tsx` imported here).

## Out of scope

- No DB schema changes. The same `content_json` powers the new layout — we just parse it.
- No edits to commerce, the sample player, or the BA-11 builder UI.
- No changes to other node-type microsites in this sprint.
