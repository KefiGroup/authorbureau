# Full Author Journey Audit — Sign In to Live Offers

## Do I need a book from you?

No, not to start. Pauline already has two books in the portal, and together they cover both halves of the journey:

- **Be SUCKcessful** — approved, all 28 modules created, 25 live. Good for auditing the later stages: publishing, reader links, buying and enquiring.
- **Invest Like Buffett: Value Investing for Parents** — approved, only 11 modules started, none live. Good for auditing the middle stages: analysis, building a module from scratch, taking it live.

What neither covers is the **very first step: adding a brand new book and uploading its manuscript**. To audit that honestly I need to actually add one. Two options:

1. I add a temporary test book under Pauline's account using a short sample manuscript I create, run the whole journey on it, then delete it at the end. Nothing of yours is touched.
2. You send me a real manuscript file for Pauline and I use that instead.

Option 1 lets me start straight away. Say the word if you prefer option 2.

## What I will audit

I will sign in as Pauline in the live portal and walk every step the way she would, recording exactly what breaks, what confuses, and what dead-ends.

1. **Sign in** — magic link and password, wrong password, landing place after sign in.
2. **Add a book** — new book form, manuscript upload, cover, what happens while it waits for review.
3. **Book analysis** — the pre-read step that feeds everything else. Does it finish, how long, what if it fails.
4. **ABBY consultation** — does she get a usable plan, are module names correct, does it save.
5. **All 28 modules, one by one** — open, generate, edit, save, publish. For each: does it complete, does it get stuck, does it refuse to publish, does it produce something a reader can actually use.
6. **Reader side of every published module** — follow each live link as a visitor. Does it land on a real page with either a working Buy button or a working Enquire form. Nothing may dead-end.
7. **Money path** — checkout for a low-priced item, enquiry routing for anything $100 and above, and that the enquiry reaches the Authors Bureau inbox.
8. **Back office** — earnings, payouts, CRM contact created from an enquiry, email flows.

## How I will report it

A single written report saved to your Files, listing every finding with:

- Where it happens (the exact step an author would be on)
- What an author sees
- Severity: blocks the journey / confusing / cosmetic
- The fix

Findings only in this pass. Once you have read it, you tell me what to fix and I fix it in a second pass, so nothing changes under you mid-audit.

## Technical notes

- Driven through the running app with a real signed-in session, not by reading code alone; code and database reads are used to confirm causes.
- Live data checks per book on `author_nodes` status, `generated_assets`, `purchases` and `crm_contacts` to verify each step truly persisted.
- Every module checked against the canonical 28-node registry, so any label or count drift is caught.
- Any temporary test book, node rows and generated assets created during the audit are removed at the end.
