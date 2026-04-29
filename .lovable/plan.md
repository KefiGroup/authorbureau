## Audit findings

I audited every ABBY prompt and node-aware edge function. Three classes of issues need fixing — node-name drift, gpt-5 temperature violations (per Core memory rule, these return AI-gateway 400 errors), and stale pricing/tier wording.

### 1. Node-name drift vs the canonical registry (`builderNodeConfig.ts`)

The master ABBY business-plan template in `supabase/functions/business-consultant/index.ts` (lines 3234-3256) lists the wrong names for several nodes — two of them (YR-27, YR-28) are completely the wrong topic:

| Node | Canonical name | Current (wrong) prompt label |
|---|---|---|
| BA-14 | Podcast Tour | Podcast |
| BA-15 | Media & PR | Affiliates & Partnerships ❌ |
| BA-16 | Affiliates | Speaking Engagements ❌ |
| BA-17 | Upsells | Upsells & Downsells |
| BA-18 | JV Partnerships | Revenue Sharing ❌ |
| YR-20 | Big Ticket Consulting | Consulting |
| YR-21 | Speaking | Keynote Speaking |
| YR-25 | Certification | Licensing & IP ❌ |
| YR-26 | Conference | Conferences & Events |
| YR-27 | Fundraising | Media & Publishing ❌❌ |
| YR-28 | Sponsors | Legacy & Philanthropy ❌❌ |

`abby-help-chat/index.ts` (lines 92-94) has the same drift in its category listings (uses "Consulting / Speaking / Certification/Licensing / Conventions / Exhibitors & JV").

### 2. GPT-5 temperature violations (Core rule violation — causes 400 errors)

Three generators pass `temperature` with `openai/gpt-5*` models, which the AI gateway rejects:

- `generate-bp00-analysis/index.ts` — line 129, `temperature: 0.7`
- `generate-bp02-social-pack/index.ts` — line 144, `temperature: 0.7`
- `generate-daily-insight/index.ts` — line 84, `temperature: 0.8`

(The other two `temperature` calls — `generate-ba10-online-course` and `abby-builder-generate` — are paired with Gemini models, which is allowed.)

### 3. Stale subscription-tier wording in ABBY's help prompt

`abby-help-chat/index.ts` lines 103-107 still describe the tiers as "Starter ($49) / Pro ($199) / Enterprise ($499)". The canonical product names (per `Pricing.tsx`) are now **Brand Package / Build Package / Yield Package** at the same prices.

### 4. What's already healthy (no changes needed)

- `extract-frameworks` — clean prompt, well-scoped Bloom's-style extraction.
- `abby-builder-generate` — strong Bloom's + Kolb's framework grounding.
- All `generate-bp0X / ba1X / yr1X-yr28` per-node generators have the correct internal `NODE_ID` and `NODE_NAME` constants (folder names like `generate-bp08-mastermind` are cosmetic and don't need touching — they're just URL slugs).
- `LOVABLE_API_KEY` doesn't expire on a schedule — no token-rotation work needed unless logs show 401s.
- All prompts already use `gpt-5` / `gemini-3-flash-preview` / `gpt-5.2` from the approved model list; no deprecated models.

---

## Proposed changes

### A. Fix node-name drift (single source of truth = `builderNodeConfig.ts`)

**`supabase/functions/business-consultant/index.ts`** — update the 28-node template at lines 3234-3256 so each line matches the canonical name exactly:

```text
- **BA-14 Podcast Tour** — …
- **BA-15 Media & PR** — …
- **BA-16 Affiliates** — …
- **BA-17 Upsells** — …
- **BA-18 JV Partnerships** — …
- **YR-20 Big Ticket Consulting** — …
- **YR-21 Speaking** — …
- **YR-25 Certification** — …
- **YR-26 Conference** — …
- **YR-27 Fundraising** — …  (was "Media & Publishing" — completely wrong topic)
- **YR-28 Sponsors & Exhibitors** — …  (was "Legacy & Philanthropy" — completely wrong topic)
```

Also tighten the Act-3/Act-4 narrative blocks earlier in the file (lines 66-68) to use the same canonical names.

### B. Fix `abby-help-chat/index.ts` system prompt (lines 92-107)

- Re-align the Brand / Build / Yield node lists to the canonical names above.
- Replace tier names: **Starter → Brand Package**, **Pro → Build Package**, **Enterprise → Yield Package** (prices stay $49 / $199 / $499).

### C. Remove gpt-5 `temperature` overrides

In each of the three files below, delete just the `temperature: …` line from the request body — leave `max_completion_tokens` and everything else intact:

- `supabase/functions/generate-bp00-analysis/index.ts` (line 129)
- `supabase/functions/generate-bp02-social-pack/index.ts` (line 144)
- `supabase/functions/generate-daily-insight/index.ts` (line 84)

### D. Memory update

Add one line to `mem://index.md` Core noting that the canonical node-name source of truth is `src/components/dashboard/builders/builderNodeConfig.ts`, so future ABBY prompts stay aligned.

---

## Out of scope (not changed)

- Folder slug renames (e.g. `generate-bp08-mastermind` → `generate-bp08-special-editions`) — would require updating every caller and provides no user-facing value.
- The big content prompts inside `business-consultant` (workbook / home-study / webinar / coaching / mastermind / speaking builder prompts, ~3000 lines) — they're well-written and framework-grounded; rewriting them risks regressions. Happy to revise specific sections if you point to one.
- ABBY's framework extraction logic — already strong.

Reply **YES** to apply A–D, or tell me which sections to skip.