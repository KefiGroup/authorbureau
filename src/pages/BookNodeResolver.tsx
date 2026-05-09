import { useParams } from "react-router-dom";
import { SLUG_TO_NODE } from "@/lib/node-slug-map";
import MicrositePage from "./MicrositePage";
import AuthorProductPage from "./AuthorProductPage";

/**
 * Sprint 56 — Book-scoped node resolver.
 *
 * Mounted on `/:authorSlug/:bookSlug/:nodeSlug`. The third segment is
 * ambiguous: it may be a node microsite slug (e.g. "workbook", "audiobook")
 * OR a product slug consumed by AuthorProductPage (legacy behaviour).
 *
 * Routing rule:
 *   - If the third segment maps to a known node → render MicrositePage.
 *     MicrositePage reads bookSlug from the URL and forwards it to
 *     get-microsite-page so the correct per-book row is served.
 *   - Otherwise → fall through to AuthorProductPage (preserves the
 *     pre-Sprint-56 product/order/checkout flows).
 */
export default function BookNodeResolver() {
  const { nodeSlug } = useParams<{ authorSlug: string; bookSlug: string; nodeSlug: string }>();
  const isKnownNode = nodeSlug ? !!SLUG_TO_NODE[nodeSlug] : false;
  if (isKnownNode) return <MicrositePage />;
  return <AuthorProductPage />;
}
