

## Diagnosis

Both BA-13 and BA-14 are **live** with rich content in `author_nodes.content_json`, but `MicrositePage` has **no dedicated renderers** for them, so both fall through to `GenericPage`, which only knows about `headline / subheadline / description / bullets / price`. Pauline's actual fields are dropped:

- **BA-13** (`/pauline-teo/group-coaching`): action type is `"application"` → renders an Apply Now form on the right with only the personalised name as the title on the left. Drops: `tagline`, `transformation_promise`, `weeks[]` (full 8-week SUCKCESS curriculum), `who_its_for`, `what_youll_get`, `session_format`, `cohort_size`, `duration`, `suggested_price_usd`, `pricing_rationale`, `sales_page`.
- **BA-14** (`/pauline-teo/podcast`): action type defaults to `"purchase"` and there's no `payment_link` → falls into the disabled "Coming Soon" button branch at line 1500-1502. Drops: `show_title`, `show_subtitle`, `tagline`, `show_description`, `episodes[]` (10 episodes), `first_10_episodes[]` (rich variant with hooks + key_points), `episode_format`, `release_cadence`, `target_listener`, `distribution_platforms[]`, `launch_plan`, `monetisation_strategy`.

Fix mirrors the proven BA-15/16/17/18 pattern: add two dedicated renderers and route to them in the dispatcher.

## Plan

### Fix 1 — `GroupCoachingPage` (BA-13) renderer

Add a new `function GroupCoachingPage(props: FormPageProps)` to `MicrositePage.tsx` (slot it after `BundlesPage`/`JVPartnersPage`). Layout follows the AffiliatesPage two-column rhythm — content on the left, sticky Apply form on the right:

- **Hero**: programme name (`programme_title` || personalised_name), `tagline`, `transformation_promise` paragraph.
- **Programme details strip** (small cards row): `duration` · `cohort_size` · `session_format` · `suggested_price_usd` (formatted `$1,997`) — each rendered only when present.
- **"Who it's for"** section: render `who_its_for` as paragraph or bullet list (handles string OR array).
- **"What you'll get"** section: bullet list from `what_youll_get` (string OR array).
- **8-Week Curriculum**: render `weeks[]` (preferred — newer shape) falling back to `curriculum[]` (legacy). Each week as a card: `Week N · title`, `description`, then optional `activity[]` / `homework[]` as a checklist.
- **Pricing rationale** (small muted block, only if `pricing_rationale` present).
- **Sales page narrative** (optional): render `sales_page` if it's a non-empty string (sanitized via existing patterns; render with `whitespace-pre-line`).
- **Right column**: existing Apply Now form (`actionType="application"` semantics) — first/last name, email, message, submit. On `submitted` show success card. Sticky on `md:` breakpoint.

Defensive: every field guarded with type check (`typeof x === "string"` / `Array.isArray`); coerce arrays of strings or arrays of objects (e.g., `weeks` items) safely; never render an object directly.

### Fix 2 — `PodcastPage` (BA-14) renderer

Add `function PodcastPage(props: PageProps & { onSubmit, email, setEmail, firstName, setFirstName, submitting, submitted })` — uses the optin form pattern for "Notify Me on Launch" since no purchase link exists.

- **Hero**: book cover OR a microphone icon tile + `show_title` (h1), `show_subtitle` (italic), `tagline` line.
- **Show description**: `show_description` paragraph block (whitespace-pre-line).
- **Subscribe links**: read `distribution_platforms` array (objects like `{platform, url}` OR plain strings like `"Spotify"`/`"Apple Podcasts"`) and render pill buttons. If it's plain strings without URLs, render disabled badge "Coming to {platform}". Add the standard Apple/Spotify/YouTube/Google copy when only labels present.
- **Episode list**: prefer `first_10_episodes[]` (richer — has `number`, `hook`, `key_points`, `description`); fall back to `episodes[]` (just `title`+`description`). Render as numbered cards with the hook as a pull-quote and key_points as a small bullet list inside an expandable `<details>`.
- **Format & cadence strip**: small grid showing `episode_format` (only first sentence preview, expand to full), `release_cadence`, `target_listener`, `episode_length_minutes`.
- **Notify Me form** (right or below): firstName + email → `onSubmit` with `getActionType` returning `"optin"` for BA-14 (see Fix 3 below). Submitted state shows "We'll let you know when episode 1 drops."

### Fix 3 — Wire into the dispatcher

In the JSX block at lines 209-223, add:

```tsx
{resolvedNodeId === "BA-13" && <GroupCoachingPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} />}
{resolvedNodeId === "BA-14" && <PodcastPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} submitting={submitting} submitted={submitted} />}
```

Append `"BA-13", "BA-14"` to the GenericPage exclusion array on line 221 so they no longer fall through.

In `getActionType` (line 1541-1548), add `"BA-14"` to the `optinNodes` array so the Notify Me form posts a lead with `action_type=optin`. BA-13 stays in `applicationNodes` (already there).

## Files touched

- **Update** `src/pages/MicrositePage.tsx`
  - Add `GroupCoachingPage` component (~110 lines) — slot before `GenericPage`.
  - Add `PodcastPage` component (~110 lines) — slot before `GenericPage`.
  - Dispatcher: 2 new `&&` lines + extend exclusion array (line 221).
  - `getActionType`: add `"BA-14"` to `optinNodes` (line 1542).

No DB migration. No edge function changes. No regeneration required for Pauline's existing data — both rows already contain the rich fields the new renderers will pick up.

## Verification

1. Reload `/pauline-teo/group-coaching` → see programme title "SUCKCESS Group Coaching", tagline, transformation promise, details strip showing 8 weeks · cohort size · $1,997, "Who it's for" + "What you'll get" lists, **8 expandable week cards** rendering all SUCKCESS stages with descriptions and activity bullets, pricing rationale block, and a working Apply Now form on the right.
2. Reload `/pauline-teo/podcast` → see show title "Be SUCKcessful with Pauline Teo", subtitle "We SUCK Before We Succeed", tagline, full show description, distribution platform pills, **10 expandable episode cards** with hooks and key points, episode format / cadence / target listener strip, and a Notify Me opt-in form. **No "Coming Soon" badge.**
3. Both pages render even when individual optional fields are missing (defensive guards).
4. Existing BA-15/16/17/18 pages unchanged.

## Scope

Pure frontend, single file. No DB, no edge functions, no regeneration.

