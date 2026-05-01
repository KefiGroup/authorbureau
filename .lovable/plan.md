# Count Business Rules — Refinement Plan

Goal: stop the 22 → 26 → 24 counter-bug class for good by collapsing the duplicated readiness logic into a single shared module, tightening three gates that are too lenient, and clarifying the dashboard so authors stop conflating "capability live" with "product publishable."

---

## 1. HIGH — Single source of truth for readiness (kills the drift class)

Today the same rules live in two files written in two languages of trust:

- `src/lib/node-readiness.ts` (frontend, used by `useBookNodeProgress` and `useNodeLiveStats`)
- `supabase/functions/author-stats/index.ts` (edge function, hand-mirrored copy of the same logic, lines 229–276 and the `AUTHOR_LEVEL_NODES` set on lines 338–342)

`node-readiness.ts` is pure (no React, no Supabase client, no DOM) so it ports cleanly.

**Move:**

```
src/lib/node-readiness.ts  →  supabase/functions/_shared/node-readiness.ts
```

**Frontend access:** keep imports working by either (a) re-exporting from `src/lib/node-readiness.ts` (one-line file that re-exports the shared module via a relative path, e.g. `export * from "../../supabase/functions/_shared/node-readiness"`) or (b) adding a Vite alias `@shared` → `supabase/functions/_shared`. Option (a) is simpler and needs no config changes; option (b) is cleaner long term. Recommend (a) now.

**Edge function access:** `author-stats/index.ts` imports from `../_shared/node-readiness.ts` and deletes its inlined `hasRequiredAssets` + `AUTHOR_LEVEL_NODES`.

After this, there is exactly one file to touch when readiness rules change. The three consumers (`useBookNodeProgress`, `useNodeLiveStats`, `author-stats`) all read the same logic.

---

## 2. HIGH — Fixture-based test guarding the rules

Add `src/lib/__tests__/node-readiness.test.ts` (Vitest) with ~10 representative `content_json` fixtures covering every gated case:

- BP-04: empty / cta_label-only / hero_headline-only / sections-only / both
- BA-13: no sessions / sessions populated
- BA-14: rss + episodes / activated + 1 episode + title / activated + 2 episodes + title / activated, no title
- BA-15: press release string / object with body / object with only headline / outlets missing / both present
- Generic node (e.g. BP-06): empty object / one key

Any future rule change forces a snapshot diff that's visible in the PR. This catches the "only one branch was updated" bug class even if the shared module gets re-forked.

---

## 3. MEDIUM — Tighten BP-04 (Author Microsite)

Current rule passes if **any** of `hero_headline | hero_subheadline | about_long | about_short | cta_label | lead_magnet_id` is set, OR `sections[]` is non-empty. Problem: `cta_label` is autofilled to "Get the Book" by the builder, so an empty microsite with only the autofill counts as live.

**New rule:** must have `hero_headline` OR a non-empty `sections[]`, AND at least one supporting field from {`about_long`, `about_short`, `hero_subheadline`, `lead_magnet_id`}.

This catches both short-form (hero + about) and long-form (sections-driven) microsites while excluding the autofill-only case.

---

## 4. MEDIUM — Tighten BA-15 (Press / Media)

Current rule accepts a press-release object with **any** of `body | html | headline | content | text`. A headline-only object passes, which is wrong — a press release without a body is a working title, not a release.

**New rule:** require `headline` AND one of `body | html | content | text` (string form continues to pass as today).

Outlets array requirement (`target_media_outlets | media_list | outlets`) stays unchanged.

---

## 5. LOW — BA-14 (Podcast) activated path

Keep the dual path (RSS-distributed vs locally activated) — the asymmetry is intentional. Tighten only the activated branch:

**New activated rule:** `activated === true` AND `episodes.length >= 2` AND `(show_title || podcast_title)`.

Bumping from 1 → 2 episodes filters out "I clicked the activate button to see what it does" without touching the title proxy. The RSS path stays at `episodes.length >= 1` since public distribution is itself the achievement.

---

## 6. MEDIUM — Dashboard tooltip / copy split

The current dashboard book card mixes two different concepts on one line:

> "26/28 streams built · Brand 8/9 · Build 8/9 · Yield 10/10"
>
> "3 ready for review"

Authors read these as the same number and get confused. Two cheap fixes (no architectural change):

- **Tooltip on the X/28 number:** "Capabilities live across this book — every node whose content has passed readiness checks. Author-level capabilities (email list, podcast, services) count toward every book."
- **Tooltip on 'ready for review':** "Products you've finished but not yet published. These don't add to the live count until you publish them."
- Optionally rename the secondary line to "3 products ready to publish" for clarity.

No data-source change — just copy + Tooltip components.

---

## 7. LOW — Dev-only "stuck node" warning

In `node-readiness.ts`, when running in dev (`import.meta.env.DEV` for frontend, equivalent guard in edge function logs), emit a `console.warn` whenever a node is `status='live'` in the DB but `hasRequiredAssets` returns `false`. Format: `[node-readiness] BP-04 (book abc123) marked live but failed readiness gate: missing hero_headline AND sections[]`.

This surfaces the long-tail "I marked it live but the dashboard says it's not" complaints in development and admin sessions, without changing user-facing behaviour.

---

## Out of scope (acknowledged, not doing today)

The deeper refactor — moving each readiness rule next to its builder so `content_json` schema and gate live together — is the right end state but not worth the disruption now. Revisit if counter bugs recur after items 1–7 land.

---

## Files touched

- `supabase/functions/_shared/node-readiness.ts` (new — moved from `src/lib/`)
- `src/lib/node-readiness.ts` (becomes a one-line re-export)
- `supabase/functions/author-stats/index.ts` (delete inlined logic, import shared)
- `src/lib/__tests__/node-readiness.test.ts` (new — fixture tests)
- Dashboard book card component(s) where the X/28 + ready-for-review numbers render — Tooltip copy only

## Validation after merge

1. Vitest passes with new fixtures.
2. Deploy `author-stats`, then verify Be SUCKcessful shows the same number on dashboard card, MultiBookPicker, and Book Hub Brand/Build/Yield tabs.
3. Spot-check a microsite that previously passed on `cta_label` alone — it should now show as Building, not Live.
4. Spot-check a press release with headline-only — should now show as Building.
