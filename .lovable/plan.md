## Goal

Flip the SmartProductCard color logic so the **category color** (teal / indigo / amber) signals **completion** ("Live"), and a **neutral color** signals work that hasn't been built yet. This way, when an entire hub is fully built, the grid reads as a unified teal / indigo / amber wall — which is what the user expects.

## Current Behavior (the problem)

In `src/components/dashboard/SmartProductCard.tsx`:

- **Published tiles** all render in **green** (success) — strip, badge, gradient, stat tiles. So even when Yield is 10/10 built, every tile is green, not amber.
- **Not-built tiles** (recommended / available / in-progress) render in the **category color** (teal / indigo / amber).

The user wants the opposite: built = category color, not-built = something else.

## New Behavior

| State | Strip / Badge / Gradient | Action button |
|---|---|---|
| **published** (built) | **Category color** (teal / indigo / amber) + small ✅ Live tag for clarity | Outline "View on Website" in category color |
| **recommended** | **Slate** (neutral cool gray) + glow + ⭐ badge | Solid slate "Build Now" |
| **available** | Slate strip, plain card | Solid slate "Build This Product" |
| **in-progress** | Slate + 🔨 badge + slate progress bar | Solid slate "Continue Building" |
| **locked** | Muted (unchanged) | Outline upgrade |
| **coming-soon** | Muted (unchanged) | n/a |

**Why slate**: It's outside the BP/BA/YR palette (teal/indigo/amber), reads as "pending / unbuilt", and works on light + dark backgrounds. It also keeps the green success color free for transient confirmations elsewhere (toasts, success modals) without conflicting with hub coloring.

The earned-revenue stat tiles on built cards keep a soft success-green tint inside (so live revenue numbers still feel "earned"), but the **outer card chrome** (strip, border, badge, button) becomes the category color so the wall of built tiles reads as the right hub color.

## Changes

### File: `src/components/dashboard/SmartProductCard.tsx`

1. **Add a `pendingTokens` constant** (slate-based) mirroring the shape of `categoryCard` entries — strip, stripSoft, border, borderHover, glow, gradient, badgeBg/Text/Border, ctaSolid, ctaAvailable, ring.

2. **Rewrite `buildStateConfig(state, cat)`**:
   - `recommended` / `available` / `in-progress` → use `pendingTokens` instead of `categoryCard[cat]`.
   - `published` → use `categoryCard[cat]` (currently uses success/green). Badge stays "✅ Live" but recolored to category palette; strip + gradient + border switch to category color.
   - `locked` / `coming-soon` → unchanged (muted).

3. **CTA buttons**:
   - `recommended` / `available` / `in-progress` buttons use `pendingTokens.ctaSolid` / `ctaAvailable` (slate).
   - `published` "View on Website" button switches from generic outline to outline tinted with the category color (`border-{cat}/40 text-{cat} hover:bg-{cat}/5`).

4. **Icon tile** (lines 252–256):
   - Built (`published`) → `catTokens.iconBg` + `catTokens.iconText` (already category-colored — keep).
   - Not built (recommended/available/in-progress) → switch to slate icon tile (`bg-slate-500/15 text-slate-600 dark:text-slate-300`).

5. **Progress bar** (in-progress) → slate fill instead of category fill, since "in progress" is a not-yet-built state.

6. **Stat tiles** (revenue / time / difficulty grid):
   - `published` → keep the soft green tint inside (reads as "money earned"). No change.
   - Others → keep `bg-muted/50`. No change.

### No other files touched

`categoryAccent.ts`, hub pages, headers, and the "Your Next Step" hero card all stay as-is — they already correctly use category colors at the hub level.

## Visual outcome

- **Yield Premium Revenue (10/10 built)**: a wall of amber tiles with amber strips, amber "Live" badges, and amber outline View buttons. Reads as a finished amber hub.
- **Build Your Brand (7/9)**: 7 teal tiles + 2 slate tiles (the unbuilt Social Media + Webinars). Eye instantly tracks the 2 slate cards as "still to do".
- **Build Your Authority (6/9)**: 6 indigo tiles + 3 slate tiles. The "Recommended Online Course" card is slate with a glow + ⭐ — clearly the next action, visually distinct from both the built indigo tiles and the plain slate available ones.

## Out of scope

- Changing hub headers / "Your Next Step" hero / progress dots (already category-colored correctly).
- Touching `BuilderTheme.ts` or `categoryAccent.ts`.
- Changing the success green used elsewhere in the app (toasts, banners).
