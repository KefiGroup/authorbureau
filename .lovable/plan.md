

## Diagnosis

The previous safety pass shipped the right code in principle, but the user reports YR-23 and YR-24 **still go blank** after generation. I cross-checked the live DB content against the current builder code and confirmed:

- DB has full content for **YR-23, YR-24, AND YR-25** (`status=content_ready, current_step=2`).
- All three already import `YRSafeBoundary` and `SafeText`, and the step-2 review block is wrapped in `<YRSafeBoundary>`.
- All identified array-vs-object fields for these three nodes (`curriculum_pillars`, `who_its_for`, `transformation_arc`, `morning/afternoon/evening`, `requirements`) are protected.

**So why is it still blank?** Two remaining possibilities the prior pass didn't fully close:

### Real residual crash sites (verified against live JSON)

**YR-24 line 87** — `transformation_arc.starting_point`:
```jsx
{t.starting_point && <p>...Starting point: {String(t.starting_point)}</p>}
```
`String()` coerces but if AI returns an object like `{ summary: "..." }`, this prints `[object Object]` (ugly but not a crash). However, line 88-91 wraps the *value* in `<SafeText>` — and `SafeText` returns a `<p>` element. The parent `<div>` wraps a `<span>` plus a `<p>` (block inside line). **This is a DOM nesting violation that React 18 strict mode treats as a hydration error in dev, sometimes blanking the whole tree.**

**YR-23 / YR-24 line 67 / 66** — `<AbbyCard><p>{content.abby_summary}</p></AbbyCard>`:
The `abby_summary` is rendered directly with no SafeText guard. If a future regen returns it as an object/array (already happened with YR-23/24 fields), this crashes **before** the `YRSafeBoundary` wrapper because `AbbyCard` is **outside** the boundary on line 66.

Wait — re-reading: line 64 opens `<YRSafeBoundary>`, line 66/67 is `<AbbyCard>{content.abby_summary}</AbbyCard>` **inside** the boundary. Good. But the *first* render that crashes still blanks the whole step.

### What's actually needed

1. **Fix the DOM nesting**: replace the `<span>...<SafeText/>` inline pairs in YR-24's `transformation_arc` block (lines 88-91) with proper block-level structure so `<ul>` is never nested inside an inline context.
2. **Universalize the SafeText guard**: wrap *every* direct text interpolation that could come back as an object/array, including: `abby_summary`, `programme_promise`, `retreat_concept`, `tagline`, `certification_promise`, `badge_concept.*`.
3. **Make `SafeText` render-safe by default**: change it to return a `<span>` wrapper for single strings (not `<p>`), so it's drop-in safe inside any parent. Use `<div>` for the array list. That removes all current and future block-in-inline traps.
4. **Add a visible "view raw content" debug block inside `YRSafeBoundary`**: when it catches an error, dump the offending field name + `JSON.stringify(content)` so the next failure gives Pauline (and us) the exact culprit instead of a generic message.
5. **Add a console.error fingerprint** at the top of the step-2 render: `console.log("[YR-XX] rendering content:", content)` so the next reload, if it crashes, leaves a breadcrumb in the dev-server log we can read.

## Plan

### Fix 1 — Refactor `SafeText` to be DOM-safe in any parent context

Update `src/components/dashboard/builders/yr-shared/YRSafeBoundary.tsx`:

- Single string → `<span>` (was `<p>`). Safe inline anywhere.
- Array → `<ul>` wrapped in `<div>` (was bare `<ul>`). Safe in any block parent.
- Object → `<span>` with `JSON.stringify` (was `<p>`). Inline-safe.
- New optional prop `as?: "block" | "inline"` defaulting to inline; pass `as="block"` from places that want list rendering.
- Add new helper `<SafeBlock value={x} />` that always renders block-level for tab content panels.

### Fix 2 — YR-24 transformation_arc block: switch to block-level layout

Replace `<span className="font-semibold">…</span> <SafeText value={t.breakthroughs} />` with a clean block layout:
```jsx
<div className="space-y-1">
  <p className="text-xs font-semibold text-muted-foreground">Breakthroughs</p>
  <SafeBlock value={t.breakthroughs} />
</div>
```
Apply to `breakthroughs`, `capabilities_built`, `measurable_shifts`, `take_home_assets`, plus `starting_point` (which uses `String()` today — replace with `<SafeText>`).

### Fix 3 — Wrap every loose text interpolation in `SafeText` across YR-19…YR-28

Audit each builder's step-2 block and replace bare `{content.xxx}` for fields that AI might return as object/array. Specifically:

- **YR-23**: `abby_summary`, `programme_promise`, `tagline`, `mastermind_title`, tier `tier_name` / `meeting_cadence`, `application_questions[i]` (already string but harden).
- **YR-24**: `abby_summary`, `retreat_concept`, `tagline`, `retreat_title`, retreat_options `format` / `duration` / `group_size` / `location_type`, itinerary `title`.
- **YR-25**: `abby_summary`, `certification_promise`, `tagline`, modules `description` / `assessment`, badge_concept `badge_name` / `badge_description` / `display_guidance`, level `level`.
- **YR-19, 20, 21, 22, 26, 27, 28**: same pattern — every direct `{content.xxx}` that's not already inside a primitive context (number, boolean) becomes `<SafeText value={...} />` for inline strings or `<SafeBlock value={...} />` for paragraph-style content.

### Fix 4 — Upgrade `YRSafeBoundary` to capture and surface the real crash

When it catches, log the full error to `console.error` with the node ID (passed as a new prop `nodeId`), include the stack, and show in the UI:
- The error message (already done)
- A "Show raw content" toggle that pretty-prints the `content` JSON (passed as new prop `debugContent`) so Pauline can see what came back, and we can see it from the session log

### Fix 5 — Diagnostic breadcrumb

Add `useEffect(() => { if (step === 2 && content) console.log('[YR-XX] step-2 render', content); }, [step, content]);` to all 10 YR builders. One line each. Next time it blanks, the dev-server log captures the exact shape that triggered the crash.

### Out of scope

- No edge function changes — generation is producing valid JSON.
- No DB migration — existing content is fine.
- No publish/microsite changes.

## Files touched

- **Update** `src/components/dashboard/builders/yr-shared/YRSafeBoundary.tsx` — refactor `SafeText` to inline-safe, add `SafeBlock`, add `debugContent` + `nodeId` props (~80 lines)
- **Update** `src/components/dashboard/builders/yr23/YR23Builder.tsx` — wrap loose interpolations, pass `nodeId="YR-23"` and `debugContent={content}` to boundary, add diagnostic effect (~20 lines)
- **Update** `src/components/dashboard/builders/yr24/YR24Builder.tsx` — refactor transformation_arc block to block-level layout, wrap loose interpolations, boundary props, diagnostic effect (~30 lines)
- **Update** `src/components/dashboard/builders/yr25/YR25Builder.tsx` — wrap loose interpolations, boundary props, diagnostic effect (~15 lines)
- **Update** `YR19/20/21/22/26/27/28 Builder.tsx` (7 files) — same wrap-and-instrument pass (~10 lines each, ~70 lines total)

No DB, no edge functions, no router, no shared backend changes. Pure resilience hardening + diagnostics.

## Verification

1. Pauline reloads `/node-builder/YR-23` → step-2 review renders all 4 tabs without blanking. Console log shows `[YR-23] step-2 render { mastermind_title: "Be SUCKcessful Mastermind...", ... }`.
2. Pauline reloads `/node-builder/YR-24` → step-2 renders. The transformation arc shows as a clean block layout (label above, SafeBlock list below). Itinerary days render as 3-column grids with morning/afternoon/evening as bulleted lists.
3. Pauline reloads `/node-builder/YR-25` → step-2 renders all 4 tabs (overview, curriculum, levels, badge).
4. If any future field comes back in an unexpected shape, `YRSafeBoundary` shows the error message + a "Show raw content" debug panel + a working "Re-generate" button. **No more white screens, ever.**
5. Pauline can click Publish on all three → microsites go live at `/pauline-teo/mastermind`, `/pauline-teo/retreat`, `/pauline-teo/certification`.
6. Console / dev-server log captures the exact `content` shape on every step-2 render, so any future regression is one log read away from root cause.

## Scope

1 shared helper refactor + 10 builder updates (each ~10-30 lines). Adds defensive `SafeText`/`SafeBlock` wrappers everywhere AI text is rendered, fixes a DOM nesting trap in YR-24, and instruments all 10 YR builders so the next failure is debuggable from logs alone.

