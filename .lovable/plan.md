

# Multi-Platform Publish Flow for BP-02

## Current State
The "Activate & Go Live" button silently pushes to BP-03 (Social Media) and BP-04 (Email Marketing) behind the scenes. The author has no control over what gets activated, and the downstream push is invisible until after publish.

## Proposed Change
Replace the single "Activate & Go Live" button with a **multi-channel publish panel** where authors see and choose which platforms to activate.

### New Publish Step UI (replaces current bottom section of Review tab)

```text
┌─────────────────────────────────────────┐
│  Where do you want to publish?          │
│                                         │
│  ☑ Opt-in Page (your microsite)    LIVE │
│    /{slug}/free-gift                    │
│                                         │
│  ☑ Email Nurture (5 emails → BP-04)    │
│    Auto-sequence after opt-in           │
│                                         │
│  ☐ LinkedIn                            │
│  ☐ Instagram                           │
│  ☐ Facebook                            │
│  ☐ X / Twitter                         │
│                                         │
│  [Save Draft]  [Publish Selected ▶]     │
└─────────────────────────────────────────┘
```

### Behavior
1. **Opt-in Page** — always checked by default (core deliverable). Saves to `author_nodes` BP-02, generates live URL.
2. **Email Nurture** — checked by default if nurture emails exist. Pushes to BP-04 on publish.
3. **Social platforms** (LinkedIn, Instagram, Facebook, X) — unchecked by default. When checked, pushes the matching platform posts to BP-03 and marks them as "ready to post". The social distribution pack content is already generated per-platform.
4. After publish, the success step shows **only the channels that were activated**, with direct links to each.

### Files to Edit

| File | Change |
|---|---|
| `BP02Builder.tsx` | Replace the current "Activate & Go Live" button section (~lines 1119-1137) with a channel selection panel. Update `handlePublish` to only push to selected channels. Update `PublishSuccessStep` to show activated channels. |

### What stays the same
- Content generation (Quiz + Checklist) — unchanged
- Data storage in `author_nodes` — unchanged
- The Review tab content/magnets/distribution tabs — unchanged
- Cross-builder push mechanism — unchanged, just conditional on selection

### Technical Detail
- Add state: `publishChannels: { optinPage: true, emailNurture: true, linkedin: false, instagram: false, facebook: false, x: false }`
- In `handlePublish`, only push to BP-03 if any social platform is selected, filtering `social_media_posts` to matching platforms
- Only push to BP-04 if `emailNurture` is checked
- Social platform posts are already tagged by platform in the generated content (`content.social_media_posts[].platform`)

No database changes needed. No new edge functions.

