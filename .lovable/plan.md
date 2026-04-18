
The user wants clarity on the "Sending Domain - Pending" status. Right now it just shows "Pending" with a vague "Verify domain & connections" button — no explanation of what verification means, what's required, or how to complete it.

Looking at the screenshot: the Sending Domain card just says "Your emails are sent through Authors Bureau's managed delivery. No DNS setup needed." then shows "Pending" with a button. That's contradictory — if no DNS setup is needed, why is it pending?

Per memory, Authors Bureau uses managed delivery (no author DNS needed). The "verification" here really means: the platform has confirmed the reply-to email is reachable / the sending identity is approved. Most authors should auto-verify once they save valid sender settings.

Plan

1. Rewrite the Sending Domain card with a clear, plain-language explainer
- Explain what "verified" means in Authors Bureau context: their reply-to email has been confirmed and emails will deliver from "Sender Name via authorsbureau.com".
- Make it clear no DNS or domain ownership work is required from the author.

2. Add an inline 3-step status checklist
- Step 1: Sender name set (auto-checks from saved settings)
- Step 2: Reply-to email saved (auto-checks from saved settings)
- Step 3: Confirmation email clicked (the actual pending action)
- Each step shows a green check or amber pending dot so the author can see exactly what's missing.

3. Replace the confusing "Verify domain & connections" button
- When pending: show a primary "Send confirmation email" button that triggers a confirmation email to the saved reply-to address. Add helper text: "We'll email pl@paulineteo.com with a one-click verification link."
- When verified: show the green "Verified" badge plus the date verified, and hide the button.
- Keep a smaller secondary "Manage connections" link for users who want the Connections page.

4. Add a "What does verified mean?" tooltip / collapsible
- One short paragraph explaining: verification confirms you own the reply-to inbox so subscriber replies reach you and emails don't get marked as spam.

5. Wire the confirmation flow through the existing backend
- Add a `send_verification_email` action to `marketing-hub-state` that sends a branded transactional email with a verification link/token.
- Add a `verify_email_token` action (or lightweight public edge function) that flips `domain_verified = true` when the token is clicked.
- Surface backend status (`pending`, `email_sent`, `verified`) so the UI shows "Confirmation email sent — check pl@paulineteo.com" after the button is clicked.

Files to update
- `src/components/dashboard/marketing-hub/SettingsTab.tsx` — new explainer, checklist, button states
- `supabase/functions/marketing-hub-state/index.ts` — `send_verification_email` + `verify_email_token` actions
- `src/lib/marketing-hub-state.ts` — add the two new action names
- New edge function or route for the public verification link click (no JWT required)
- Migration: add `verification_token` and `verification_sent_at` columns to `author_email_settings` if not present

Outcome: the author sees exactly why it's pending, what to do next (one button click + check inbox), and gets immediate confirmation when verified.
