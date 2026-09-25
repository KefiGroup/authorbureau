# Social Media module (BP-03): audit and fix "empty" generation

## What I found
- Invest Like Buffett for Parents: working. 20 posts across 4 platforms saved and live.
- Be SUCKcessful and The 4AM Club For Mums: broken. Generation stopped halfway (step 2 of 3, "Writing Instagram + Facebook posts"). Only the LinkedIn drafts were saved, and the final post list that the builder and Social Calendar read was never written.
- Afterwards the stuck-job cleanup marked both rows "content ready", so the module looks finished but shows no posts. That is the "always empty" you are seeing.
- Likely cause, still to confirm in step 1: the 3-stage AI run goes past the time limit, and nothing saves the partial result in a usable form or tells the author it failed.

## Plan
1. **Confirm the cause.** Check the generator logs and timings for the two failed runs (timeout, AI error, or a JSON parse failure in stage 2).
2. **Make generation resilient.**
   - Run each platform stage as its own short call so no single call hits the time limit, and retry a failed stage once.
   - After every stage, save the posts built so far in the final format (LinkedIn first), so a partial run still shows real posts.
   - Mark the node "failed" with a clear message, not "content ready", when the post list is empty.
3. **Fix the readiness check and cleanup.** "Content ready" or "live" only when at least one real post exists. The stuck-job cleanup must not promote an empty kit.
4. **Builder and Social Calendar.** If the kit is empty or partial, show "Generation didn't finish. Resume" (continuing from the missing stage) instead of a blank screen.
5. **Repair existing data.** Rebuild usable posts from the saved LinkedIn drafts for Be SUCKcessful and 4AM Club, then run the remaining stages to finish both kits.
6. **Check the whole posting flow end to end** on all 3 of Pauline's books and Veronica's book: generate, Design All graphics, Send to Social Calendar, Copy caption, Download graphic, Open platform, Mark as posted. Each book shows its own posts only.

## Posting model (unchanged)
Copy-paste only, with no auto-posting and no account connections. The author copies the caption, downloads the graphic, opens LinkedIn, Facebook, Instagram or X, pastes, and marks the post as posted.

## Technical details
- `supabase/functions/generate-bp03-social-media/index.ts`: split into per-stage calls with `stage` param; flatten into `posts[]` incrementally; set `status='failed'` + `error` on empty.
- `reset_stuck_generating_nodes()` and `_shared/node-readiness.ts` / `src/lib/node-readiness.ts`: BP-03 requires `posts.length > 0`.
- `BP03Builder.tsx` and `SocialCalendarTab.tsx`: detect `progress` with empty `posts`, offer resume.
- Add a readiness test case for the partial-kit shape.
