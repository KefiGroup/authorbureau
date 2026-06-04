# Authors Bureau Public Audit — My Comments + Fix Plan

I read the full Manus AI report and checked each claim against the live code. Below is an honest verdict on each finding, then a concrete fix plan. Short version: the report is **mostly accurate and fair**, but a few "critical" routing bugs were tested against the **older published build** and are already fixed in the current code. The genuinely damaging rendering bugs (raw JSON fee schedule, internal node-ID tab bar, database-artifact product names) are **real and confirmed in code**.

---

## Verdicts (is it true?)

### Critical
| Ref | Finding | Verdict | Note |
|---|---|---|---|
| S-01 | Fee schedule renders raw JSON | **TRUE — confirmed** | `yrInline()` does `JSON.stringify()` on objects, so a `fee_schedule` of objects dumps raw JSON exactly as shown. |
| S-02 | Speaking H1 is a DB title ("Pauline Teo \| Be SUCKcessful") | **TRUE** | Title falls back to `personalised_name`, which holds the page title artifact. |
| B-01 | Internal node-ID tab bar (leadmagnet, jv, press…) | **TRUE — confirmed** | `BookProductNav` labels come from `getProductTabMeta(type)`, which falls back to the raw node type for unmapped types. |
| B-04 | "Pauline Teo \| Be SUCKcessful — Contact Pauline" shown as a product | **TRUE** | Product titles use `personalised_name \|\| node_name` with no sanitization. |
| A-01 | Hero CTA price mismatch ($4.99 vs $0.99) | **PARTLY — data** | Code computes the lowest of kindle/paperback/price; if it shows $4.99 the book record's price fields are wrong/stale. Fix is data + a guard. |
| A-02 | Terms/Privacy repeated under every product card | **LIKELY TRUE** | Needs a one-line confirm in the product-card render; belongs in footer only. |
| A-06 / Q-01 | "Free Quiz" nav → 404 | **ALREADY ADDRESSED** | Author nav now uses a `#quiz-section` anchor, not a dead route. The quiz only appears when the book has a quiz section. |
| H-01 | "How It Works" → blank page | **ALREADY FIXED** | `/how-it-works` renders a full, rich page in current code. Was true on the older published build. |
| H-02 / HP-01 | "Help" → 404 | **ALREADY FIXED** | Main nav "Help" points to `/faq`, which exists. Stale finding. |

### Medium / Low
| Ref | Finding | Verdict |
|---|---|---|
| S-03 | Talks named "Talk 1/2/3" | TRUE if generated content lacks titles — data/generation gap; add fallback titles. |
| S-04/05/06 | No speaker photo / testimonials / client logos | TRUE — these sections don't exist on the speaking node yet. |
| S-07 | No form confirmation | PARTLY — a `submitted` state exists; needs a clearer success toast/message. |
| A-03 | Hero stat "18 Products & Services" meaningless | TRUE — cosmetic copy choice. |
| A-04 | "Work With Me" has no "Start Here" guidance | TRUE — UX enhancement. |
| A-05 | Affiliate link dangling with no context | TRUE — placement. |
| A-07 | Subscribe form has no lead-magnet description | TRUE — copy. |
| B-02 | Free Workbook has no "why free" description | TRUE — copy. |
| B-03 | "Collective — Contact Pauline" should be "Join $17/mo" | TRUE — same artifact family as B-04. |
| B-05 | Cross-sell card has no price/CTA | TRUE — small enhancement. |
| D-01 | "Entreprenuer" typo | TRUE — pure data fix in DB. |
| D-02 | No book-cover thumbnails on directory cards | TRUE — enhancement. |
| D-03 | Internal genre labels in filter (Access Strategy, Ai Advocacy…) | TRUE — genre normalization needed. |
| D-04 | Empty author page instead of "Coming Soon" | TRUE — empty-state. |
| M-01 | Methodology page has no CTA | TRUE — add CTA. |
| M-02 | Framework badges text-only | TRUE — styling. |
| H-03 | 28-stream diagram too low | TRUE — layout opinion. |
| H-04 | No pricing on homepage | TRUE — note: pricing is intentionally de-emphasized per our public-site rules, so this is a deliberate product decision, not a bug. |
| H-05 | External footer links no "↗" indicator | TRUE — small UX. |

**Bottom line:** ~3 of the 5 "critical" items are real and live (S-01, B-01, plus the artifact names S-02/B-04). Two "critical" routing bugs (H-01, H-02) are already fixed. The medium/low list is fair and worth doing.

---

## Fix Plan

### Sprint A — Critical, trust-destroying (code, ~1 day)
1. **S-01 Fee schedule JSON.** In `MicrositePage.tsx` `SpeakingPage`, stop dumping objects. Render `fee_schedule` entries with a proper formatter: for object entries show `label` + a human price range (`$25,000–$40,000`) instead of `yrInline` JSON. Safest per the report: **hide the fee schedule on the public speaking page entirely** (corporate buyers inquire), keeping the booking form. I'll gate it behind a clean formatter and default it off.
2. **B-01 Internal node-ID tab bar.** In `getProductTabMeta` / `BookProductNav`, map every node type to a friendly label and **filter out non-product nodes** (leadmagnet, jv, press, fundraising, sponsors, affiliates, vip, corporate, bundles, conference, groupcoaching) from the public product tab bar. No raw type should ever render as a label.
3. **S-02 / B-04 / B-03 artifact names.** Add a sanitizer for product/title display: if `personalised_name` contains the `Author | Book` pattern or "Contact {name}", fall back to the canonical node label. Speaking H1 → "Book {Author} to Speak". Collective CTA → "Join for $17/month" with enrolment link when it's a membership node.
4. **A-01 price guard.** Ensure the hero CTA always derives from the real lowest book price and correct the underlying book record so it reads $0.99.
5. **A-02 inline Terms/Privacy.** Remove Terms of Sale / Privacy links from individual product cards; keep them in the footer only.

### Sprint B — Conversion (1–2 days)
- S-03 fallback talk titles; S-04 speaker photo block; S-05 organiser testimonials; S-06 client logo bar; S-07 explicit success toast.
- A-03 swap stat to "28 Revenue Streams Built" / rating; A-04 "Start Here" recommendation; A-07 lead-magnet description on subscribe form.
- D-01 typo fix (DB); D-03 reader-friendly genre normalization.

### Sprint C — Polish (~1 day)
- H-03 move 28-stream diagram up; M-01 Methodology CTA; M-02 styled framework pill badges; B-02 workbook "why free" copy; B-05 cross-sell price + CTA; D-02 directory cover thumbnails; D-04 "Coming Soon" empty state; H-05 external-link indicator.
- H-04 (homepage pricing): flag for your decision — our public-site convention intentionally suppresses pricing, so I'd recommend a "See plans" link rather than a full pricing block.

---

## Technical notes
- Root cause of the worst bugs is **unsanitized rendering of AI/DB content** in two spots: `yrInline()` (JSON.stringify fallback) and product title fallbacks (`personalised_name`). Centralizing a `formatPublicLabel()` + `formatFeeRange()` helper fixes S-01, S-02, B-01, B-03, B-04 together.
- H-01/H-02 prove the live site is behind the codebase — a **publish** will clear those two "critical" findings immediately.
- Several items (A-01 price, D-01 typo, D-03 genres, S-03 talk titles) are **data**, not code; I'll fix the rendering guard and correct the records.

I'll start with Sprint A once you approve.
