# Authors Bureau 45-second demo video

A 45-second animated walkthrough (16:9, 1920x1080) with a narrated voiceover, delivered as an MP4 in Files. Your app is not changed.

## Story (about 45s)

1. **Hook (0-5s):** "Your book is not the business. Your book is the HOOK."
2. **Upload (5-12s):** An author uploads a manuscript, and ABBY analyses it.
3. **ABBY plan (12-20s):** The AI Business Advisor turns the book into a business plan.
4. **28 revenue streams (20-30s):** A grid of the Brand, Build and Yield modules lights up to show "28/28 Live".
5. **Book website (30-38s):** Each book gets its own page, plus email marketing and a social calendar.
6. **Earnings (38-42s):** "You keep 92% of every sale."
7. **Close (42-45s):** The Authors Bureau logo and authorsbureau.com.

## Look

- The dark navy and gold author palette, with Teal, Indigo and Amber for Brand, Build and Yield.
- Real screenshots of your live site (the homepage, the dashboard, Pauline's book page and the module grid), shown in animated frames with a slow pan and zoom, plus text callouts.
- One serif font for headings and one clean sans-serif font for body text. No prices over $100 appear on screen.

## Voiceover

- A narration script of about 110 words (I will show you the draft in the final message).
- Your ElevenLabs subscription is paused, so the voice comes from Lovable AI's built-in text-to-speech. It will be a warm, professional voice, and the video is timed to match it.
- A soft background music bed is not included unless you ask for one.

## Technical details

- Screenshots are captured with Playwright from localhost (the dashboard view uses Pauline's signed-in session).
- The video is rendered with Remotion under /tmp/remotion using TransitionSeries at 30fps, 1350 frames.
- The voiceover comes from the AI Gateway speech model (google/gemini-3.1-flash-tts-preview). The file's length sets the scene timing.
- I check still frames of key moments before the final render. Output: /mnt/documents/authors-bureau-demo.mp4.
