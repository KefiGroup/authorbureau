# Rule: author photos never cut off the head

## Goal
Anywhere an author's photo appears on the site — circle avatars, hero portraits, directory cards, social graphics — the head must always be fully in frame. Today most spots already anchor the photo to the top, but the small circular avatar in the author-branded top navigation (visible in your screenshot next to "Pauline Teo") still centre-crops, which clips the top of the head.

## Changes

1. **Fix the top-nav avatar** (`src/components/public/AuthorBrandedNav.tsx`): add top-anchored cropping (`object-top`) to the 32px circular author photo so the head stays in frame.

2. **Sweep every author-photo spot** and apply the same rule where missing:
   - Author website hero, About, and section portraits (`src/pages/author-site/*`, `src/pages/AuthorSite.tsx`) — mostly already `object-top`; verify each.
   - Directory cards (`src/pages/Directory.tsx`) — already `object-top`; verify.
   - Author Profile page (`src/pages/AuthorProfile.tsx`) — already `object-top`; verify.
   - Dashboard profile editor avatar (`src/components/dashboard/ProfileEditor.tsx`) — verify the recent fix holds.
   - Any other circular/rounded author headshot found in the sweep (testimonials, related authors, social proof bar).

3. **Make the rule permanent** so future code follows it:
   - Record in `AGENTS.md`: "Author headshots must always render with top-anchored cropping (`object-cover object-top` or equivalent); never centre-crop a portrait."
   - Save the same rule to project memory so it is applied to every future page, card, and graphic that shows an author photo.

4. **Verify live**: check Pauline's pages (author website nav, hero, Directory, profile) after the change to confirm her head is fully in frame everywhere.

## Technical details
- Purely presentational: CSS object-position only, no data or copy changes.
- BP-03 social graphics already use face-aware framing from the earlier redesign; confirmed unaffected.
- No publish until you approve; after approval the change goes live with the next publish.
