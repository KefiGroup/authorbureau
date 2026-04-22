

## Diagnosis (real bug)

The user's diagnosis is incorrect. DB confirms BA-10 is healthy:

```
node_id  status  microsite_url                                        activated_at
BA-10    live    https://authorsbureau.com/pauline-teo/online-course  2026-04-22
```

The **actual** problem is `MicrositePage.tsx` has no dedicated `OnlineCoursePage` renderer for BA-10, so it falls through to `GenericPage` (line 223). GenericPage only knows `headline / subheadline / description / bullets / price` — none of which exist in Pauline's BA-10 row. Her real fields:

```
course_title, course_subtitle, tagline, transformation_promise,
modules[8], who_its_for, what_youll_get, suggested_price_usd,
duration, difficulty_level, pedagogical_approach, sales_copy,
pricing_rationale, course_description_long, abby_summary
```

Because none of those map to GenericPage's expected keys, the page renders nearly empty, and because there's no `payment_link` it shows the disabled "Coming Soon" button on line 1830 — which is what Pauline interpreted as the page being broken.

No publish/DB-write fix is needed. No BA10Builder change is needed. The fix is the **same pattern as BA-13/14**: add a dedicated renderer.

## Plan

### Fix 1 — Add `OnlineCoursePage` renderer in `MicrositePage.tsx`

New component slotted before `GenericPage` (~120 lines), modeled on `GroupCoachingPage`:

- **Hero**: `course_title` (h1) + `course_subtitle` (italic) + `tagline` line + `transformation_promise` paragraph.
- **Course details strip**: `duration` · `difficulty_level` · `modules.length` modules · `suggested_price_usd` (formatted `$497`) — each rendered only when present.
- **"Who it's for"**: render `who_its_for` (string OR array).
- **"What you'll get"**: bullet list from `what_youll_get` (string OR array).
- **Curriculum**: render `modules[]` as expandable cards. Each module shows `title`, `description`, plus optional `lessons[]` / `learning_outcomes[]` checklist when expanded.
- **Pedagogical approach**: small muted block (only if present).
- **Sales copy**: render `sales_copy` if non-empty string (with `whitespace-pre-line`).
- **Pricing rationale**: small muted block (only if present).
- **Right column / CTA**:
  - If `data.node.payment_link || content.stripe_checkout_url` exists → "Enroll Now" button linking to checkout (consistent with BuyNowButton commerce-engine v1 pattern).
  - Otherwise → "Notify Me When Enrollment Opens" optin form (firstName + email → `handleSubmit` registers a lead with `action_type=optin`). **No "Coming Soon" disabled button.**

All fields type-guarded (string / array / object) so a future schema drift never blanks the page.

### Fix 2 — Wire into the dispatcher

`src/pages/MicrositePage.tsx` line 220-223:

```tsx
{resolvedNodeId === "BA-10" && <OnlineCoursePage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} submitting={submitting} submitted={submitted} />}
```

Append `"BA-10"` to the GenericPage exclusion array on line 223.

### Fix 3 — Add BA-10 to optin nodes (only when no payment link)

In `getActionType`, the OnlineCoursePage handles its own form submission contextually so this isn't strictly required — but to keep the lead capture pipeline consistent when no payment link is configured yet, conditionally treat BA-10 as `optin` inside the renderer (use `getActionType` only for purchase/payment routing).

## Files touched

- **Update** `src/pages/MicrositePage.tsx`
  - Add `OnlineCoursePage` component (~120 lines).
  - Dispatcher: 1 new `&&` line + extend exclusion array on line 223 to include `"BA-10"`.

No DB migration. No edge function changes. No BA10Builder changes. No regeneration required — Pauline's existing content already has all needed fields.

## Verification

1. Reload `/pauline-teo/online-course` → see `course_title` ("…course title…"), tagline, transformation_promise, details strip showing duration · difficulty · 8 modules · $497, "Who it's for" + "What you'll get" lists, **8 expandable module cards** with descriptions and lesson checklists, pedagogical approach block, sales_copy block, pricing rationale.
2. Because there's no payment_link, the right column shows a "Notify Me When Enrollment Opens" form (NOT a "Coming Soon" disabled button).
3. Once a Stripe payment link is added to the row, the form is replaced by an "Enroll Now" CTA.
4. Existing BA-13/14/15/16/17/18 pages unchanged.

## Scope

Pure frontend, single file. No DB, no edge functions, no regeneration, no builder changes.

