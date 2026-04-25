## What you showed me (the actual journey)

1. **Book Hub → Brand tab** (screenshot 1): Looks correct. BP-01 Live, BP-02 Live, BP-03 "Recommended → Build Now."
2. **Email Marketing publish success** (screenshot 2): Says **"Your Email Marketing _are_ saved to your library!"** — broken grammar, and the wording ("are saved to your library") is the **no-microsite** copy path, even though Email Marketing nodes do produce something deployable. It also offers "View My Marketing Hub" and "Go back to Brand Products" — but no "Back to Book Hub" even though the user came from Book Hub, not from /brand-products.
3. **Marketing Hub → Sequences tab** (screenshot 3): Lists `BA-13 Quiz Result Delivery`, `BA-11 Audiobook Listener…`, `BA-10 Enrollment…` as drafts — but the user just published **BP-01 Email Marketing**. There is no BP-01 sequence in the list because pressing "Activate My Marketing Campaign" navigates to `/dashboard?section=marketing-hub&highlight=email-marketing`, but the Sequences tab does not filter / scroll-to / highlight the matching sequence. The "Generate sequences for all 28 nodes" CTA is also right there, which conflicts with the just-completed single-node publish.
4. **Group Coaching builder** (screenshots 4 & 5): "Setting up your group sessions… / Creating your payment page…" — these progress strings are **fake stage labels** in `ACT_MSGS`. The "Back to Build Authority" link at the top is correct (matches the standardisation we just shipped), but the user got here from… nowhere obvious in this flow. There's no breadcrumb showing they came from Book Hub or from Marketing Hub.
5. **Build Authority Hub** (screenshot 6): Correct page, but it's a **second hub** that duplicates what the Book Hub → Build tab already shows. The user has now seen the same 9 BA nodes in two different layouts.

## Root issues

**A. Wrong success-screen copy for Email Marketing (BP-01).**
`PublishSuccessScreen.tsx` line 90 picks the "are saved to your library" string when `hasPublicPage === false`. BP-01 is in `NO_MICROSITE_NODES`, so it always renders the ungrammatical "Your Email Marketing **are** saved" headline. That same path is taken by all internal-only nodes (BP-01, BA-12, BA-15, BA-17, BA-18, etc.), so they all read awkwardly when the node name is singular ("Your Email Marketing are…", "Your Affiliates are…").

**B. The path back is inconsistent across hubs.**
- The Book Hub already lists every BP/BA/YR node by tab. The standalone `/brand-products`, `/build-authority`, `/yield-revenue` hubs duplicate that listing.
- After publishing BP-01 from Book Hub, the success screen sends the user to `/brand-products` (or to Marketing Hub), **not back to the Book Hub** they came from. There's no record of the entry point.
- The Group Coaching back link goes to `/build-authority`, even if the user arrived from `/book-hub/{id}?tab=marketing-channels`.

**C. Marketing Hub → Sequences highlight is broken.**
"Activate My Marketing Campaign" passes `?highlight=email-marketing` but `SequencesTab.tsx` ignores the param. The user sees a list of 13 unrelated draft sequences (BA-13, BA-11, BA-10) and a giant "Generate sequences for all 28 nodes" button — there is no UI cue that the BP-01 sequence is the one to activate.

**D. BA-13 fake progress messages.**
`ACT_MSGS = ["Setting up your group sessions...", "Creating your payment page...", "Your programme is almost ready..."]` are pure UI theatre — they cycle on a timer regardless of what the generator is actually doing. When the call completes in 3 seconds, the user still sees "Creating your payment page" because the timer hasn't advanced; when it takes 60 seconds, they see "Your programme is almost ready..." for 40 seconds straight. Same pattern in YR-19.

**E. Two competing top-level nav models for the same nodes.**
The sidebar surfaces *Marketing Hub*, *My Library*, *Revenue Dashboard* (cross-cutting), but the routes `/brand-products`, `/build-authority`, `/yield-revenue` exist as separate page wrappers that show the same 9-node grid the Book Hub tab already shows. After we redirected `/brand-products` → Book Hub last sprint (see `BrandProductsHub.tsx`), Build Authority and Yield Revenue still render the standalone version. This is what makes the back-and-forth feel "messy."

## Fix plan

### 1. Success screen copy (`PublishSuccessScreen.tsx`)
- Replace headline logic with a singular/plural-safe template and drop "are":
  - Public page: `Your {nodeName} is now live! 🎉`
  - Internal: `Your {nodeName} is saved to your library! 🎉` (always "is", never "are")
- For BP-01 specifically use `Your email marketing sequences are saved to your library! 🎉` — fix it via a per-node override map alongside `NODE_TO_CAMPAIGN`.
- Add a third secondary link: "Back to Book Hub" when `?from=book-hub` (or when `document.referrer` points at `/book-hub/`), so the user always has a route home regardless of which hub they entered through.

### 2. Marketing Hub sequence highlight (`SequencesTab.tsx`)
- Read `?highlight=` from `useSearchParams`.
- Auto-scroll the matching sequence card into view, add a 2-second pulse ring, and surface a single primary "Activate {Node Name} sequence" button at the top instead of (or above) the bulk "Generate sequences for all 28 nodes" CTA.
- If the matching sequence does not exist yet, show an inline "Generate {Node Name} sequence" button rather than dumping the user into the bulk-generate UI.

### 3. Retire the duplicate hubs (`/build-authority`, `/yield-revenue`)
- Mirror what we already did for `/brand-products`: redirect to `/book-hub/{activeBookId}?tab=marketing-channels` (Build) and `?tab=authority-builders` (Yield).
- Update every internal link that still points at `/build-authority` or `/yield-revenue` (the standardised back link in `NodeBuilder.tsx`, success-screen "Go back to {Hub}", recommendation cards) to resolve to the Book Hub tab when a `bookId` is in scope, and only fall back to the legacy hub when no book is active.
- This means the back links become **Back to Book Hub → Build** / **→ Yield** / **→ Brand**, which is the page the user actually came from.

### 4. BA-13 (and YR-19) progress UX
- Drop the fake `ACT_MSGS` cycle. Bind the progress label to actual generation phases the registry / generator already knows about (e.g., `phase: "outline" | "sessions" | "payment_page" | "publishing"`), or just show a single neutral "Setting up your group coaching… (Abby usually takes 20–40 seconds)" line with the indeterminate bar.
- Same change in `YR19Builder.tsx`.

### 5. Polish on the Book Hub → Brand grid (screenshot 1)
- The "Recommended" badge on BP-03 collides visually with the `BP-03` node-id chip in the top right. Push the badge into the title row and reserve the top-right strictly for the node code, so the recommended-step card matches the layout of Live cards.
- The greyed-out `Build Now` CTA on the recommended card uses the same dark fill as a primary action elsewhere — switch to the accent gradient used by other "Next Step" cards so it reads as the suggested action, not as a disabled button.

## Files I'll touch

- `src/components/dashboard/builders/shared/PublishSuccessScreen.tsx` — copy fix, "Back to Book Hub" link, per-node overrides.
- `src/components/dashboard/marketing-hub/SequencesTab.tsx` — `?highlight=` handling, scroll-into-view, single-node activate CTA.
- `src/pages/BuildAuthorityHub.tsx` and `src/pages/YieldRevenueHub.tsx` — replace bodies with the `BrandProductsHub.tsx` redirect pattern.
- `src/pages/NodeBuilder.tsx` — make the standardised back link prefer `/book-hub/{bookId}?tab=…` when `bookId` is present.
- `src/components/dashboard/builders/ba13/BA13Builder.tsx` and `src/components/dashboard/builders/yr19/YR19Builder.tsx` — remove `ACT_MSGS` theatre.
- `src/components/dashboard/book-hub/BookHubOverview.tsx` (or the BP grid component used by the Brand tab) — recommended-card layout polish.

## What you should expect after the fix

- Publishing BP-01 from the Book Hub lands on a grammatically correct success screen with a clear "Back to Book Hub" path.
- Clicking "Activate My Marketing Campaign" jumps straight to the BP-01 sequence in the Marketing Hub with it highlighted — no scrolling past 13 unrelated drafts.
- Every node-builder back link returns you to the **same** place you came from (Book Hub tab), not to a parallel hub.
- BA-13 and YR-19 stop showing fake "Creating your payment page…" copy when nothing of the kind is happening.
- The standalone Build Authority / Yield Revenue hubs stop existing as separate destinations, removing the "two pages for the same nodes" feeling.
