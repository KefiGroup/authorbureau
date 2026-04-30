# Audit #5 — Reader Experience (Pauline Teo, 28 Public Pages)

## Goal
Score every one of Pauline's 28 public pages against the 8-check rubric and the 8-level QA gate. Produce a **per-page scorecard** and a **prioritized fix queue**, then implement the fixes that block acceptance.

## Reality check before we start

Three slugs in the request don't match the platform's canonical slug map (`src/lib/node-slug-map.ts` and DB function `compute_node_microsite_url`):

| Audit request URL | Canonical URL on platform |
|---|---|
| `/pauline-teo/media-kit` | `/pauline-teo/press` (BA-15) |
| `/pauline-teo/upsells` | `/pauline-teo/bundles` (BA-17) |
| `/pauline-teo/partnerships` | `/pauline-teo/partners` (BA-18) |

DB confirms all 28 of Pauline's nodes are `status='live'`. We will audit the canonical URLs. If you also want the alt slugs (`/media-kit`, `/upsells`, `/partnerships`) to resolve, we'll add them to `SLUG_ALIASES` and the edge function map — flag that before we run.

## Step 1 — Automated evidence collection (per page)

Loop through the 28 URLs against the **published** site (`https://authorsbureau.com`) and the preview, capturing:

1. **HTTP status + load time** — `curl -w` for TTFB and total time; flag >3s.
2. **Page `<title>`** — extract from rendered HTML; flag generic "Authors Bureau".
3. **Body content** — grep for forbidden tokens: `[AUTHOR NAME]`, `undefined`, `null`, `{{`, `example.com`, `Lorem ipsum`, "Coming Soon" (when node is live).
4. **Pauline + SUCKCESS personalization** — confirm "Pauline" and at least one of `SUCKCESS|Be SUCKcessful|stuck` appears.
5. **CTA presence** — at least one `<a>`/`<button>` whose text matches CTA verbs (Buy, Get, Register, Apply, Book, Download, Join, Subscribe).
6. **Broken images** — count `<img>` with no `src` or `src=""`.
7. **Console errors** — open each route in browser tool, capture red errors and 4xx/5xx network calls.
8. **Mobile** — set viewport to 375×812, screenshot, look for horizontal scroll & overflow.

Result: a markdown table `Page | Score /8 | Title | Load(ms) | Issues`.

## Step 2 — DB cross-check

For each node, read `author_nodes.content_json` and verify required fields are populated and reference Pauline / her book. Nodes with empty or AI-default JSON go straight to the fix queue (re-run the generator).

## Step 3 — 8-level QA gate

Run only on **live nodes that pass Step 1**:

```text
L1 Console/Network  → red errors / 4xx / 5xx
L2 Buttons & links  → click every CTA & nav link
L3 Empty states     → simulate node with empty content_json
L4 Data flow        → submit lead-magnet form, webinar reg, contact form;
                      confirm row in leads / webinar_registrations
L5 Mobile (375px)   → no overflow, all CTAs tappable
L6 Auth states      → incognito (must work) + logged-out reader
L7 Error handling   → invalid email, empty form, missing param routes
L8 Navigation       → ≥2 next actions on every page; back works
```

## Step 4 — Hub & escape-route audit

- `/pauline-teo` (BP-04 author hub) — confirm sections render: hero, books, lead magnets, learn, services, events, podcast, formats, related authors, footer with all socials.
- Confirm every live node from Step 1 appears as a card/link on the hub (cross-check `liveNodes` filter buckets in `AuthorSite.tsx`).
- Every microsite footer/header links back to `/pauline-teo` ("escape route").

## Step 5 — Coming Soon vs 404

For nodes that are *not* live for an author, the resolver chain in `AuthorSubpageResolver.tsx` falls through to `AuthorBookPage`, which can render a confusing page. We will:
- Verify `get-microsite-page` returns 404 for non-live nodes.
- Confirm the resolver renders `ComingSoonScreen` (already exists at `src/components/public/ComingSoonScreen.tsx`) for known-slug-but-not-live, instead of falling to `AuthorBookPage`. If it doesn't, add that branch.

## Step 6 — Fix queue (built from Steps 1–5)

Expected categories of fixes (we'll only do what evidence shows is broken):

- **Title tags** — pages still showing "Authors Bureau" get a node-specific `useDocumentMeta` call inside `MicrositePage.tsx` per `nodeId`.
- **Placeholder leak** — replace any `[AUTHOR NAME]` / `{{first_name}}` / `example.com` found in `content_json` with real values; tighten the responsible generator's prompt.
- **Mobile overflow** — typical culprits: hero h1 `text-7xl` without `sm:` breakpoint, fixed-width tables, long URLs. Patch in the offending section components.
- **Missing CTAs** — nodes whose `content_json.cta_*` fields are empty get a sensible default ("Get in touch with Pauline" → opens `AuthorContactModal`).
- **Broken/missing images** — fall back to `author.photo_url` or `book.cover_image_url`; never leave empty `src`.
- **Hub gaps** — any live node missing from `AuthorSite.tsx` filter buckets gets added (e.g. BA-15 press, BA-18 partners, YR-27 fundraising, YR-28 sponsors).
- **Coming Soon routing** — fix resolver fallback so unknown/inactive nodes never show a stale book page.

## Step 7 — Re-run audit & deliver report

Re-run Step 1 + 8-level gate after fixes. Deliver:

```text
Page                          | Score | L1 | L2 | L3 | L4 | L5 | L6 | L7 | L8
/pauline-teo                  | 8/8   | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓
/pauline-teo/free-gift        | …     | … | … | … | … | … | … | … | …
…
OVERALL: PASS / NEEDS FIXES
```

Plus a "what was fixed" change log keyed to each failure.

## Open questions before I start

1. The 3 mismatched slugs above — audit the **canonical** slugs (`/press`, `/bundles`, `/partners`) only, or also add aliases (`/media-kit`, `/upsells`, `/partnerships`) so both URLs resolve?
2. Audit target — **published** (`authorsbureau.com`) or the **lovable preview** URL? (Published is what real readers see; preview reflects unmerged work.)
3. If a page scores 5–6/8, fix in this sprint or just log it?

## Technical scope (files most likely to change)

- `src/pages/MicrositePage.tsx` — per-node `useDocumentMeta` titles, default CTAs, image fallbacks, mobile classes
- `src/pages/AuthorSubpageResolver.tsx` — Coming-Soon branch instead of book fallback
- `src/pages/AuthorSite.tsx` — add any missing node buckets to hub
- `src/lib/node-slug-map.ts` + `supabase/functions/get-microsite-page/index.ts` — alias slugs (only if Q1 = yes)
- `src/components/public/ComingSoonScreen.tsx` — already exists, will be wired in
- DB: targeted `UPDATE author_nodes SET content_json = jsonb_set(...)` for any placeholder leaks found
- Generator prompt tightening in whichever `generate-*` edge function emitted the placeholder

No schema changes anticipated.
