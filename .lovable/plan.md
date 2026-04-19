
The user raises two valid issues on the "How this node works" panel (BP-02 Lead Magnet, but the same pattern is shared across all nodes via `NodeHowItWorks.tsx` + `BP_INTRO_SPECS`).

Issue 1: Internal node IDs are leaked
- Copy says "Re-open BP-02 to edit…". Authors don't know what BP-02 is. We use friendly names everywhere else (Lead Magnet, Email Marketing, Social Media, etc.). Need to scrub all `BP-0x / BA-xx / YR-xx` references from `BP_INTRO_SPECS` and replace with the node's friendly name.

Issue 2: "You can edit it later" promise is broken in the Lead Magnet review
- The intro promises authors can edit headline, design, questions, and push refreshed copy. But on the Live screen (and Review step) the cards aren't actually clickable/editable for the lead magnet content.
- For BP-01 (Email Marketing) we already shipped `InlineEmailCard` with expand + inline edit. We need the same pattern for BP-02's Review step so authors can click any asset (headline, questions, nurture emails, social posts) to expand and edit inline, and save back to `author_nodes.content_json`.

Plan

1. Fix the leaked internal IDs (quick, global)
- Open `src/components/dashboard/builders/shared/BuilderIntroBlock.tsx` (where `BP_INTRO_SPECS` lives).
- Replace every `"Re-open BP-0x …"` / `"BA-xx"` / `"YR-xx"` mention in the `editLater`, `livesAt`, `creates`, and `prerequisites` fields with the node's friendly name (e.g. "Re-open Lead Magnet to edit…", "Re-open Email Marketing to…").
- Audit all 28 spec entries in one pass.

2. Make BP-02 Review assets clickable + inline-editable
- In `src/components/dashboard/builders/bp02/BP02Builder.tsx` (and the Review/Live step components it uses), introduce an `InlineAssetCard` pattern mirroring BP-01's `InlineEmailCard`:
  - Collapsed: shows asset label + 1-line summary, with a clear "Click to expand & edit" affordance.
  - Expanded: shows full content (headline variants, quiz questions/answers, nurture email subject+body, social posts).
  - Edit mode: inline form fields → Save → upserts the updated slice into `author_nodes.content_json` for `BP-02` via the existing project supabase client (per builder-database-client constraint).
  - Toast on save success/failure using `toAbbyError`.
- Cover all asset types surfaced in the Review step:
  - Headline (3 variants — keep the picker, but allow editing the chosen text)
  - Quiz questions + answer options + result tiers
  - 4-email nurture sequence (subject, preview, body, CTA)
  - Social distribution pack (LinkedIn, IG, FB, X copy)
- Same editability also applied to the Live step's "Your assets" list so authors can refine after going live.

3. Keep generation pipeline untouched
- No changes to `generate-lead-magnet` or any AI prompts. Only the Review/Live UI gains read+edit affordances.
- Saved edits update `content_json` directly; existing public microsite + nurture flow already render from `content_json`, so edits flow through automatically.

4. Verify
- Test on a published lead magnet: open Review, expand each card, edit headline + one quiz question + one nurture email, save, reload, confirm persistence and that the public microsite reflects the edits.
- Confirm "How this node works" copy no longer mentions BP-02 / BP-01 / etc. on at least 3 different nodes.

Files to update
- `src/components/dashboard/builders/shared/BuilderIntroBlock.tsx` — friendly-name copy across all 28 specs
- `src/components/dashboard/builders/bp02/BP02Builder.tsx` (and its Review/Live subcomponents) — inline expand + edit for every asset
- Possibly a small shared `InlineAssetCard.tsx` under `builders/shared/` so other nodes can reuse the same pattern next

Outcome: authors never see internal node IDs, and the "You can edit it later" promise is actually true on the Lead Magnet node — every Review/Live asset can be opened and edited inline, with edits saved to the same `content_json` the public microsite renders from.
