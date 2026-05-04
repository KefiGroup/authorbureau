## Plan — Fix the 3 audit bugs (BP-05 routing · BP-07 refresh · BP-08 slow load)

I traced each bug to a specific root cause. All three are small, surgical fixes.

---

### Bug 1 — HIGH · BP-05 "Build This Product" routes to BP-09 (Book Sales)

**Root cause.** `src/config/abbyFrameworkConfig.ts` lines 260-293 — the `NODE_TO_NODE_BUILDER` slug→ID map drifted out of sync after the Sprint 50 BP-05/06/07/08/09 renames. Every Brand-Products slot from Webinars onward is wrong:

| Slug                  | Currently maps to | Canonical (per docs §3) |
| --------------------- | ----------------- | ----------------------- |
| `book-sales-events`   | BP-05 ❌          | **BP-09**               |
| `workbooks`           | BP-06 ✅          | BP-06                   |
| `home-study`          | BP-07 ✅          | BP-07                   |
| `courses`             | BP-08 ❌          | **BA-10** (Online Course) |
| `webinars`            | BP-09 ❌          | **BP-05**               |
| `special-editions`    | YR-26 ❌          | **BP-08**               |

That's why the Webinars card lands on Book Sales — the slug literally points to BP-09.

**Fix.** Replace the broken entries in `NODE_TO_NODE_BUILDER`:

```ts
"book-sales-events": "BP-09",   // was BP-05
"webinars":          "BP-05",   // was BP-09
"special-editions":  "BP-08",   // was YR-26
"courses":           "BA-10",   // was BP-08
```

Leave the other 22 entries untouched. No DB / edge-function changes needed.

---

### Bug 2 — HIGH · BP-07 refresh resets to Step 1

**Root cause.** `src/components/dashboard/builders/bp07/BP07Builder.tsx` has a `bookId` mismatch between save and load:

- **Resume** (line 114) calls `loadBuilderDraft(authorId, "BP-07", activeBookId)` where `activeBookId = bookId ?? hookBookId ?? null`.
- **Save** on the generation result (line 174) and channel toggle (line 223) pass `bookId: bookId ?? null` — i.e. the raw URL prop only, ignoring the `useAuthorBook` fallback.

When the URL omits `?bookId=...` (common when arriving via the recommendation card or a stale link), the save writes `book_id = NULL` while the load queries `book_id = <hookBookId>`. The edge function returns no draft → builder falls through to step 0.

The publish-step save (line 252) already uses `activeBookId` correctly, which is why already-Live nodes work and only mid-flow drafts break.

**Fix.** In `BP07Builder.tsx`, change the two stray `bookId: bookId ?? null` autosave args (lines 174 and 223) to `bookId: activeBookId`. One-line change in two places. Mirrors the pattern already used by BP-08 line 156 and the BP-07 publish call on line 252.

---

### Bug 3 — LOW · BP-08 shows a blank generic skeleton for 8-10s

**Root cause.** `src/pages/NodeBuilder.tsx` lines 112-122 — while waiting for `authorId` to resolve from `author_profiles`, NodeBuilder renders a content-free placeholder (one short skeleton, one wide skeleton, one tall block) with no node title, no stepper, no "How this node works" panel. Because BP-08 also pulls in `useAuthorBook` (and a heavier intro that imports `resolve-book-title` lazily on mount), the gap between route arrival and BP-08's internal hydration looks especially long. The user sees no orienting UI during that window.

This is the same shell delay every node hits, but BP-08 is the slowest because of its extra imports + occasion-calendar logic, so it's the most visible.

**Fix.** Replace the generic skeleton in NodeBuilder with the canonical builder shell (header + stepper + "How this node works" panel) rendered eagerly from the URL `nodeId` — so the moment the route mounts, the user sees the right node title, the 4-step stepper at step 1, and the explanatory panel. Only the body below swaps in once `authorId` resolves.

Concretely, in `src/pages/NodeBuilder.tsx`:

1. While `authLoading || loading`, instead of rendering the generic 3-skeleton block, render:
   - `<BuilderHeader nodeId={nodeId} title={...} icon={...} onBack={...} />`
   - `<UnifiedStepper nodeId={nodeId} steps={["Introduction","Generating","Review","Publish"]} current={0} />`
   - `<NodeHowItWorks nodeId={nodeId} />`
   - A single small skeleton block beneath for the body that's still loading.
2. Pull the title/icon from a tiny `NODE_META` lookup keyed by `nodeId` (BP-05 → "Webinars" / Video icon, BP-08 → "Special Editions" / Gift icon, etc.). All 28 entries already exist in `abbyFrameworkConfig.ts` — reuse that data, no duplication.

Side benefits: every other node also gets a faster perceived load, not just BP-08. Pure UX polish, no behaviour change.

---

### Files touched

- `src/config/abbyFrameworkConfig.ts` — fix 4 entries in `NODE_TO_NODE_BUILDER`
- `src/components/dashboard/builders/bp07/BP07Builder.tsx` — change 2 autosave bookId args
- `src/pages/NodeBuilder.tsx` — eager builder shell during loading state
- (Possibly a tiny `src/lib/node-meta.ts` helper exposing `{ title, icon }` per nodeId, sourced from existing config)

### Out of scope

- Database, edge-function, or auth changes
- Renaming any node IDs (we agreed not to)
- Touching the 25 other builders' resume logic — only BP-07 has the mismatch

### Verification

After build I'll spot-check:
1. From Brand tab, click "Build This Product" on Webinars card → lands on `/node-builder/BP-05` (not BP-09).
2. Open BP-07, generate, leave, return → lands on Review (Step 3) with content intact.
3. Open BP-08 cold → header + stepper + "How this node works" visible immediately, body fills in within 1-2s.

Approve to proceed.