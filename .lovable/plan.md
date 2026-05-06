## Why it looks unpublished

Both top steppers are static — they only check the in-memory `stepIdx` (which step the user is on), not whether the audiobook is actually published. So even after publish + refresh, the icons stay grey because the user is still "on" step 4, not past it.

## Fix — two tiny edits in `src/components/dashboard/builders/ba11/BA11Builder.tsx`

**1. Top stepper (Introduction → Generating → Review → Publish)** — line 317:
```tsx
<StepHeader nodeId="BA-11" nodeName="Audiobook"
  step={stepData.publishedAt ? 4 : intro ? 0 : 2} />
```
When `publishedAt` exists, pass step=4 so all 4 circles render as ✓ done.

**2. Inner 5-icon stepper (Setup → Manuscript → Voice → Production → Publish & Distribute)** — lines 356–360:
```tsx
const isPublished = !!stepData.publishedAt;
const active = i === stepIdx && !isPublished;
const done = i < stepIdx || isPublished;
```
When published, every icon flips to the "done" style (gold check on accent background).

No backend changes. No new state. Approve and I'll make the edit.