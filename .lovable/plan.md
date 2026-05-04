# Plan

## Diagnosis
Yes, I know what the issue is. There are two separate BP-09 problems:

1. The slide exporter is currently broken at boot.
   - `supabase/functions/export-bp09-slides/index.ts` imports `qrPng` from `qr-image`, but the deployed runtime reports:
   - `The requested module 'https://esm.sh/qr-image@3.2.0?bundle' does not provide an export named 'qrPng'`
   - That means the deck download function never starts, so any slide export attempt falls back to the generic “ABBY hit a snag” message.

2. BP-09 does not expose a proper regenerate action once you are on the Review step.
   - In `src/components/dashboard/builders/bp09/BP09Builder.tsx`, the normal review screen has download actions but no always-available “Regenerate toolkit” button.
   - Right now the practical workaround is exactly what you described: click **Previous** to go back to step 0 and trigger generation there.
   - There is also a bad no-op path in `handleGenerate()` that returns JSX while hydration is incomplete instead of handling the click safely.

## What I will change

### 1) Repair the BP-09 slide export function
Update `supabase/functions/export-bp09-slides/index.ts` so the exporter can boot and return `.pptx` files again.

Planned fix:
- Replace the invalid QR import with a supported QR generation method for the edge runtime.
- Keep QR optional so a QR failure never crashes the entire deck export.
- Preserve the new professional layout rendering already added for workshop and corporate decks.

### 2) Add a real regenerate action in BP-09 review
Update `src/components/dashboard/builders/bp09/BP09Builder.tsx` so regeneration is available without backing up a step.

Planned UX changes:
- Add a clear **Regenerate toolkit** button on the Review step.
- Keep it visible when content already exists.
- Show a loading state while regeneration is running.
- Prevent double-submits by respecting the existing single-flight generation registry.
- Keep the current content visible until the new generation starts, then move cleanly into the generating state.

### 3) Fix the dead-click hydration path
In `BP09Builder.tsx`, fix `handleGenerate()` so it no longer returns JSX from an event handler.

Planned behavior:
- If the builder is still hydrating, disable the generate/regenerate action or show a short “Loading your saved toolkit…” state.
- Remove the silent no-op click behavior.

### 4) Improve failure messaging around BP-09 exports
Tighten BP-09 error handling so exporter failures read like export failures, not vague generation failures.

Planned improvement:
- Surface deck-export problems as a specific download/export issue in the BP-09 UI.
- Keep the friendly ABBY tone, but avoid masking a backend boot failure as generic content-generation trouble.

## Technical details

### Files to update
- `supabase/functions/export-bp09-slides/index.ts`
  - Fix QR import/runtime compatibility
  - Add graceful QR fallback
- `src/components/dashboard/builders/bp09/BP09Builder.tsx`
  - Add review-step regenerate CTA
  - Fix hydration/no-op click path
  - Add regeneration loading/disabled states
- Optional if needed after implementation:
  - `src/lib/abby-error.ts`
    - Only if BP-09 still needs a clearer export-specific message mapping

### What I do not expect to change
- No database schema changes
- No auth changes
- No BP-09 content schema changes unless QA shows a remaining content-shape issue after regeneration

## Validation
After implementation I will verify:

1. BP-09 opens with saved content and shows a direct regenerate control on Review.
2. Regenerate works without using the Previous button.
3. Workshop deck download works.
4. Corporate deck download works.
5. The exporter no longer throws the `qrPng` boot error.
6. If QR generation fails, the deck still exports successfully.

Once you approve, I’ll implement these fixes directly.