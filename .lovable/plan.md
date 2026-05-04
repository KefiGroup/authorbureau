## The two real problems

Looking at the rendered deck (`Pauline_Teo_workshop_deck.pptx`), the slides are visually flat AND content-thin. There are two distinct root causes — both must be fixed together, otherwise nicer layouts will just frame empty bullets.

### Problem 1 — Generator outputs *category labels*, not slide content

In `supabase/functions/generate-bp09-book-sales/index.ts` the prompt's slide schema is:

```
{ "n": 6, "title": "Framework pillar 1", "body": "...", "speaker_notes": "..." }
```

The model is dutifully echoing "Framework pillar 1" as the slide title and squeezing the actual headline ("S and U / Start by Sucking, Understand Yourself") into `body`. That's why every slide reads like a wireframe label.

### Problem 2 — Exporter renders one layout for all 14 slides

`supabase/functions/export-bp09-slides/index.ts` puts every slide through the same template: top navy bar, big black title top-left, plain body text, light footer. No layout variation, no visual hierarchy, no design motif — exactly the "generic, visually flat" pattern the slides skill warns against.

---

## Fix plan

### A. Rewrite the generator schema (slide content quality)

Change the workshop slide object in `generate-bp09-book-sales/index.ts` from `{n, title, body, speaker_notes}` to a **typed, layout-aware** shape:

```ts
{
  n: 1,
  layout: "title" | "section" | "stat" | "framework" | "two_column" | "case_study" | "exercise" | "offer" | "qr" | "thanks",
  eyebrow: string,        // small label e.g. "PILLAR 1 OF 4"
  headline: string,       // the actual slide headline (16 words max)
  subhead?: string,       // one supporting line
  bullets?: string[],     // 2-4 short bullets, each ≤ 12 words
  stat?: { value: string, label: string },   // for stat slides
  columns?: { left: {h, body}, right: {h, body} }, // for two_column
  speaker_notes: string,
}
```

Then the prompt assigns a deliberate layout to each of the 14 slides:

```text
1  title       — Hero title + author
2  stat        — Pain point as a "X% of Y…" stat callout
3  two_column  — Setback story | What it really costs
4  bullets     — 3 governance principles
5  framework   — 8-stage SUCKCESS overview (8 chips in a grid)
6  framework   — Pillar 1 (S, U) with 3 bullets
7  framework   — Pillar 2 (C, K) with 3 bullets
8  framework   — Pillar 3 (C, E, S, S) with 4 bullets
9  case_study  — Ethics turnaround (challenge / move / result)
10 case_study  — COVID pivot (challenge / move / result)
11 exercise   — 24-Hour move with 3 numbered prompts
12 offer      — Book offer + dedication promise
13 qr         — Big QR placeholder + bonus list
14 thanks     — CTA + connect info
```

Also tighten the rules: `headline` must be a real sentence the audience reads aloud (not a label), and bullets/columns are required for every non-title slide.

### B. Rebuild the slide exporter (visual design)

Rewrite the per-slide rendering in `export-bp09-slides/index.ts` to switch on `layout` and apply a real design system. Concrete decisions:

- **Palette (Midnight Executive, from slides skill):** primary `#1E2761`, ice `#CADCFC`, accent `#F96167` (coral) used sparingly for emphasis, ink `#1A1A2E`, paper `#FFFFFF`.
- **Typography:** `Calibri` body, `Calibri` bold for headers (Arial fallback). Title 40pt, headline 32pt, eyebrow 12pt all-caps tracked, body 18pt, bullets 18pt, stat number 96pt, footer 9pt italic.
- **Visual motif (repeat every slide):** thin coral vertical accent bar 0.15" wide on the left edge of the content area, plus a small navy circle with the slide number in the bottom-left footer. This is the "commit to one motif" rule.
- **Layout templates:**
  - `title` — full-bleed navy background, white headline center-left, coral underline bar, author name + book title bottom-left, "Slide 1" hidden.
  - `section` — navy left third with eyebrow + slide number, white right two-thirds with large headline + subhead.
  - `stat` — huge 96pt number in coral, label below in navy, supporting sentence right column.
  - `framework` — eyebrow + headline top, then 3-4 cards in a row: each card = small navy circle with bullet number, bold title, 1-line description. For the SUCKCESS overview slide, render an 8-chip grid (2 rows × 4) with each letter in a navy rounded rect.
  - `two_column` — 50/50 split, each side has a coral header bar, h2 title, body text.
  - `case_study` — 3 stacked rows: "The challenge" (ice background), "The move" (white), "The result" (navy text on ice with coral accent number).
  - `exercise` — eyebrow "LIVE EXERCISE", headline, then 3 numbered steps in coral circles down the page.
  - `offer` — navy left panel with book mockup placeholder rect, right panel headline + 3 benefits + footer CTA strip.
  - `qr` — big white QR placeholder square (we'll embed an actual QR PNG generated from `amazon_url`/`bookstore_url` using a tiny Deno QR library), bonus list right column.
  - `thanks` — full-bleed navy, white headline center, coral CTA strip bottom with author social/email.
- **Footer change:** remove the current ice-blue full-width strip on every slide; replace with a small bottom-left "01 / 14 · Author Name" treatment that respects the layout.
- **QR code:** use `https://esm.sh/qrcode@1.5.3` to render the buy URL as a 600×600 PNG embedded via `slide.addImage({ data })`. If no URL, show a plain "Visit the back of the room" callout instead.
- **All copy from the model:** headline, eyebrow, bullets, stat, columns are passed straight through — no more dumping `body` into one text box.

### C. Backwards-compat for already-generated decks

The new exporter must still render older `{title, body}` records gracefully. Add a small `normalizeSlide()` helper at the top of the exporter that, if `layout` is missing, treats the slide as `layout: "section"` and maps `title → headline`, `body → subhead`. That way Pauline's existing toolkit re-exports cleanly while she can re-generate to get the upgraded version.

### D. QA loop (mandatory before declaring done)

1. Deploy `generate-bp09-book-sales` and `export-bp09-slides`.
2. Re-generate Pauline's BP-09 toolkit, export the workshop deck.
3. Convert PPTX → PDF → JPG and inspect every slide against the slides-skill checklist (overlap, contrast, overflow, motif consistency, no leftover label text like "Pain point 1").
4. Iterate fixes until a full pass surfaces no new issues. Report what was checked.

---

## Files touched

- `supabase/functions/generate-bp09-book-sales/index.ts` — new slide schema + layout assignments + tightened rules.
- `supabase/functions/export-bp09-slides/index.ts` — full rewrite of the rendering loop with per-layout templates, palette, motif, QR embedding, backwards-compat shim.
- No DB migration, no UI changes — `content_json.workshop.slides` is consumed only by these two functions.

## Out of scope

- BP-09 corporate lunch deck (10 slides) — same pattern applies and we should do it next, but ship workshop first so you can review the design direction.
- Handout PDF (`export-bp09-handout`) — separate file, untouched here.

Approve and I'll implement A → B → D in that order.