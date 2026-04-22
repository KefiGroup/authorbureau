

## Diagnosis

All six issues trace to four root causes, three of which share a single fix.

| # | Symptom | Real root cause |
|---|---|---|
| 1 | "Coming Soon" after publish (BA-15/16/17/18) | `publishNodeToSite` uses project-local Supabase → RLS update silently matches **zero rows** because `auth.uid() (5fd8…)` ≠ `author_profile.user_id (ef23…)`. The DB row stays `content_ready` with `microsite_url = null`. |
| 2 | Blank tabs (BA-12/13/14) | AI generates a different JSON shape than the React component expects. E.g. BA-12 emits `monthly_price_usd` + flat `benefits[]`, UI reads `tiers[].name/price/benefits`. BA-14 emits `first_10_episodes`, UI reads `episodes[]`. BA-13 emits `curriculum`, UI reads `weeks[]`. |
| 3 | Press Release tab crashes (BA-15) | AI returns `press_release` as an **object** `{headline, subheadline, body, boilerplate}` but UI does `<p>{content.press_release}</p>` → React "Objects are not valid as a React child" → blank page. |
| 4 | BA-18 first-attempt fails | AI gateway logs show `Http: connection closed before message completed`. The single 9KB JSON call to `openai/gpt-5` exceeds the gateway's first-try budget. |
| 5 | BA-15 / BA-18 redirect to Marketing Hub | They're in `NO_MICROSITE_NODES`. No `/press` or `/partners` route exists yet. |
| 6 | Resume always lands on step 0 | Same as #1 — saves go through the edge function (`save-author-node`) and work, **load** also works, BUT the autosave on `setStep(2)` writes `current_step: 2` only if the autosave call fires. Several builders set `setStep(2)` and then call autosave with `currentStep: 2`, which IS correct. Real issue: when publish silently fails (#1), `setContent({...prev, activated:true})` runs in memory only — there is no autosave call. On reload, the DB row still has `_currentStep: 2` and `status='content_ready'` so resume goes back to step 2 (Review), not step 3 — confusing the user into thinking it reset. After fixing #1 the resume position will be correct. (Step 0 reports specifically about BA-11 trace to the heal effect — already fixed last sprint.)

## Plan

### Phase 1 — Fix the silent publish failure (Issues 1 + 5 + 6)

**New action in `save-author-node`**: `action: "publish"`.

- Same JWT-decode auth + ownership check (project-local `auth.uid()` matched to `author_profiles.user_id` is too strict — instead match on `author_profiles.id = authorId` AND `author_profiles.user_id = sub` OR the resolved profile's email matches the JWT email — covering both shared-backend and project-local users).
- Sets `status='live'`, `activated_at=now()`, `microsite_url`, `current_step=3`, and merges `{ activated: true }` into `content_json`.
- Returns the resolved `microsite_url` so the UI can display the live link confidently.

**Update `src/lib/publish-node.ts`** to call this new action via `getActiveToken()` + `fetchWithTimeout()` instead of the project-local PostgREST update.

**Fix Issue 5** in the same pass:
- Add `BA-15 → "press"` and `BA-18 → "partners"` to `NODE_SLUG_MAP` and `NODE_NAMES` (so `/pauline-teo/press` and `/pauline-teo/partners` resolve via the existing `AuthorSubpageResolver` → `MicrositePage` flow).
- Remove `BA-15` and `BA-18` from `NO_MICROSITE_NODES`.
- Add reader-facing renderers for them in `MicrositePage.tsx` (Press = press release + speaker headline + media kit + pitch contact form; Partners = partner profiles + pitch CTA + outreach contact form).
- The existing `GenericPage` fallback covers the other BA nodes, so nothing else needs a new template.

**Fix Issue 6** by ensuring autosave runs on every meaningful state change — already correct after Phase 1 fixes the publish action (which triggers a real DB write that records `current_step=3`). No extra builder changes needed.

### Phase 2 — Make the Review tabs render (Issue 2)

Strategy: **fix the AI prompts to emit the shape the UI already expects** (smaller blast radius than rewriting 7 React components, and keeps existing exports working).

- **`generate-ba12-membership`**: change schema to require `membership_title`, `tagline`, `who_its_for`, `transformation_promise`, `tiers: [3 items: {name, price, description, benefits[]}]`, `content_calendar`, `welcome_emails`, `abby_summary`. Keep prompt under 4KB; use `openai/gpt-5-mini`.
- **`generate-ba13-group-coaching`**: schema → `programme_title`, `programme_subtitle`, `tagline`, `duration`, `group_size`, `session_frequency`, `transformation_promise`, `who_its_for`, `weeks: [8 items {week_number, title, description, activity}]`, `suggested_price_usd`, `pricing_rationale`, `sales_page: {headline, subheadline, cta_button_text}`, `abby_summary`.
- **`generate-ba14-podcast`**: schema → `podcast_title`, `tagline`, `format`, `target_listener`, `episodes: [10 items {title, description}]`, `launch_plan`, `abby_summary`.
- **`generate-ba16-affiliate`**: schema → `programme_title`, `overview`, `commission_tiers: [{name, description, commission}]`, `affiliate_resources` (string), `abby_summary`. (UI is already mostly in sync — only minor.)
- **`generate-ba17-upsells`**: confirm `bundles[]` and `upsell_sequences[]` shape match the BA17 builder; align prompt accordingly.

Bonus: store the renamed fields, and add a small **back-compat shim** in each builder's `setContent` step so the still-saved old shape (Pauline's current data) is mapped to the new shape on load (e.g. `tiers ?? [{name:'Member', price: monthly_price_usd, benefits}]`). This means existing authors don't have to re-generate.

### Phase 3 — Stop Press Release from crashing (Issue 3)

In `BA15Builder.tsx` Press Release tab, replace `<p>{content.press_release}</p>` with a structured renderer that handles both string and object shapes:

```tsx
{typeof content.press_release === "string" ? (
  <p className="whitespace-pre-wrap">{content.press_release}</p>
) : (
  <div className="space-y-3">
    <h3 className="font-bold">{content.press_release?.headline}</h3>
    <p className="italic">{content.press_release?.subheadline}</p>
    <p className="whitespace-pre-wrap">{content.press_release?.body}</p>
    <p className="text-xs text-muted-foreground">{content.press_release?.boilerplate}</p>
  </div>
)}
```

Apply the same defensive pattern to `pitch_template` (mismatched name → `media_pitch_template` object) and the BA-18 `partnership_pitch` object. Then update the BA-15 prompt schema to match the React component (string fields where the UI expects strings).

### Phase 4 — Make BA-18 generation reliable (Issue 4)

Two-part fix:
1. **Switch model** from `openai/gpt-5` to `openai/gpt-5-mini` (5–10× faster, plenty of headroom for the ~9KB JSON we need; matches the "fast preview" pattern used by BP-02).
2. **Increase client timeout** for builder generate calls. `supabase.functions.invoke` has no timeout knob, so introduce a small wrapper `invokeWithTimeout(name, body, ms)` (default 90s) using `AbortController` + the project URL. Apply to all `handleGenerate` calls in BA-13, BA-15, BA-18 (the three heaviest prompts).
3. Align BA-18 prompt schema with the React component (already does `ideal_partners[]` and `pitch_template` — adjust prompt from `ideal_partner_profiles` → `ideal_partners` and from `partnership_pitch` object → `pitch_template` string).

### Phase 5 — Verification

1. Click **Publish to My Site** on BA-16/17/15/18 → DB row flips to `status='live'` with `microsite_url` set; success screen shows the live link.
2. Visit `/pauline-teo/affiliates`, `/pauline-teo/bundles`, `/pauline-teo/press`, `/pauline-teo/partners` → each renders content, no "Coming Soon".
3. Re-generate BA-12/13/14 → all tabs render; existing pre-fix data still renders via the back-compat shim.
4. Click Press Release tab on BA-15 → page stays alive, structured render appears.
5. Click "Design My Strategy" on BA-18 → completes on first attempt within ~30s.
6. Refresh any builder mid-flow → resumes at the saved step.

## Files touched

**Backend**
- **Update** `supabase/functions/save-author-node/index.ts` — add `action: "publish"`.
- **Update** `supabase/functions/generate-ba12-membership/index.ts` — schema to match UI.
- **Update** `supabase/functions/generate-ba13-group-coaching/index.ts` — schema to match UI.
- **Update** `supabase/functions/generate-ba14-podcast/index.ts` — schema to match UI.
- **Update** `supabase/functions/generate-ba15-media-pr/index.ts` — strings where UI expects strings.
- **Update** `supabase/functions/generate-ba16-affiliate/index.ts` — schema alignment.
- **Update** `supabase/functions/generate-ba17-upsells/index.ts` — schema alignment.
- **Update** `supabase/functions/generate-ba18-jv-partnerships/index.ts` — switch to `gpt-5-mini`, schema alignment.

**Frontend**
- **Update** `src/lib/publish-node.ts` — call `save-author-node` `publish` action via `getActiveToken()`.
- **New** `src/lib/invoke-with-timeout.ts` — 90s wrapper around edge function POST.
- **Update** `src/lib/node-slug-map.ts` — add `BA-15 → "press"`, `BA-18 → "partners"`; remove from `NO_MICROSITE_NODES`.
- **Update** `src/pages/MicrositePage.tsx` — add `PressKitPage` and `JVPartnersPage` renderers, plus contact form wiring through existing `microsite-action`.
- **Update** `src/components/dashboard/builders/ba12/BA12Builder.tsx` — back-compat shim for legacy `monthly_price_usd` shape.
- **Update** `src/components/dashboard/builders/ba13/BA13Builder.tsx` — shim for legacy `curriculum` → `weeks`.
- **Update** `src/components/dashboard/builders/ba14/BA14Builder.tsx` — shim for legacy `first_10_episodes` → `episodes`, `show_title` → `podcast_title`.
- **Update** `src/components/dashboard/builders/ba15/BA15Builder.tsx` — defensive Press Release/Pitch renderer.
- **Update** `src/components/dashboard/builders/ba18/BA18Builder.tsx` — defensive Pitch renderer + map `ideal_partner_profiles` → `ideal_partners`.

## Scope

- No DB migration. No RLS changes. No new secrets.
- Existing `content_ready` rows in DB will be re-published correctly on the next "Publish to My Site" click — no data backfill required.
- Old generations of Pauline's BA-12/13/14 keep rendering via the back-compat shim; she does NOT need to re-generate.

