## Goal
Make Pauline Teo and Veronica Tan free forever on their existing subscriptions, and fix Pauline's missing email in Stripe.

## Actions

**1. Update Pauline's Stripe customer email**
- Customer: `cus_UJUky0qgRpdVKc` (Pauline Teo)
- Set `email = support@paulineteo.com`
- Tool: `stripe_api_execute` → `PostCustomersCustomer`

**2. Attach coupon `SUCK100` (100% off, forever) to both subscriptions**
- Pauline: `sub_1TKrlPCk4r0emyO8EEMKpuW3`
- Veronica: `sub_1TUep4Ck4r0emyO8SbpVsbli`
- Tool: `stripe_api_execute` → `PostSubscriptionsSubscription` with `discounts[0][coupon]=SUCK100`
- No proration, no plan change — they stay on the same price, just net $0

## Result
- Both renew automatically every month at $0
- Pauline's customer record now has a proper email for future lookups
- Reversible anytime by removing the discount in Stripe

## No code changes
This is a Stripe data operation only — no files in the project are modified.