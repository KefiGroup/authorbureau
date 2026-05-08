## Issue
The Home Study cover shows the subtitle as **"Home Study: Home Study: Disaster to Mastery in 21 Days"**. Root causes:

1. The BP-07 AI generator stores `programme_subtitle` already prefixed with "Home Study:" (e.g. *"Home Study: Disaster to Mastery in 21 Days"*).
2. The cover prompt also passes the productKind via the ribbon ("HOME STUDY COURSE"), and the subtitle is then rendered verbatim — which already contains the prefix. When combined, the visible subtitle reads twice. (Other product kinds — workbook with `workbook_subtitle`, BP-09 `tagline`, BP-08 hard-coded "Special Edition" — can hit the same class of bug whenever the source content already includes the kind label.)

## Goal
Subtitles on AI cover designs must never duplicate the product-kind prefix already conveyed by the top ribbon. Authors should see a clean line under the title (e.g. *"Disaster to Mastery in 21 Days"*) regardless of what the upstream generator stored.

## Change — single file
Edit `supabase/functions/generate-product-cover/index.ts` only. Add a **`sanitizeSubtitle(rawSubtitle, kind)`** helper that runs before `safeSubtitle` is built (around line 40), and use its output for the prompt.

### Sanitization rules
- Trim and collapse internal whitespace.
- Strip a leading product-kind label if the subtitle starts with one of the redundant prefixes for the current `kind`. Match case-insensitive, allow optional trailing `:`, `-`, `–`, `—`, or whitespace. Apply repeatedly so a doubly-prefixed string ("Home Study: Home Study: …") collapses to the clean tail.
- Strip a leading copy of the product TITLE if the subtitle starts with it (handles "Be SUCKcessful — Be SUCKcessful: …").
- After stripping, if the remaining string is empty or shorter than 3 chars, return `undefined` so no subtitle line is sent.
- Re-apply the existing 60-char defensive cap.

### Per-kind prefix list (in `PRODUCT_KIND_LABELS` or a new sibling map)
| kind | redundant prefixes to strip |
|---|---|
| workbook | "workbook", "companion workbook", "the workbook" |
| home-study | "home study", "home study course", "home-study", "home study programme/program" |
| course | "online course", "course", "the course" |
| special-edition | "special edition", "special-edition", "the special edition" |
| bundle | "bundle", "the bundle" |
| toolkit | "toolkit", "live audience toolkit" |
| generic | "companion", "companion edition" |

### Wiring
- In `buildPrompt`, replace lines 40–43 with:
  ```
  const cleaned = sanitizeSubtitle(args.productSubtitle, args.kind, args.productTitle);
  const safeSubtitle = cleaned && cleaned.length > 0 && cleaned.length <= 60 ? cleaned : undefined;
  ```
- Add a one-line note above `STRICT TEXT RULES` instructing the model: *"Render the subtitle exactly as given; do NOT prepend the product type, ribbon text, or title to it."* (Defense-in-depth so the model itself doesn't re-add "Home Study:".)

### Deploy
Deploy `generate-product-cover` after the edit.

## Out of scope
- No changes to BP-06/07/08/09 builders or to upstream generator prompts (those still write what they write; the cover function defends against it).
- No DB migration. No frontend changes.
- Existing already-saved covers won't auto-fix; authors can hit **Redo** on a tile to regenerate cleanly.
