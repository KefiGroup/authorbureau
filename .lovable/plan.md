

# Sprint 31 — Connect Quiz Result to Email Capture, CRM, and ABBY Personalised Nurture

## Overview
Wire the BP-02 SUCKCESS Quiz into: email gate (teaser → capture → full results), CRM enrichment with quiz data, ABBY personalised welcome email (GPT-5 via Lovable AI Gateway), stage-based intelligence segments, and placeholder cleanup. Replace "microsite" with "Author Page" in all user-facing text.

## Database Migration

**Add quiz columns to `crm_contacts`:**
- `quiz_stage text` (nullable)
- `quiz_score integer` (nullable)  
- `quiz_completed_at timestamptz` (nullable)

**Add quiz columns to `leads`:**
- `quiz_stage text` (nullable)
- `quiz_score integer` (nullable)
- `quiz_completed_at timestamptz` (nullable)

**Create `quiz_responses` table:**
- `id uuid PK`, `lead_id uuid FK→leads`, `question_number integer`, `answer_selected text`, `answer_text text`, `created_at timestamptz`
- RLS enabled, service-role insert only

## Part 1 — Quiz Gate Redesign

**File: `src/pages/MicrositePage.tsx`** — `LeadMagnetPage` component, `stage === "gate"` block

Current gate shows generic "Quiz Complete!" with no teaser. Replace with:
- Show stage name + one-sentence teaser from `resultTier.description` (truncated)
- Copy: "Get your personalised action plan from [authorName]"
- First name + email inputs → gold "Get My Personalised Plan →" button
- Privacy note: "No spam. Unsubscribe anytime."

Also pass quiz data (`quiz_stage`, `quiz_score`, `quiz_answers`) in the `handleSubmit` body when `resolvedNodeId === "BP-02"`.

## Part 2 — CRM + Leads Capture with Quiz Data

**File: `supabase/functions/microsite-action/index.ts`**

Accept new optional fields: `quiz_stage`, `quiz_score`, `quiz_answers`.

When `node_id === "BP-02"` and quiz data is present:
1. Insert into `leads` with `quiz_stage`, `quiz_score`, `quiz_completed_at`
2. Update `crm_contacts` record with quiz fields
3. Insert individual `quiz_responses` rows
4. Log `nurture_events` entry: `event_type = "quiz_completed"`, `metadata = {stage, score}`
5. Add tags: `quiz-completed` + stage-specific (e.g. `stage-3-seeker`)
6. Activity log: "Completed SUCKCESS Quiz — Stage 3: Seeker (Score: 62)"

## Part 3 — ABBY Personalised Welcome Email

**File: `supabase/functions/microsite-action/index.ts`** — inline after quiz capture block

- Uses **openai/gpt-5** via the Lovable AI Gateway (user requested GPT-4o equivalent)
- System prompt: "You are ABBY, the AI business coach for author [pen_name]. The reader just completed the SUCKCESS Stage Quiz at [quiz_stage]. Write a warm, personal welcome email from [pen_name]. Reference their specific stage. Quote one insight from [book_title]. End with a clear next step. Tone: warm, encouraging, personal — like a message from a friend. Max 200 words."
- Send via Resend (existing pattern) with subject: "Your SUCKCESS Stage is [Stage Name] — here's what it means for you"
- Non-blocking: failure does not break the submission flow

## Part 4 — CRM Contact Card Shows Quiz Data

**File: `src/components/crm/ContactDetailPanel.tsx`**
- Add `quiz_stage`, `quiz_score`, `quiz_completed_at` to `CRMContact` interface
- Show coloured quiz stage badge below contact name (e.g. "Stage 3 — Seeker")
- Show quiz score as a small progress bar (0–100) if present

**File: `src/components/crm/ContactListView.tsx`**
- Add quiz_stage to interface; show badge in the table row when present

**File: `supabase/functions/author-crm-data/index.ts`**
- `list` action: include `quiz_stage`, `quiz_score`, `quiz_completed_at` in select (already selects `*`, so just ensure frontend reads them)
- `abby-intelligence` action: include `quiz_stage` in select and inject stage distribution into AI prompt

## Part 5 — ABBY Intelligence: Reader Segments Card

**File: `src/components/crm/AbbyIntelligenceView.tsx`**
- Add 5th card: "Your Reader Segments" with stage breakdown
- Stage groups: Stage 1-2 (Suck), Stage 3-4 (Seek), Stage 5-6 (Succeed), Stage 7-8 (Sustain)
- Each with count, visual bar, and ABBY-recommended action
- Gold "Take Action" button per segment

**File: `supabase/functions/author-crm-data/index.ts`**
- In `abby-intelligence`, query contacts with `quiz_stage`, compute group counts
- Add `readerSegments` to tool-call schema and response

## Part 6 — User-Facing Text: "microsite" → "Author Page"

All user-visible strings only (not code filenames):
- `MicrositePage.tsx`: source in `handleSubmit` body stays `microsite`, but any UI-facing error messages or labels say "Author Page"
- `microsite-action/index.ts`: notification messages, activity log content, email body — replace "microsite" with "Author Page"
- CRM source labels in `crm-utils.ts` if applicable

## Part 7 — BP-01 Placeholder Cleanup

**File: `src/components/dashboard/builders/bp01/BP01Builder.tsx`**
- Already handles `[Lead Magnet URL]`. Also add `[Link to Lead Magnet]` variant to the regex replacement.

## Files Changed

| File | Change |
|------|--------|
| **Migration SQL** | Add quiz columns to `crm_contacts` + `leads`; create `quiz_responses` |
| `src/pages/MicrositePage.tsx` | Redesign gate with teaser; pass quiz data on submit |
| `supabase/functions/microsite-action/index.ts` | Accept quiz data, write to leads/crm/quiz_responses/nurture_events; generate + send ABBY welcome email via openai/gpt-5; replace "microsite" in user-facing text |
| `src/components/crm/ContactDetailPanel.tsx` | Quiz stage badge + score bar |
| `src/components/crm/ContactListView.tsx` | Quiz stage badge in table |
| `supabase/functions/author-crm-data/index.ts` | Include quiz fields in intelligence; add readerSegments to schema |
| `src/components/crm/AbbyIntelligenceView.tsx` | Add "Reader Segments" card |
| `src/components/dashboard/builders/bp01/BP01Builder.tsx` | Add `[Link to Lead Magnet]` variant to regex |

## What Does NOT Change
- Quiz questions, scoring logic, result categories
- Existing BP node builders
- Edge function filenames (microsite-action stays as-is)
- Visual design system

