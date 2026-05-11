## Goal

Reconcile the mismatch between Stripe billing names (e.g. "Veronica Chung") and the author's true pen name (e.g. "Veronica Tan") in the CRM, and prevent it from happening again.

## Part 1 — One-time fix for Veronica

Update the existing `crm_contacts` row for `veronicagogetter320@gmail.com`:
- `full_name`: `Veronica Chung` → `Veronica Tan`

Done via a single data update; no schema change.

## Part 2 — Pen-name preference in future syncs

Update the `sync-stripe-subscriber-to-crm` edge function so that when it resolves a contact's display name, it uses this priority:

1. **Author profile pen name** — look up `author_profiles.pen_name` via the email (match `books.owner_email` → `author_id` → `author_profiles.pen_name`). This is the name the author uses publicly on Authors Bureau.
2. **Stripe customer name** — fallback if no author profile is found (e.g. paying subscriber who hasn't built a profile yet).
3. **Email local part** — last-resort fallback.

Same priority applied on both initial sync and updates, so the CRM name stays consistent with the author's public identity even if Stripe billing name differs.

Also update `backfill-stripe-subscribers-to-crm` to use the same resolver, so any existing rows already synced from Stripe billing names get corrected on the next backfill run.

## Out of scope

- No changes to Stripe customer billing names (those stay as the author entered them — needed for invoices/receipts).
- No changes to author profile, books, or auth tables.
- No UI changes.

## Technical notes

- Resolver lives inline in `sync-stripe-subscriber-to-crm/index.ts` (small helper).
- Lookup uses service role: `books.owner_email` (case-insensitive) → `author_id` → `author_profiles.pen_name`. Falls back gracefully if no match.
- Re-running the backfill after deploy will heal any other rows where Stripe billing name ≠ pen name.
