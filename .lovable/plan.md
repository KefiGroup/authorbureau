

## Diagnosis

**YR-25/26/27/28 are NOT bugs.** The DB has zero rows for those four nodes — Pauline simply hasn't clicked "Generate" yet. There's nothing for the builder to restore, so it correctly shows the Introduction step. Once she clicks Generate, those four will work (they just need the same defensive guards as YR-23/24 to be safe).

**YR-23 and YR-24 are real bugs — frontend render crashes.** The DB confirms generation succeeded for both (`status=content_ready, current_step=2, content_json` populated). The "white screen on completion" and "stays blank on reload" symptoms are classic React render crashes: the AI returned shapes the JSX wasn't expecting, React threw "Objects are not valid as a React child", and the whole component tree unmounted. On reload, `loadBuilderDraft` rehydrates the same broken content → blank again. The node is **not** stuck — the data is fine, only the renderer is wrong.

### Exact crash sites (verified against the live JSON in the DB)

**`YR23Builder.tsx`**

| Line | Code | AI returns | Crash |
|---|---|---|---|
| 77 | `curriculum_pillars.map((p: string) => <span>{p}</span>)` | `[{ pillar_name, focus_areas[], outcomes[] }]` (objects) | "Objects are not valid as a React child" → blank |
| 104 | `<p>{content.sales_page?.who_its_for}</p>` | `string[]` | renders array as child → throws |
| 105 | `sales_page.what_youll_get?.map(...)` | `string[]` ✅ ok | — |

**`YR24Builder.tsx`**

| Line | Code | AI returns | Crash |
|---|---|---|---|
| 78 | `<p>{content.transformation_arc}</p>` | `{ breakthroughs, starting_point, take_home_assets[], measurable_shifts[], capabilities_built[] }` (object) | renders object → throws |
| 97–99 | `<p>{d.morning}</p>` `<p>{d.afternoon}</p>` `<p>{d.evening}</p>` | each is `string[]` | renders array → throws |

## Plan

### Fix 1 — Repair the YR-23 renderer

Two changes in `src/components/dashboard/builders/yr23/YR23Builder.tsx`:

1. **Curriculum pillars (line 77)**: render the pillar object properly — show `pillar_name` as a chip, optionally expand to show focus areas / outcomes underneath. Use a defensive coercion so the renderer also works if a future AI response returns plain strings.
   ```tsx
   {content.curriculum_pillars?.map((p: any, i: number) => {
     const name = typeof p === "string" ? p : p?.pillar_name;
     return <span key={i} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">{name}</span>;
   })}
   ```
2. **Sales page who-it's-for (line 104)**: render as a bulleted list, with a string-fallback.
   ```tsx
   {Array.isArray(content.sales_page?.who_its_for) ? (
     <ul className="space-y-1">{content.sales_page.who_its_for.map((w: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><span className="text-primary">•</span>{w}</li>)}</ul>
   ) : (
     <p className="text-sm">{content.sales_page?.who_its_for}</p>
   )}
   ```

### Fix 2 — Repair the YR-24 renderer

Two changes in `src/components/dashboard/builders/yr24/YR24Builder.tsx`:

1. **Transformation arc (line 78)**: render the structured object — `starting_point` + `breakthroughs` as paragraphs, `capabilities_built` / `measurable_shifts` / `take_home_assets` as small lists. Add string-fallback.
2. **Itinerary day blocks (lines 97–99)**: coerce each session to a list — `Array.isArray(d.morning) ? <ul>…</ul> : <p>{d.morning}</p>` for morning/afternoon/evening.

### Fix 3 — Add a `<RenderSafe>` boundary to all 10 YR builders

Wrap the `step === 2` review block in every YR builder (YR-19 through YR-28) with a tiny React error boundary that catches any future shape-mismatch and shows an actionable fallback ("This view couldn't render — click Re-generate") instead of a blank screen. New file: `src/components/dashboard/builders/yr-shared/YRSafeBoundary.tsx`. ~30 lines, class component with `componentDidCatch`. Drops in as `<YRSafeBoundary onReset={() => { setContent(null); setStep(0); }}>…</YRSafeBoundary>`.

This is the **structural** fix that prevents the next white-screen incident — even if the AI returns an unexpected shape for YR-25/26/27/28 when Pauline clicks Generate, she'll see a clear recovery action instead of a stuck blank page.

### Fix 4 — Preventive shape-guards on YR-25/26/27/28

Quick read of the four un-generated builders shows one latent risk: **YR-25 line 104** renders `{l.requirements}` directly. The prompt asks the AI to return it as a string, but past results show AI sometimes returns arrays. Apply the same `Array.isArray` coerce pattern to:

- `YR25Builder.tsx` line 104: `l.requirements`
- `YR26Builder.tsx` line 78: `f.description`, line 84: `s.description`
- `YR27Builder.tsx` line 81: `t.benefit`, line 94: `c.summary`
- `YR28Builder.tsx` line 76: `content.audience_profile`, line 88: `sp.description`, line 98: `s.content_summary`, line 104/107/109: outreach fields

For each, wrap as: `Array.isArray(x) ? <ul>{x.map(...)}</ul> : <p>{x}</p>`. ~1 line each, no logic change.

### Out of scope

- No edge function changes — generation works correctly; the AI prompts and outputs are valid.
- No DB migration — existing YR-23/24 content_json is already correct and will render once the JSX is fixed (no need to re-generate).
- No router/microsite changes — Fix 3 from the prior sprint (publishing path) is still in place; Pauline can publish YR-23/24 immediately after this sprint lands.

## Files touched

- **Update** `src/components/dashboard/builders/yr23/YR23Builder.tsx` — fix pillars + who_its_for renderers (~10 lines)
- **Update** `src/components/dashboard/builders/yr24/YR24Builder.tsx` — fix transformation_arc + itinerary day renderers (~15 lines)
- **Create** `src/components/dashboard/builders/yr-shared/YRSafeBoundary.tsx` — error boundary (~30 lines)
- **Update** `src/components/dashboard/builders/yr19/YR19Builder.tsx` through `yr28/YR28Builder.tsx` (10 files) — wrap step 2 in `<YRSafeBoundary>`, plus the YR-25/26/27/28 shape-guards (~3 lines each, ~30 lines total across 10 files)

No DB, no edge functions, no router. Pure frontend resilience pass.

## Verification

1. Pauline reloads `/node-builder/YR-23` → builder restores to step 2 (Review) → all 4 tabs render: Overview, Tiers, Application, Sales Page. The `Be SUCKcessful Mastermind` content displays correctly with both membership tiers ($5,000 and $15,000). She can click "Publish to My Site" → microsite goes live at `/pauline-teo/mastermind`.
2. Pauline reloads `/node-builder/YR-24` → builder restores to step 2 → all 4 tabs render: Concept, Options, Itinerary, Pricing. The transformation arc shows as structured sections. The itinerary day cards show morning/afternoon/evening as bulleted lists. She publishes → live at `/pauline-teo/retreat`.
3. Pauline opens `/node-builder/YR-25`, `YR-26`, `YR-27`, `YR-28` → each lands on Introduction (correct — no content yet). She clicks Build → spinner runs 20–40 s → review screen renders without blanking, regardless of array-vs-string shape variations.
4. If any future AI response returns a wholly unexpected shape, the `YRSafeBoundary` catches it and shows: "This view couldn't render — click Re-generate" with a button that resets to step 0. No more white screens.

## Scope

2 surgical render fixes (YR-23, YR-24) + 1 new error boundary + 10 small wrap-and-guard updates across all YR builders. No data loss, no regeneration required, no edge function changes.

