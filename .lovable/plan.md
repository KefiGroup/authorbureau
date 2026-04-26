## What's broken

You're seeing two real issues from the screenshots and DB:

**1. The Sales funnel never resolves publicly because it's still `draft`.**
- DB confirms: `Be SUCKcessful Instant Digital Book` (Sales funnel) → `status: draft`
- The public router `AuthorSubpageResolver` only serves a funnel when `status = 'live'`. Drafts silently fall back to the book page.
- That's why the URL `https://authorsbureau.com/pauline-teo/be-suckcessful-digital-book` "doesn't go anywhere obvious" — it's quietly serving the generic book page instead of the funnel you just edited.
- The Opt-in funnel (`free-gift`) IS `live`, which is why that one renders correctly.

**2. "Page not saved" in the Stage Editor.**
- The drawer writes to `funnel_stage_overrides` but doesn't update the `funnels` row itself, and there's no visible toast/feedback when save succeeds or fails. So edits to the Sales Page stage feel like they vanish.
- Even when the override IS saved, `FunnelPage.tsx` reads from `funnels` columns directly (headline, body_copy, cta_text…) and ignores the overrides table — so edits never appear on the live page.

## The fix

### A. Make funnel saves actually reach the public page
- In `StageEditorDrawer`, when a Sales/Opt-in stage's core fields are edited (headline, subheadline, body, CTA text, CTA URL), also update the matching column on the `funnels` row — not just the overrides table.
- Keep the override row as the audit trail / "edited" badge source, but the live page reads `funnels.*`.
- Add a success toast ("Saved — changes are live" or "Saved to draft — publish to go live") and an error toast on failure.

### B. Surface draft vs live clearly + give a one-click Publish
- On each funnel card in `FunnelsHub` and in `NodeFunnelFlow`, when status is `draft`, show:
  - A yellow banner: "This funnel is a draft. Your edits are saved but the public URL still shows your book page."
  - A primary **Publish funnel** button that flips `status` to `live`.
- Replace the current "Open landing page" button on draft funnels with **Preview draft** (opens a `?preview=funnel-id` URL that bypasses the live-only check using the author's session).

### C. Add draft preview support in the resolver
- `AuthorSubpageResolver`: if `?preview=<funnel_id>` is present AND the viewer is the funnel owner (checked via `supabase.auth.getUser()` → `author_profiles.user_id`), serve the draft funnel instead of falling through.
- Public visitors without the preview param + ownership still see the book page fallback. No leak.

### D. Small clarity fixes
- In `FunnelPage`, merge `funnel_stage_overrides` on top of base `funnels` columns at render time so the layered model actually shows on the public page.
- In the Funnels Hub URL row, append a small "(draft — not public yet)" hint when status is draft so it's obvious why opening the URL shows the book page.

## Files touched

- `src/pages/AuthorSubpageResolver.tsx` — add owner-gated `?preview=` support
- `src/pages/FunnelPage.tsx` — merge overrides into rendered content
- `src/components/dashboard/builders/shared/StageEditorDrawer.tsx` — dual-write to `funnels` + toasts
- `src/components/dashboard/builders/shared/NodeFunnelFlow.tsx` — Publish button + draft banner
- `src/components/dashboard/FunnelsHub.tsx` — Publish button, draft hint on URL, Preview vs Open

No DB migration needed — `funnels` already has all the columns we need and `funnel_stage_overrides` stays as-is.

## Outcome

- You hit Save in the editor → see a confirmation toast → changes appear on the live URL (if live) or the preview URL (if draft).
- Sales funnel for "Be SUCKcessful" gets a clear **Publish funnel** button. One click and `authorsbureau.com/pauline-teo/be-suckcessful-digital-book` serves the funnel instead of the book page.
- Drafts get a private preview link so you can QA before publishing.
