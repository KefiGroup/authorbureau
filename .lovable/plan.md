

# Fix BP-02 Review: Show Quiz Content, Enable Editing, Add Save Draft, Improve Publish

## Problems

1. **Quiz tab empty**: Code reads `quiz.quiz_questions` / `content.quiz` but data is at `content.quiz_structure.questions`. Scoring tiers are at `content.quiz_structure.scoring_tiers`, not `content.scoring_tiers`.
2. **Headline variants missing**: Code reads `content.optin_page.headline_variants` but data is at `content.headline_variants` (root level).
3. **Generating timer says "15-30 seconds"**: Should say "about 1 minute" given 16k token budget.
4. **No editing**: All content is read-only. User wants inline editing of draft content.
5. **No Save Draft**: No way to save edits without publishing. Need a Save Draft button.
6. **Publish step lacks guidance**: No mention of where it's published or how to distribute via Social Media node (BP-03).

## Changes — `src/components/dashboard/builders/bp02/BP02Builder.tsx`

### 1. Fix quiz data path (line 311)
```
// Current (broken):
const quizData = quiz?.quiz_questions || content.quiz_questions || content.quiz;

// Fixed:
const quizData = content.quiz_structure?.questions || quiz?.quiz_questions || content.quiz_questions;
```

Fix scoring tiers path (line 422):
```
// Current: content.scoring_tiers || content.result_tiers || quiz?.scoring_tiers
// Fixed: content.quiz_structure?.scoring_tiers || content.scoring_tiers || ...
```

Fix quiz title/description to read from `content.quiz_structure`.

### 2. Fix headline variants path (line 472)
```
// Current: content.optin_page?.headline_variants
// Fixed: content.headline_variants || content.optin_page?.headline_variants
```

### 3. Update timing message (line 267)
Change "This usually takes 15–30 seconds" → "This usually takes about 1 minute"

### 4. Make all draft content editable
- Convert quiz questions, opt-in headlines, bullet points, thank-you page text, nurture email subjects/body outlines, and social post captions into editable `<Textarea>` / `<Input>` fields.
- Store edits in the local `content` state via a helper function that deep-updates the content object.
- Quiz question text and options become editable inputs.
- Opt-in headline, subheadline, bullets, CTA text become editable.
- Thank-you headline, message, next_step become editable.
- Nurture email subjects and body outlines become editable.

### 5. Add Save Draft button
- Add a "Save Draft" button next to the existing "Activate & Go Live" button.
- On click, upsert `author_nodes` with `status: 'content_ready'` and the current (possibly edited) `content_json`.
- Show toast confirmation "Draft saved!"

### 6. Improve Publish success step
- Add a card explaining where the lead magnet is published (the live URL).
- Add guidance: "Share this across all your social media channels. Go to Social Media (BP-03) to manage your social campaigns."
- Add a button: "Set Up Social Media Distribution →" linking to BP-03.

## Files Changed

| File | Change |
|---|---|
| `src/components/dashboard/builders/bp02/BP02Builder.tsx` | Fix data paths, add editing, save draft, improve publish guidance |

