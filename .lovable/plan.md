# Fix CourseBuilder broken by column-level grants

## Background
The last security migration revoked table-wide `SELECT` on `author_nodes`, `courses`, and `subscriptions` and re-granted only safe columns (hiding `stripe_price_id`, `stripe_product_id`, `checkout_url`, `stripe_customer_id`, `stripe_subscription_id`). With column-level grants, any PostgREST `select('*')` fails because `*` expands to columns the role no longer has access to.

A full audit of every frontend query against these three tables found **exactly one** offending query.

## The only break
`src/components/dashboard/CourseBuilder.tsx` → `fetchCourses()` uses:
```ts
.from("courses").select("*")
```
This now errors with a permission denial, so the author dashboard's course list silently returns no data.

## Fix
Replace the `*` with the explicit, granted column list that the `Course` type actually consumes. Safe granted columns on `courses`:
`id, author_id, title, description, cover_image_url, price, currency, status, created_at, updated_at, book_id, source_asset_id, course_format, target_student, transformation_promises, workshop_schedule, subtitle, course_slug, delivery_url, tagline`

Select only the fields the component renders (at minimum `id, title, description, price, currency, status, created_at`, plus any others the `Course` interface references), dropping `stripe_price_id`/`stripe_product_id` which the UI does not need.

## Verification
- Confirm the `Course` type in CourseBuilder.tsx does not reference any hidden Stripe column; if it does, drop those fields from the type.
- Build passes with no type errors.
- (Optional) Re-confirm no other `select('*')` exists against `author_nodes`/`courses`/`subscriptions` — audit already shows none.

## Not changing
No other queries, edge functions, RLS policies, or the migration itself need changes. Stripe checkout/payout flows run through service-role edge functions and are unaffected.
