import { Navigate } from "react-router-dom";

/**
 * Canonical-flow guard: every road through Brand/Build/Yield now passes through
 * the My Books Hub so the author always picks a book before opening a builder.
 *
 * Usage in App.tsx routes:
 *   <Route path="/brand-products"  element={<IntentRedirect intent="brand"  />} />
 *   <Route path="/build-authority" element={<IntentRedirect intent="build"  />} />
 *   <Route path="/yield-revenue"   element={<IntentRedirect intent="yield"  />} />
 */
export default function IntentRedirect({ intent }: { intent: "brand" | "build" | "yield" }) {
  return <Navigate to={`/my-books?intent=${intent}`} replace />;
}
