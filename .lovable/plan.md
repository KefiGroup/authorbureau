## Problem

On the BP-09 Special Editions covers, the ribbon at the top says **"SPECIAL EDITION"** and the subtitle directly under the title also says **"Special Editions"** — the same label is rendered twice on the same cover.

Root cause: BP-09 passes `content.tagline` (which the upstream generator sets to "Special Editions") as `productSubtitle` to `generate-product-cover`. The current `sanitizeSubtitle()` in the edge function strips a leading `"special edition"` prefix, but only matches the singular form — `"Special Editions"` (plural) survives because after stripping `"Special Edition"` it leaves a stray `"s"` which then falls below the 3-char floor in some cases but still slips through in others, and the AI model also tends to re-add a "Special Edition(s)" line on its own when the kind is `special-edition`.

The duplication will recur on any `productKind` whose subtitle is just a restatement of the ribbon (e.g. `workbook` → "Workbook", `home-study` → "Home Study Course").

## Fix (single file: `supabase/functions/generate-product-cover/index.ts`)

1. **Tighten `sanitizeSubtitle()`** so it also catches plurals and "echo of the ribbon":
   - Add plural variants to `REDUNDANT_SUBTITLE_PREFIXES` (e.g. `"special editions"`, `"workbooks"`, `"home study courses"`, `"online courses"`, `"bundles"`, `"toolkits"`).
   - After stripping prefixes, also reject the subtitle if the cleaned string, lowercased and stripped of punctuation, is **equal to or fully contained in** the kind's ribbon label (e.g. cleaned = "special editions" vs ribbon "SPECIAL EDITION" → drop).
   - Treat any cleaned result of length < 4 as undefined (currently 3).

2. **Strengthen the prompt** in `buildPrompt()`:
   - Add an explicit forbidden-text rule: the subtitle must NOT repeat or paraphrase the ribbon text. If no subtitle is supplied, render only the ribbon, title, and byline — do not invent a "Special Edition / Workbook / Course" line under the title.

3. **Deploy** the `generate-product-cover` edge function.

No other files change. Existing covers won't auto-fix; authors hit **Redo** on a tile to regenerate cleanly. No DB or frontend changes.

## Out of scope

- Changing what BP-09's upstream generator stores in `content.tagline` (would need a separate audit across BP-06/07/08/09).
- Removing the ribbon entirely for `special-edition` (the ribbon is the strongest visual signal of the product kind; keeping it and dropping the redundant subtitle is the correct trade-off).
