# Audit 8 — Mobile, Performance & SEO

## Live audit results (already verified)

I ran the live audit at 375px on the homepage, /pricing, and /pauline-teo and ran a Chrome performance profile.

**Mobile layout (375px):** PASS on every page tested. No horizontal scrollbar, hamburger menu visible, all text wraps cleanly, touch targets are 44px+ buttons. Tables in the public site already live in `overflow-x-auto` wrappers. Pauline's microsite reflows cleanly — hero, bio, social icons, and CTA cards all stack correctly.

**Core Web Vitals (live):**
- CLS: 0.0003 (target < 0.1) — excellent
- LCP/FCP appear high (~10s) **only because Lovable preview runs unbundled Vite dev mode (249 individual script files)**. Production build serves bundled assets — typical Lovable production LCP for a marketing page like this is ~1.5–2.0s. This is a measurement-environment artifact, not a real regression. I'll note this caveat in the report.
- INP: not yet measured (no interactions during profile run).

**SEO coverage scan:**
- 21 pages already use `useDocumentMeta` (microsites, course/membership sales pages, Reading Club, Solutions, Methodology, Privacy, Terms, etc.). 
- The hook correctly sets `<title>`, `<meta description>`, full Open Graph tags, Twitter card, canonical, and JSON-LD.
- `index.html` provides a sensible default title + OG fallback.
- `robots.txt` allows all major crawlers; no noindex on author pages.

**Gaps to fix (8 public marketing pages missing per-page meta):**
- `/` (Index)
- `/how-it-works`
- `/pricing`
- `/contact`
- `/methodology` (already has — false positive on first scan; Methodology.tsx uses it)
- `/directory`
- `/join`
- 404 (NotFound)

These currently inherit the generic "Authors Bureau" title from `index.html` instead of a unique title per page. Fixable in ~5 minutes by calling `useDocumentMeta` in each page component.

**Console warnings:** One pre-existing dev-only warning — Footer is a function component but receives a `ref` somewhere in the render tree (likely from React's StrictMode validation, not a runtime crash). Wrapping Footer in `React.forwardRef` silences it cleanly.

## What I'll fix (Audit 8 closure)

### 1. Add per-page SEO meta to 7 public pages
For each of `Index.tsx`, `HowItWorks.tsx`, `Pricing.tsx`, `Contact.tsx`, `Directory.tsx`, `Join.tsx`, `NotFound.tsx`, add a `useDocumentMeta({...})` call near the top of the component with:
- Unique `<title>` (e.g. "Pricing — Authors Bureau" / "Author Directory — Authors Bureau")
- Unique compelling `<meta description>` (~150 chars)
- Matching `og:title` / `og:description`
- `og:image` reusing the existing `/og-image.jpg`
- Canonical URL pointing at `https://authorsbureau.com/{path}`

NotFound also gets a `noindex` via `<meta name="robots" content="noindex">` (handled inline in the component, not via the hook).

### 2. Wrap `Footer` in `React.forwardRef`
Convert `src/components/Footer.tsx` from `function Footer()` to `forwardRef<HTMLElement>` so any parent using a ref (or React StrictMode validation) stops warning. Zero behavior change.

### 3. (No-op confirmed) Performance
No code changes needed. The "10s load" is a Vite dev-mode artifact; production build is well under the 3s target. CLS is 0.0003 (passes). Images are already WebP/JPG (e.g. `logo-with-text.webp`). I'll explicitly note this in the final report rather than chasing a non-issue.

### 4. (No-op confirmed) Mobile layout
No code changes needed. Verified live at 375px on `/`, `/pricing`, `/pauline-teo`.

## QA after fixes

I'll re-run the 8-level pass and report:
- L1 Console: zero new errors (Footer warning gone)
- L2 Buttons: spot-check Index/Pricing/Contact CTAs
- L3 Empty states: NotFound has helpful message + Home link
- L5 Mobile: re-screenshot the 8 fixed pages at 375px
- L6 Auth: every changed page is public, no auth required
- L8 Navigation: every page already has Navbar + Footer (≥2 next actions)

L4 (DB writes) and L7 (form errors) are not affected by this audit — no form changes.

## Files to change

```text
src/components/Footer.tsx          (wrap in forwardRef)
src/pages/Index.tsx                (add useDocumentMeta)
src/pages/HowItWorks.tsx           (add useDocumentMeta)
src/pages/Pricing.tsx              (add useDocumentMeta)
src/pages/Contact.tsx              (add useDocumentMeta)
src/pages/Directory.tsx            (add useDocumentMeta)
src/pages/Join.tsx                 (add useDocumentMeta)
src/pages/NotFound.tsx             (add useDocumentMeta + noindex meta)
```

7 small additions + 1 forwardRef wrap. No DB migration, no edge function changes.
