# Add the Authors Bureau demo video to the homepage

## What visitors will see
- A new "See Authors Bureau in 45 seconds" section right below the opening banner on the homepage.
- The video sits in a framed, dark navy card with a gold play button over a still poster frame (the AB mark + "Your Story is Your LIFE").
- Clicking play starts the video with sound. It never autoplays with sound, so it doesn't surprise visitors.
- Short caption under it and a "Start free" button leading to sign-up.
- Works on phones (full-width, 16:9) and desktops (centered, max ~960px wide).

## Details
- Uses the latest rendered video (with the 28 Revenue Streams artwork and the Authors Bureau opening slide).
- No prices are shown in or around the video.
- Page speed protected: the video only loads when the visitor scrolls near it or presses play.

## Technical details
- Compress `/mnt/documents/authors-bureau-demo.mp4` to ~1080p H.264 (~6-8MB) and upload it to project storage/public assets; extract a WebP poster (<150KB).
- New component `src/components/home/DemoVideoSection.tsx`: native `<video controls preload="none" playsInline poster=...>`, semantic tokens only, lazy mount via IntersectionObserver.
- Insert it in `src/pages/Index.tsx` right after the hero section (line ~86 block).
- Add a captions track (.vtt) from the voiceover script for accessibility.
