<final-text>## Root cause

This is not primarily a React re-render/dependency bug.

I traced the failure to a broken BP-03 state machine:

- The latest `author_nodes` row for `BP-03` is currently `status = 'generating'`
- That same row still contains saved review content (`posts`, `outreach_kit`, `calendar_name`)
- The `generate-bp03-social-media` backend logged a real failure: AI gateway `502`

So the actual sequence is:

1. BP-03 already has a valid saved kit
2. User re-generates or retries
3. `generate-bp03-social-media` immediately changes the node to `status='generating'`
4. The AI call fails before completion
5. The backend never restores the previous good status
6. On refresh, `BP03Builder` trusts the stale `generating` status and sends the user back into the pre-review flow
7. The UI also worsens this by doing `setStep(0)` on generation error

That is why the issue keeps coming back: the saved backend record is being left in the wrong status after a failed rerun.

## What to fix

### 1) Fix the backend root cause
Update `supabase/functions/generate-bp03-social-media/index.ts` so failed reruns do not leave a previously-saved node stuck in `generating`.

Implementation:
- Read the existing BP-03 node before writing progress
- Track:
  - previous status
  - whether a usable saved kit already exists
- During generation, it can still write progress
- But in the `catch` path:
  - if there was already a valid saved kit, restore the previous stable status (`content_ready` or `live`)
  - only leave `generating` if there was no prior valid content at all

### 2) Make BP-03 resume logic content-aware
Update `src/components/dashboard/builders/bp03/BP03Builder.tsx` so resume is based on usable saved content, not just the raw status string.

Implementation:
- Treat BP-03 as resumable to Review when `content_json` already has the saved review payload
- If saved posts/outreach content exists, open Review even if status temporarily says `generating`
- Only show the Generating step when there is no usable saved review content yet

### 3) Stop forcing the user back to Intro on transient failures
In `handleGenerate`:
- remove the unconditional `setStep(0)` on error
- if prior saved content exists, keep the user on Review and show the error message there
- only fall back to Intro when there is truly no saved content

## Files to change
- `supabase/functions/generate-bp03-social-media/index.ts`
- `src/components/dashboard/builders/bp03/BP03Builder.tsx`

## Why the previous fixes did not hold
They focused on the resume `useEffect` firing pattern, but the persistent bad state is coming from the backend record itself. Even a perfect mount effect will keep reopening the wrong step if the node is left as `generating` after a failed regeneration.

## Validation
1. Open an existing BP-03 kit -> lands on Review
2. Refresh -> still lands on Review
3. Trigger a failed regeneration -> refresh -> still lands on Review
4. Live BP-03 nodes still reopen correctly in activated state
5. Brand-new BP-03 with no prior content still behaves normally during first generation</final-text>