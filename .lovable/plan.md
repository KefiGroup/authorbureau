# Authors Bureau — Full Platform Bug Audit
**Generated: 2026-03-11**

---

## 1. AUTHOR DASHBOARD

### 1A. Sidebar Navigation (`DashboardSidebar.tsx`)

| ID | Bug | Severity | File(s) |
|----|-----|----------|---------|
| SD-01 | `buildUnlocked` counter on Build tab passes `stats.products.totalBuilt` which counts ALL products, not just Build-category products | Medium | `AuthorDashboard.tsx:373` |
| SD-02 | `bridgeUnlocked` counter incorrectly sums ALL `perTable` entries instead of filtering to Bridge-category tables only | Medium | `AuthorDashboard.tsx:374` |
| SD-03 | `yieldUnlocked` reuses `stats.products.totalBuilt` (same as Build), should count only Yield-category products | Medium | `AuthorDashboard.tsx:375` |
| SD-04 | CRM lock message says `"Upgrade to Pro to Pro"` when tier is starter (string concatenation bug at line 110) | Low | `DashboardSidebar.tsx:110` |
| SD-05 | Revenue Dashboard `hidden` when `!hasMicrosite && !isPremium` — should always show for subscribers | Low | `DashboardSidebar.tsx:118-119` |

### 1B. Dashboard Overview (`ABBYFrameworkDashboard.tsx`)

| ID | Bug | Severity |
|----|-----|----------|
| DO-01 | Fetches `dashboard-state` edge function — need to verify it exists and handles identity resolution | High |
| DO-02 | `bookCovers` populated from `state.bookCovers` but never verified if edge function returns this field | Medium |

### 1C. Journey Breadcrumb (`AuthorDashboard.tsx:389-418`)

| ID | Bug | Severity |
|----|-----|----------|
| JB-01 | Step 4 "Launch Microsite" uses `hasMicrosite` from profile existence, but breadcrumb state logic on line 409 duplicates the check | Low |
| JB-02 | Journey steps don't account for admin users who may not have books — shows "Analyze First Book" even for admins | Low |

### 1D. Build/Bridge/Yield Tabs (`PortfolioStepView.tsx`)

| ID | Bug | Severity |
|----|-----|----------|
| PV-01 | `getActiveToken()` is redefined locally (line 25-30) instead of importing from `@/lib/get-active-token` — possible stale session handling | Medium |
| PV-02 | Product state detection `nodeIdMap` (line 139-142) is incomplete — only maps 5 of 28 nodes, so most products always show as "available" even when built | High |
| PV-03 | `builtProducts` only checks `generated_assets` table for 5 asset types (line 102), misses home_study_courses, podcasts, etc. | High |
| PV-04 | `publishedProducts` check (line 112-121) queries `webinars` table which doesn't exist in schema — should be removed or the table created | Medium |
| PV-05 | "Planned" feature cards have no "Notify Me" button or disabled state mechanism | Medium |
| PV-06 | Missing "Open Studio" buttons for `book-sales-events`, `special-editions`, and `lead-magnet` nodes — `getStudioPath` maps them but `section` routing in `AuthorDashboard.tsx` doesn't handle `book-sales`, `special-editions`, or `lead-magnet` sections | High |

### 1E. Revenue Dashboard (`RevenueDashboard.tsx`)

| ID | Bug | Severity |
|----|-----|----------|
| RD-01 | Chart `XAxis` has no left padding — first month label cut off | Low |
| RD-02 | "Platform Fee (5%)" stat card shown even when `grossSales === 0` — should be hidden or show "—" | Low |
| RD-03 | Category breakdown cards say "from 0 products" — should say "No products built yet" when 0 | Low |
| RD-04 | `useAuth()` called twice (lines 43 and 48) — duplicate hook call | Low |

### 1F. My Microsite (`MicrositeManager.tsx`)

| ID | Bug | Severity |
|----|-----|----------|
| MS-01 | Profile detection uses `supabase` (Cloud) client — may miss profiles created on shared backend | Medium |
| MS-02 | No "View My Microsite" CTA when profile already exists and is live — always shows setup flow | Medium |
| MS-03 | Premium features don't show lock icons with tooltips — just show as `locked` status | Low |

### 1G. Reading Club (`AuthorReadingClub.tsx`)

| ID | Bug | Severity |
|----|-----|----------|
| RC-01 | Book query uses `supabase` (Cloud) client with `author_id = user.id` — may return empty if books are on shared backend only | Medium |

### 1H. Author CRM (`AuthorCRMPage.tsx`)

| ID | Bug | Severity |
|----|-----|----------|
| CRM-01 | Empty state CTA button styling not verified — may have inconsistent colors | Low |
| CRM-02 | No CSV template download or column preview in empty state | Low |

---

## 2. BUILDER STUDIOS

### 2A. Home Study Builder

| ID | Bug | Severity |
|----|-----|----------|
| HS-01 | ✅ FIXED — Stale content banner now shows when setup fields change after generation | Done |
| HS-02 | Generated content uses placeholder text (not real AI) — `handleGenerate` in DailyContentStep uses `setTimeout` with static strings | Medium |
| HS-03 | `DailyScheduleStep.handleGenerate` generates mock data with `setTimeout` — no real AI call to `abby-builder-generate` | Medium |

### 2B. Course Builder (`CourseBuilder.tsx`)

| ID | Bug | Severity |
|----|-----|----------|
| CB-01 | Need to verify CourseStepRenderer steps all route correctly | Medium |

### 2C. Workbook Builder (`WorkbooksManager.tsx`)

| ID | Bug | Severity |
|----|-----|----------|
| WB-01 | Need to verify all 5 steps render and save correctly | Medium |

### 2D. Universal Builder Studio

| ID | Bug | Severity |
|----|-----|----------|
| UB-01 | `builderNodeConfig` maps nodes to studios — need to verify all 27 nodes have valid configs | High |
| UB-02 | Several planned nodes (big-ticket, training, retreats, certification, conventions, fundraising, exhibitors, affiliates, upsells, revenue-sharing, in-house-speaker) have `status: "planned"` but no gating in SmartProductCard — clicking "Build" may lead to empty pages | High |

---

## 3. ADMIN PANEL

### 3A. Admin Dashboard (`AdminDashboard.tsx`)

| ID | Bug | Severity |
|----|-----|----------|
| AD-01 | ✅ Previously fixed — dedicated admin header, no public navbar | Done |
| AD-02 | Need to verify all 6 tabs (Overview, Authors, Books, CRM, Reading Club, Support) load data correctly | Medium |
| AD-03 | `admin-data` edge function needs verification that it handles all actions without errors | Medium |

### 3B. Authors Tab (`AuthorsTab.tsx`)

| ID | Bug | Severity |
|----|-----|----------|
| AT-01 | ✅ Previously fixed — red border removed from search | Done |
| AT-02 | Edit Profile dialog needs verification that saves propagate to database | Medium |
| AT-03 | "Listed" status application on approval needs verification | Medium |

---

## 4. PUBLIC PAGES

### 4A. Landing Page (`Index.tsx`)

| ID | Bug | Severity |
|----|-----|----------|
| LP-01 | Google Fonts CSS requests may still be failing — need to check | Low |

### 4B. Author Directory (`Directory.tsx`)

| ID | Bug | Severity |
|----|-----|----------|
| DIR-01 | Need to verify directory correctly shows listed/featured authors | Medium |

### 4C. Auth Flow (`Auth.tsx`)

| ID | Bug | Severity |
|----|-----|----------|
| AF-01 | ✅ Previously fixed — admin redirect race condition | Done |
| AF-02 | Dual-backend auth token resolution via `getActiveToken()` — working | Done |

### 4D. Dynamic Microsites (`DynamicBookMicrosite.tsx`)

| ID | Bug | Severity |
|----|-----|----------|
| DM-01 | Need to verify microsites render with correct data for listed authors | Medium |

---

## PRIORITY FIX ORDER

### Critical (breaks core functionality):
1. **PV-02/PV-03**: Product state detection incomplete — counters always wrong
2. **PV-06**: Missing section routing for book-sales, special-editions, lead-magnet
3. **UB-02**: Planned nodes may lead to empty pages when clicked

### High (major UX issues):
4. **SD-01/SD-02/SD-03**: Sidebar counters inaccurate
5. **PV-04**: Queries non-existent `webinars` table
6. **MS-01/RC-01**: Shared backend profile/book detection issues

### Medium (functional but broken UX):
7. **RD-01/RD-02/RD-03**: Revenue dashboard polish
8. **SD-04**: CRM lock message typo
9. **MS-02**: Missing "View My Microsite" CTA
10. **HS-02/HS-03**: Mock AI generation (placeholder timeouts)

### Low (cosmetic):
11. **CRM-01/CRM-02**: Empty state polish
12. **JB-01/JB-02**: Journey breadcrumb edge cases
13. **LP-01**: Google Fonts

---

## Previous Roadmap (Phase 1)

### CRM Foundation + Reading Club Enhancement (Weeks 1-4)

The roadmap says to build the CRM ("nervous system") and Reading Club ("demand engine") first, so every subsequent feature automatically captures contacts and drives conversions.

### Current State

- **CRM**: A basic `CRMDashboard.tsx` that reads from `profiles`, `reading_club_members`, and `newsletter_signups` as a unified contact list. Separate `crm_contacts`, `crm_contact_tags`, and `crm_activity_log` tables exist but are only used by the `CoachingCRM` component.
- **Reading Club**: A public page with featured books, member signup (email+name), and basic discussions. No book catalog browsing, no challenges, no CRM integration.
