
Goal: fix only the BP-03 mount resume logic in `src/components/dashboard/builders/bp03/BP03Builder.tsx`, exactly as requested.

What I found:
- Pauline’s saved BP-03 backend row does exist and currently has `content_json.posts` populated (`posts_count = 5`).
- That same row is not reliably marked as activated (`activated_at` is null), so any resume logic that depends on activation/status metadata can miss the saved kit.
- The current mount effect still mixes multiple heuristics (`hasUsableSocialKit`, `status`, `activated_at`), instead of treating `content_json.posts.length > 0` as the single source of truth.
- BP03Builder uses zero-based step state, so your requested mapping translates to:
  - posts exist → `setStep(3)`  (user-visible Step 4 / Activate)
  - status `generating` → `setStep(1)` (user-visible Step 2 / Generating)
  - otherwise → `setStep(0)` (user-visible Step 1 / Introduction)

Implementation:
1. In the mount `useEffect`, keep the existing query to `author_nodes` for the current `authorId` + `node_id = 'BP-03'`.
2. Replace the current resume branching with the exact rule you specified:
   - Read `const cj = node?.content_json`
   - Read `const postsCount = Array.isArray(cj?.posts) ? cj.posts.length : 0`
   - If `postsCount > 0`:
     - hydrate `content` from `content_json`
     - send BP-03 directly to the saved final stage with `setStep(3)`
   - Else if `node?.status === "generating"`:
     - `setStep(1)`
   - Else:
     - `setStep(0)`
3. Remove the current mount-time dependence on:
   - `hasUsableSocialKit(...)`
   - `status === "content_ready"`
   - `activated_at` / `status === "live"`
   for deciding the initial step.
4. Make the mount effect set the resolved step directly, instead of using the current “only move forward” comparison, so the landing state is deterministic on every page load.

Scope guard:
- No content generation changes
- No edge function changes
- No other builder changes
- No Marketing Hub changes
- Only `BP03Builder.tsx`

Validation after implementation:
1. Open `authorsbureau.com → Brand Products → Social Media`
2. Confirm Pauline’s BP-03 opens on the saved post-build stage, not Introduction
3. Navigate away and come back
4. Hard refresh the page
5. Confirm it still lands on the saved BP-03 stage every time
