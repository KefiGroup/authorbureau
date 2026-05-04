## Goals

1. Social Media Distribution Pack (BP-02 → Share tab) generates much faster.
2. Leaving the page does NOT kill in-flight generation, and the generated pack is always restored when the user returns.
3. Refreshing any page (especially a builder page like `/node-builder/BP-02?bookId=...`) returns the user to that exact page, never the dashboard root.

Once BP-02 is rock-solid we replicate the same pattern to BP-06 and the rest of BP / BA / YR.

---

## Issue 1 — Generation is slow

Root cause: `generate-bp02-social-pack` calls `openai/gpt-5` with `max_completion_tokens: 5000` and asks for a single huge JSON blob (LinkedIn + IG + FB + X thread + email + visual brief). GPT-5 large completions routinely take 60–120 s.

Fix:
- Switch the model to `google/gemini-3-flash-preview` (3–5× faster, JSON-friendly, already our default chat model per memory).
- Drop `max_completion_tokens` to ~3500 — the schema doesn't need more.
- Keep the prompt and JSON schema unchanged so downstream rendering is untouched.
- Add a 90 s `fetchWithTimeout` wrapper around the AI call so a hung gateway can't strand the function.

Expected wall-time: ~15–25 s instead of 60–120 s.

## Issue 2 — Generation is "killed" when leaving the page

Two separate symptoms, two fixes:

**(a) The promise dies on unmount.** `SocialDistributionPack.handleGenerate` keeps the in-flight request in component state (`generating`). When the user navigates away, the component unmounts, React drops `setGenerating`, and even though the edge function is still running, the next mount has no idea — so the user sees the empty "Generate" CTA again.

Fix: route the call through the existing single-flight registry (`src/lib/builder-generation-registry.ts`). On mount, check `getGeneration(authorId, "BP-02::social-pack")`; if a promise exists, show "Generating…" and `await` it. On click, use `startGeneration` so a second mount joins the same promise instead of starting a new one.

**(b) The result isn't restored after navigation.** The edge function already upserts `social_pack` into `author_nodes.content_json` (hardened in the previous sprint), but `BP02Builder`'s resume effect doesn't rehydrate it into `SocialDistributionPack` state because `SocialDistributionPack` only reads from local React state set during the generate click.

Fix: pass the persisted pack down as a prop. `BP02Builder` already stores `content.social_pack` after `handleSocialPackLoaded`. Update `SocialDistributionPack` to render whenever `content?.social_pack` is present (it already does — but currently the parent passes `content` = the whole BP-02 content, not the social pack). Refactor the parent to pass `content.social_pack` and have `onContentLoaded(pack)` call back into `handleSocialPackLoaded`. This way after a refresh the pack renders immediately from the stored draft.

## Issue 3 — Refresh always returns to dashboard

Root cause: BP-02 sidebar navigation funnels through `setActiveSection("lead-magnet")` → URL becomes `/dashboard?section=lead-magnet&bookId=…`. The per-book redirect in `AuthorDashboard` then bounces to `/dashboard/book/:bookId?tab=...` (the Book Hub) instead of the actual builder page. On refresh you land on the Book Hub, not BP-02. From the Book Hub the user has to click in again — which feels like "dashboard reset".

Fix: when the user opens BP-02 from the sidebar/Book-Hub, navigate directly to `/node-builder/BP-02?bookId=…`. That URL already survives refresh because `NodeBuilder` reads `nodeId` and `bookId` from params. Concretely:
- Add `BP-02` (and other builder nodes that exist as direct builders: BP-01, BP-03, BP-04, BP-05, BP-06, BP-09, BA-10..BA-12) to `NODE_TO_NODE_BUILDER` in `src/config/abbyFrameworkConfig.ts` so `getStudioPath` returns `/node-builder/<NODE_ID>?bookId=…` for them.
- In `AuthorDashboard.setActiveSection`, when a section maps to a node that has a direct builder route AND a `bookId` is present, push to `/node-builder/<NODE_ID>?bookId=…` instead of the `?section=` URL.

Result: refresh on a builder page stays on that builder page. The "introduction" reset disappears because `BP02Builder`'s resume effect (already correct) pulls the saved draft and lands on Review (step 2) or Live (step 4).

---

## Files touched

- `supabase/functions/generate-bp02-social-pack/index.ts` — model swap, lower token cap, timeout wrapper.
- `src/components/dashboard/builders/bp02/SocialDistributionPack.tsx` — wire to `builder-generation-registry`, render from `content` prop directly.
- `src/components/dashboard/builders/bp02/BP02Builder.tsx` — pass `content.social_pack` (not whole content) into the pack component; small render tweak.
- `src/config/abbyFrameworkConfig.ts` — extend `NODE_TO_NODE_BUILDER` with all nodes that have dedicated builders.
- `src/pages/AuthorDashboard.tsx` — when `setActiveSection` is called for a node with a direct builder + active `bookId`, route to `/node-builder/<NODE_ID>?bookId=…`.

## After BP-02 verifies

Replicate to BP-06 (already the gold reference for resume — only needs the same `setActiveSection` routing fix), then roll the same three patterns out to all remaining BP / BA / YR builders. No further plan needed for that wave; it's mechanical once BP-02 + BP-06 are confirmed perfect.

## Out of scope

- No DB schema changes.
- No changes to `loadBuilderDraft` / `autosaveBuilderDraft` (already correct).
- No new edge functions.
