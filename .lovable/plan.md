

## Diagnosis

Pauline's BA-12 row in DB has no `content_calendar` field — the AI generator omitted it that run. The Calendar tab reads only `content.content_calendar` and falls back to placeholder text. The normaliser doesn't synthesize a calendar from related fields.

Available related fields in the stored content: `monthly_newsletter_template`, `welcome_emails`, `tiers[].benefits`, `transformation_promise`.

## Plan — two fixes

### Fix 1 — Synthesize `content_calendar` in the normaliser when missing

Update `src/components/dashboard/builders/ba12/normalise.ts` so `normaliseMembership` adds a sensible default `content_calendar` string when the field is missing/empty. Build it from existing data:

```ts
content_calendar: raw.content_calendar?.trim()
  ? raw.content_calendar
  : buildDefaultCalendar(raw),
```

Where `buildDefaultCalendar` produces a 4-week month template referencing the membership name and pulling cues from `tiers[0].benefits` and `monthly_newsletter_template` if present:

> Week 1: Welcome + monthly theme kickoff (live Q&A). Week 2: Deep-dive workshop or training drop. Week 3: Community discussion + member spotlight. Week 4: Office hours / accountability call + preview of next month's theme.

Deterministic, no AI call required.

### Fix 2 — Richer Calendar tab rendering

Update `BA12Builder.tsx` Calendar tab (line 152-154) to render not just `content_calendar` but also, when present:

- `monthly_newsletter_template` in a labelled card ("Monthly Newsletter Template")
- `welcome_emails[]` as a small list ("Welcome Sequence: Day 0 / Day 2 / Day 5")

This way the tab is meaningful for any author whose generation produced one of these fields, even before re-generation.

### Fix 3 — Heal Pauline's row on next load

The existing one-time autosave-on-load pattern in BA12Builder already fires when legacy shape detected (`isLegacyMembership`). Extend the legacy detector to also return `true` when `content_calendar` is missing, so Pauline's row gets healed with the synthesized calendar on her next builder visit.

```ts
export function isLegacyMembership(raw: any): boolean {
  return !raw || !Array.isArray(raw.tiers) || raw.tiers.length === 0
    || !raw.content_calendar;
}
```

## Files touched

- **Update** `src/components/dashboard/builders/ba12/normalise.ts` — add `buildDefaultCalendar` helper, set `content_calendar` if missing, broaden `isLegacyMembership`.
- **Update** `src/components/dashboard/builders/ba12/BA12Builder.tsx` — Calendar tab renders `content_calendar` + optional `monthly_newsletter_template` card + optional welcome-emails list.

## Verification

1. Reload BA-12 builder → Calendar tab shows a 4-week template referencing the membership, plus the monthly newsletter template card and 3-email welcome sequence list.
2. Background autosave heals Pauline's DB row with the synthesized calendar.
3. Future fresh generations that DO include `content_calendar` render the AI-authored version unchanged (normaliser is a no-op for non-empty strings).

## Scope

- Pure frontend. No DB migration. No edge function changes. No regeneration required.

