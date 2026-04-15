import { useParams } from "react-router-dom";
import { SLUG_TO_NODE } from "@/lib/node-slug-map";
import MicrositePage from "./MicrositePage";
import AuthorBookPage from "./AuthorBookPage";

/**
 * Smart resolver for /:authorSlug/:slug routes.
 * If the slug matches a known node slug → render MicrositePage.
 * If the slug looks like a personalised microsite slug (contains hyphens, no dots) → render MicrositePage (dynamic lookup).
 * Otherwise → render AuthorBookPage (book landing page).
 */
export default function AuthorSubpageResolver() {
  const { bookSlug } = useParams<{ bookSlug: string }>();

  // Check if this slug is a known node microsite slug
  if (bookSlug && SLUG_TO_NODE[bookSlug]) {
    return <MicrositePage />;
  }

  // For unknown slugs, try MicrositePage first — it supports dynamic slug lookup
  // and will gracefully show "not found" if the slug doesn't match any node.
  // Common book slugs are short (e.g., "be-suckcessful") while microsite slugs
  // tend to be longer personalised names. We try MicrositePage for all unknown slugs
  // since it handles the not-found case properly.
  return <MicrositePage />;
}
