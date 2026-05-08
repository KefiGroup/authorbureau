## Make Amazon Paperback URL optional

Some authors don't sell on Amazon. The backend already accepts a null/empty value, so this is a 2-line frontend change.

### Changes to `src/components/DualModeBookForm.tsx`

1. **Line 171** — Remove `!form.amazonUrl` from the validation check, and update the toast description to "Please fill in title and description".
2. **Line 417** — Change label from `Amazon Paperback URL *` to `Amazon Paperback URL (optional)` to match the existing Kindle URL field styling.

No backend, schema, or migration changes needed.