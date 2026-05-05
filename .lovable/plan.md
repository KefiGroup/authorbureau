## What’s actually broken

I do know what the issue is. This is not one random glitch - it is a small cluster of BA-11 architectural bugs.

### Root cause 1: refresh/publish drops you back to Introduction
BA-11 currently has two resume defects:

1. The builder loads saved state using only the raw route `bookId`, not the resolved effective book ID. If the page is reopened without the query param, it misses the book-scoped saved row.
2. The builder only resumes when saved content looks like `{ studio: ... }`, but the publish/distribution flow writes a different live payload shape. After publishing, refresh can see a live row but still fail the `content.studio` check, so the UI falls back to the intro screen.

### Root cause 2: manuscript split still throws the generic snag
The manuscript step is still calling the older retrieval path in a fragile way:

1. It uses the client helper that depends on session restoration timing, so it is vulnerable during refresh/bootstrap.
2. It calls the older manuscript backend function directly, while the older Audiobook Studio already has a more resilient pattern.
3. That older manuscript function is stricter than it should be when matching manuscript ownership, so it can fail even for a valid book if the manuscript asset was written under a different historical author ID.

## Plan

### 1) Normalize BA-11 resume logic
- Update `BA11Builder.tsx` to load using the resolved effective book ID, not only the route param.
- Add a BA-11 state normalizer so the builder can resume from both:
  - draft shape: `{ studio: ... }`
  - live/published shape: flat audiobook payload written during distribution
- Derive the deepest valid step from saved markers instead of requiring `content.studio` to exist.
- Ensure a live or published audiobook always skips Introduction on refresh.

### 2) Replace the fragile manuscript fetch path
- Update `ManuscriptOptimizationStep.tsx` to use the project’s shared token pattern with retry-on-restore behavior.
- Use the stronger manuscript retrieval flow first, with a safe fallback only if needed.
- Stop masking real backend responses behind the generic snag when a specific message is available.

### 3) Preserve BA-11 state when publishing
- Update the publish/distribution path so it preserves the builder’s working audiobook state instead of replacing it with a thin live payload.
- Persist the correct final step/current progress so refresh returns to Review/Publish instead of resetting.
- Audit the BA-11 live row write to make sure book-scoped state cannot be overwritten incorrectly.

### 4) Add regression guardrails
- Add tests for BA-11 resume from:
  - draft state
  - published state
  - refresh without explicit `bookId` in the route
- Add a focused regression check for manuscript retrieval so authorized books with existing manuscript assets do not fail because of historical author ID mismatches.
- Add lightweight logging around resume resolution and manuscript lookup so future repeats are diagnosable quickly.

## Technical details

Likely files to update:
- `src/components/dashboard/builders/ba11/BA11Builder.tsx`
- `src/components/dashboard/builders/audiobook/ManuscriptOptimizationStep.tsx`
- `src/components/dashboard/builders/audiobook/AudiobookPublishStep.tsx`
- `src/components/dashboard/audiobook/DistributeAudiobookModal.tsx`
- `supabase/functions/get-manuscript-source/index.ts` and/or `supabase/functions/get-book-manuscript/index.ts`
- possibly BA-11 publish backend helpers if the live payload needs to retain builder state

Once you approve, I’ll implement this as a permanent BA-11 fix rather than another patch on top.

<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>

<lov-actions>
<lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>