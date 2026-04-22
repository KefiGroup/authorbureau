

## Diagnosis

The Calendar tab crashes with "Objects are not valid as a React child" when `content.content_calendar` (or `monthly_newsletter_template`, or a welcome-email's `subject`/`body`) is an object/array instead of a string. React throws inside the Tabs render, which unmounts the whole tree → blank white screen.

Two failure paths:
1. **Normaliser blind spot** — `normaliseMembership` only synthesizes `content_calendar` when missing/empty-string. If the generator returned an object (e.g. `{ week_1: "...", week_2: "..." }`) or an array of week objects, the normaliser passes it through untouched and the JSX renders the object directly.
2. **Same risk** for `monthly_newsletter_template` and individual `welcome_emails[i].subject` / `.body` — never type-checked before render.

## Plan — two-layer defence

### Fix 1 — Coerce non-string shapes in `ba12/normalise.ts`

Add a small `toCalendarString(value)` helper used by `normaliseMembership`:

- string → trim, return as-is (or default if empty)
- array → join entries (each stringified) with newlines; objects in array become `Week N: …` lines using their `week`/`title`/`focus`/`description` fields, falling back to `JSON.stringify`
- object → iterate entries, render each as `Key: value` lines (handles `{week_1, week_2…}` shape)
- anything else → fall back to `buildDefaultCalendar(raw)`

Apply the same coercion to `monthly_newsletter_template` (string-only field — coerce object/array to readable text or drop).

Broaden `isLegacyMembership` so it also flags non-string `content_calendar` values, ensuring Pauline's row is healed in DB on next load.

### Fix 2 — Defensive render in `BA12Builder.tsx` Calendar tab

Even with the normaliser fixed, wrap each render with a tiny inline guard so a future schema drift never blanks the page again:

```tsx
const asText = (v: unknown) =>
  typeof v === "string" ? v : v == null ? "" : JSON.stringify(v, null, 2);
```

- Line 155: `{asText(content.content_calendar) || "Content calendar details will appear here."}`
- Line 160: `{asText(content.monthly_newsletter_template)}` (and gate the whole card on `asText(...).trim()`)
- Lines 171-172: coerce `e.subject` and `e.body` via `asText` before interpolation/render.

## Files touched

- **Update** `src/components/dashboard/builders/ba12/normalise.ts` — add `toCalendarString` + `toPlainString` helpers; coerce `content_calendar` and `monthly_newsletter_template`; broaden `isLegacyMembership` to flag non-string calendars.
- **Update** `src/components/dashboard/builders/ba12/BA12Builder.tsx` — add `asText` helper at top of Calendar tab; apply to the three render points (lines 155, 160, 171-172).

## Verification

1. Click Calendar tab on Pauline's BA-12 builder → renders without blank screen, shows readable calendar text (coerced from whatever shape was stored).
2. Background autosave heals her DB row to a plain-string `content_calendar`.
3. Future generations returning either string OR object shapes both render safely.

## Scope

Pure frontend. No DB migration, no edge function changes, no regeneration.

