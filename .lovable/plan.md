# Fix: password-reset code not reaching support@paulineteo.com

## What I found so far
- The account exists and is in good standing.
- The platform's email record shows only Pauline's weekly Abby reports reaching that address (last one 14 Sep). It has no entry for a sign-in or reset code at all, for her or for anyone else.
- So sign-in and reset codes are sent by the built-in default sender and never pass through the branded email system on notify.authorsbureau.com. That means I can't yet see whether today's code was sent, blocked, or filtered.
- The "Forgot password?" screen sends a 6-digit code (not a link), so the email to look for is a sign-in code.

The cause isn't confirmed yet. Step 1 confirms it before anything changes.

## Steps
1. **Find the cause.** Check the sign-in service's records for today's reset requests (sent, rate-limited, or failed). Check the email domain status. Check whether branded sign-in emails are switched on.
2. **Fix the cause I find:**
   - If requests are rate-limited, raise the hourly limit on sign-in emails.
   - If emails go out from the default sender and get filtered, set up branded sign-in emails (code, reset, sign-up) from notify.authorsbureau.com in navy and gold. Every code is then logged and can be traced.
   - If the request never left the page, fix the "Forgot password?" button and show a clear error instead of moving on silently.
3. **Unlock Pauline now.** Send her a fresh code and confirm it shows as delivered. If it still doesn't arrive, I'll ask you before using a one-time admin password reset.
4. **Prevent it happening again.** Add a sign-in email check to the daily audit: send a code to the test author account each day and confirm it was delivered.
5. **Verify.** Run the reset start to finish on the test author account, then confirm Pauline can sign in.

## Meanwhile
Ask Pauline to check Spam/Promotions for an email with a 6-digit code. If she requested several codes, only the newest one works.
