# Full Author Journey Audit — Sign In to Live Offers

## About the manuscript you sent

Thank you, that answers the question: I will use **Value Investing for Women** as the book I add as Pauline during the audit. One thing worth knowing up front: the file is 170 pages of scanned page images, not typed text. Only the back-cover blurb comes out as readable text; the rest is pictures of pages.

That matters, because the portal reads the manuscript to understand the book. If it cannot read a scanned file, every later step is built on nothing. So the very first thing the audit checks is whether the upload step copes with a scanned book, and if it does not, that becomes finding number one with a fix.

If you also have the original Word or text version of this book, send it and I will run the journey twice: once with the scanned file, once with the clean text. Not required to start.

## What I will audit

I sign in as Pauline in the live portal and walk every step exactly as she would, recording what breaks, what confuses, and what dead-ends.

1. **Sign in** — magic link and password, wrong password, where she lands.
2. **Add the book** — new book form, upload of the Value Investing for Women manuscript, cover, and what she sees while it waits for review.
3. **Book analysis** — the read step that feeds everything else. Does it finish, how long, what happens on a scanned file, what happens if it fails.
4. **ABBY consultation** — does she get a usable plan, are the module names right, does it save.
5. **All 28 modules, one at a time** — open, generate, edit, save, publish. For each: does it complete, does it hang, does it refuse to publish, does it produce something a reader can actually use.
6. **Reader side of everything published** — follow each live link as a visitor. Every one must land on a real page with either a working Buy button or a working Enquire form. Nothing may dead-end.
7. **Money path** — checkout on a low-priced item, enquiry routing for anything $100 and above, and confirmation the enquiry reaches Authors Bureau.
8. **Back office** — earnings, payouts, the CRM contact created by an enquiry, email flows.

Her two existing books are used as controls: Be SUCKcessful (28 modules, 25 live) for the later stages, Invest Like Buffett (11 modules, none live) for the middle stages.

## How I will report it

One written report saved to your Files, each finding with:

- Where it happens, named as the step an author is on
- What the author sees
- Severity: blocks the journey / confusing / cosmetic
- The fix

Findings only in this pass. You read it, then tell me what to fix, so nothing changes under you mid-audit.

## Technical notes

- Driven through the running app with a real signed-in session, not code reading alone; code and database reads confirm causes.
- Manuscript ingestion tested against both a scanned PDF and, if the parser needs it, an OCR text version generated from the same file.
- Per-book checks on node status, generated assets, purchases and CRM rows to confirm each step truly persisted.
- Every module checked against the canonical 28-node registry so any label or count drift is caught.
- The new book is created as Pauline's real third book, as you intended, not a throwaway; nothing existing is modified.
