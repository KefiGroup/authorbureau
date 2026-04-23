

# Plan — Fix YR-25 & YR-28 Reader Page Display Bugs

## Diagnosis (verified in code)

Both bugs are in `src/pages/MicrositePage.tsx` and stem from the same root cause: array/object data being fed to `yrInline`, which falls back to `JSON.stringify` and prints raw JSON to the page.

### Bug 1 — YR-25 Certification Levels (line 2738)
```tsx
{l?.requirements && <p ...>{yrInline(l?.requirements)}</p>}
```
`requirements` is an **array of strings** (e.g. `["Complete all 6 modules…", "Submit a Suck-to-Start plan…"]`). `yrInline` JSON-stringifies it, so the page shows the raw bracketed string instead of bullets.

### Bug 2 — YR-28 Pitch Deck Outline (line 2937)
```tsx
const deckText = ... Array.isArray(deck) ? deck.map(yrInline).join("\n") : ...
```
`pitch_deck_outline` is an **array of `{slide, title, content_summary}` objects**. `yrInline` JSON-stringifies each one, so readers see `{"slide":1,"title":"…","content_summary":"…"}` lines.

---

## Fix

### YR-25 — render `requirements` as a bullet list
Replace the single inline paragraph with a `yrLines`-driven list (same pattern already used for module learning outcomes a few lines above):

```tsx
{(() => {
  const reqs = yrLines(l?.requirements);
  if (reqs.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: v.mutedText }}>Requirements</p>
      <ul className="space-y-1">
        {reqs.map((r, j) => (
          <li key={j} className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: v.accent }} />
            <span className="text-sm" style={{ color: v.bodyText }}>{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
})()}
```

### YR-28 — render the pitch deck as a proper slide outline
Replace the JSON-stringified `deckText` block (lines 2936–2937 + 2990–2995) with a structured slide list that reads `slide`, `title`, and `content_summary` cleanly. If the field is a plain string we keep the old paragraph rendering:

```tsx
const deckSlides = Array.isArray(deck)
  ? deck.map((s: any, i: number) => ({
      n: typeof s?.slide === "number" ? s.slide : i + 1,
      title: yrStr(s?.title || s?.heading, `Slide ${i + 1}`),
      summary: yrStr(s?.content_summary || s?.summary || s?.description),
    }))
  : [];
const deckString = typeof deck === "string" ? deck : "";

// …in the JSX…
{(deckSlides.length > 0 || deckString) && (
  <Card className="p-5" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
    <p className="text-xs uppercase tracking-wider mb-3" style={{ color: v.mutedText }}>Pitch Deck Outline</p>
    {deckString && <p className="text-sm whitespace-pre-line" style={{ color: v.bodyText }}>{deckString}</p>}
    {deckSlides.length > 0 && (
      <ol className="space-y-3">
        {deckSlides.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="text-xs font-bold shrink-0 w-12 pt-0.5" style={{ color: v.accent }}>SLIDE {s.n}</span>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold" style={{ color: v.headingText }}>{s.title}</p>
              {s.summary && <p className="text-sm" style={{ color: v.bodyText }}>{s.summary}</p>}
            </div>
          </li>
        ))}
      </ol>
    )}
  </Card>
)}
```

### Optional hardening (same file, ~5 lines)
Audit the rest of the YR templates for any other `yrInline(...)` calls that operate on fields the AI may return as arrays/objects, and swap to `yrLines` + bullet rendering where appropriate. (A quick grep shows the price-fallback uses are safe — they only hit `yrInline` when the value is not a number, which is rare and benign.)

## Files touched

- `src/pages/MicrositePage.tsx` — `CertificationPage` (replace one line ~2738 with a bullet list block) and `SponsorsPage` (replace `deckText` derivation + render block, ~2936–2995). ~40 lines changed total.

## Out of scope

- Builder UI, edge functions, DB schema, RLS, AI generation prompts — all unchanged. The data is correct; only the rendering is wrong.

## Verification

1. `/pauline-teo/certification` → Each level (Associate, Certified, Master) shows its requirements as a clean bulleted list, no `["…","…"]` text anywhere.
2. `/pauline-teo/sponsors` → Pitch Deck Outline renders as a numbered slide list ("SLIDE 1 — From Disaster to Mastery" + summary), no `{"slide":1,…}` artifacts.
3. Other YR pages (YR-19 through YR-24, YR-26, YR-27) — visually unchanged.

