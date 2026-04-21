
## Goal
Stabilize BA-10 so:
1. Abby no longer flashes `Hi !` / `your book` on first load
2. `generate-ba10-online-course` stops timing out and failing with HTTP 500
3. The course output still follows a clear instructional-design framework using Bloom’s Taxonomy and related pedagogy, but stays within the edge runtime limits

## What will be fixed

### 1) BA-10 intro/loading regression
Update `src/components/dashboard/builders/ba10/BA10Builder.tsx` so the introduction does not render placeholder text before book data resolves.

Planned changes:
- Add a single derived `displayBookTitle`:
  - prefer `detectedBookTitle` when it is not `"your book"`
  - otherwise use `resolvedBookTitle`
- Add a small intro-ready/loading guard so the full Abby sentence only renders once `authorName` and a real title are available
- Replace the current first-paint placeholder state with a neutral loading message instead of rendering `Hi !` / `'your book'`
- Keep the CTA enabled/disabled logic tied to whether a real title is available, not just the hook loading state

Result:
- No more placeholder flash
- BA-10 shows either a neutral “loading your book details” state or the fully personalised intro

### 2) Edge function timeout / 500 failure
Refactor `supabase/functions/generate-ba10-online-course/index.ts` to reduce payload size, harden JSON generation, and return structured failures without raw HTTP 500s for normal generation errors.

Planned changes:
- Keep the pedagogical framework, but simplify the prompt shape:
  - target exactly 6 modules
  - target exactly 3 lessons per module
  - shorten module descriptions and lesson outlines
  - keep sales copy + pricing + course overview
  - remove non-essential high-token sections that BA-10 does not need for rendering
- Preserve pedagogy by explicitly requiring:
  - Bloom progression across modules
  - one Bloom level per module
  - one Kolb stage per module
  - measurable learning objectives
  - concise pedagogical summary
- Add `response_format: { type: "json_object" }` to reduce parse failures
- Lower randomness for structural reliability (`temperature` around 0.2–0.25)
- Reduce output budget to a safer range for this workload
- Add a request timeout guard on the AI call so the function fails fast instead of hanging near the platform limit
- Improve parse handling:
  - accept direct JSON
  - repair JSON once if the model returns malformed output
  - validate required top-level fields before saving
- Return standardized structured responses in the existing frontend-compatible shape:
  - success: true/false
  - error/message
  - optional diagnostics for logs
- Change normal failure responses from HTTP 500 to HTTP 200 with `success: false` so the UI can show the real error instead of generic “ABBY hit a snag”
- Keep relational table population (`courses`, `course_modules`, `course_lessons`) and `author_nodes` mirroring intact

Result:
- Faster generation
- Fewer parse failures
- Frontend receives usable error messages
- Builder should complete within the runtime window

### 3) Keep the Stratira-style course package intact
The BA-10 output will still include the sections the builder and export flow need:

- course title
- course tagline/subtitle
- who this course is for
- transformation outcomes / what students will achieve
- module structure with lesson titles
- suggested price + rationale
- sales page copy
- Abby summary
- pedagogical metadata (Bloom/Kolb/objectives)

This preserves the professional course-design requirement without overloading the model.

## Files to update
- `src/components/dashboard/builders/ba10/BA10Builder.tsx`
- `supabase/functions/generate-ba10-online-course/index.ts`

## Technical details
- Frontend:
  - introduce `displayBookTitle` and `isIntroReady`
  - avoid rendering personalised prose until title/name are resolved
  - continue using the existing `handleGenerate` diagnostics and toast path
- Edge function:
  - keep service-role book/context lookup
  - simplify prompt while retaining Bloom/Kolb requirements
  - add `response_format: { type: "json_object" }`
  - add AI timeout guard
  - add schema/required-field validation before DB writes
  - return `{ success: false, error, diagnostics? }` with HTTP 200 for expected failures
- No database schema change is required

## Verification
After implementation:
1. Load `/node-builder/BA-10`
   - no flash of `Hi !`
   - no flash of `'your book'`
   - intro resolves cleanly to `Be SUCKcessful`
2. Click **Build My Course**
   - request completes without navigating away
   - generation finishes within the runtime window
3. Confirm the returned course includes:
   - Bloom progression across modules
   - module learning objectives
   - module/lesson structure
   - pricing + sales copy
4. Confirm BA-10 review step still renders correctly
5. Confirm failures now surface a specific message instead of a generic HTTP 500

## Expected outcome
BA-10 becomes reliable again: the intro loads cleanly, the generator returns within the time limit, Abby still follows a professional course-design framework, and the UI shows actionable errors if generation ever fails.
