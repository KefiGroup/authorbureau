## Bug verification + fix plan (Pauline microsite + dashboard)

### Verification matrix

| # | Bug | Verified? | Root cause |
|---|---|---|---|
| 1 | "Specialist ,who" | **Stale** | `bio_short` in DB still contains the typo (string `"...Specialist ,who previously..."`). `stripHtml` already strips `\s+,` at render time, but `AuthorHeroSection` doesn't use `stripHtml` — the hero shows raw `bio_short`. |
| 2 | Monetization Universe 0/28 | **Real** | `MonetizationUniverse` matches by **string label** ("Email Marketing", "Podcast Tour", …). `recommendedByAbby` comes from `planData.plan.products[].name/label` which is free-text from the AI; `builtProducts` comes from `completedAssets` = `generated_assets.asset_type` (e.g. `"business_plan"`, `"lead_magnet"`) — those strings never match the hard-coded `STREAMS[].nodes[].label` in MonetizationUniverse, so `builtCount` is always 0. |
| 3 | BP-01 "Recommended" not "Live" | **Real** | BP-01 row in DB has `book_id = Invest Like Buffett`, but the Brand tab is rendered while viewing **Be SUCKcessful**. `useNodeLiveStats` filters by `bookId`, so BP-01 disappears for this book and the tile reverts to "available" → next-step override → "Recommended". BP-01 is an author-level node and must show Live across all books (per `AUTHOR_LEVEL_NODES` in `useBookNodeProgress`). |
| 4 | BP-09 "Ready to Build" not "Live" | **Real but expected** | BP-09 row's `book_id = Invest Like Buffett` and BP-09 is **book-specific** (not author-level). Viewing it under Be SUCKcessful correctly shows "available". The bug is that **the user has no BP-09 row for Be SUCKcessful at all**. We should keep book-scoping but stop the misleading override that promotes book-specific empty nodes to "Recommended" when the author already published the same node for another book. |
| 5 | BA-14 Podcast "Recommended" not "Live" | **Real** | BA-14 IS in `AUTHOR_LEVEL_NODES`, status='live', episodes=10, activated=true, show_title set → `useBookNodeProgress` correctly marks `completed`. But `useNodeLiveStats` is **book-scoped** so when the dashboard renders cards using its `liveStats[code]`, BA-14 returns no row for Be SUCKcessful's bookId (its row is for Be SUCKcessful actually — bookId matches, status=live). Re-checking: `PortfolioStepView` reads tile state from `progress.byCategory.nodes[].state` which uses `useBookNodeProgress` → should be "completed". The override on line 251 turns `completed` into `published`, NOT `recommended`. So tile should be Live. The "Recommended" comes from `useNodeLiveStats.effectiveStatus` downgrade — but there are **two BA-14 rows possible**, and `useNodeLiveStats` filters by bookId. Combined with `isNext` override, BA-14 ends up as the next step in Build category and gets force-promoted to "recommended". Fix: in line 251 only promote to "recommended" when tile state is `available` — never override `in-progress` (it should stay as Building) and never reach this branch when state is `completed`. |
| 6 | BA-15 stuck "Building 60%" | **Real** | BA-15 `press_release` is stored as a JSON **object** (structured fields), not a string. `hasRequiredAssets("BA-15", c)` evaluates `!!(c.press_release || c.press_release_html || c.assets?.press_release)` — `!!{}` is `true`, so gate should pass. Re-checking the BA-15 row: `target_media_outlets` length is 5 (good). Gate **should** pass and effectiveStatus should be `live`. But user sees 60% (= `STATUS_PROGRESS.content_ready`). The `press_release` object may be empty or missing the `body` key — need to defend the gate by checking the object has actual content (e.g. body/headline keys with non-empty strings). |
| 7 | "Buy Audiobook" no URL | **Not a bug** | BA-11 → `actionType = "purchase"` → `<BuyNowButton>` with `data.node.id`. Pauline has **no Stripe Connect account** (`stripe_account_id IS NULL`, `stripe_onboarding_complete = false`). Per locked Commerce Engine rule, the button correctly opens the "Payments coming soon" modal and captures a waitlist email. This is the designed graceful fallback, not a missing URL. The complaint indicates the modal isn't visually obvious — improve labelling. |
| 8 | URL `/be-suckcessful-` trailing hyphen | **Real (display-only)** | DB slug is exactly `be-suckcessful` (no trailing hyphen). `WebsiteBlueprintPage.tsx:381` renders `/{book.slug}/{product.route}`; when `product.route` is empty, output becomes `/be-suckcessful/` (trailing slash). The reporter likely saw `/be-suckcessful-/` because some product row passes `route: "-"` or an empty-but-stripped value. Defend by stripping/falsy-check. |
| 9 | Review tab "All (29)" not "(28)" | **Real** | `ReviewProductsPage` `products.length` uses raw count of draft rows from `builder-draft-state`. Pauline has duplicate / orphaned drafts (likely a BP-09 written under both books, or a stale BP-02 row). Display counter is correct for raw count but conceptually wrong: it should de-duplicate by `node_code` per book. |
| 10 | Lead Magnet "14/5 steps" | **Already mitigated** | `ReviewProductsPage:154` already caps `stepsCompleted = Math.min(rawSteps, totalSteps)`. If user still sees 14/5, the `nodeConfig` lookup is failing (resolvedId not in `ALL_BUILDER_NODES`) so `totalSteps` falls back to 5 while raw is 14. Need to add a hard floor + correct slug mapping for lead-magnet. |
| 11 | Lead Magnet raw S3 URL | **Real** | `pickPublicUrl` in `LiveMicrositesGrid` filters `supabase.co/storage` and known file extensions, but other S3 paths (e.g. `*.s3.amazonaws.com`) and signed URLs slip through. Should also reject any URL not on `authorsbureau.com`. |
| 12 | Course guarantee "30-day vs 14-day" | **Already fixed last sprint** | `MicrositePage:1191-1199` computes `guaranteeDays = Math.min(30, Math.max(7, totalDays - 7))` and `guaranteeText` is reused everywhere on the page (FAQ, footer, header on lines 1213/1286/1308/1486). Per active memory rule "Use the dynamic computed value everywhere" this is correct. Verify `BehindTheDesignContent.ts` static copy doesn't claim a different number on this same page (it mentions 21/30-day in pricing rationale but that's the **internal Behind-the-Design panel**, not the public sales page). |

### Fixes to ship

**Bug 1 — bio typo**
- One-off SQL migration: `UPDATE author_profiles SET bio_short = regexp_replace(bio_short, '\s+([,.;:!?])', '\1', 'g') WHERE bio_short ~ '\s+[,.;:!?]';` (cleans Pauline + any other authors with the same pattern).
- Defense in depth: in `AuthorHeroSection.tsx`, run `bio_short` through `stripHtml()` before render so future typos sanitize at view time too.

**Bug 2 — Monetization Universe 0/28**
- In `ABBYFrameworkDashboard.tsx`, replace the AI-text-driven `builtProducts` with a query against `author_nodes` where `status='live'`, mapping `node_id → MonetizationUniverse label` via a new `NODE_ID_TO_UNIVERSE_LABEL` constant kept next to `STREAMS`.
- Same approach for `recommendedByAbby`: derive from `planData.plan.products[].nodeId` (already structured in the plan JSON) → label, falling back to text only when nodeId is absent.

**Bug 3, 4, 5 — Brand/Build tile states**
- In `PortfolioStepView.tsx:250-253`, narrow the "promote next step to Recommended" override:
  ```ts
  const cardState = isNext && n.state === "available" ? "recommended" : stateMap[n.state];
  ```
  Never demote `completed` (already `published`) or `in-progress` to `recommended`.
- In `useNodeLiveStats.ts`, when `bookId` is provided, also include rows where `node_id` is in `AUTHOR_LEVEL_NODES` regardless of book scope. Mirrors the logic already in `useBookNodeProgress`.
- Move the `AUTHOR_LEVEL_NODES` constant out of `useBookNodeProgress.ts` into `src/lib/node-readiness.ts` so both hooks share one source of truth.

**Bug 6 — BA-15 gate**
- Tighten `hasRequiredAssets("BA-15", …)` in `src/lib/node-readiness.ts`: when `press_release` is an object, require at least one of `{body, html, headline}` to be a non-empty string. Same for `media_kit_title`/`speaker_headline` if those are the assets.
- One-off: re-validate Pauline's row by re-running the BA-15 builder save (no migration needed once gate accepts the actual shape).

**Bug 7 — BuyNowButton modal clarity**
- In `BuyNowButton.tsx`, when `AUTHOR_PAYMENTS_NOT_SET_UP`, change modal title from "Payments coming soon" to "Notify me when this is available" and add a one-line explainer: "The author hasn't switched on direct checkout yet — leave your email and we'll notify you the moment it's ready."
- No code path change for owners — Stripe-required nudge is already inserted into `abby_nudges`.

**Bug 8 — trailing hyphen in WebsiteBlueprintPage**
- Line 381: `/{book.slug}{product.route ? `/${product.route}` : ""}`. Skip the trailing segment when route is falsy or `"-"`.

**Bug 9 — Review tab "All (29)"**
- In `ReviewProductsPage.tsx` after building `drafts`, dedupe with: `Array.from(new Map(drafts.map(d => [`${d.bookId}:${d.nodeId}`, d])).values())`. Counter then reflects unique products per book.

**Bug 10 — Lead Magnet 14/5 steps**
- Add the missing slug entry for lead magnets: confirm `SLUG_TO_CODE["lead-magnets"] = "BP-02"` (currently only `lead-magnet` singular). Add both keys.
- Keep the existing `Math.min` cap; also cap `actProgress` at 100.

**Bug 11 — Lead Magnet raw S3 URL**
- Tighten `pickPublicUrl` in `LiveMicrositesGrid.tsx`: reject any URL whose hostname is not `authorsbureau.com` (or its preview/published equivalents). For non-branded URLs return `null` so the card is filtered out — and surface a one-time "Republish to generate branded URL" hint in the Inactive section.

**Bug 12 — guarantee period**
- No change — already dynamic. Add a small comment in `BehindTheDesignContent.ts` clarifying the 21/30 numbers there are pricing context, not the public guarantee.

### Files to change

- `src/lib/node-readiness.ts` — tighten BA-15 gate; export `AUTHOR_LEVEL_NODES`.
- `src/hooks/useBookNodeProgress.ts` — import `AUTHOR_LEVEL_NODES` from shared module.
- `src/hooks/useNodeLiveStats.ts` — include author-level rows when bookId is set.
- `src/components/dashboard/PortfolioStepView.tsx` — narrow "Recommended" override.
- `src/components/dashboard/ABBYFrameworkDashboard.tsx` — derive built/recommended from `author_nodes` + structured plan JSON.
- `src/components/dashboard/framework-dashboard/MonetizationUniverse.tsx` — accept node-id arrays, add `NODE_ID_TO_LABEL` mapping.
- `src/pages/author-site/AuthorHeroSection.tsx` — `stripHtml(bio_short)` at render.
- `src/components/commerce/BuyNowButton.tsx` — modal copy.
- `src/components/dashboard/microsite/WebsiteBlueprintPage.tsx` — guard trailing route.
- `src/components/dashboard/ReviewProductsPage.tsx` — dedupe drafts; ensure lead-magnet slug code map.
- `src/components/dashboard/review/LiveMicrositesGrid.tsx` — restrict `pickPublicUrl` to branded hostnames.
- New SQL migration: regex-clean stray space-before-punctuation in `author_profiles.bio_short` (one-off, scoped to rows that match the pattern).

### Out of scope (intentionally not changing)

- Stripe Connect onboarding for Pauline (Bug 7 root cause) — that's an author action, not a code fix.
- Course guarantee text (Bug 12) — already correct under the active memory rule.
- The Monetization Universe locked-tile copy ("Recommended"/"Built") — visual freeze applies; we only fix data wiring.
