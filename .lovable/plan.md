

# Fix: Connect BP-01 Email Marketing to Actual BP-02 Lead Magnet

## Problem
The BP-01 Email Marketing generator creates a **fictional lead magnet** from scratch (e.g., "Personal Growth Kickstart Guide") instead of referencing the **real BP-02 lead magnet** the author already built (e.g., "SUCKCESS Starter Quiz"). These marketing nodes are completely disconnected.

The same issue likely applies to BP-03 (Social Media) and BP-04 (Author Website) — none of them pull from the actual lead magnet data.

## Root Cause
The `generate-bp01-email-marketing` edge function queries `author_context` and `books` for book info, but **never queries `generated_assets`** for the existing lead magnet (`asset_type = 'builder_draft_lead-magnet'`).

## Fix

### 1. Edge Function: `generate-bp01-email-marketing/index.ts`
- After fetching author context, also query `generated_assets` for `asset_type = 'builder_draft_lead-magnet'` belonging to this author
- Extract the real lead magnet title, type (quiz), audience, headline, and quiz topic from the stored JSON
- Inject this into the AI prompt so the `lead_magnet_offer` section references the real lead magnet (title, description, CTA) rather than inventing one
- If no BP-02 lead magnet exists yet, fall back to the current generic generation

### 2. Prompt Update
Change the `lead_magnet_offer` instruction from "Name of the free resource to offer" to "Use the author's existing lead magnet: [title]. Generate a CTA that drives readers to this specific resource." Include the lead magnet's public URL if published.

### 3. Audit Other Marketing Nodes (scope check only)
- Check if `generate-bp03-social-media` and the BP-04 website builder also ignore the real lead magnet data
- If so, flag for a follow-up sprint (not fixed in this change)

## Files Changed
| File | Change |
|------|--------|
| `supabase/functions/generate-bp01-email-marketing/index.ts` | Fetch real lead magnet from `generated_assets`, inject into prompt |

## What Does NOT Change
- No database migrations
- No frontend changes
- No BP-02 builder changes

