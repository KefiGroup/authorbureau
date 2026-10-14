# Fix Pauline's cut-off head on the Author Website page

## What is wrong
The Author Website page (`/pauline-teo/be-suckcessful/author-website`) uses its own hero photo, separate from the one fixed last time. That photo is set to a fixed square and crops from the centre, so the top of Pauline's head is cut off. It was missed in the earlier sweep because it does not have the top-anchored setting.

## What will change
- Author Website hero photo: show the whole photo inside a taller portrait frame, scaled to fit rather than cropped. Her full head and shoulders will always be visible, whatever the shape of the uploaded photo.
- Keep the same position, size feel, rounded corners and shadow so the page otherwise looks the same. No copy changes.
- Re-scan every author photo on the public pages, including photo tags split over several lines, for any remaining centre-crop. Fix any found the same way. The admin crop-preview tool stays as it is because it is meant to crop.

## Verification
- Open the Author Website page for all three of Pauline's books in a desktop and a mobile-sized browser, take screenshots, and confirm the top of her head is fully visible.
- After you publish, check the same live pages again.

## Technical details
- `src/pages/MicrositePage.tsx` around line 852: replace `w-48 h-48 sm:w-64 sm:h-64 rounded-2xl object-cover` with a portrait frame (for example `w-56 sm:w-72 h-auto max-h-[22rem] rounded-2xl object-contain object-top`). The AGENTS.md headshot rule already covers this; no new rule is needed.
- Add a small test that fails if any author photo `<img>` uses `object-cover` without `object-top` or `object-contain`, so this cannot slip back in. The admin `AuthorsTab` crop preview is excluded.
