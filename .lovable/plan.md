

# BP-02 Review UX Overhaul: Readability, Color, Editing, and Data Flow

## Problems Identified

1. **Text boxes too small** — Textarea fields are cramped (`min-h-[40px]`, `min-h-[60px]`), cutting off content. Everything is wrapped in Input/Textarea making it look like a form, not a preview.
2. **No color** — The entire review step is monochrome white/gray cards. No visual hierarchy or category colors.
3. **Quiz Description empty** — The `quiz_structure.description` field may not be generated, or the placeholder "Quiz description" shows in an empty textarea.
4. **Headline Variants purpose unclear** — Three variants are shown but there's no way to select one as the active headline. They should be selectable radio options that set the opt-in page headline.
5. **Nurture emails and social posts misplaced** — These belong to Email Marketing (BP-04) and Social Media (BP-03) respectively, not in the Lead Magnet builder. They should be pushed to those nodes on publish instead.
6. **No clear data flow after publish** — Lead capture data goes to `author_subscribers` and `author_nodes` but there's no visible link to CRM or downstream nodes.

## Solution

### 1. Display-first with edit toggle (not form-first)
Replace all Input/Textarea fields with styled readable text. Add a small pencil icon per section that toggles inline editing. Content is readable by default, editable on demand.

### 2. Add category colors
- Quiz tab: Teal accents (Brand category)
- Scoring tiers: Color-coded borders (tier 1 = red-ish, tier 5 = green)
- Opt-in tab: Primary/indigo preview card
- Magnets tab: Teal-bordered cards with the recommended one highlighted in gold

### 3. Fix Quiz Description
If `quiz_structure.description` is empty, show a meaningful fallback derived from the quiz title. Also ensure the edge function prompt explicitly requires a `description` field.

### 4. Make Headline Variants selectable
Convert headline variants into radio-selectable cards. When selected, the chosen headline populates `optin_page.headline`. Show a "Selected" badge on the active one.

### 5. Move nurture emails and social posts out of Details tab
- Remove the nurture sequence and social posts from the Details tab entirely.
- On publish, auto-push nurture emails to BP-04 (Email Marketing) `author_nodes` content_json.
- On publish, auto-push social posts to BP-03 (Social Media) `author_nodes` content_json.
- Replace the Details tab with a "Distribution" tab that shows where content will be pushed on activation.

### 6. Connect data flow: CRM, subscribers, and downstream nodes
On publish (already partially done via `microsite-action` edge function):
- Leads captured go to `author_subscribers` table (already wired).
- Add a visible "Your Leads" section in the Publish success step showing the subscriber count and a link to the CRM/contacts section.
- On publish, upsert nurture emails into BP-04 `author_nodes` with `status: 'content_ready'` so the Email Marketing node shows pre-populated content.
- On publish, upsert social posts into BP-03 `author_nodes` with `status: 'content_ready'`.
- Update the Publish success step to show clear next-step cards: "View your leads in CRM", "Set up Email Nurture (BP-04)", "Distribute on Social Media (BP-03)".

## Technical Changes

### File: `src/components/dashboard/builders/bp02/BP02Builder.tsx`

**Display-first pattern**: Replace `<Input>` / `<Textarea>` with styled `<p>` / `<span>` elements by default. Add an `editingSection` state. Each section gets a pencil button that toggles editing for that section only. When editing, show the current Input/Textarea fields.

**Color improvements**:
- Magnets tab: Cards get `border-l-4 border-teal-500`. Recommended card gets `border-amber-500 bg-amber-50/5`.
- Quiz tab: Question cards get `border-l-4 border-teal-400`. Tier cards get progressive color borders (1=red, 2=orange, 3=amber, 4=teal, 5=green).
- Opt-in tab: Preview card gets a gradient header `bg-gradient-to-br from-indigo-500/10 to-teal-500/10`.
- Tab triggers get active-state coloring.

**Headline variant selector**: Convert to radio cards with `onClick` that sets `optin_page.headline` to the selected variant's text. Show a checkmark on the selected one.

**Remove nurture/social from Details tab**: Replace with a "Distribution Plan" summary showing where content flows on publish.

**Publish handler changes**: After successful publish, also upsert BP-03 and BP-04 `author_nodes` with the generated social posts and nurture emails respectively, status `content_ready`.

**Publish success step**: Add a subscriber count query and CRM link. Show 3 clear next-step cards with node navigation.

### File: `supabase/functions/generate-bp02-lead-magnets/index.ts`

Add explicit instruction in the prompt: `quiz_structure.description` must be a 1-2 sentence description of what the quiz measures. Ensure it's never empty.

## Files Changed

| File | Change |
|---|---|
| `src/components/dashboard/builders/bp02/BP02Builder.tsx` | Display-first UI, colors, headline selector, remove nurture/social from Details, push to BP-03/BP-04 on publish, CRM link in success |
| `supabase/functions/generate-bp02-lead-magnets/index.ts` | Enforce quiz_structure.description in prompt |

