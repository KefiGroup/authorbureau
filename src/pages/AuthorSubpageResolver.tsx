import { useParams } from "react-router-dom";
import { SLUG_TO_NODE } from "@/lib/node-slug-map";
import MicrositePage from "./MicrositePage";
import AuthorBookPage from "./AuthorBookPage";

/**
 * Smart resolver for /:authorSlug/:slug routes.
 * If the slug matches a known node slug → render MicrositePage.
 * Otherwise → render AuthorBookPage (book landing page).
 */
export default function AuthorSubpageResolver() {
  const { bookSlug } = useParams<{ bookSlug: string }>();

  // Check if this slug is a node microsite slug
  if (bookSlug && SLUG_TO_NODE[bookSlug]) {
    return <MicrositePage />;
  }

  // Otherwise, treat as a book slug
  return <AuthorBookPage />;
}
