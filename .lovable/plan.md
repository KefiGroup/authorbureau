

## Add the dashboard sidebar to every authenticated page

Right now the left navigation (Dashboard sidebar + top header) only renders on two pages: `/dashboard` and `/dashboard/book/:bookId`. Every other authenticated page — Brand Products, Build Authority, Yield Revenue, Revenue Dashboard, Earnings, Account Settings, Connect Settings, Abby Coach, Node Builder, Admin Payouts — drops the user into a bare page with only a "← Back to Dashboard" link (visible in your screenshot of `authorsbureau.com/brand-products`).

The fix is to extract the sidebar+header chrome that already exists in `AuthorDashboard` into a single shared layout component and wrap every authenticated route with it.

### What you'll see after

- The same gold sidebar (Dashboard, My Books, Brand Products, Build Authority, Yield Revenue, Marketing Hub, My Library, Revenue Dashboard, Account Settings, etc.) appears on **every** signed-in page.
- The top dashboard header (search, user menu, notifications) also appears on every signed-in page.
- The active item in the sidebar correctly highlights based on the current URL (e.g. on `/brand-products` the "Brand Products" item is highlighted; on `/earnings` the "Revenue Dashboard" group is highlighted).
- Mobile behaviour is preserved: sidebar collapses to a slide-over with a hamburger toggle in the header.
- Public pages (author microsites, reader pages, marketing site, auth pages) are **not** affected — they keep their current chrome-free layout.

### What changes

**New file: `src/components/dashboard/DashboardLayout.tsx`**
A single wrapper component that:
- Calls `useAuth`, `useSubscription`, and the same data hooks `AuthorDashboard` uses today (books count, stats, pending review count, stripe status, tier flags).
- Renders `DashboardSidebar` + `DashboardHeader` + `<main>{children}</main>` with the exact same flex/overflow structure that's working in `AuthorDashboard.tsx` lines 506–549.
- Accepts an `activeSection` prop (or derives it from the current pathname via a small route→section map) so the correct sidebar item is highlighted.
- Sidebar item clicks call `navigate("/dashboard?section=...")` for sections that live inside the dashboard, or `navigate("/brand-products")` etc. for the standalone hub pages.
- Handles the mobile collapse state internally.

**Refactor: `src/pages/AuthorDashboard.tsx` and `src/pages/BookHub.tsx`**
Replace the inline sidebar/header markup with `<DashboardLayout activeSection={...}>{pageContent}</DashboardLayout>`. No behaviour change — same code, just relocated.

**Wrap these pages with `DashboardLayout`:**
- `BrandProductsHub` (`/brand-products`)
- `BuildAuthorityHub` (`/build-authority`)
- `YieldRevenueHub` (`/yield-revenue`)
- `RevenueFullDashboard` (`/revenue-dashboard`)
- `EarningsDashboard` (`/earnings`)
- `AccountSettings` (`/account-settings`)
- `ConnectSettings` (`/connect-settings`)
- `AbbyCoachPage` (`/abby-coach`)
- `NodeBuilder` (`/node-builder/:nodeId`)
- `AdminPayouts` (`/admin/payouts`)

For each page, we wrap the existing page body in `<DashboardLayout>…</DashboardLayout>` and remove the now-redundant "← Back to Dashboard" link (the sidebar makes it obsolete).

**Route→section highlighting map** (lives inside `DashboardLayout`):
```
/dashboard           → from ?section= query param (existing logic)
/brand-products      → "brand-products"
/build-authority     → "build-authority"
/yield-revenue       → "yield-revenue"
/revenue-dashboard   → "revenue-dashboard"
/earnings            → "revenue-dashboard"
/account-settings    → "account-settings"
/connect-settings    → "account-settings"
/abby-coach          → "abby-coach"
/node-builder/*      → derived from the node's category
/admin/payouts       → "admin"
```

### Pages explicitly NOT wrapped
Marketing site (`/`, `/how-it-works`, `/pricing`, `/faq`, `/contact`, `/methodology`, `/terms`, `/privacy`), all author public microsites (`/:authorSlug`, `/:authorSlug/:bookSlug`, course/membership/webinar pages), `/directory`, `/readers-bureau/*`, `/auth`, `/admin-auth`, `/admin`, purchase/subscription success pages, and `NotFound`. These are intentionally chrome-free.

### Out of scope
- Visual redesign of the sidebar or its items.
- Changing what items appear in the sidebar.
- Adding the sidebar to public reader pages.
- Changing the admin dashboard chrome (it has its own layout).

### Validation
1. Sign in, visit `/brand-products` → sidebar + header appear, "Brand Products" item is highlighted.
2. Visit `/build-authority`, `/yield-revenue`, `/revenue-dashboard`, `/earnings`, `/account-settings`, `/connect-settings`, `/abby-coach`, `/node-builder/BP-09`, `/admin/payouts` → sidebar + header appear on each, correct item highlighted.
3. Click any sidebar item from any of these pages → navigates correctly, highlight updates.
4. Resize to mobile → sidebar collapses to a slide-over with a hamburger toggle, same as on `/dashboard` today.
5. Visit `/`, `/pricing`, `/yourslug`, `/directory`, `/readers-bureau` → no dashboard sidebar (unchanged).

