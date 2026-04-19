
## BP Nodes Audit — Findings

I audited all 9 BP builders (BP-01 through BP-09). Here's what's broken vs what works.

### 1. Buttons & Navigation — Several broken/missing patterns

**Broken: "Edit" button is a dead-end on 6 builders**
BP-04, BP-05, BP-06, BP-07, BP-08, BP-09 all show an "Edit" button on the Review step that just pops a toast: *"Manual editing coming soon. Activate now and request changes from ABBY later."* This is the same broken-promise pattern you already fixed for BP-02. The other 3 (BP-01, BP-02, BP-03) have real inline editing.

**Broken: Step circles aren't clickable**
`UnifiedStepper` renders the 4 step dots (Introduction → Generating → Review → Publish/Activate) as pure visual indicators. New users naturally try to click step 3 to jump back to Review — nothing happens. Steps that are already completed should be clickable; future steps should remain disabled.

**Broken: No "Previous" button**
Once at Review, the only path back is the "← Back to Review" link that only appears AFTER you've published. No way to go from Review → Introduction without a full page refresh.

**Working**: Back-to-hub link, Generate button, Publish/Activate button, Try Again on errors, BP-01 InlineEmailCard edits, BP-02 inline editable fields with autosave, BP-03 social-post copy buttons + ZIP download.

### 2. Node Intent Flows — Partially broken

| Node | Intent | Status |
|---|---|---|
| BP-01 Email Marketing | Schedule emails + CRM funnel firing | ✅ Working — `ensureFunnel()` + visual CRM-stage flow + Marketing Hub link |
| BP-02 Lead Magnet | Copy/paste to social for leads | ⚠️ Social pack exists with Copy buttons but **buried in a separate `SocialDistributionPack` component** that isn't surfaced inside the BP-02 Review step — most users never see it |
| BP-03 Social Media | Schedule + post to social accounts | ⚠️ Saves posts to Social Calendar but **never checks if the user has connected social accounts** — silent failure if not connected. Also no inline link to "Connect accounts" if missing |
| BP-04 Author Website | Public site live | ✅ Works |
| BP-05 Book Trailer | Saved + downloadable | ⚠️ No download button on Review (only on success) |
| BP-06–09 | Workbook / Course / Special Ed / Sales Kit | ⚠️ Generates content but Edit is fake, and no flow to push lead-magnet copy / sales pages anywhere actionable |

### 3. UX/UI — Steps hidden from new users

- The "How this node works" panel auto-collapses on every step except Introduction. New users on Generating/Review can't see the roadmap. Should stay open by default until user dismisses.
- No persistent step labels visible while inside Review (the stepper is at the top, but on long pages it scrolls out of view).
- Generating step has no ETA bar — only the rotating message.

### 4. Color & Branding — Inconsistent

- BP-09 uses the new `categoryStyles.brand` (teal left-strip, glow shadow) — looks rich.
- BP-01–08 still use the old flat `border-primary/20 bg-primary/5` — looks dull and breaks visual consistency with the post-Sprint-12 design freeze (dark navy + teal Brand strip).
- Step dots have the right teal color but the connector lines between dots stay grey even after completion on some screens.

---

## Plan to Fix

### A. Restore real edit on every BP node (kills the fake "Edit" toast)
- Build a small shared `<InlineSectionCard>` component (mirrors BP-02's pattern) that lets every Review tab card flip into edit mode with Save → autosave to `author_nodes.content_json`.
- Wire it into BP-04, BP-05, BP-06, BP-07, BP-08, BP-09 Review tabs.
- Remove the fake "Edit" button from all 6 builders.

### B. Make navigation clickable & predictable
- `UnifiedStepper`: accept `onStepClick` and make completed/current steps clickable (skip Generating). Add hover state + cursor-pointer + aria-current.
- Add a "← Previous" button next to every Publish/Activate button on the Review step so users can jump back to Introduction.
- Keep `BackToReviewLink` on Publish step (already exists).

### C. Surface the right intent on each node
- **BP-02**: Embed the `SocialDistributionPack` component directly inside the BP-02 Review step (new "Share" tab) so the lead-magnet → social copy flow is visible, not hidden in a separate route.
- **BP-03**: Before allowing Activate, check `social_connections` table and show a yellow "Connect your accounts to schedule" banner with a button to `/account-settings?tab=connections` if none are connected. Posts still save to calendar either way.
- **BP-01**: Add a "View in Marketing Hub" button on the Review step (not just Publish) so users can preview where the schedule lives.
- **BP-05–09**: Add a "Download" / "Copy sales page" action button on Review where applicable.

### D. Make steps clearer for new users
- `NodeHowItWorks`: change `defaultOpen` from `step === 0` to **always default open**, with persistent collapse state remembered in localStorage per node. No more hiding the roadmap.
- Add a sticky "Step X of 4: <name>" mini-bar above Review content so the current step stays visible as users scroll.
- On Generating step, add an indeterminate progress that fills based on `msgIndex` so there's a sense of progress.

### E. Apply branding consistently (kill the dull look)
- Convert BP-01 through BP-08 `AbbyCard` to use the BP-09 pattern: `categoryStyles.brand` left-strip + glowShadow + iconBg. One change per file.
- In `UnifiedStepper`, ensure the connector line uses `styles.leftStrip` (gradient) when done — already coded but verify it renders with the right opacity.
- Make the Review tabs (TabsList) use `styles.bg` background so the active-tab teal underline pops.

### F. Verify
- Click through every BP node: hit each step circle, click Previous and Next, expand each Review card and edit a field, save, reload — confirm persistence.
- BP-03: log in with no social connections, confirm warning banner appears; connect an account, confirm banner disappears.
- BP-02: confirm social distribution pack renders inside the Review step and Copy buttons work.

### Files to update
- `src/components/dashboard/builders/shared/UnifiedStepper.tsx` — clickable steps
- `src/components/dashboard/builders/shared/NodeHowItWorks.tsx` — default-open + persistence
- `src/components/dashboard/builders/shared/InlineSectionCard.tsx` — NEW shared editable card
- `src/components/dashboard/builders/shared/BuilderFooter.tsx` — confirm Previous wiring (or add a small `<ReviewStepFooter>` helper)
- `src/components/dashboard/builders/bp01/BP01Builder.tsx` — Marketing Hub button on Review, branded AbbyCard
- `src/components/dashboard/builders/bp02/BP02Builder.tsx` — embed SocialDistributionPack tab
- `src/components/dashboard/builders/bp03/BP03Builder.tsx` — connection check + banner
- `src/components/dashboard/builders/bp04..bp08/*Builder.tsx` — replace fake Edit, add inline edit, branded AbbyCard
- `src/components/dashboard/builders/bp09/BP09Builder.tsx` — replace fake Edit + inline edit (already uses branded AbbyCard)

**Outcome**: every button on every BP node does something real, every step is reachable in both directions, every node fulfils its promised intent (email→CRM, lead magnet→social, social→scheduled accounts), the roadmap stays visible for new users, and the Brand teal identity is consistent across all 9 nodes.
