
## Plan: Force a Fresh Frontend Rebuild and Verify the Live Bundle

### What is already confirmed
- The `v3.2` changes are saved in `src/hooks/useBookContext.ts`:
  - `HOOK_VERSION = "v3.2-2026-04-20-force-refetch"`
  - `queryKey: ["book-context-v3.2", user?.id ?? "anon"]`
  - `staleTime: 0`
  - `gcTime: 0`
  - `refetchOnMount: "always"`
  - mount/query logs are present in source
- All 4 target builders import `useBookContext` from `@/hooks/useBookContext`
- There is no service worker / PWA registration in the app source, so this looks like a frontend publish/build-cache issue rather than client-side SW caching

### Important additional issue found
Even after the new bundle goes live, **BP-06** and **BP-07** still have a title propagation bug:
- they copy `detectedBookTitle` into local `bookTitle` state inside an effect that only depends on `authorId`
- if `useBookContext` resolves after first render, those two builders may stay stuck on the initial fallback

That needs to be fixed in the same implementation pass.

### Implementation steps

#### 1) Force the bundler to invalidate the current frontend build
Make a trivial code change in a guaranteed-entry file so the next publish cannot reuse the same compiled output:
- safest options: `src/main.tsx` or `src/App.tsx`
- example: add/remove a harmless comment or whitespace-only formatting change near the root render / QueryClient setup

This is only to force a new frontend bundle hash.

#### 2) Keep the existing v3.2 hook changes as the active source of truth
Do not roll back the current `useBookContext` changes. The saved file already contains the intended debug/cache-bypass logic and should be the version that gets compiled into the new bundle.

#### 3) Fix builder title propagation in BP-06 and BP-07
Update both builders so the resolved title actually reaches the intro text after the hook finishes loading:
- either add `detectedBookTitle` and `isBookLoading` to the effect dependencies
- or remove the unnecessary local mirror state and render directly from `detectedBookTitle`

Preferred outcome:
- intro text should always prefer `detectedBookTitle`
- local `bookTitle` state should not be allowed to stay stale

#### 4) Re-publish as a frontend update
After the trivial cache-busting edit and the BP-06/BP-07 propagation fix are saved, publish again so Lovable performs a fresh frontend build.

### Pass/fail verification
The publish is only successful if all of these are true:

#### Build verification
- bundle hash changes from `index-C6gjd4yk.js` to a new filename

#### Runtime verification
Open a signed-in builder and confirm:
- console shows `[useBookContext] mount`
- console shows `[useBookContext] queryFn START`
- network shows `author_context` being called
- if `author_context.book_title` is empty, network then shows `books` and/or `get-author-book` fallback
- ABBY intro text shows `Be SUCKcessful` instead of `your book`

### Expected builder coverage
This must be verified across:
- BA-10
- BA-12
- BP-06
- BP-07

### Technical notes
- The source code already proves the latest hook changes exist; the current problem is that the live site is not serving a freshly built frontend bundle
- BP-06 and BP-07 have an additional state-sync bug independent of publishing, so they should be corrected now to avoid a second round of title issues after the bundle finally updates
- No backend change is required for this step; this is a frontend rebuild + builder state propagation fix

### What the user will need to do after implementation
- Click **Publish → Update**
- Hard refresh the live site
- Confirm the new bundle hash is different
- Confirm `author_context` appears in the network trace and the intro text uses `Be SUCKcessful`
