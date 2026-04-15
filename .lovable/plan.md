

# Simplify BP-02: Quiz + Checklist Only (2 Choose 1)

## What Changes

Drop **Cheat Sheet** entirely from the generator and builder. The system produces only **Quiz** and **Checklist** lead magnets — the author picks one.

### 1. Edge Function (`supabase/functions/generate-bp02-lead-magnets/index.ts`)

- Remove all `cheatsheet_structure` from the JSON schema in the prompt (lines 212-224)
- Change `lead_magnets` instruction from "exactly 3 items" to "exactly 2 items: one Quiz/Assessment, one Checklist"
- Remove rule 16 about cheatsheet sections
- Switch model from `openai/gpt-5.2` to `google/gemini-2.5-flash` for faster/cheaper generation
- Reduce `max_completion_tokens` from 16000 to 10000
- Remove `cheatsheet_structure` from the saved `content_json` cleanup/validation

### 2. Builder UI (`src/components/dashboard/builders/bp02/BP02Builder.tsx`)

- Remove `isCheatsheetType` logic and the cheat sheet rendering block in the Content tab
- Update intro text from "3 lead magnet concepts" to "2 lead magnet concepts"
- Remove any cheat sheet references in the Magnets tab display

### 3. Generating Messages

- Update from "Designing 3 irresistible free resources" to "Designing 2 irresistible free resources"

### Files to Edit

| File | Change |
|---|---|
| `supabase/functions/generate-bp02-lead-magnets/index.ts` | Remove cheatsheet schema, reduce to 2 magnets, faster model, lower tokens |
| `src/components/dashboard/builders/bp02/BP02Builder.tsx` | Remove cheatsheet rendering, update copy from 3→2 |

No database changes needed.

