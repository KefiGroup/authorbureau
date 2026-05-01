# 01 · AB Design Rules

_Version 3.0 · 2026-05-01_

**Source(s) of truth:**
- `tailwind.config.ts`
- `src/index.css`
- `mem://style/visual-identity-and-design-freeze`
- `mem://architecture/audience-split-persona-and-visual-identity`

---

## 1. Palette

Authors Bureau uses HSL semantic tokens defined in `src/index.css` and consumed via Tailwind classes — **never hard-coded colours in components**.

| Token | Role |
|---|---|
| `--background` | Page background (dark navy) |
| `--foreground` | Body text |
| `--primary` / `--primary-foreground` | Author CTA gold |
| `--secondary` | Reader CTA teal |
| `--accent` | Hover / highlight |
| `--muted` / `--muted-foreground` | Subdued surfaces / labels |
| `--card` / `--card-foreground` | All surfaces — dark navy, never light |
| `--builder-brand` | Brand-category accent (Teal) |
| `--builder-bridge` | Build-category accent (Indigo) |
| `--builder-yield` | Yield-category accent (Amber) |
| `--success` / `--destructive` | Status |

### Audience split

- **Author dashboard** — Gold (`primary`).
- **Reader / public surfaces** — Teal (`secondary`).

Routing logic in `mem://architecture/audience-split-persona-and-visual-identity`.

## 2. Typography

| Use | Family |
|---|---|
| Headings | **Playfair Display** (serif) |
| Body | **Inter** (sans-serif) |

Set in `tailwind.config.ts` — do not change without approval.

## 3. Visual freeze rules

- Dark navy cards across the dashboard. **No light backgrounds.**
- Builder category colours fixed: Brand=Teal, Build=Indigo, Yield=Amber. Do not introduce other category colours.
- WebP images optimised to **< 150 KB**.
- Single step-circle stepper for builders (no progress bars or breadcrumbs).
- LIVE lead-magnet uses `text-red-600` for the live indicator (per `mem://style/lead-magnet-success-theme`).

## 4. Public microsites

- **No nav header.**
- **No pricing visible** anywhere on a public microsite.
- **No em-dashes** in any rendered copy (`scrub_microsite_jsonb` DB trigger enforces).
- Empty fields **must hide cleanly** — no "TBD", "[insert]", "—" placeholders.
- Footer must include "Powered by Authors Bureau".
- Header / footer component requirements per `mem://ux/public-microsite-rendering-standards`.

## 5. ABBY tone in UI

- Warm, encouraging, specific.
- Always uses author's first name.
- 3–5 sentences default in chat.
- Celebrates wins; never makes the author feel behind.

## 6. Forbidden technical jargon (UI copy)

| Internal | Author-facing |
|---|---|
| GHL / Stripe / Supabase / Thinkific / Transistor | (omit) |
| CRM | "your contacts" |
| API / webhook / endpoint | (omit) |
| deploy | "activate" |
| backend | "your marketing" |
| funnel | "campaign" |

## 7. Action-description vocabulary

Every action label uses plain English:

- "Generate" not "Run prompt"
- "Activate" not "Deploy" or "Publish to GHL"
- "Save" not "Persist"
- "Connect payouts" not "Link Stripe Connect Express account"
